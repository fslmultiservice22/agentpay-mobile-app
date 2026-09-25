import type { Request, RequestHandler } from "express";

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 120;
export const RATE_LIMIT_MAX_AUTH_REQUESTS = 20;
export const RATE_LIMIT_MAX_MONITOR_REFRESH_REQUESTS = 5;

const MAX_TRACKED_BUCKETS = 10_000;

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  now?: () => number;
};

function requestLimit(pathname: string, fallback: number): number {
  if (pathname.startsWith("/api/oauth/") || pathname.startsWith("/api/auth/")) {
    return RATE_LIMIT_MAX_AUTH_REQUESTS;
  }

  if (pathname === "/api/operational-monitor/refresh") {
    return RATE_LIMIT_MAX_MONITOR_REFRESH_REQUESTS;
  }

  return fallback;
}

function requestKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Limite anti-abuso per singola istanza. Il gateway può applicare limiti
 * aggiuntivi; questa protezione evita che il backend resti privo di un gate.
 */
export function createApiRateLimitMiddleware(options: RateLimitOptions = {}): RequestHandler {
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const fallbackMax = options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();
  let requestCounter = 0;

  return (req, res, next) => {
    const currentTime = now();
    const limit = requestLimit(req.path, fallbackMax);
    const key = `${requestKey(req)}:${req.path.startsWith("/api/oauth/") || req.path.startsWith("/api/auth/") ? "auth" : req.path}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, limit - bucket.count);
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    requestCounter += 1;
    if (requestCounter % 100 === 0 || buckets.size > MAX_TRACKED_BUCKETS) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= currentTime) buckets.delete(bucketKey);
      }
    }

    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))));
      res.status(429).json({ success: false, error: "Troppe richieste, riprovare più tardi" });
      return;
    }

    next();
  };
}
