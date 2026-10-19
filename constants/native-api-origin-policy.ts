/**
 * Native credential destinations, approved independently of build URL input.
 * Empty until source/owner/pilot-access gates for a concrete backend are closed.
 * Never populate this list from EXPO_PUBLIC_API_BASE_URL or runtime input.
 * Web same-origin/Metro behavior is handled separately by the resolver.
 */
export const APPROVED_NATIVE_API_ORIGINS: readonly string[] = Object.freeze([]);
