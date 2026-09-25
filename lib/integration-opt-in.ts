export type OptionalIntegration = "telegram" | "wallester";

export type IntegrationOptInState = Readonly<{
  telegram: boolean;
  wallester: boolean;
}>;

const DEFAULT_STATE: IntegrationOptInState = {
  telegram: false,
  wallester: false,
};

/**
 * Returns a fresh deny-by-default state. No provider is enabled automatically.
 */
export function getDefaultIntegrationOptIn(): IntegrationOptInState {
  return { ...DEFAULT_STATE };
}

/**
 * Accepts only the literal boolean true as an explicit opt-in signal.
 */
export function isIntegrationOptedIn(
  state: Partial<IntegrationOptInState> | null | undefined,
  integration: OptionalIntegration,
): boolean {
  return state?.[integration] === true;
}

/**
 * Grants one local opt-in without enabling any network capability. Provider
 * credentials, routes and external calls remain outside this policy.
 */
export function grantIntegrationOptIn(
  state: Partial<IntegrationOptInState> | null | undefined,
  integration: OptionalIntegration,
): IntegrationOptInState {
  return {
    ...getDefaultIntegrationOptIn(),
    ...(state ?? {}),
    [integration]: true,
  };
}

export function revokeIntegrationOptIn(
  state: Partial<IntegrationOptInState> | null | undefined,
  integration: OptionalIntegration,
): IntegrationOptInState {
  return {
    ...getDefaultIntegrationOptIn(),
    ...(state ?? {}),
    [integration]: false,
  };
}
