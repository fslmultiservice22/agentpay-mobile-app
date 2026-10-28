import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: { OS: "android" },
  saveState: vi.fn(),
  createURL: vi.fn(() => "agentpay://oauth/callback"),
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-linking", () => ({ createURL: mocks.createURL }));
vi.mock("../lib/oauth-pending-state", () => ({ savePendingOAuthState: mocks.saveState }));

const backend = "https://agentpayapp-q3spezws.manus.space";

describe("OAuth initialization trust boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.platform.OS = "android";
    vi.stubGlobal("__DEV__", false);
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", backend);
    vi.stubEnv("EXPO_PUBLIC_OAUTH_PORTAL_URL", "https://auth.example.test");
    vi.stubEnv("EXPO_PUBLIC_APP_ID", "synthetic-app");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ state: "synthetic-signed-state" }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("saves the minted state before returning the native authorization URL", async () => {
    const { getLoginUrl } = await import("../constants/oauth");
    const url = new URL(await getLoginUrl());
    expect(url.searchParams.get("state")).toBe("synthetic-signed-state");
    expect(url.searchParams.get("redirectUri")).toBe("agentpay://oauth/callback");
    expect(mocks.saveState).toHaveBeenCalledWith("synthetic-signed-state");
    expect(fetch).toHaveBeenCalledWith(`${backend}/api/oauth/state`, expect.objectContaining({
      body: JSON.stringify({ redirectUri: "agentpay://oauth/callback" }),
    }));
  });

  it("rejects an untrusted configured API before any network request or state write", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://attacker.example");
    const { getLoginUrl } = await import("../constants/oauth");
    await expect(getLoginUrl()).rejects.toThrow("API base URL is not trusted");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.saveState).not.toHaveBeenCalled();
  });

  it("uses an absolute callback with a relative state endpoint on trusted same-origin web", async () => {
    mocks.platform.OS = "web";
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "");
    vi.stubGlobal("window", { location: new URL(backend) });
    const { getLoginUrl } = await import("../constants/oauth");
    const url = new URL(await getLoginUrl());
    expect(url.searchParams.get("redirectUri")).toBe(`${backend}/api/oauth/callback`);
    expect(fetch).toHaveBeenCalledWith("/api/oauth/state", expect.any(Object));
  });

  it("does not persist malformed or missing state from the initialization response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ state: {} }) } as Response);
    const { getLoginUrl } = await import("../constants/oauth");
    await expect(getLoginUrl()).rejects.toThrow("OAuth state is missing");
    expect(mocks.saveState).not.toHaveBeenCalled();
  });
});
