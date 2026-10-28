import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "pending_oauth_state";
const nativeStore = new Map<string, string>();
const secureStore = {
  getItemAsync: vi.fn(async (key: string) => nativeStore.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    nativeStore.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    nativeStore.delete(key);
  }),
};

vi.mock("expo-secure-store", () => secureStore);
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const { Platform } = await import("react-native");
const {
  consumePendingOAuthState,
  hasPendingOAuthState,
  savePendingOAuthState,
} = await import("../lib/oauth-pending-state");

type TestStorage = Storage & { values: Map<string, string> };

function makeWebStorage(): TestStorage {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    get length() {
      return values.size;
    },
  } as TestStorage;
}

let webStorage: TestStorage;

function useWebStorage(): void {
  (Platform as { OS: string }).OS = "web";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: webStorage },
  });
}

function useNativeStorage(): void {
  (Platform as { OS: string }).OS = "ios";
  Reflect.deleteProperty(globalThis, "window");
}

beforeEach(() => {
  vi.useRealTimers();
  nativeStore.clear();
  webStorage = makeWebStorage();
  vi.clearAllMocks();
  useNativeStorage();
});

describe("pending OAuth state", () => {
  it("verifies a matching state without consuming it before the exchange", async () => {
    await savePendingOAuthState("expected");

    expect(await hasPendingOAuthState("expected")).toBe(true);
    expect(nativeStore.has(KEY)).toBe(true);
    expect(await consumePendingOAuthState("expected")).toBe(true);
  });

  it("matches and consumes a state exactly once", async () => {
    await savePendingOAuthState("expected");

    expect(await consumePendingOAuthState("expected")).toBe(true);
    expect(await consumePendingOAuthState("expected")).toBe(false);
    expect(nativeStore.has(KEY)).toBe(false);
  });

  it("preserves a legitimate pending state when a callback mismatches", async () => {
    await savePendingOAuthState("legitimate");

    expect(await consumePendingOAuthState("attacker")).toBe(false);
    expect(await consumePendingOAuthState("legitimate")).toBe(true);
  });

  it("rejects an expired state and cleans it up", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    await savePendingOAuthState("expired");
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(await consumePendingOAuthState("expired")).toBe(false);
    expect(nativeStore.has(KEY)).toBe(false);
    expect(await consumePendingOAuthState("expired")).toBe(false);
  });

  it("rejects malformed stored JSON without accepting the callback", async () => {
    nativeStore.set(KEY, "{not-json");

    expect(await consumePendingOAuthState("anything")).toBe(false);
    expect(nativeStore.has(KEY)).toBe(true);
  });

  it("uses separate web sessionStorage and native SecureStore state", async () => {
    await savePendingOAuthState("native");
    useWebStorage();
    expect(await consumePendingOAuthState("native")).toBe(false);

    await savePendingOAuthState("web");
    expect(webStorage.values.has(KEY)).toBe(true);
    expect(nativeStore.has(KEY)).toBe(true);
    expect(await consumePendingOAuthState("web")).toBe(true);

    useNativeStorage();
    expect(await consumePendingOAuthState("native")).toBe(true);
  });

  it("serializes simultaneous consumes so only one can pass", async () => {
    await savePendingOAuthState("one-time");

    const results = await Promise.all([
      consumePendingOAuthState("one-time"),
      consumePendingOAuthState("one-time"),
    ]);

    expect(results.sort()).toEqual([false, true]);
  });

  it("fails closed when storage reads or deletes throw", async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error("read failure"));
    expect(await consumePendingOAuthState("state")).toBe(false);

    nativeStore.set(KEY, JSON.stringify({ state: "state", expiresAt: Date.now() + 60_000 }));
    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error("delete failure"));
    expect(await consumePendingOAuthState("state")).toBe(false);
  });
});
