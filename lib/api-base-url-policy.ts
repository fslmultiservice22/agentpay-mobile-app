export const PUBLISHED_API_BASE_URL = "https://agentpayapp-q3spezws.manus.space";

const LOCALHOST_API_BASE_URL = "http://localhost:3000";
const PREVIEW_HOST_PATTERN = /^3000-[a-z0-9-]+\.(?:us1|us2)\.manus\.computer$/i;

export type ApiBaseUrlPolicyOptions = {
  isDevelopment?: boolean;
  /** Permit the empty string only when the caller has already established trusted same-origin. */
  allowRelativeFallback?: boolean;
};

/**
 * Validate and normalize a configured API URL. `null` means the value is not
 * trusted; callers must never use the original value after a null result.
 */
export function validateApiBaseUrl(
  candidate: string | undefined | null,
  options: ApiBaseUrlPolicyOptions = {},
): string | null {
  if (!candidate || candidate.trim() !== candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const authority = candidate.slice(candidate.indexOf("://") + 3).split(/[/?#]/, 1)[0];
  const explicitPort = authority.match(/:(\d+)$/)?.[1];

  // URL credentials, paths, queries, fragments, and non-standard ports are
  // deliberately rejected rather than normalized away.
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    (parsed.port && !(parsed.hostname === "localhost" && parsed.port === "3000")) ||
    (explicitPort && !(parsed.hostname === "localhost" && explicitPort === "3000"))
  ) {
    return null;
  }

  const normalized = parsed.origin;
  if (normalized === PUBLISHED_API_BASE_URL) return normalized;
  if (!options.isDevelopment) return null;

  if (normalized === LOCALHOST_API_BASE_URL) return normalized;
  if (parsed.protocol === "https:" && PREVIEW_HOST_PATTERN.test(parsed.hostname)) {
    return normalized;
  }
  return null;
}

/** Whether an origin is the published backend and therefore safe for relative API calls. */
export function isTrustedApiOrigin(origin: string | undefined | null): boolean {
  return validateApiBaseUrl(origin, { isDevelopment: false }) === PUBLISHED_API_BASE_URL;
}

/**
 * Invalid explicit configuration fails closed rather than silently moving a
 * development session to the published backend. An absent configuration uses
 * the known backend, or an explicitly trusted same-origin fallback.
 */
export function resolveApiBaseUrl(
  configured: string | undefined | null,
  options: ApiBaseUrlPolicyOptions = {},
): string {
  if (!configured) return options.allowRelativeFallback ? "" : PUBLISHED_API_BASE_URL;
  const validated = validateApiBaseUrl(configured, options);
  if (!validated) throw new Error("API base URL is not trusted");
  return validated;
}

/** True only for the development-only preview hostname family. */
export function isDevelopmentPreviewHost(hostname: string): boolean {
  return PREVIEW_HOST_PATTERN.test(hostname);
}
