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

  // ─── Subscription (protected) ─────────────────────
  subscription: router({
    mySubscription: protectedProcedure.query(async ({ ctx }) => {
      const sub = await db.getUserActiveSubscription(ctx.user.id);
      return sub ?? null;
    }),

    // 결제 준비: 구독 생성 + 결제 정보 반환
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

    // 빌링키 발급 (토스 SDK에서 받은 authKey로)
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

    // 결제 승인 (빌링키로 실제 결제)
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

        // 결제 성공 시 구독 활성화
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

    // 결제 시스템 상태 확인
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

  // ─── Newsletter (public/protected) ────────────────
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        await db.subscribeNewsletter(input.email, ctx.user?.id);
        return { success: true };
      }),

    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await db.unsubscribeNewsletter(input.email);
        return { success: true };
      }),
  }),

  // ─── Chat (public) ────────────────────────────────
  chat: router({
    getOrCreateSession: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        userName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.getOrCreateChatSession(input.sessionId, ctx.user?.id, input.userName ?? ctx.user?.name ?? undefined) ?? null;
      }),

    getMessages: publicProcedure
      .input(z.object({ sessionId: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getChatMessages(input.sessionId, { limit: input.limit });
      }),

    sendMessage: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string().min(1),
        senderType: z.enum(["user", "admin", "system"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.sendChatMessage({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          senderType: input.senderType,
          message: input.message,
        });
        return { success: true };
      }),

    markRead: publicProcedure
      .input(z.object({ sessionId: z.string(), senderType: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await db.markMessagesRead(input.sessionId, input.senderType);
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
        publishedAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const data = { ...input, authorId: ctx.user.id };
        if (input.status === "published" && !input.publishedAt) {
          (data as any).publishedAt = new Date();
        }
        await db.createContent(data);

        // 콘텐츠 발행 시 자동 뉴스레터 발송 + 오너 알림
        if (input.status === "published" && input.accessLevel === "free") {
          try {
            const subscribers = await db.listNewsletterSubscribers();
            if (subscribers.length > 0) {
              await db.createNewsletter({
                subject: `[닉스의 스몰톡] ${input.title}`,
                body: `새로운 콘텐츠가 발행되었습니다: ${input.title}\n\n${input.excerpt ?? ""}`,
                sentCount: subscribers.length,
                status: "sent",
                sentAt: new Date(),
              });
              // 오너에게 뉴스레터 발송 알림
              await notifyOwner({
                title: `뉴스레터 자동 발송 완료`,
                content: `"${input.title}" 콘텐츠 발행에 따른 뉴스레터가 ${subscribers.length}명의 구독자에게 발송되었습니다.`,
              }).catch(() => {});
            }
          } catch (e) {
            console.error("Auto newsletter failed:", e);
          }
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
        publishedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.status === "published" && !data.publishedAt) {
          (data as any).publishedAt = new Date();
        }
        // 초안→발행 전환 시 자동 뉴스레터 발송
        const existing = await db.getContentById(id);
        await db.updateContent(id, data as any);

        if (data.status === "published" && existing?.status !== "published" && (data.accessLevel ?? existing?.accessLevel) === "free") {
          try {
            const subscribers = await db.listNewsletterSubscribers();
            if (subscribers.length > 0) {
              await db.createNewsletter({
                subject: `[닉스의 스몰톡] ${data.title ?? existing?.title}`,
                body: `새로운 콘텐츠가 발행되었습니다: ${data.title ?? existing?.title}\n\n${data.excerpt ?? existing?.excerpt ?? ""}`,
                sentCount: subscribers.length,
                status: "sent",
                sentAt: new Date(),
              });
            }
          } catch (e) {
            console.error("Auto newsletter failed:", e);
          }
        }

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

    // Newsletter
    listNewsletters: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listNewsletters(input ?? {});
      }),

    createNewsletter: adminProcedure
      .input(z.object({ subject: z.string(), body: z.string(), recipientType: z.enum(["all", "subscribers", "free"]).optional() }))
      .mutation(async ({ input }) => {
        await db.createNewsletter(input);
        return { success: true };
      }),

    updateNewsletter: adminProcedure
      .input(z.object({ id: z.number(), subject: z.string().optional(), body: z.string().optional(), status: z.enum(["draft", "scheduled", "sent"]).optional(), recipientType: z.enum(["all", "subscribers", "free"]).optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateNewsletter(id, data);
        return { success: true };
      }),

    deleteNewsletter: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteNewsletter(input.id);
        return { success: true };
      }),

    sendNewsletter: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateNewsletter(input.id, { status: "sent" });
        return { success: true };
      }),

    listNewsletterSubscribers: adminProcedure
      .input(z.object({ activeOnly: z.boolean().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listNewsletterSubscribers(input ?? {});
      }),

    newsletterSubscriberCount: adminProcedure.query(async () => {
      return db.getNewsletterSubscriberCount();
    }),

    // Chat sessions
    listChatSessions: adminProcedure
      .input(z.object({ status: z.enum(["open", "closed"]).optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listChatSessions(input ?? {});
      }),

    closeChatSession: adminProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.closeChatSession(input.sessionId);
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

    // Payments
    listPayments: adminProcedure
      .input(z.object({ userId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listPayments(input ?? {});
      }),
  }),
});

export type AppRouter = typeof appRouter;
