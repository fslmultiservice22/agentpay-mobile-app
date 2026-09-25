export type MockStatementFormat = "pdf" | "csv";

const MOCK_ROWS = [
  ["MOCK-001", "Demo record", "N/A"],
  ["MOCK-002", "No financial data", "N/A"],
] as const;

export function buildMockStatementCsv(): string {
  return [
    "AgentPay Technical Beta — MOCK STATEMENT",
    "This file contains synthetic data only; it is not a bank statement.",
    "Reference,Description,Amount",
    ...MOCK_ROWS.map((row) => row.join(",")),
  ].join("\n");
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildMockStatementPdf(): string {
  const lines = [
    "AgentPay Technical Beta — MOCK STATEMENT",
    "Synthetic preview only — not a bank statement",
    "No account, card, balance, payment or transaction data is included.",
  ];
  const textCommands = [
    "BT",
    "/F1 12 Tf",
    "72 740 Td",
    ...lines.flatMap((line, index) => [
      `${index === 0 ? "" : "0 -20 Td "}(${escapePdfText(line)}) Tj`,
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function getMockStatementContent(format: MockStatementFormat): {
  content: string;
  mimeType: string;
  fileName: string;
} {
  if (format === "csv") {
    return {
      content: buildMockStatementCsv(),
      mimeType: "text/csv;charset=utf-8",
      fileName: "agentpay-mock-statement.csv",
    };
  }
  return {
    content: buildMockStatementPdf(),
    mimeType: "application/pdf",
    fileName: "agentpay-mock-statement.pdf",
  };
}
