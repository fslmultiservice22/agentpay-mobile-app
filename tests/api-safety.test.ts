import { describe, expect, it } from "vitest";

import {
  API_BODY_LIMIT,
  API_CONTENT_SECURITY_POLICY,
  applyApiSafetyHeaders,
  getApiErrorResponse,
} from "../server/_core/api-safety";

describe("API safety defaults", () => {
  it("uses a bounded request body limit", () => {
    expect(API_BODY_LIMIT).toBe("1mb");
  });

  it("maps malformed and oversized requests to safe errors", () => {
    expect(getApiErrorResponse({ type: "entity.too.large" })).toEqual({ status: 413, message: "Richiesta troppo grande" });
    expect(getApiErrorResponse(new SyntaxError("invalid JSON"))).toEqual({ status: 400, message: "Richiesta non valida" });
    expect(getApiErrorResponse(new Error("internal detail"))).toEqual({ status: 500, message: "Errore tecnico interno" });
  });

  it("applies defensive headers suitable for JSON-only API responses", () => {
    const headers = new Map<string, string>();
    applyApiSafetyHeaders({ setHeader: (name: string, value: string) => headers.set(name, value) } as any);

    expect(headers.get("Content-Security-Policy")).toBe(API_CONTENT_SECURITY_POLICY);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("payment=()");
    expect(headers.get("Cache-Control")).toBe("no-store");
  });
});
