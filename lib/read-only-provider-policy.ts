export type ProviderDecision = "candidate" | "blocked";
export type ReadOnlyProviderId =
  | "coingecko"
  | "etherscan"
  | "enable_banking"
  | "codego"
  | "walletconnect"
  | "telegram"
  | "wallester";

export type ReadOnlyProviderStatus = {
  id: ReadOnlyProviderId;
  decision: ProviderDecision;
  enabled: false;
  networkRequestsAllowed: false;
  reason: string;
  nextRequirement: string;
};

const PROVIDERS: ReadOnlyProviderStatus[] = [
  {
    id: "coingecko",
    decision: "candidate",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Fonte potenziale di dati pubblici di mercato; non attivata nella Fase A.",
    nextRequirement: "Proxy server-side, caching, rate limit e revisione prodotto separata.",
  },
  {
    id: "etherscan",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Dati on-chain possono rivelare indirizzi, saldi e transazioni.",
    nextRequirement: "Consenso esplicito, minimizzazione dati e revisione privacy dedicata.",
  },
  {
    id: "enable_banking",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Open Banking tratta dati di conto e consenso PSD2.",
    nextRequirement: "Nuove credenziali, callback verificato e autorizzazione separata.",
  },
  {
    id: "codego",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Il provider riguarda carta, KYC e operazioni sensibili.",
    nextRequirement: "Revisione tecnica, contrattuale e di conformità prima di ogni riattivazione.",
  },
  {
    id: "walletconnect",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "La connessione wallet può preparare firme e sessioni utente.",
    nextRequirement: "Custodia, consenso e audit indipendente prima dell’abilitazione.",
  },
  {
    id: "telegram",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Messaggistica esterna separata dal flusso principale; nessun invio automatico.",
    nextRequirement: "Opt-in locale esplicito, revisione privacy e autorizzazione separata.",
  },
  {
    id: "wallester",
    decision: "blocked",
    enabled: false,
    networkRequestsAllowed: false,
    reason: "Servizio finanziario esterno non integrato in AgentPay.",
    nextRequirement: "Accordo valutato e accettato direttamente dal titolare; integrazione read-only separata.",
  },
];

export function getReadOnlyProviderStatus(): ReadOnlyProviderStatus[] {
  return PROVIDERS.map((provider) => ({ ...provider }));
}

export function hasEnabledExternalProvider(): false {
  return false;
}
