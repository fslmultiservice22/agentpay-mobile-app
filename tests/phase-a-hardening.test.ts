import { describe, expect, it } from "vitest";

import { FINANCIAL_ROUTE_GUARDS, getFinancialRouteGuard, isFinancialRouteBlocked } from "../lib/financial-route-policy";
import { createTechnicalMonitor } from "../server/operational-monitor";

describe("Fase A — hardening non transazionale", () => {
  it("intercetta le route finanziarie e lascia accessibile il pannello tecnico", () => {
    expect(Object.keys(FINANCIAL_ROUTE_GUARDS)).toHaveLength(25);
    expect(isFinancialRouteBlocked("/trading")).toBe(true);
    expect(isFinancialRouteBlocked("/(tabs)/portfolio")).toBe(true);
    expect(isFinancialRouteBlocked("/send")).toBe(true);
    expect(isFinancialRouteBlocked("/currency-converter")).toBe(true);
    expect(isFinancialRouteBlocked("/dashboard")).toBe(false);
    expect(isFinancialRouteBlocked("/monitor-log")).toBe(false);
    expect(getFinancialRouteGuard("/wallet-import")?.title).toContain("non attiva");
  });

  it("produce snapshot tecnici senza dati finanziari, provider o segreti", () => {
    const monitor = createTechnicalMonitor({ now: () => new Date("2026-08-25T12:00:00.000Z"), uptime: () => 42 });
    const snapshot = monitor.run();

    expect(snapshot.overallStatus).toBe("healthy");
    expect(snapshot.checks.map((check) => check.id)).toEqual(["api", "runtime", "financial_policy"]);
    expect(snapshot.checks.every((check) => check.status === "healthy")).toBe(true);
    const serialized = JSON.stringify(snapshot).toLowerCase();
    expect(serialized).not.toMatch(/iban|seed|private.?key|credential|card number|balance|wallet address/);
  });

  it("mantiene una cronologia volatile e limitata", () => {
    const monitor = createTechnicalMonitor({ now: () => new Date("2026-08-25T12:00:00.000Z"), uptime: () => 1 });
    for (let index = 0; index < 14; index += 1) monitor.run();
    expect(monitor.getHistory()).toHaveLength(12);
  });
});
