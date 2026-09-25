import type { MonitorSnapshot } from "@/lib/operational-status";

const CSV_HEADER = ["Orario controllo", "Stato complessivo", "Controllo", "Stato controllo"];
const ALLOWED_CHECKS = new Set(["api", "runtime", "financial_policy"]);

function csvCell(value: string): string {
  const safe = value.replace(/[\r\n]+/g, " ").replace(/^[-+=@]/, "'$&");
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildTechnicalLogCsv(entries: MonitorSnapshot[]): string {
  const rows = entries.flatMap((entry) =>
    entry.checks
      .filter((check) => ALLOWED_CHECKS.has(check.id))
      .map((check) => [entry.checkedAt, entry.overallStatus, check.id, check.status].map(csvCell).join(",")),
  );

  return [CSV_HEADER.map(csvCell).join(","), ...rows].join("\n");
}

export function technicalLogFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `agentpay-registro-tecnico-${stamp}.csv`;
}
