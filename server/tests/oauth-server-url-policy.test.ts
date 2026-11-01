import { describe, expect, it } from "vitest";

import {
  requireTrustedOAuthServerUrl,
  TRUSTED_OAUTH_SERVER_ORIGINS,
  validateOAuthServerUrl,
} from "../_core/oauth-server-url-policy";

describe("OAUTH_SERVER_URL policy", () => {
  it("consente solo l'origin OAuth Manus HTTPS allowlisted", () => {
    expect(TRUSTED_OAUTH_SERVER_ORIGINS).toEqual(["https://oauth.manus.im"]);
    expect(validateOAuthServerUrl("https://oauth.manus.im")).toBe("https://oauth.manus.im");
    expect(validateOAuthServerUrl("HTTPS://OAUTH.MANUS.IM")).toBe("https://oauth.manus.im");
  });

  it.each([
    "http://oauth.manus.im",
    "ftp://oauth.manus.im",
    "file:///tmp/oauth",
    "javascript:alert(1)",
  ])("rifiuta protocollo non HTTPS: %s", (candidate) => {
    expect(validateOAuthServerUrl(candidate)).toBeNull();
  });

  it.each([
    "https://localhost",
    "https://localhost:8443",
    "https://127.0.0.1",
    "https://127.0.0.1:443",
    "https://10.0.0.8",
    "https://192.168.1.10",
    "https://172.16.0.4",
    "https://[::1]",
  ])("rifiuta localhost, IP e reti private: %s", (candidate) => {
    expect(validateOAuthServerUrl(candidate)).toBeNull();
  });

  it.each([
    "",
    "not a url",
    "https://",
    "https://oauth.manus.im.evil.example",
    "https://oauth.manus.im/extra",
    "https://oauth.manus.im/oauth?next=https://evil.example",
    "https://oauth.manus.im/#fragment",
    " https://oauth.manus.im",
    "https://oauth.manus.im ",
  ])("rifiuta URL malformati o origin non esatto: %s", (candidate) => {
    expect(validateOAuthServerUrl(candidate)).toBeNull();
  });

  it.each([
    "https://user:password@oauth.manus.im",
    "https://oauth.manus.im:443",
    "https://oauth.manus.im:8443",
  ])("rifiuta credenziali o porte nell'URL: %s", (candidate) => {
    expect(validateOAuthServerUrl(candidate)).toBeNull();
  });

  it("fallisce chiuso con un errore prima dell'uso dell'upstream", () => {
    expect(() => requireTrustedOAuthServerUrl("https://attacker.example")).toThrow(
      "OAUTH_SERVER_URL is not a trusted HTTPS OAuth origin",
    );
    expect(requireTrustedOAuthServerUrl("https://oauth.manus.im")).toBe("https://oauth.manus.im");
  });
});
