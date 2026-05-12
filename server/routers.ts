import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Content (public) ──────────────────────────────
  content: router({
    listPublished: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().min(0).optional(),
        categoryId: z.number().optional(),
        search: z.string().optional(),
        contentType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listPublishedContents(input ?? {});
      }),

    countPublished: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        contentType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getPublishedContentCount(input ?? {});
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const content = await db.getContentBySlug(input.slug);
        if (content) await db.incrementViewCount(content.id);
        return content ?? null;
      }),
  }),

  // ─── Categories (public) ──────────────────────────
  category: router({
    list: publicProcedure.query(async () => {
      return db.listCategories();
    }),
  }),

  // ─── Plans (public) ───────────────────────────────
  plan: router({
    listActive: publicProcedure.query(async () => {
      return db.listActivePlans();
    }),
  }),

  // ─── Telegram (protected - subscriber only) ───────
  telegram: router({
    getInvite: protectedProcedure.query(async ({ ctx }) => {
      // Check if user has active subscription
      const sub = await db.getUserActiveSubscription(ctx.user.id);
      if (!sub) return { hasAccess: false, settings: null };
      const settings = await db.getTelegramSettings();
      if (!settings) return { hasAccess: true, settings: null };
      return { hasAccess: true, settings: { inviteLink: settings.inviteLink, channelName: settings.channelName, description: settings.description } };
    }),
  }),

  // ─── Subscription (protected) ─────────────────────
  subscription: router({
    mySubscription: protectedProcedure.query(async ({ ctx }) => {
      const sub = await db.getUserActiveSubscription(ctx.user.id);
      return sub ?? null;
    }),

    create: protectedProcedure
      .input(z.object({
        planId: z.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const plan = await db.getActivePlanById(input.planId);
        if (!plan) throw new Error("플랜을 찾을 수 없습니다.");

        const amount = input.billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
        const orderId = `NICS_${ctx.user.id}_${input.planId}_${Date.now()}`;

        await db.createSubscription({
          userId: ctx.user.id,
          planId: input.planId,
          billingCycle: input.billingCycle,
          status: "pending",
        });

        return {
          success: true,
          orderId,
          amount,
          orderName: `닉스의 스몰톡 ${plan.name} (${input.billingCycle === "monthly" ? "월간" : "연간"})`,
          customerKey: `user_${ctx.user.id}`,
        };
      }),

    issueBillingKey: protectedProcedure
      .input(z.object({
        authKey: z.string(),
        customerKey: z.string(),
      }))
      .mutation(async ({ input }) => {
        const payment = await import("./payment");
        if (!payment.isTossConfigured()) {
          return { success: false, message: "결제 시스템이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요." };
        }
        const result = await payment.issueBillingKey(input);
        return { success: true, billingKey: result.billingKey, cardCompany: result.cardCompany, cardNumber: result.cardNumber };
      }),

    approvePayment: protectedProcedure
      .input(z.object({
        billingKey: z.string(),
        customerKey: z.string(),
        amount: z.number(),
        orderId: z.string(),
        orderName: z.string(),
        planId: z.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const payment = await import("./payment");
        if (!payment.isTossConfigured()) {
          return { success: false, message: "결제 시스템이 아직 설정되지 않았습니다." };
        }
        const result = await payment.approveBillingPayment({
          billingKey: input.billingKey,
          customerKey: input.customerKey,
          amount: input.amount,
          orderId: input.orderId,
          orderName: input.orderName,
        });

        const now = new Date();
        const endDate = new Date(now);
        if (input.billingCycle === "monthly") endDate.setMonth(endDate.getMonth() + 1);
        else endDate.setFullYear(endDate.getFullYear() + 1);

        await db.createSubscription({
          userId: ctx.user.id,
          planId: input.planId,
          billingCycle: input.billingCycle,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
          pgProvider: "tosspayments",
        });

        await db.createPayment({
          userId: ctx.user.id,
          subscriptionId: null,
          amount: result.totalAmount,
          pgProvider: "tosspayments",
          pgPaymentId: result.paymentKey,
          pgOrderId: input.orderId,
          status: "completed",
        });

        return { success: true, paymentKey: result.paymentKey };
      }),

    paymentStatus: publicProcedure.query(async () => {
      const payment = await import("./payment");
      return { isConfigured: payment.isTossConfigured() };
    }),

    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const sub = await db.getUserActiveSubscription(ctx.user.id);
      if (sub) {
        await db.updateSubscription(sub.id, { status: "cancelled", cancelledAt: new Date() });
      }
      return { success: true };
    }),
  }),

  // ─── Playlists (public) ───────────────────────────
  playlist: router({
    listPublic: publicProcedure.query(async () => {
      return db.listPublicPlaylists();
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getPlaylistBySlug(input.slug) ?? null;
      }),

    getContents: publicProcedure
      .input(z.object({ playlistId: z.number() }))
      .query(async ({ input }) => {
        return db.getPlaylistContents(input.playlistId);
      }),
  }),

  // ─── Admin ────────────────────────────────────────
  admin: router({
    dashboard: adminProcedure.query(async () => {
      return db.getDashboardStats();
    }),

    // Content CRUD
    listContents: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listAllContents(input ?? {});
      }),

    contentCount: adminProcedure.query(async () => {
      return db.getAllContentCount();
    }),

    createContent: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        excerpt: z.string().optional(),
        body: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        contentType: z.enum(["article", "video"]),
        videoUrl: z.string().optional(),
        accessLevel: z.enum(["free", "paid"]),
        status: z.enum(["draft", "published", "archived"]),
        categoryId: z.number().optional(),
        tags: z.string().optional(),
        publishedAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const data = { ...input, authorId: ctx.user.id };
        if (input.status === "published" && !input.publishedAt) {
          (data as any).publishedAt = new Date();
        }
        await db.createContent(data);

        if (input.status === "published") {
          await notifyOwner({
            title: `새 콘텐츠 발행`,
            content: `"${input.title}" 콘텐츠가 발행되었습니다.`,
          }).catch(() => {});
        }

        return { success: true };
      }),

    updateContent: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        slug: z.string().optional(),
        excerpt: z.string().optional(),
        body: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        contentType: z.enum(["article", "video"]).optional(),
        videoUrl: z.string().optional(),
        accessLevel: z.enum(["free", "paid"]).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        categoryId: z.number().nullable().optional(),
        tags: z.string().nullable().optional(),
        publishedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.status === "published" && !data.publishedAt) {
          (data as any).publishedAt = new Date();
        }
        await db.updateContent(id, data as any);
        return { success: true };
      }),

    deleteContent: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContent(input.id);
        return { success: true };
      }),

    // Category CRUD
    listCategories: adminProcedure.query(async () => {
      return db.listCategories();
    }),

    createCategory: adminProcedure
      .input(z.object({ name: z.string(), slug: z.string(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),

    updateCategory: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, data);
        return { success: true };
      }),

    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),

    // Plan CRUD
    listPlans: adminProcedure.query(async () => {
      return db.listAllPlans();
    }),

    createPlan: adminProcedure
      .input(z.object({
        name: z.string(), description: z.string().optional(),
        priceMonthly: z.number(), priceYearly: z.number(),
        features: z.any().optional(), sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createPlan(input);
        return { success: true };
      }),

    updatePlan: adminProcedure
      .input(z.object({
        id: z.number(), name: z.string().optional(), description: z.string().optional(),
        priceMonthly: z.number().optional(), priceYearly: z.number().optional(),
        features: z.any().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePlan(id, data);
        return { success: true };
      }),

    deletePlan: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePlan(input.id);
        return { success: true };
      }),

    // Subscribers
    listUsers: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllUsers(input ?? {});
      }),

    userCount: adminProcedure.query(async () => {
      return db.getUserCount();
    }),

    listSubscriptions: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listAllSubscriptions(input ?? {});
      }),

    subscriberCount: adminProcedure.query(async () => {
      return db.getActiveSubscriberCount();
    }),

    // Telegram settings
    getTelegramSettings: adminProcedure.query(async () => {
      const settings = await db.getTelegramSettings();
      return settings ?? { inviteLink: null, channelName: null, description: null };
    }),

    updateTelegramSettings: adminProcedure
      .input(z.object({
        inviteLink: z.string().min(1).refine(
          (val) => val.startsWith("https://t.me/") || val.startsWith("https://telegram.me/") || val.startsWith("http"),
          { message: "유효한 텔레그램 링크를 입력해 주세요 (https://t.me/...)" }
        ),
        channelName: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertTelegramSettings(input);
        return { success: true };
      }),

    // Playlists
    listPlaylists: adminProcedure.query(async () => {
      return db.listAllPlaylists();
    }),

    createPlaylist: adminProcedure
      .input(z.object({ title: z.string(), slug: z.string(), description: z.string().optional(), thumbnailUrl: z.string().optional(), isPublic: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.createPlaylist(input);
        return { success: true };
      }),

    updatePlaylist: adminProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), slug: z.string().optional(), description: z.string().optional(), thumbnailUrl: z.string().optional(), isPublic: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePlaylist(id, data);
        return { success: true };
      }),

    deletePlaylist: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePlaylist(input.id);
        return { success: true };
      }),

    addContentToPlaylist: adminProcedure
      .input(z.object({ playlistId: z.number(), contentId: z.number(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.addContentToPlaylist(input.playlistId, input.contentId, input.sortOrder);
        return { success: true };
      }),

    removeContentFromPlaylist: adminProcedure
      .input(z.object({ playlistId: z.number(), contentId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeContentFromPlaylist(input.playlistId, input.contentId);
        return { success: true };
      }),

    // Image Upload
    uploadImage: adminProcedure
      .input(z.object({
        filename: z.string(),
        data: z.string(), // base64 data URL
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const base64Data = input.data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.filename.split(".").pop() || "png";
        const key = `content-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    uploadFile: adminProcedure
      .input(z.object({
        filename: z.string(),
        data: z.string(), // base64 data URL
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const base64Data = input.data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.filename.split(".").pop() || "bin";
        const key = `content-files/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, filename: input.filename };
      }),

    // Payments
    listPayments: adminProcedure
      .input(z.object({ userId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listPayments(input ?? {});
      }),
  }),
});

export type AppRouter = typeof appRouter;
