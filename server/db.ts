import { eq, desc, asc, like, or, and, sql, count, gte } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
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
  contentVersions, InsertContentVersion,
  contentTemplates, InsertContentTemplate,
  contentStats, InsertContentStat,
  newsletterSubscribers, InsertNewsletterSubscriber,
  authorProfile, InsertAuthorProfile,
  userPreferences, InsertUserPreference,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: MySql2Database<typeof schema> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL!, { schema, mode: 'default' as const }) as unknown as MySql2Database<typeof schema>;
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

// ─── Content Versions ─────────────────────────────
export async function createContentVersion(data: { contentId: number; title: string; body?: string | null; excerpt?: string | null }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ count: count() }).from(contentVersions).where(eq(contentVersions.contentId, data.contentId));
  const versionNumber = (existing[0]?.count ?? 0) + 1;
  await db.insert(contentVersions).values({ ...data, body: data.body ?? undefined, excerpt: data.excerpt ?? undefined, versionNumber });
}

export async function listContentVersions(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentVersions).where(eq(contentVersions.contentId, contentId)).orderBy(desc(contentVersions.versionNumber));
}

export async function getContentVersion(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(contentVersions).where(eq(contentVersions.id, id)).limit(1);
  return r[0];
}

// ─── Content Templates ─────────────────────────────
export async function listTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentTemplates).orderBy(asc(contentTemplates.sortOrder));
}

export async function createTemplate(data: { name: string; content: string; category?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contentTemplates).values(data);
}

export async function updateTemplate(id: number, data: { name?: string; content?: string; category?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentTemplates).set(data).where(eq(contentTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
}

// ─── Preview Token ─────────────────────────────
export async function setPreviewToken(contentId: number, token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(contents).set({ previewToken: token }).where(eq(contents.id, contentId));
}

export async function getContentByPreviewToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(contents).where(eq(contents.previewToken, token)).limit(1);
  return r[0];
}

// ─── Content Statistics ───────────────────────────────────────────
export async function getContentStats(contentId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return db.query.contentStats.findMany({
    where: and(
      eq(contentStats.contentId, contentId),
      gte(contentStats.date, startDate)
    ),
    orderBy: asc(contentStats.date),
  });
}

export async function getTopContents(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.query.contents.findMany({
    where: eq(contents.status, "published"),
    orderBy: desc(contents.viewCount),
    limit,
  });
}

export async function recordContentView(contentId: number) {
  const db = await getDb();
  if (!db) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await db.query.contentStats.findFirst({
    where: and(
      eq(contentStats.contentId, contentId),
      eq(contentStats.date, today)
    ),
  });
  
  if (existing) {
    await db.update(contentStats)
      .set({ views: existing.views + 1 })
      .where(eq(contentStats.id, existing.id));
  } else {
    await db.insert(contentStats).values({
      contentId: contentId,
      date: today,
      views: 1,
      uniqueVisitors: 1,
    });
  }
  
  // Update content viewCount
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, contentId),
  });
  if (content) {
    await db.update(contents)
      .set({ viewCount: content.viewCount + 1 })
      .where(eq(contents.id, contentId));
  }
}

// ─── Newsletter Subscribers ───────────────────────────────────────
export async function subscribeNewsletter(email: string, name?: string) {
  const db = await getDb();
  if (!db) return;
  return db.insert(newsletterSubscribers).values({
    email,
    isSubscribed: true,
  }).onDuplicateKeyUpdate({
    set: { isSubscribed: true, subscribedAt: new Date() }
  });
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) return;
  return db.update(newsletterSubscribers)
    .set({ isSubscribed: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email));
}

export async function getActiveNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];
  return db.query.newsletterSubscribers.findMany({
    where: eq(newsletterSubscribers.isSubscribed, true),
  });
}

// ─── Author Profile ───────────────────────────────────────────────
export async function getAuthorProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db.query.authorProfile.findFirst({
    where: eq(authorProfile.userId, userId),
  });
}

export async function updateAuthorProfile(userId: number, data: Partial<typeof authorProfile.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAuthorProfile(userId);
  if (existing) {
    return db.update(authorProfile)
      .set(data)
      .where(eq(authorProfile.userId, userId));
  } else {
    return db.insert(authorProfile).values({
      userId,
      ...data,
    });
  }
}

// ─── User Preferences ───────────────────────────────────────────
export async function getUserPreference(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });
}

export async function updateUserPreference(userId: number, theme: "light" | "dark" | "auto") {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserPreference(userId);
  if (existing) {
    return db.update(userPreferences)
      .set({ theme })
      .where(eq(userPreferences.userId, userId));
  } else {
    return db.insert(userPreferences).values({
      userId,
      theme,
    });
  }
}

// ─── Advanced Stats ───────────────────────────────────────────────
export async function getDailyViewStats(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await db.select({
    date: contentStats.date,
    views: sql<number>`SUM(${contentStats.views})`,
  })
    .from(contentStats)
    .where(gte(contentStats.date, since))
    .groupBy(contentStats.date)
    .orderBy(contentStats.date);
  return rows;
}

export async function getSubscriptionConversionRate() {
  const db = await getDb();
  if (!db) return { total: 0, paid: 0, rate: 0 };
  const [totalRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [paidRow] = await db.select({ count: sql<number>`COUNT(DISTINCT ${subscriptions.userId})` })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));
  const total = Number(totalRow?.count ?? 0);
  const paid = Number(paidRow?.count ?? 0);
  return { total, paid, rate: total > 0 ? Math.round((paid / total) * 100) : 0 };
}

export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  const [contentsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(contents).where(eq(contents.status, 'published'));
  const [subscribersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [activeSubsRow] = await db.select({ count: sql<number>`COUNT(DISTINCT ${subscriptions.userId})` }).from(subscriptions).where(eq(subscriptions.status, 'active'));
  const [totalViewsRow] = await db.select({ total: sql<number>`SUM(${contentStats.views})` }).from(contentStats);
  return {
    publishedContents: Number(contentsRow?.count ?? 0),
    totalUsers: Number(subscribersRow?.count ?? 0),
    activeSubscriptions: Number(activeSubsRow?.count ?? 0),
    totalViews: Number(totalViewsRow?.total ?? 0),
  };
}
