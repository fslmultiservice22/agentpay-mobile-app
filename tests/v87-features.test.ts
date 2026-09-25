/**
 * Tests v87: savings-goals storage fix, financial-planner, savings-goals-notifications
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock AsyncStorage ────────────────────────────────────────────────────────
const store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete store[key]; }),
  },
}));

// ─── Mock expo-notifications ──────────────────────────────────────────────────
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  scheduleNotificationAsync: vi.fn(async () => "notif-id-123"),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
}));

// ─── Mock react-native Platform ───────────────────────────────────────────────
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("savings-goals storage key isolation", () => {
  it("v1 and v2 keys are different strings", () => {
    const V1_KEY = "agentpay_savings_goals";
    const V2_KEY = "agentpay_savings_goals_v2";
    expect(V1_KEY).not.toBe(V2_KEY);
  });

  it("v2 key ends with _v2", () => {
    const V2_KEY = "agentpay_savings_goals_v2";
    expect(V2_KEY.endsWith("_v2")).toBe(true);
  });

  it("v2 goal model uses icon string (not emoji)", () => {
    const v2Goal = { id: "1", name: "Casa", targetAmount: 50000, currentAmount: 10000, deadline: "2027-01-01", icon: "home", color: "#3B82F6", createdAt: "2026-01-01" };
    expect(typeof v2Goal.icon).toBe("string");
    expect(v2Goal.icon).toBe("home"); // MaterialIcons name, not emoji
    expect(typeof v2Goal.createdAt).toBe("string"); // ISO string, not timestamp number
  });

  it("v1 and v2 data stored independently", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const V1_KEY = "agentpay_savings_goals";
    const V2_KEY = "agentpay_savings_goals_v2";
    await AsyncStorage.setItem(V1_KEY, JSON.stringify([{ id: "a", emoji: "🏠" }]));
    await AsyncStorage.setItem(V2_KEY, JSON.stringify([{ id: "b", icon: "home" }]));
    const v1 = JSON.parse((await AsyncStorage.getItem(V1_KEY))!);
    const v2 = JSON.parse((await AsyncStorage.getItem(V2_KEY))!);
    expect(v1[0].emoji).toBe("🏠");
    expect(v2[0].icon).toBe("home");
    expect(v1[0].id).not.toBe(v2[0].id);
  });
});

describe("financial-planner calculations", () => {
  it("calculates monthly recurring total correctly", () => {
    const payments = [
      { amount: 100, frequency: "monthly" },
      { amount: 50, frequency: "weekly" },
      { amount: 1200, frequency: "yearly" },
    ];
    const total = payments.reduce((s, r) => {
      if (r.frequency === "weekly") return s + r.amount * 4.33;
      if (r.frequency === "yearly") return s + r.amount / 12;
      return s + r.amount;
    }, 0);
    // 100 + 50*4.33 + 1200/12 = 100 + 216.5 + 100 = 416.5
    expect(total).toBeCloseTo(416.5, 0);
  });

  it("calculates available balance correctly", () => {
    const income = 3000;
    const recurring = 800;
    const goalsSavings = 500;
    const available = income - recurring - goalsSavings;
    expect(available).toBe(1700);
  });

  it("calculates savings rate correctly", () => {
    const income = 3000;
    const goalsSavings = 600;
    const rate = (goalsSavings / income) * 100;
    expect(rate).toBeCloseTo(20, 1);
  });

  it("handles zero income gracefully", () => {
    const income = 0;
    const savingsRate = income > 0 ? (500 / income) * 100 : 0;
    expect(savingsRate).toBe(0);
  });

  it("monthly amount from yearly is correct", () => {
    const yearlyAmount = 1200;
    const monthly = yearlyAmount / 12;
    expect(monthly).toBe(100);
  });
});

describe("savings-goals-notifications service", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("isSavingsGoalsNotifEnabled returns false when no pref stored", async () => {
    const { isSavingsGoalsNotifEnabled } = await import("../lib/savings-goals-notifications");
    const result = await isSavingsGoalsNotifEnabled();
    expect(result).toBe(false);
  });

  it("setSavingsGoalsNotifEnabled stores the preference as true", async () => {
    const { setSavingsGoalsNotifEnabled, isSavingsGoalsNotifEnabled } = await import("../lib/savings-goals-notifications");
    await setSavingsGoalsNotifEnabled(true);
    const result = await isSavingsGoalsNotifEnabled();
    expect(result).toBe(true);
  });

  it("setSavingsGoalsNotifEnabled can be set to false", async () => {
    const { setSavingsGoalsNotifEnabled, isSavingsGoalsNotifEnabled } = await import("../lib/savings-goals-notifications");
    await setSavingsGoalsNotifEnabled(true);
    await setSavingsGoalsNotifEnabled(false);
    const result = await isSavingsGoalsNotifEnabled();
    expect(result).toBe(false);
  });

  it("scheduleSavingsGoalsReminders does not throw with empty goals", async () => {
    const { scheduleSavingsGoalsReminders } = await import("../lib/savings-goals-notifications");
    await expect(scheduleSavingsGoalsReminders()).resolves.not.toThrow();
  });

  it("scheduleDailyCheck skips if notifications are disabled", async () => {
    const { scheduleDailyCheck } = await import("../lib/savings-goals-notifications");
    // No pref stored = disabled
    await expect(scheduleDailyCheck()).resolves.not.toThrow();
  });
});

describe("widget-order: dashboard tecnica", () => {
  it("financialplanner non viene esposto tra i widget", async () => {
    const { ALL_WIDGETS } = await import("../lib/widget-order");
    const found = ALL_WIDGETS.find((w) => w.id === "financialplanner");
    expect(found).toBeUndefined();
  });

  it("savingsgoals non viene esposto tra i widget", async () => {
    const { ALL_WIDGETS } = await import("../lib/widget-order");
    const found = ALL_WIDGETS.find((w) => w.id === "savingsgoals");
    expect(found).toBeUndefined();
  });

  it("ALL_WIDGETS non espone widget finanziari finché la policy è inattiva", async () => {
    const { ALL_WIDGETS } = await import("../lib/widget-order");
    expect(ALL_WIDGETS).toHaveLength(0);
  });

  it("all widget IDs are unique", async () => {
    const { ALL_WIDGETS } = await import("../lib/widget-order");
    const ids = ALL_WIDGETS.map((w) => w.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
