import { apiCall } from "@/lib/_core/api";
import { isRecord, isValidMonitoringResponse, isValidMonitoringSnapshot } from "./technical-monitor-validation";

export type ConnectionStatus = "healthy" | "attention" | "unavailable";

export type MonitorCheck = {
  id: "api" | "runtime" | "financial_policy";
  label: string;
  status: ConnectionStatus;
  detail: string;
};

export type MonitorSnapshot = {
  checkedAt: string;
  overallStatus: ConnectionStatus;
  checks: MonitorCheck[];
};

export type MonitorResponse = {
  success: true;
  monitoring: MonitorSnapshot;
  safeguards: string[];
};

export type MonitorHistoryResponse = {
  success: true;
  entries: MonitorSnapshot[];
  retention: string;
  safeguards: string[];
};

const MAX_SNAPSHOT_AGE_MS = 2 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 30 * 1000;

export function isFreshMonitoringSnapshot(snapshot: MonitorSnapshot | null | undefined, now = Date.now()): boolean {
  if (!isValidMonitoringSnapshot(snapshot)) return false;
  const checkedAt = Date.parse(snapshot.checkedAt);
  return Number.isFinite(now) && checkedAt <= now + MAX_CLOCK_SKEW_MS && now - checkedAt <= MAX_SNAPSHOT_AGE_MS;
}

export async function getOperationalStatus(): Promise<MonitorResponse> {
  const response = await apiCall<unknown>("/api/operational-monitor/status");
  if (!isValidMonitoringResponse(response)) throw new Error("Technical monitoring response is invalid");
  // The server may return its last snapshot indefinitely. Refresh only when stale.
  if (isFreshMonitoringSnapshot(response.monitoring)) return response;
  return refreshOperationalStatus();
}

export async function refreshOperationalStatus(): Promise<MonitorResponse> {
  const response = await apiCall<unknown>("/api/operational-monitor/refresh", { method: "POST" });
  if (!isValidMonitoringResponse(response) || !isFreshMonitoringSnapshot(response.monitoring)) {
    throw new Error("Technical monitoring snapshot is stale or invalid");
  }
  return response;
}

export async function getMonitorHistory(): Promise<MonitorHistoryResponse> {
  const result = await apiCall<unknown>("/api/operational-monitor/history");
  if (!isRecord(result) || result.success !== true || !Array.isArray(result.entries) || result.entries.length > 12 ||
      !result.entries.every(isValidMonitoringSnapshot) || typeof result.retention !== "string" ||
      !Array.isArray(result.safeguards) || !result.safeguards.every((value) => typeof value === "string")) {
    throw new Error("Technical monitoring history is invalid");
  }
  return result as MonitorHistoryResponse;
}
