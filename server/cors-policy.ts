import type { RequestHandler } from "express";

const LOCAL_DEVELOPMENT_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081"];
const PUBLISHED_AGENTPAY_ORIGIN = "https://agentpayapp-q3spezws.manus.space";
const TRUSTED_PREVIEW_PATTERN = /^https:\/\/8081-[a-z0-9-]+\.(?:us1|us2)\.manus\.computer$/i;

function configuredOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const developmentOrigins = process.env.NODE_ENV === "production" ? [] : LOCAL_DEVELOPMENT_ORIGINS;

  return [...new Set([...developmentOrigins, PUBLISHED_AGENTPAY_ORIGIN, ...configured])];
}

function allowPreviewOrigins(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isAllowedAgentPayOrigin(
  origin: string | undefined,
  allowedOrigins = configuredOrigins(),
  allowPreview = allowPreviewOrigins(),
): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || (allowPreview && TRUSTED_PREVIEW_PATTERN.test(origin));
}

export function createAgentPayCorsMiddleware(options?: {
  allowedOrigins?: string[];
  allowPreviewOrigins?: boolean;
}): RequestHandler {
  const allowedOrigins = options?.allowedOrigins ?? configuredOrigins();
  const allowPreview = options?.allowPreviewOrigins ?? allowPreviewOrigins();

  return (req, res, next) => {
    const origin = req.header("Origin");
    const originAllowed = isAllowedAgentPayOrigin(origin, allowedOrigins, allowPreview);

    res.vary("Origin");

    if (originAllowed && origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      if (origin && !originAllowed) {
        res.status(403).json({ error: "Origin non consentita" });
        return;
      }
      res.sendStatus(204);
      return;
    }

    next();
  };
}
