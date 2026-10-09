import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall } from "@/lib/_core/api";
import {
  getOperationalStatus,
  isFreshMonitoringSnapshot,
  refreshOperationalStatus,
  type MonitorResponse,
} from "../lib/operational-status";

vi.mock("@/lib/_core/api", () => ({ apiCall: vi.fn() }));

const mockApiCall = vi.mocked(apiCall);

function response(checkedAt: string): MonitorResponse {
  return {
    success: true,
    monitoring: {
      checkedAt,
      overallStatus: "healthy",
      checks: [
        { id: "api", label: "API tecnica", status: "healthy", detail: "Fixture sintetica" },
        { id: "runtime", label: "Runtime", status: "healthy", detail: "Fixture sintetica" },
        { id: "financial_policy", label: "Policy", status: "healthy", detail: "Funzioni finanziarie inattive" },
      ],
    },
    safeguards: ["Nessuna funzione finanziaria"],
  };
}

describe("monitor tecnico: freschezza fail-closed", () => {
  beforeEach(() => vi.resetAllMocks());

  it("accetta solo timestamp recenti e non futuri o malformati", () => {
    const now = Date.parse("2026-10-05T09:30:00.000Z");
    expect(isFreshMonitoringSnapshot(response("2026-10-05T09:29:00.000Z").monitoring, now)).toBe(true);
    expect(isFreshMonitoringSnapshot(response("2026-10-05T06:47:49.950Z").monitoring, now)).toBe(false);
    expect(isFreshMonitoringSnapshot(response("2026-10-05T09:31:00.000Z").monitoring, now)).toBe(false);
    expect(isFreshMonitoringSnapshot(response("not-a-date").monitoring, now)).toBe(false);
    expect(isFreshMonitoringSnapshot(null, now)).toBe(false);
  });

  it("non invia POST quando la GET contiene uno snapshot recente", async () => {
    const fresh = response(new Date().toISOString());
    mockApiCall.mockResolvedValueOnce(fresh);
    await expect(getOperationalStatus()).resolves.toEqual(fresh);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith("/api/operational-monitor/status");
  });

  it("se la GET è stantia, prova una sola volta la route tecnica di refresh", async () => {
    const stale = response("2026-10-05T06:47:49.950Z");
    const fresh = response(new Date().toISOString());
    mockApiCall.mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh);
    await expect(getOperationalStatus()).resolves.toEqual(fresh);
    expect(mockApiCall).toHaveBeenNthCalledWith(1, "/api/operational-monitor/status");
    expect(mockApiCall).toHaveBeenNthCalledWith(2, "/api/operational-monitor/refresh", { method: "POST" });
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it("rifiuta lo stato vecchio anche quando il refresh fallisce o restituisce vecchi dati", async () => {
    mockApiCall.mockResolvedValueOnce(response("2026-10-05T06:47:49.950Z"))
      .mockResolvedValueOnce(response("2026-10-05T06:47:49.950Z"));
    await expect(getOperationalStatus()).rejects.toThrow(/stale or invalid/);
    mockApiCall.mockRejectedValueOnce(new Error("offline"));
    await expect(refreshOperationalStatus()).rejects.toThrow("offline");
  });

  it("rifiuta GET malformate prima di un refresh o dell'esposizione in UI", async () => {
    const valid = response(new Date().toISOString());
    for (const bad of [
      { ...valid, success: false },
      { ...valid, safeguards: [123] },
      { ...valid, monitoring: { ...valid.monitoring, checks: [] } },
    ]) {
      mockApiCall.mockReset();
      mockApiCall.mockResolvedValueOnce(bad);
      await expect(getOperationalStatus()).rejects.toThrow("Technical monitoring response is invalid");
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledWith("/api/operational-monitor/status");
    }
  });

  it("rifiuta POST refresh con timestamp recente ma risposta invalida", async () => {
    const valid = response(new Date().toISOString());
    for (const bad of [
      { ...valid, success: false },
      { ...valid, safeguards: [123] },
      { ...valid, monitoring: { ...valid.monitoring, checks: [] } },
    ]) {
      mockApiCall.mockReset();
      mockApiCall.mockResolvedValueOnce(bad);
      await expect(refreshOperationalStatus()).rejects.toThrow(/stale or invalid/);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    }
  });
});
