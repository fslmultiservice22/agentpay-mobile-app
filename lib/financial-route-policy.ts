export type FinancialGuardDefinition = {
  icon: "account-balance-wallet" | "credit-card-off" | "show-chart" | "swap-horiz" | "send";
  title: string;
  summary: string;
  prerequisites: string[];
};

export const FINANCIAL_ROUTE_GUARDS: Record<string, FinancialGuardDefinition> = {
  "/trading": {
    icon: "show-chart",
    title: "Trading non attivo",
    summary: "Questa area è consultiva e non mostra mercati, segnali, ordini, posizioni o risultati simulati.",
    prerequisites: ["Servizio e responsabilità operative verificati.", "Controlli di conformità specifici.", "Nuova autorizzazione esplicita prima dell’attivazione."],
  },
  "/portfolio": {
    icon: "account-balance-wallet",
    title: "Portafoglio non attivo",
    summary: "Non sono disponibili saldo, indirizzo, token, valore di portafoglio o collegamento a provider wallet.",
    prerequisites: ["Provider wallet autorizzato e configurato.", "Revisione della custodia e della privacy.", "Autorizzazione esplicita per ogni collegamento."],
  },
  "/portfolio-dashboard": {
    icon: "account-balance-wallet",
    title: "Dashboard portafoglio non attiva",
    summary: "I dati di portafoglio non vengono caricati né simulati durante la Fase A.",
    prerequisites: ["Fonte dati verificata.", "Nessun dato simulato o di test presentato come reale.", "Revisione di sicurezza prima della pubblicazione."],
  },
  "/portfolio-multi": {
    icon: "account-balance-wallet",
    title: "Multi-portafoglio non attivo",
    summary: "Questa vista non aggrega indirizzi, saldi o asset da fonti esterne.",
    prerequisites: ["Consenso per ogni fonte dati.", "Separazione degli account verificata.", "Autorizzazione esplicita all’aggregazione."],
  },
  "/cross-chain-swap": {
    icon: "swap-horiz",
    title: "Swap non attivo",
    summary: "Non vengono richieste firme, quotazioni, bridge o scambi tra reti.",
    prerequisites: ["Provider autorizzato e controllato.", "Analisi dei rischi di rete e slippage.", "Conferma esplicita dell’utente."],
  },
  "/swap-analytics": {
    icon: "swap-horiz",
    title: "Analisi swap non attiva",
    summary: "La Fase A non mostra volumi, segnali o analisi di swap basati su dati simulati.",
    prerequisites: ["Fonte dati read-only verificata.", "Metodologia trasparente.", "Revisione prima dell’esposizione all’utente."],
  },
  "/rebalancing-dashboard": {
    icon: "swap-horiz",
    title: "Ribilanciamento non attivo",
    summary: "Non vengono generati suggerimenti, ordini o istruzioni di ribilanciamento.",
    prerequisites: ["Politica di investimento approvata.", "Controlli di idoneità e rischio.", "Autorizzazione esplicita per qualunque azione."],
  },
  "/credit-line": {
    icon: "credit-card-off",
    title: "Linea di credito non attiva",
    summary: "Non sono disponibili offerte, limiti, tassi o richieste di credito.",
    prerequisites: ["Partner regolamentato verificato.", "KYC e condizioni legali approvate.", "Abilitazione formale del servizio."],
  },
  "/credit-card": {
    icon: "credit-card-off",
    title: "Carta non attiva",
    summary: "L’app non emette, visualizza o gestisce carte, PAN, limiti, ricariche o pagamenti.",
    prerequisites: ["Provider carta e KYB approvati.", "Conformità PCI-DSS verificata.", "Abilitazione esplicita dell’operatività."],
  },
  "/crypto-collateral": {
    icon: "account-balance-wallet",
    title: "Collaterale crypto non attivo",
    summary: "Non vengono calcolati collateral ratio, prestiti o liquidazioni.",
    prerequisites: ["Provider regolamentato verificato.", "Rischi di liquidazione documentati.", "Autorizzazione esplicita prima dell’uso."],
  },
  "/send": {
    icon: "send",
    title: "Invio non attivo",
    summary: "La Fase A non avvia trasferimenti, pagamenti, firme o richieste di pagamento.",
    prerequisites: ["Beneficiario e provider verificati.", "Conferma esplicita dell’utente.", "Audit transazionale dedicato."],
  },
  "/credit-transfer": {
    icon: "send",
    title: "Trasferimento credito non attivo",
    summary: "Non vengono avviati trasferimenti di denaro o richieste di credito.",
    prerequisites: ["Servizio regolamentato e condizioni approvate.", "Conferma esplicita.", "Audit transazionale dedicato."],
  },
  "/recurring-transfer": {
    icon: "send",
    title: "Trasferimento ricorrente non attivo",
    summary: "Non vengono create istruzioni ricorrenti o addebiti automatici.",
    prerequisites: ["Mandato verificato.", "Controlli di consenso e revoca.", "Autorizzazione esplicita."],
  },
  "/eosio-transfer": {
    icon: "send",
    title: "Trasferimento blockchain non attivo",
    summary: "Non sono disponibili firme, broadcast o trasferimenti su blockchain.",
    prerequisites: ["Wallet e rete autorizzati.", "Firma isolata e verificabile.", "Conferma esplicita per ogni azione."],
  },
  "/payment-queue": {
    icon: "send",
    title: "Coda pagamenti non attiva",
    summary: "Non vengono mostrati o processati pagamenti pendenti, reali o simulati.",
    prerequisites: ["Provider pagamenti verificato.", "Audit di persistenza e autorizzazione.", "Conferma esplicita per ogni operazione."],
  },
  "/wallet-detail": {
    icon: "account-balance-wallet",
    title: "Dettaglio wallet non attivo",
    summary: "L’app non mostra indirizzi, asset, transazioni o chiavi wallet.",
    prerequisites: ["Provider wallet autorizzato.", "Revisione privacy e custodia.", "Attivazione esplicita."],
  },
  "/wallet-import": {
    icon: "account-balance-wallet",
    title: "Importazione wallet non attiva",
    summary: "La Fase A non raccoglie seed phrase, chiavi private o file wallet.",
    prerequisites: ["Modello di custodia definito.", "Valutazione di sicurezza indipendente.", "Autorizzazione esplicita."],
  },
  "/wallet-export": {
    icon: "account-balance-wallet",
    title: "Esportazione wallet non attiva",
    summary: "La Fase A non esporta chiavi, seed phrase o dati wallet.",
    prerequisites: ["Cifratura e recupero sicuri.", "Revisione della custodia.", "Autorizzazione esplicita."],
  },
  "/wallet-receive": {
    icon: "account-balance-wallet",
    title: "Ricezione wallet non attiva",
    summary: "Non vengono generati indirizzi, QR o richieste di ricezione.",
    prerequisites: ["Provider wallet autorizzato.", "Rete e indirizzo verificati.", "Attivazione esplicita."],
  },
  "/wallet-tx-history": {
    icon: "account-balance-wallet",
    title: "Cronologia wallet non attiva",
    summary: "La Fase A non recupera né simula cronologie blockchain.",
    prerequisites: ["Fonte dati read-only verificata.", "Consenso e minimizzazione dati.", "Revisione privacy."],
  },
  "/ob-connect": {
    icon: "account-balance-wallet",
    title: "Open Banking non attivo",
    summary: "Non viene avviato alcun consenso, collegamento conto o accesso a saldo e movimenti.",
    prerequisites: ["Partner Open Banking autorizzato.", "Redirect URI e consenso verificati.", "Abilitazione esplicita del servizio."],
  },
  "/currency-converter": {
    icon: "show-chart",
    title: "Convertitore non attivo",
    summary: "Non vengono recuperati tassi fiat, quotazioni crypto o dati di mercato da provider esterni.",
    prerequisites: ["Fonte dati read-only verificata.", "Metodologia e frequenza di aggiornamento documentate.", "Autorizzazione esplicita prima della riattivazione."],
  },
  "/virtual-account": {
    icon: "account-balance-wallet",
    title: "Conto virtuale non attivo",
    summary: "Non vengono creati o mostrati conti, IBAN, saldi o movimenti.",
    prerequisites: ["Provider regolamentato verificato.", "KYC e condizioni approvate.", "Abilitazione esplicita."],
  },
  "/wlfi-swap": {
    icon: "swap-horiz",
    title: "Swap WLFI non attivo",
    summary: "Non vengono generate quotazioni, firme o scambi WLFI.",
    prerequisites: ["Provider autorizzato.", "Controlli di rischio.", "Conferma esplicita."],
  },
  "/wlfi-transfer": {
    icon: "send",
    title: "Trasferimento WLFI non attivo",
    summary: "Non vengono firmati o inviati trasferimenti WLFI.",
    prerequisites: ["Wallet autorizzato.", "Firma verificabile.", "Conferma esplicita."],
  },
};

const LEGACY_FINANCIAL_ROUTE_GUARD: FinancialGuardDefinition = {
  icon: "credit-card-off",
  title: "Funzione finanziaria non attiva",
  summary: "Questa schermata legacy è bloccata: non mostra, elabora o simula dati finanziari e non avvia notifiche, pagamenti, trasferimenti o collegamenti a provider.",
  prerequisites: ["Perimetro del servizio definito e autorizzato.", "Revisione di sicurezza e conformità dedicata.", "Nuova autorizzazione esplicita prima di qualunque attivazione."],
};

export const LEGACY_FINANCIAL_ROUTE_PATHS = new Set([
  "/add-bank-account", "/add-to-wallet", "/annual-summary", "/balance-history", "/balance-sweep", "/bank-accounts-manage", "/bill-splitter",
  "/budget-history", "/budget-planner", "/budget-vs-actual", "/card-subscriptions", "/cash-flow-forecast", "/category-budget", "/category-detail",
  "/copy-trade-tracking", "/crypto-tutorial", "/debt-tracker", "/eosio-transfer", "/expense-categories-editor", "/expense-report",
  "/export-data",
  "/emergency-fund", "/expense-split", "/expense-trends", "/financial-calendar", "/financial-goals", "/financial-health-score", "/financial-planner",
  "/financial-report", "/frequent-contacts", "/frequent-senders", "/favorite-senders", "/favorites", "/fuel-tracker", "/gas-comparator", "/global-search", "/goal-contributions-history",
  "/history", "/income-stats", "/incoming-transfers", "/investment-tracker", "/kyc-process", "/leaderboard", "/loan-simulator",
  "/month-comparison", "/monthly-comparison", "/monthly-summary", "/net-worth", "/net-worth-history", "/payment-queue", "/portfolio-multi", "/price-alerts", "/price-compare",
  "/qr-scanner", "/rebalancing-dashboard", "/recurring-calendar", "/recurring-optimizer", "/recurring-payments", "/reminders", "/savings-challenge",
  "/savings-goal", "/savings-goals", "/savings-plan", "/sender-detail", "/spending-analysis", "/spending-forecast", "/spending-goal",
  "/spending-insights", "/spending-report", "/subscription-budget", "/subscription-history", "/subscription-tracker", "/swap-analytics",
  "/social-trading",
  "/tax-estimator", "/tax-report", "/trader-chat", "/trader-profile", "/transaction-history", "/transfer-detail", "/transfer-history",
  "/virtual-account", "/wallet-tx-history", "/wlfi-dashboard", "/wlfi-markets", "/wlfi-policy", "/yearly-stats",
  "/loyalty-points", "/pdf-reports", "/tip-calculator", "/token-distribution", "/top-holders", "/weekly-digest",
]);

export const VISIBLE_PROTECTED_TAB_PATHS = new Set(["/trading", "/portfolio"]);

function normalizeFinancialPathname(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  return pathname.replace(/^\/\(tabs\)/, "").replace(/\/$/, "") || "/";
}

export function getFinancialRouteGuard(pathname: string | null | undefined): FinancialGuardDefinition | null {
  const normalized = normalizeFinancialPathname(pathname);
  if (!normalized) return null;
  return FINANCIAL_ROUTE_GUARDS[normalized] ?? (LEGACY_FINANCIAL_ROUTE_PATHS.has(normalized) ? LEGACY_FINANCIAL_ROUTE_GUARD : null);
}

export function isFinancialRouteBlocked(pathname: string | null | undefined): boolean {
  return getFinancialRouteGuard(pathname) !== null;
}

export function shouldUseGlobalFinancialRouteGuard(pathname: string | null | undefined): boolean {
  const normalized = normalizeFinancialPathname(pathname);
  return normalized !== null && !VISIBLE_PROTECTED_TAB_PATHS.has(normalized) && isFinancialRouteBlocked(normalized);
}
