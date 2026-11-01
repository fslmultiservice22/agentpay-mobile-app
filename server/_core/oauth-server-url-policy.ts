const TRUSTED_OAUTH_ORIGINS = new Set(["https://oauth.manus.im"]);

/**
 * Validate the OAuth upstream before any authorization code, token, or other
 * credential is sent to it. OAuth is an exact-origin integration: paths,
 * ports, credentials, and redirects are intentionally not accepted.
 */
export function validateOAuthServerUrl(candidate: string | undefined | null): string | null {
  if (!candidate || candidate.trim() !== candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const authority = candidate.slice(candidate.indexOf("://") + 3).split(/[/?#]/, 1)[0];
  const explicitPort = authority.match(/:(\d+)$/)?.[1];

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    explicitPort ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return null;
  }

  const origin = parsed.origin.toLowerCase();
  return TRUSTED_OAUTH_ORIGINS.has(origin) ? origin : null;
}

/** Return the trusted upstream or fail closed before a request can be made. */
export function requireTrustedOAuthServerUrl(candidate: string | undefined | null): string {
  const validated = validateOAuthServerUrl(candidate);
  if (!validated) throw new Error("OAUTH_SERVER_URL is not a trusted HTTPS OAuth origin");
  return validated;
}

export const TRUSTED_OAUTH_SERVER_ORIGINS = [...TRUSTED_OAUTH_ORIGINS];
