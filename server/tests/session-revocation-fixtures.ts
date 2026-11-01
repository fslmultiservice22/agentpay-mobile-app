import type { SessionTokenRevocationPersistence } from "../_core/sdk";

export type MemorySessionTokenRevocationPersistence = SessionTokenRevocationPersistence & {
  readonly revokedTokenHashes: Set<string>;
};

export function createMemorySessionTokenRevocationPersistence(): MemorySessionTokenRevocationPersistence {
  const revokedTokenHashes = new Set<string>();
  return {
    revokedTokenHashes,
    isRevoked: async (tokenHash) => revokedTokenHashes.has(tokenHash),
    revoke: async ({ tokenHash }) => {
      revokedTokenHashes.add(tokenHash);
    },
  };
}
