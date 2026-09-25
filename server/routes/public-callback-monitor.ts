import type { Express, Request, Response } from "express";

import { sdk } from "../_core/sdk";

const PUBLIC_PLATFORM_ORIGIN = "https://agentpayapp-q3spezws.manus.space";
const CALLBACK_PATHS = ["/api/open-banking/callback", "/api/open-banking/status"] as const;
const REQUEST_TIMEOUT_MS = 8_000;

type CallbackProbe = {
  path: (typeof CALLBACK_PATHS)[number];
  httpStatus: number;
  contentType: string;
  outcome: "inactive_json" | "availability_page" | "unexpected_response" | "request_error";
  safeguardsMatch: boolean;
};

function hasInactiveSafeguards(payload: unknown, requiresAcceptedFlag: boolean): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const status = record.status;
  if (!status || typeof status !== "object") return false;
  const safeguards = status as Record<string, unknown>;
  return (
    (!requiresAcceptedFlag || record.accepted === false) &&
    safeguards.enabled === false &&
    safeguards.networkRequestsAllowed === false &&
    safeguards.consentAllowed === false &&
    safeguards.registrationAllowed === false &&
    safeguards.publicCallbackJsonVerified === true
  );
}

export async function inspectPublicCallback(
  path: (typeof CALLBACK_PATHS)[number],
  request: typeof fetch = fetch,
): Promise<CallbackProbe> {
  try {
    const response = await request(`${PUBLIC_PLATFORM_ORIGIN}${path}`, {
      headers: { accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = (await response.text()).slice(0, 16_384);
    const isJson = contentType.toLowerCase().includes("application/json");

    if (!isJson) {
      return {
        path,
        httpStatus: response.status,
        contentType,
        outcome: body.toLowerCase().includes("site unavailable") ? "availability_page" : "unexpected_response",
        safeguardsMatch: false,
      };
    }

    try {
      const payload: unknown = JSON.parse(body);
      const safeguardsMatch = hasInactiveSafeguards(payload, path.endsWith("/callback"));
      return {
        path,
        httpStatus: response.status,
        contentType,
        outcome: safeguardsMatch ? "inactive_json" : "unexpected_response",
        safeguardsMatch,
      };
    } catch {
      return { path, httpStatus: response.status, contentType, outcome: "unexpected_response", safeguardsMatch: false };
    }
  } catch {
    return { path, httpStatus: 0, contentType: "", outcome: "request_error", safeguardsMatch: false };
  }
}

export function registerPublicCallbackMonitorRoute(app: Express) {
  app.post("/api/scheduled/public-callback-monitor", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const probes = await Promise.all(CALLBACK_PATHS.map((path) => inspectPublicCallback(path)));
      const ready = probes.every((probe) => probe.outcome === "inactive_json" && probe.safeguardsMatch);

      return res.json({
        ok: true,
        checkedAt: new Date().toISOString(),
        ready,
        action: "none",
        probes,
      });
    } catch (error) {
      return res.status(500).json({
        error: "public-callback-monitor-failed",
        context: { url: "/api/scheduled/public-callback-monitor" },
        timestamp: new Date().toISOString(),
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
