import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosMock = vi.hoisted(() => ({
  create: vi.fn(),
  post: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: axiosMock.create,
  },
}));

describe("confine dell'upstream OAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    axiosMock.create.mockReset();
    axiosMock.post.mockReset();
    axiosMock.create.mockReturnValue({ post: axiosMock.post });
  });

  it("non invia POST con URL OAuth configurato invalido", async () => {
    const { ENV } = await import("../_core/env");
    ENV.oAuthServerUrl = "https://oauth.manus.im.evil.example";
    ENV.appId = "test-app";
    const { sdk } = await import("../_core/sdk");

    await expect(sdk.exchangeCodeForToken("code", "state")).rejects.toThrow(
      /not a trusted HTTPS OAuth origin/,
    );
    await expect(sdk.getUserInfo("access-token")).rejects.toThrow(
      /not a trusted HTTPS OAuth origin/,
    );
    await expect(sdk.getUserInfoWithJwt("jwt-token")).rejects.toThrow(
      /not a trusted HTTPS OAuth origin/,
    );

    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it("crea il client OAuth con redirect disabilitati per l'origine valida", async () => {
    const { ENV } = await import("../_core/env");
    ENV.oAuthServerUrl = "https://oauth.manus.im";
    ENV.appId = "test-app";
    const { sdk } = await import("../_core/sdk");

    expect(axiosMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://oauth.manus.im",
        maxRedirects: 0,
      }),
    );
    expect(sdk).toBeDefined();
  });
});
