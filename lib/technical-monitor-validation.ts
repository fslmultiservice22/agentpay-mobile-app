import type { ConnectionStatus, MonitorCheck, MonitorResponse, MonitorSnapshot } from "./operational-status";

const CHECK_IDS = ["api", "runtime", "financial_policy"] as const;
const CONNECTION_STATUSES: readonly string[] = ["healthy", "attention", "unavailable"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConnectionStatus(value: unknown): value is ConnectionStatus {
  return typeof value === "string" && CONNECTION_STATUSES.includes(value);
}

/** Reject malformed or unexpected monitoring records before displaying or exporting them. */
export function isValidMonitoringSnapshot(value: unknown): value is MonitorSnapshot {
  if (!isRecord(value) || typeof value.checkedAt !== "string" || !isConnectionStatus(value.overallStatus)) return false;
  const checkedAt = Date.parse(value.checkedAt);
  if (!Number.isFinite(checkedAt) || new Date(checkedAt).toISOString() !== value.checkedAt) return false;
  if (!Array.isArray(value.checks) || value.checks.length !== CHECK_IDS.length) return false;

  const seen = new Set<string>();
  for (const check of value.checks) {
    if (!isRecord(check) || typeof check.id !== "string" || !CHECK_IDS.includes(check.id as MonitorCheck["id"])) return false;
    if (seen.has(check.id) || !isConnectionStatus(check.status)) return false;
    if (typeof check.label !== "string" || check.label.length > 256 || typeof check.detail !== "string" || check.detail.length > 256) return false;
    seen.add(check.id);
  }
  return seen.size === CHECK_IDS.length;
}

/** A recent timestamp alone does not establish a valid API response. */
export function isValidMonitoringResponse(value: unknown): value is MonitorResponse {
  return isRecord(value) && value.success === true && isValidMonitoringSnapshot(value.monitoring) &&
    Array.isArray(value.safeguards) && value.safeguards.every((item) => typeof item === "string");
}
