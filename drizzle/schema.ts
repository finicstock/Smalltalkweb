import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, json } from "drizzle-orm/mysql-core";
/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/**
 * Categories for organizing content
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
/**
 * Content items (articles, videos)
 */
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  excerpt: text("excerpt"),
  body: text("body"),
  thumbnailUrl: text("thumbnailUrl"),
  contentType: mysqlEnum("contentType", ["article", "video"]).default("article").notNull(),
  videoUrl: text("videoUrl"),
  accessLevel: mysqlEnum("accessLevel", ["free", "paid"]).default("free").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  categoryId: int("categoryId"),
  authorId: int("authorId"),
  viewCount: int("viewCount").default(0).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Content = typeof contents.$inferSelect;
export type InsertContent = typeof contents.$inferInsert;
/**
 * Subscription plans (monthly, yearly)
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: int("priceMonthly").notNull(),
  priceYearly: int("priceYearly").notNull(),
  features: json("features"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;
/**
 * User subscriptions
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "pending"]).default("pending").notNull(),
  pgProvider: varchar("pgProvider", { length: 50 }),
  pgSubscriptionId: varchar("pgSubscriptionId", { length: 200 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
/**
 * Payment history
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("KRW").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  pgProvider: varchar("pgProvider", { length: 50 }),
  pgPaymentId: varchar("pgPaymentId", { length: 200 }),
  pgOrderId: varchar("pgOrderId", { length: 200 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
/**
 * Telegram settings for premium subscriber access
 */
export const telegramSettings = mysqlTable("telegram_settings", {
  id: int("id").autoincrement().primaryKey(),
  inviteLink: varchar("inviteLink", { length: 500 }).notNull(),
  channelName: varchar("channelName", { length: 200 }),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TelegramSetting = typeof telegramSettings.$inferSelect;
export type InsertTelegramSetting = typeof telegramSettings.$inferInsert;
/**
 * Playlists for organizing content series
 */
export const playlists = mysqlTable("playlists", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  isPublic: boolean("isPublic").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = typeof playlists.$inferInsert;
/**
 * Many-to-many: playlist <-> content
 */
export const playlistContents = mysqlTable("playlist_contents", {
  id: int("id").autoincrement().primaryKey(),
  playlistId: int("playlistId").notNull(),
  contentId: int("contentId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});
export type PlaylistContent = typeof playlistContents.$inferSelect;
export type InsertPlaylistContent = typeof playlistContents.$inferInsert;
