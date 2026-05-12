import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── 토스페이먼츠 웹훅 (raw body 필요 → JSON 파서 전에 등록) ──
  app.post("/api/payment/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const { verifyWebhookSignature, isTossConfigured } = await import("../payment");
        const { getDb } = await import("../db");
        const { payments, subscriptions } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        if (!isTossConfigured()) {
          return res.status(503).json({ error: "Payment system not configured" });
        }

        // raw body 기반 서명 검증
        const rawBody = req.body instanceof Buffer ? req.body.toString("utf-8") : String(req.body);
        const signature = req.headers["toss-signature"] as string;

        if (!signature) {
          console.warn("[Webhook] Missing toss-signature header");
          return res.status(400).json({ error: "Missing signature" });
        }

        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn("[Webhook] Invalid signature");
          return res.status(400).json({ error: "Invalid signature" });
        }

        const parsed = JSON.parse(rawBody);
        const { eventType, data } = parsed;
        const db = await getDb();
        if (!db) return res.status(500).json({ error: "DB unavailable" });

        switch (eventType) {
          // ── 결제 상태 변경 ──
          case "PAYMENT_STATUS_CHANGED": {
            if (data.orderId && data.status) {
              const newStatus = data.status === "DONE" ? "completed"
                : data.status === "CANCELED" ? "refunded"
                : "failed";
              await db.update(payments)
                .set({ status: newStatus })
                .where(eq(payments.pgOrderId, data.orderId));
              console.log(`[Webhook] Payment ${data.orderId} → ${newStatus}`);
            }
            break;
          }

          // ── 정기결제 성공 (자동 갱신 결제 완료) ──
          case "BILLING_PAYMENT_APPROVED": {
            if (data.billingKey && data.orderId) {
              // 구독 기간 연장
              const now = new Date();
              const nextMonth = new Date(now);
              nextMonth.setMonth(nextMonth.getMonth() + 1);

              await db.update(subscriptions)
                .set({
                  status: "active",
                  currentPeriodStart: now,
                  currentPeriodEnd: nextMonth,
                })
                .where(eq(subscriptions.pgSubscriptionId, data.billingKey));

              // 결제 기록 업데이트
              if (data.orderId) {
                await db.update(payments)
                  .set({ status: "completed" })
                  .where(eq(payments.pgOrderId, data.orderId));
              }
              console.log(`[Webhook] Billing renewal approved: ${data.billingKey}`);
            }
            break;
          }

          // ── 정기결제 실패 ──
          case "BILLING_PAYMENT_FAILED": {
            if (data.billingKey) {
              await db.update(subscriptions)
                .set({ status: "pending" })
                .where(eq(subscriptions.pgSubscriptionId, data.billingKey));
              console.log(`[Webhook] Billing payment failed: ${data.billingKey}`);
            }
            break;
          }

          // ── 빌링키 만료/해지 ──
          case "BILLING_STATUS_CHANGED": {
            if (data.billingKey) {
              const newStatus = data.status === "EXPIRED" ? "expired"
                : data.status === "CANCELED" ? "cancelled"
                : "expired";
              await db.update(subscriptions)
                .set({ status: newStatus })
                .where(eq(subscriptions.pgSubscriptionId, data.billingKey));
              console.log(`[Webhook] Billing status → ${newStatus}: ${data.billingKey}`);
            }
            break;
          }

          default:
            console.log(`[Webhook] Unhandled event: ${eventType}`);
        }

        res.json({ success: true });
      } catch (error) {
        console.error("[Webhook] Error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── Scheduled: Publish due contents ──
  app.post("/api/scheduled/publish-due", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
      const { publishDueContents } = await import("../db");
      const result = await publishDueContents();
      console.log(`[Scheduled] Published ${result.published} due contents`);
      res.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("[Scheduled] publish-due error:", error);
      res.status(500).json({
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
