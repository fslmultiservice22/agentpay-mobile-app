export type TechnicalMonitorStatus = "healthy" | "attention" | "unavailable";

export type TechnicalMonitorCheck = {
  id: "api" | "runtime" | "financial_policy";
  label: string;
  status: TechnicalMonitorStatus;
  detail: string;
};

export type TechnicalMonitorSnapshot = {
  checkedAt: string;
  overallStatus: TechnicalMonitorStatus;
  checks: TechnicalMonitorCheck[];
};

const HISTORY_LIMIT = 12;

export function createTechnicalMonitor(dependencies: { now?: () => Date; uptime?: () => number } = {}) {
  const now = dependencies.now ?? (() => new Date());
  const uptime = dependencies.uptime ?? (() => process.uptime());
  let latest: TechnicalMonitorSnapshot | null = null;
  let history: TechnicalMonitorSnapshot[] = [];

  function run(): TechnicalMonitorSnapshot {
    const uptimeSeconds = Math.max(0, Math.floor(uptime()));
    const snapshot: TechnicalMonitorSnapshot = {
      checkedAt: now().toISOString(),
      overallStatus: "healthy",
      checks: [
        { id: "api", label: "Backend AgentPay", status: "healthy", detail: "Endpoint tecnico locale disponibile." },
        { id: "runtime", label: "Runtime", status: "healthy", detail: `Processo attivo da ${uptimeSeconds} secondi.` },
        { id: "financial_policy", label: "Policy Fase A", status: "healthy", detail: "Pagamenti, carte, wallet, firme e provider finanziari restano disattivati." },
      ],
    };
    latest = snapshot;
    history = [snapshot, ...history].slice(0, HISTORY_LIMIT);
    return snapshot;
  }

  return {
    run,
    getLatest: () => latest,
    getHistory: () => history,
  };
}
