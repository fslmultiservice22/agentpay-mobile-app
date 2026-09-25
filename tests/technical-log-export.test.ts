import { describe, expect, it } from "vitest";

import { buildTechnicalLogCsv, technicalLogFilename } from "../lib/technical-log-csv";
import type { MonitorSnapshot } from "../lib/operational-status";

const snapshots: MonitorSnapshot[] = [{
  checkedAt: "2026-08-25T19:40:00.000Z",
  overallStatus: "healthy",
  checks: [
    { id: "api", label: "Backend AgentPay", status: "healthy", detail: "Endpoint tecnico locale disponibile." },
    { id: "runtime", label: "Runtime", status: "healthy", detail: "Processo attivo." },
    { id: "financial_policy", label: "Policy Fase A", status: "healthy", detail: "Operazioni finanziarie disattivate." },
  ],
}];

describe("esportazione locale del registro tecnico", () => {
  it("produce soltanto le quattro colonne tecniche autorizzate", () => {
    const csv = buildTechnicalLogCsv(snapshots);
    expect(csv.split("\n")).toHaveLength(4);
    expect(csv).toContain('"Orario controllo","Stato complessivo","Controllo","Stato controllo"');
    expect(csv).toContain('"2026-08-25T19:40:00.000Z","healthy","api","healthy"');
  });

  it("non esporta dettagli, saldi, wallet, indirizzi, carte o credenziali", () => {
    const csv = buildTechnicalLogCsv(snapshots);
    expect(csv.toLowerCase()).not.toMatch(/saldo|wallet|indirizzo|iban|seed|chiave|credenziale|carta|private/);
  });

  it("usa un nome file locale tracciabile e senza dati utente", () => {
    expect(technicalLogFilename(new Date("2026-08-25T19:40:00.000Z"))).toBe("agentpay-registro-tecnico-2026-08-25T19-40-00-000Z.csv");
  });
});
