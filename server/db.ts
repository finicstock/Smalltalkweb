import { eq, desc, asc, like, or, and, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  contents, InsertContent,
  categories, InsertCategory,
  plans, InsertPlan,
  subscriptions, InsertSubscription,
  payments, InsertPayment,
  newsletters, InsertNewsletter,
  newsletterSubscribers, InsertNewsletterSubscriber,
  chatMessages, InsertChatMessage,
  chatSessions, InsertChatSession,
  playlists, InsertPlaylist,
  playlistContents, InsertPlaylistContent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TF = (typeof textFields)[number];
  const assign = (f: TF) => { const v = user[f]; if (v === undefined) return; const n = v ?? null; values[f] = n; updateSet[f] = n; };
  textFields.forEach(assign);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0];
}

export async function getAllUsers(opts: { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const r = await db.select({ count: count() }).from(users);
  return r[0]?.count ?? 0;
}

// ─── Categories ──────────────────────────────────────
export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values(data);
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Contents ────────────────────────────────────────
export async function listPublishedContents(opts: { limit?: number; offset?: number; categoryId?: number; search?: string; contentType?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contents.status, "published")];
  if (opts.categoryId) conditions.push(eq(contents.categoryId, opts.categoryId));
  if (opts.contentType) conditions.push(eq(contents.contentType, opts.contentType as "article" | "video"));
  if (opts.search) conditions.push(or(like(contents.title, `%${opts.search}%`), like(contents.excerpt, `%${opts.search}%`))!);
  return db.select().from(contents).where(and(...conditions)).orderBy(desc(contents.publishedAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
}

export async function getPublishedContentCount(opts: { categoryId?: number; search?: string; contentType?: string } = {}) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq(contents.status, "published")];
  if (opts.categoryId) conditions.push(eq(contents.categoryId, opts.categoryId));
  if (opts.contentType) conditions.push(eq(contents.contentType, opts.contentType as "article" | "video"));
  if (opts.search) conditions.push(or(like(contents.title, `%${opts.search}%`), like(contents.excerpt, `%${opts.search}%`))!);
  const r = await db.select({ count: count() }).from(contents).where(and(...conditions));
  return r[0]?.count ?? 0;
}

export async function getContentBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(contents).where(eq(contents.slug, slug)).limit(1);
  return r[0];
}

export async function getContentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
  return r[0];
}

export async function incrementViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contents).set({ viewCount: sql`${contents.viewCount} + 1` }).where(eq(contents.id, id));
}

export async function listAllContents(opts: { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contents).orderBy(desc(contents.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getAllContentCount() {
  const db = await getDb();
  if (!db) return 0;
  const r = await db.select({ count: count() }).from(contents);
  return r[0]?.count ?? 0;
}

export async function createContent(data: InsertContent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contents).values(data);
}

export async function updateContent(id: number, data: Partial<InsertContent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contents).set(data).where(eq(contents.id, id));
}

export async function deleteContent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contents).where(eq(contents.id, id));
}

// ─── Plans ───────────────────────────────────────────
export async function listActivePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.sortOrder));
}

export async function listAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).orderBy(asc(plans.sortOrder));
}

export async function createPlan(data: InsertPlan) {
  const db = await getDb();
  if (!db) return;
  await db.insert(plans).values(data);
}

export async function updatePlan(id: number, data: Partial<InsertPlan>) {
  const db = await getDb();
  if (!db) return;
  await db.update(plans).set(data).where(eq(plans.id, id));
}

export async function deletePlan(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(plans).where(eq(plans.id, id));
}

// ─── Subscriptions ───────────────────────────────────
export async function getUserActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))).limit(1);
  return r[0];
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) return;
  await db.insert(subscriptions).values(data);
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function listAllSubscriptions(opts: { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getActiveSubscriberCount() {
  const db = await getDb();
  if (!db) return 0;
  const r = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  return r[0]?.count ?? 0;
}

// ─── Payments ────────────────────────────────────────
export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return;
  await db.insert(payments).values(data);
}

export async function listPayments(opts: { userId?: number; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conds = opts.userId ? [eq(payments.userId, opts.userId)] : [];
  return db.select().from(payments).where(conds.length ? and(...conds) : undefined).orderBy(desc(payments.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

// ─── Newsletters ─────────────────────────────────────
export async function listNewsletters(opts: { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsletters).orderBy(desc(newsletters.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function createNewsletter(data: InsertNewsletter) {
  const db = await getDb();
  if (!db) return;
  await db.insert(newsletters).values(data);
}

export async function updateNewsletter(id: number, data: Partial<InsertNewsletter>) {
  const db = await getDb();
  if (!db) return;
  await db.update(newsletters).set(data).where(eq(newsletters.id, id));
}

export async function deleteNewsletter(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(newsletters).where(eq(newsletters.id, id));
}

// ─── Newsletter Subscribers ──────────────────────────
export async function subscribeNewsletter(email: string, userId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(newsletterSubscribers).values({ email, userId, isActive: true }).onDuplicateKeyUpdate({ set: { isActive: true, unsubscribedAt: null } });
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(newsletterSubscribers).set({ isActive: false, unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.email, email));
}

export async function listNewsletterSubscribers(opts: { activeOnly?: boolean; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conds = opts.activeOnly ? [eq(newsletterSubscribers.isActive, true)] : [];
  return db.select().from(newsletterSubscribers).where(conds.length ? and(...conds) : undefined).orderBy(desc(newsletterSubscribers.subscribedAt)).limit(opts.limit ?? 200).offset(opts.offset ?? 0);
}

export async function getNewsletterSubscriberCount(activeOnly = true) {
  const db = await getDb();
  if (!db) return 0;
  const conds = activeOnly ? [eq(newsletterSubscribers.isActive, true)] : [];
  const r = await db.select({ count: count() }).from(newsletterSubscribers).where(conds.length ? and(...conds) : undefined);
  return r[0]?.count ?? 0;
}

// ─── Chat Sessions & Messages ────────────────────────
export async function getOrCreateChatSession(sessionId: string, userId?: number, userName?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(chatSessions).values({ sessionId, userId, userName, status: "open" });
  const r = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId)).limit(1);
  return r[0];
}

export async function listChatSessions(opts: { status?: "open" | "closed"; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conds = opts.status ? [eq(chatSessions.status, opts.status)] : [];
  return db.select().from(chatSessions).where(conds.length ? and(...conds) : undefined).orderBy(desc(chatSessions.updatedAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getChatMessages(sessionId: string, opts: { limit?: number; offset?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(asc(chatMessages.createdAt)).limit(opts.limit ?? 100).offset(opts.offset ?? 0);
}

export async function sendChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data);
  // update session timestamp
  await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.sessionId, data.sessionId));
}

export async function closeChatSession(sessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatSessions).set({ status: "closed" }).where(eq(chatSessions.sessionId, sessionId));
}

export async function markMessagesRead(sessionId: string, senderType: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  // Mark messages from the other party as read
  const readTarget = senderType === "admin" ? "user" : "admin";
  await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.senderType, readTarget)));
}

// ─── Playlists ───────────────────────────────────────
export async function listPublicPlaylists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playlists).where(eq(playlists.isPublic, true)).orderBy(asc(playlists.sortOrder));
}

export async function listAllPlaylists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playlists).orderBy(asc(playlists.sortOrder));
}

export async function getPlaylistBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(playlists).where(eq(playlists.slug, slug)).limit(1);
  return r[0];
}

export async function createPlaylist(data: InsertPlaylist) {
  const db = await getDb();
  if (!db) return;
  await db.insert(playlists).values(data);
}

export async function updatePlaylist(id: number, data: Partial<InsertPlaylist>) {
  const db = await getDb();
  if (!db) return;
  await db.update(playlists).set(data).where(eq(playlists.id, id));
}

export async function deletePlaylist(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(playlistContents).where(eq(playlistContents.playlistId, id));
  await db.delete(playlists).where(eq(playlists.id, id));
}

export async function getPlaylistContents(playlistId: number) {
  const db = await getDb();
  if (!db) return [];
  const pcs = await db.select().from(playlistContents).where(eq(playlistContents.playlistId, playlistId)).orderBy(asc(playlistContents.sortOrder));
  if (pcs.length === 0) return [];
  const contentIds = pcs.map(pc => pc.contentId);
  const allContents = await db.select().from(contents).where(sql`${contents.id} IN (${sql.join(contentIds.map(id => sql`${id}`), sql`, `)})`);
  // Preserve sort order
  return pcs.map(pc => allContents.find(c => c.id === pc.contentId)).filter(Boolean);
}

export async function addContentToPlaylist(playlistId: number, contentId: number, sortOrder: number = 0) {
  const db = await getDb();
  if (!db) return;
  await db.insert(playlistContents).values({ playlistId, contentId, sortOrder });
}

export async function removeContentFromPlaylist(playlistId: number, contentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(playlistContents).where(and(eq(playlistContents.playlistId, playlistId), eq(playlistContents.contentId, contentId)));
}

// ─── Dashboard Stats ─────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { users: 0, contents: 0, subscribers: 0, activeSubscriptions: 0 };
  const [u, c, ns, as_] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(contents).where(eq(contents.status, "published")),
    db.select({ count: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.isActive, true)),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
  ]);
  return {
    users: u[0]?.count ?? 0,
    contents: c[0]?.count ?? 0,
    subscribers: ns[0]?.count ?? 0,
    activeSubscriptions: as_[0]?.count ?? 0,
  };
}

export async function getActivePlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.isActive, true))).limit(1);
  return r[0];
}
