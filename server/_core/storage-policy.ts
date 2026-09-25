export const AGENTPAY_STORAGE_PREFIX = "agentpay/";

/**
 * Impone uno spazio dei nomi dedicato ad AgentPay e rifiuta traversal o chiavi
 * non portabili. Le URL firmate non vengono mai richieste per percorsi arbitrari.
 */
export function normalizeAgentPayStorageKey(value: string): string {
  const key = value.replace(/^\/+/, "");

  if (
    !key.startsWith(AGENTPAY_STORAGE_PREFIX) ||
    key.includes("..") ||
    !/^[A-Za-z0-9._/-]+$/.test(key)
  ) {
    throw new Error("Storage key is not allowed by AgentPay policy");
  }

  return key;
}
