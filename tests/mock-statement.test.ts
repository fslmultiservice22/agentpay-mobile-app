import { describe, expect, it } from "vitest";

import {
  buildMockStatementCsv,
  buildMockStatementPdf,
  getMockStatementContent,
} from "../lib/mock-statement";

describe("mock statement downloads", () => {
  it("creates an explicitly synthetic CSV", () => {
    const csv = buildMockStatementCsv();
    expect(csv).toContain("AgentPay Technical Beta — MOCK STATEMENT");
    expect(csv).toContain("Reference,Description,Amount");
    expect(csv).toContain("No financial data");
    expect(getMockStatementContent("csv")).toMatchObject({
      mimeType: "text/csv;charset=utf-8",
      fileName: "agentpay-mock-statement.csv",
    });
  });

  it("creates a minimal PDF payload without account data", () => {
    const pdf = buildMockStatementPdf();
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Synthetic preview only");
    expect(pdf).toContain("No account, card, balance, payment or transaction data");
    expect(getMockStatementContent("pdf")).toMatchObject({
      mimeType: "application/pdf",
      fileName: "agentpay-mock-statement.pdf",
    });
  });
});
