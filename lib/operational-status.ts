import { apiCall } from "@/lib/_core/api";

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

export async function getOperationalStatus(): Promise<MonitorResponse> {
  return apiCall<MonitorResponse>("/api/operational-monitor/status");
}

export async function refreshOperationalStatus(): Promise<MonitorResponse> {
  return apiCall<MonitorResponse>("/api/operational-monitor/refresh", { method: "POST" });
}

export async function getMonitorHistory(): Promise<MonitorHistoryResponse> {
  return apiCall<MonitorHistoryResponse>("/api/operational-monitor/history");
}
