import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "test-user-001", email: "user@test.com",
    name: "Test User", loginMethod: "manus", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 99, openId: "admin-001", role: "admin", name: "Admin" });
}

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
  it("returns user data for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-001");
  });
});

describe("content.listPublished", () => {
  it("returns a list for public access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.listPublished({});
    expect(Array.isArray(result)).toBe(true);
  });
  it("accepts pagination parameters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.listPublished({ limit: 5, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
  });
  it("filters by non-existent category returns empty", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.listPublished({ categoryId: 999 });
    expect(result.length).toBe(0);
  });
  it("filters by search query", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.listPublished({ search: "xyznonexistent" });
    expect(result.length).toBe(0);
  });
});

describe("content.getBySlug", () => {
  it("returns null for non-existent slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.getBySlug({ slug: "non-existent-slug-12345" });
    expect(result).toBeNull();
  });
});

describe("category.list", () => {
  it("returns a list of categories", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.category.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("plan.listActive", () => {
  it("returns a list of active plans", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.plan.listActive();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("telegram.getInvite", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.telegram.getInvite()).rejects.toThrow();
  });
  it("returns hasAccess false for non-subscriber", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.telegram.getInvite();
    expect(result.hasAccess).toBe(false);
  });
});

describe("subscription.mySubscription", () => {
  it("returns null for non-subscribed user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.subscription.mySubscription();
    expect(result).toBeNull();
  });
});

describe("admin procedures", () => {
  it("rejects non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.dashboard()).rejects.toThrow();
  });
  it("allows admin to access dashboard", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.dashboard();
    expect(result).toBeDefined();
    expect(typeof result.users).toBe("number");
    expect(typeof result.contents).toBe("number");
    expect(typeof result.activeSubscriptions).toBe("number");
  });
  it("allows admin to list contents", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.listContents({});
    expect(Array.isArray(result)).toBe(true);
  });
  it("allows admin to list categories", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.listCategories();
    expect(Array.isArray(result)).toBe(true);
  });
  it("allows admin to list plans", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.listPlans();
    expect(Array.isArray(result)).toBe(true);
  });
  it("allows admin to list subscriptions", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.listSubscriptions();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("payment module", () => {
  it("verifyWebhookSignature returns false without key", async () => {
    const { verifyWebhookSignature } = await import("./payment");
    expect(verifyWebhookSignature("body", "sig")).toBe(false);
  });
  it("isTossConfigured returns false without key", async () => {
    const { isTossConfigured } = await import("./payment");
    expect(isTossConfigured()).toBe(false);
  });
  it("generateOrderId creates valid format", async () => {
    const { generateOrderId } = await import("./payment");
    expect(generateOrderId(1, 2)).toMatch(/^NICS_1_2_\d+$/);
  });
  it("calculateSubscriptionAmount returns correct amounts", async () => {
    const { calculateSubscriptionAmount } = await import("./payment");
    expect(calculateSubscriptionAmount(29900, 299000, "monthly")).toBe(29900);
    expect(calculateSubscriptionAmount(29900, 299000, "yearly")).toBe(299000);
  });
});

describe("content.countPublished", () => {
  it("returns a count number", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.countPublished({});
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("content.getBySlug - existing content", () => {
  it("returns content for existing slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.getBySlug({ slug: "etf-beginner-guide" });
    expect(result).toBeDefined();
    expect(result?.title).toContain("ETF");
    expect(result?.accessLevel).toBe("free");
  });
  it("returns paid content with paywall info", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.content.getBySlug({ slug: "market-outlook-2026-h1" });
    expect(result).toBeDefined();
    expect(result?.accessLevel).toBe("paid");
  });
});

describe("playlist.listPublic", () => {
  it("returns a list of public playlists", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.playlist.listPublic();
    expect(Array.isArray(result)).toBe(true);
  });
});
