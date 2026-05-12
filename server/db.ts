import { eq, desc, asc, like, or, and, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  contents, InsertContent,
  categories, InsertCategory,
  plans, InsertPlan,
  subscriptions, InsertSubscription,
  payments, InsertPayment,
  telegramSettings, InsertTelegramSetting,
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
      console.error("Database connection failed:", error);
      return null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────
export async function upsertUser(data: InsertUser) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(users).where(eq(users.openId, data.openId)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({ ...data, lastSignedIn: new Date() }).where(eq(users.openId, data.openId));
    return existing[0];
  }
  await db.insert(users).values(data);
  const [newUser] = await db.select().from(users).where(eq(users.openId, data.openId)).limit(1);
  return newUser;
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
  const conds: any[] = [eq(contents.status, "published")];
  if (opts.categoryId) conds.push(eq(contents.categoryId, opts.categoryId));
  if (opts.contentType) conds.push(eq(contents.contentType, opts.contentType as any));
  if (opts.search) conds.push(or(like(contents.title, `%${opts.search}%`), like(contents.excerpt, `%${opts.search}%`)));
  return db.select().from(contents).where(and(...conds)).orderBy(desc(contents.publishedAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
}

export async function getPublishedContentCount(opts: { categoryId?: number; search?: string; contentType?: string } = {}) {
  const db = await getDb();
  if (!db) return 0;
  const conds: any[] = [eq(contents.status, "published")];
  if (opts.categoryId) conds.push(eq(contents.categoryId, opts.categoryId));
  if (opts.contentType) conds.push(eq(contents.contentType, opts.contentType as any));
  if (opts.search) conds.push(or(like(contents.title, `%${opts.search}%`), like(contents.excerpt, `%${opts.search}%`)));
  const r = await db.select({ count: count() }).from(contents).where(and(...conds));
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

// ─── Scheduled Publishing ────────────────────────────────────────
export async function publishDueContents() {
  const db = await getDb();
  if (!db) return { published: 0 };
  const now = new Date();
  // Find all draft contents with scheduledAt <= now
  const dueContents = await db.select().from(contents)
    .where(
      and(
        eq(contents.status, "draft"),
        sql`${contents.scheduledAt} IS NOT NULL AND ${contents.scheduledAt} <= ${now}`
      )
    );
  let published = 0;
  for (const item of dueContents) {
    await db.update(contents)
      .set({ status: "published", publishedAt: now, scheduledAt: null })
      .where(eq(contents.id, item.id));
    published++;
  }
  return { published, items: dueContents.map(c => ({ id: c.id, title: c.title })) };
}

// ─── Plans ───────────────────────────────────────────────────
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

export async function getActivePlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.isActive, true))).limit(1);
  return r[0];
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

// ─── Telegram Settings ───────────────────────────────
export async function getTelegramSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(telegramSettings).where(eq(telegramSettings.isActive, true)).limit(1);
  return r[0];
}

export async function upsertTelegramSettings(data: { inviteLink: string; channelName?: string; description?: string }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(telegramSettings).limit(1);
  if (existing.length > 0) {
    await db.update(telegramSettings).set({ ...data, updatedAt: new Date() }).where(eq(telegramSettings.id, existing[0].id));
  } else {
    await db.insert(telegramSettings).values({ ...data, isActive: true });
  }
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
  if (!db) return { users: 0, contents: 0, activeSubscriptions: 0 };
  const [u, c, as_] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(contents).where(eq(contents.status, "published")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
  ]);
  return {
    users: u[0]?.count ?? 0,
    contents: c[0]?.count ?? 0,
    activeSubscriptions: as_[0]?.count ?? 0,
  };
}
