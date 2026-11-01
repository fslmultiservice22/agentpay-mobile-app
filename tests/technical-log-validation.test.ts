import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall } from "@/lib/_core/api";
import { getMonitorHistory, type MonitorSnapshot } from "../lib/operational-status";
import { isValidMonitoringSnapshot } from "../lib/technical-monitor-validation";

vi.mock("@/lib/_core/api", () => ({ apiCall: vi.fn() }));

const mockApiCall = vi.mocked(apiCall);

function snapshot(): MonitorSnapshot {
  return {
    checkedAt: "2026-10-05T11:33:04.579Z",
    overallStatus: "healthy",
    checks: [
      { id: "api", label: "Backend AgentPay", status: "healthy", detail: "DATI_FITTIZI_NON_ESPORTARE" },
      { id: "runtime", label: "Runtime", status: "healthy", detail: "Processo di test." },
      { id: "financial_policy", label: "Policy Fase A", status: "healthy", detail: "Funzioni finanziarie inattive." },
    ],
  };
}

function response(entries: unknown) {
  return { success: true, entries, retention: "Memoria volatile del processo, massimo dodici controlli.", safeguards: [] };
}

describe("registro tecnico: validazione a runtime prima dell'export", () => {
  beforeEach(() => vi.resetAllMocks());

  it("accetta uno storico valido anche se non recente", async () => {
    const valid = response([snapshot()]);
    mockApiCall.mockResolvedValueOnce(valid);
    await expect(getMonitorHistory()).resolves.toEqual(valid);
    expect(mockApiCall).toHaveBeenCalledWith("/api/operational-monitor/history");
  });

  it("rifiuta un campo di stato controllato dall'esterno", async () => {
    const bad = { ...snapshot(), overallStatus: "TEST_MARKER_UNVALIDATED" };
    mockApiCall.mockResolvedValueOnce(response([bad]));
    await expect(getMonitorHistory()).rejects.toThrow("Technical monitoring history is invalid");
    expect(isValidMonitoringSnapshot(bad)).toBe(false);
  });

  it("rifiuta timestamp non canonici, check estranei, duplicati e stati invalidi", () => {
    const valid = snapshot();
    expect(isValidMonitoringSnapshot({ ...valid, checkedAt: "not-a-date" })).toBe(false);
    expect(isValidMonitoringSnapshot({ ...valid, checkedAt: "2026-10-05T13:33:04+02:00" })).toBe(false);
    expect(isValidMonitoringSnapshot({ ...valid, checks: [{ ...valid.checks[0], id: "account" }, ...valid.checks.slice(1)] })).toBe(false);
    expect(isValidMonitoringSnapshot({ ...valid, checks: [valid.checks[0], valid.checks[0], valid.checks[2]] })).toBe(false);
    expect(isValidMonitoringSnapshot({ ...valid, checks: [{ ...valid.checks[0], status: "=1+1" }, ...valid.checks.slice(1)] })).toBe(false);
  });

  it("rifiuta la cronologia non array, più di dodici snapshot, valori non stringa e risposta senza success", async () => {
    for (const invalid of [
      response({}),
      response(Array.from({ length: 13 }, snapshot)),
      response([{ ...snapshot(), overallStatus: { secret: "TEST_ONLY" } }]),
      { ...response([snapshot()]), success: false },
    ]) {
      mockApiCall.mockResolvedValueOnce(invalid);
      await expect(getMonitorHistory()).rejects.toThrow("Technical monitoring history is invalid");
    }
  });
});
