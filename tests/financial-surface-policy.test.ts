import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FINANCIAL_ROUTE_GUARDS,
  getFinancialRouteGuard,
  isFinancialRouteBlocked,
  LEGACY_FINANCIAL_ROUTE_PATHS,
  shouldUseGlobalFinancialRouteGuard,
  VISIBLE_PROTECTED_TAB_PATHS,
} from "../lib/financial-route-policy";

const projectRoot = resolve(__dirname, "..");

describe("Financial surface policy", () => {
  it("rimuove il convertitore dalle fonti dati esterne", () => {
    const source = readFileSync(resolve(projectRoot, "app/currency-converter.tsx"), "utf8");

    expect(source).toContain("tassi fiat e crypto esterni sono disattivati per policy");
    expect(source).not.toContain("api.coingecko.com");
    expect(source).not.toContain("exchangerate-api.com");
  });

  it("espone la dashboard tecnica senza importare widget o hook finanziari legacy", () => {
    const source = readFileSync(resolve(projectRoot, "app/(tabs)/index.tsx"), "utf8");

    expect(source).toContain("Dashboard tecnica");
    expect(source).toContain("Connessione finanziaria non disponibile");
    expect(source).not.toContain("useEthereumWallet");
    expect(source).not.toContain("useBankAccounts");
    expect(source).not.toContain("bank-transfer");
  });

  it("elimina le preferenze widget finanziarie salvate e blocca il convertitore", () => {
    const source = readFileSync(resolve(projectRoot, "lib/widget-order.ts"), "utf8");

    expect(source).toContain("export const ALL_WIDGETS: WidgetDef[] = []");
    expect(source).toContain("const supportedOrder = order.filter");
    expect(getFinancialRouteGuard("/currency-converter")?.title).toBe("Convertitore non attivo");
  });

  it("blocca le route finanziarie legacy non coperte dal catalogo originale", () => {
    expect(LEGACY_FINANCIAL_ROUTE_PATHS.size).toBeGreaterThan(40);
    expect(isFinancialRouteBlocked("/savings-goals")).toBe(true);
    expect(isFinancialRouteBlocked("/(tabs)/trading")).toBe(true);
    expect(isFinancialRouteBlocked("/transfer-history")).toBe(true);
    expect(isFinancialRouteBlocked("/ob-connect")).toBe(true);
    expect(isFinancialRouteBlocked("/add-bank-account")).toBe(true);
    expect(isFinancialRouteBlocked("/(tabs)/copy-trade-tracking")).toBe(true);
    expect(isFinancialRouteBlocked("/monthly-summary")).toBe(true);
    expect(isFinancialRouteBlocked("/monthly-comparison")).toBe(true);
    expect(isFinancialRouteBlocked("/fuel-tracker")).toBe(true);
    expect(isFinancialRouteBlocked("/kyc-process")).toBe(true);
    expect(isFinancialRouteBlocked("/(tabs)/social-trading")).toBe(true);
    expect(isFinancialRouteBlocked("/social-feed")).toBe(false);
  });

  it("lascia montare soltanto i placeholder dei due tab protetti", () => {
    expect(VISIBLE_PROTECTED_TAB_PATHS).toEqual(new Set(["/trading", "/portfolio"]));
    expect(isFinancialRouteBlocked("/trading")).toBe(true);
    expect(isFinancialRouteBlocked("/(tabs)/portfolio")).toBe(true);
    expect(shouldUseGlobalFinancialRouteGuard("/trading")).toBe(false);
    expect(shouldUseGlobalFinancialRouteGuard("/(tabs)/portfolio")).toBe(false);
    expect(shouldUseGlobalFinancialRouteGuard("/send")).toBe(true);
    expect(shouldUseGlobalFinancialRouteGuard("/dashboard")).toBe(false);

    const rootLayout = readFileSync(resolve(projectRoot, "app/_layout.tsx"), "utf8");
    expect(rootLayout).toContain("shouldUseGlobalFinancialRouteGuard(pathname)");
    expect(rootLayout).not.toContain("isFinancialRouteBlocked(pathname)");
  });

  it("mantiene il plugin Worklets all'ultimo posto nella configurazione Babel", () => {
    const babelConfig = readFileSync(resolve(projectRoot, "babel.config.js"), "utf8");
    const commonJsIndex = babelConfig.indexOf('"@babel/plugin-transform-modules-commonjs"');
    const workletsIndex = babelConfig.indexOf('"react-native-worklets/plugin"');

    expect(commonJsIndex).toBeGreaterThanOrEqual(0);
    expect(workletsIndex).toBeGreaterThan(commonJsIndex);
  });

  it("copre ogni route registrata nei cataloghi finanziari", () => {
    for (const pathname of Object.keys(FINANCIAL_ROUTE_GUARDS)) {
      expect(getFinancialRouteGuard(pathname)).not.toBeNull();
    }

    for (const pathname of LEGACY_FINANCIAL_ROUTE_PATHS) {
      expect(getFinancialRouteGuard(pathname)).not.toBeNull();
    }
  });

  it("non monta provider wallet o coda pagamenti nelle route tecniche attive", () => {
    const rootLayout = readFileSync(resolve(projectRoot, "app/_layout.tsx"), "utf8");
    const tabLayout = readFileSync(resolve(projectRoot, "app/(tabs)/_layout.tsx"), "utf8");
    const settings = readFileSync(resolve(projectRoot, "app/(tabs)/settings.tsx"), "utf8");

    expect(rootLayout).not.toContain("BlockchainProvider");
    expect(tabLayout).not.toContain("useEthereumWallet");
    expect(tabLayout).not.toContain("getPendingPayments");
    expect(settings).toContain("Impostazioni tecniche");
    expect(settings).not.toContain("useEthereumWallet");
    expect(settings).not.toContain("useBankAccounts");
  });

  it("isola le route tab legacy ad alta esposizione provider tramite la guardia comune", () => {
    const routeStubs = [
      ["app/(tabs)/portfolio-dashboard.tsx", "/portfolio-dashboard"],
      ["app/(tabs)/cross-chain-swap.tsx", "/cross-chain-swap"],
      ["app/(tabs)/social-trading.tsx", "/social-trading"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain('FinancialRouteGuard');
      expect(source).toContain(`pathname="${pathname}"`);
      expect(source).not.toContain("useEthereumWallet");
      expect(source).not.toContain("useBlockchain");
      expect(source).not.toContain("useCrossChainSwap");
      expect(source).not.toContain("useSocialTrading");
    }
  });

  it("mantiene Trading e Portafoglio montabili senza router o provider runtime", () => {
    const visibleProtectedTabs = [
      ["app/(tabs)/trading.tsx", "Trading non attivo"],
      ["app/(tabs)/portfolio.tsx", "Portafoglio non attivo"],
    ];

    for (const [relativePath, title] of visibleProtectedTabs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("ProtectedTabPlaceholder");
      expect(source).toContain(title);
      expect(source).not.toContain("FinancialRouteGuard");
      expect(source).not.toContain("useRouter");
      expect(source).not.toContain("MaterialIcons");
      expect(source).not.toContain("useEthereumWallet");
      expect(source).not.toContain("useBankAccounts");
    }

    const placeholder = readFileSync(
      resolve(projectRoot, "components/protected-tab-placeholder.tsx"),
      "utf8",
    );
    expect(placeholder).not.toContain("expo-router");
    expect(placeholder).not.toContain("AsyncStorage");
    expect(placeholder).not.toContain("fetch(");
    expect(placeholder).not.toContain("MaterialIcons");
    expect(placeholder).toContain("ActivityIndicator");
    expect(placeholder).toContain("Animated.timing");
    expect(placeholder).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(placeholder).toContain('accessibilityRole="progressbar"');

    const tabLayout = readFileSync(resolve(projectRoot, "app/(tabs)/_layout.tsx"), "utf8");
    expect(tabLayout).not.toContain('animation: "fade"');
  });

  it("isola le route principali di conto e trasferimento tramite la guardia comune", () => {
    const routeStubs = [
      ["app/add-bank-account.tsx", "/add-bank-account"],
      ["app/bank-accounts-manage.tsx", "/bank-accounts-manage"],
      ["app/virtual-account.tsx", "/virtual-account"],
      ["app/credit-transfer.tsx", "/credit-transfer"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("useEthereumWallet");
      expect(source).not.toContain("payment-queue");
      expect(source).not.toContain("IBAN");
    }
  });

  it("isola storico, coda e strumenti operativi del gruppo trasferimenti", () => {
    const routeStubs = [
      ["app/export-data.tsx", "/export-data"],
      ["app/transfer-history.tsx", "/transfer-history"],
      ["app/transfer-detail.tsx", "/transfer-detail"],
      ["app/payment-queue.tsx", "/payment-queue"],
      ["app/recurring-transfer.tsx", "/recurring-transfer"],
      ["app/favorites.tsx", "/favorites"],
      ["app/frequent-contacts.tsx", "/frequent-contacts"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("loadPaymentQueue");
      expect(source).not.toContain("scheduleNotificationAsync");
      expect(source).not.toContain("toggleFavorite");
      expect(source).not.toContain("printToFileAsync");
      expect(source).not.toContain("Sharing.shareAsync");
    }
  });

  it("isola analisi, mittenti, promemoria e calendari del gruppo trasferimenti", () => {
    const routeStubs = [
      ["app/incoming-transfers.tsx", "/incoming-transfers"],
      ["app/frequent-senders.tsx", "/frequent-senders"],
      ["app/favorite-senders.tsx", "/favorite-senders"],
      ["app/sender-detail.tsx", "/sender-detail"],
      ["app/reminders.tsx", "/reminders"],
      ["app/financial-calendar.tsx", "/financial-calendar"],
      ["app/recurring-calendar.tsx", "/recurring-calendar"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("getAllReminders");
      expect(source).not.toContain("RecurringTemplate");
    }
  });

  it("isola i riepiloghi e i report legacy tramite la guardia comune", () => {
    const routeStubs = [
      ["app/annual-summary.tsx", "/annual-summary"],
      ["app/monthly-summary.tsx", "/monthly-summary"],
      ["app/month-comparison.tsx", "/month-comparison"],
      ["app/financial-report.tsx", "/financial-report"],
      ["app/tax-report.tsx", "/tax-report"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("printToFileAsync");
      expect(source).not.toContain("toLocaleString");
    }
  });

  it("isola tutte le route analytics senza caricare dati o servizi legacy", () => {
    const routeStubs = [
      ["app/balance-history.tsx", "/balance-history"],
      ["app/budget-history.tsx", "/budget-history"],
      ["app/budget-vs-actual.tsx", "/budget-vs-actual"],
      ["app/cash-flow-forecast.tsx", "/cash-flow-forecast"],
      ["app/expense-report.tsx", "/expense-report"],
      ["app/expense-trends.tsx", "/expense-trends"],
      ["app/financial-health-score.tsx", "/financial-health-score"],
      ["app/income-stats.tsx", "/income-stats"],
      ["app/net-worth-history.tsx", "/net-worth-history"],
      ["app/spending-analysis.tsx", "/spending-analysis"],
      ["app/spending-forecast.tsx", "/spending-forecast"],
      ["app/spending-insights.tsx", "/spending-insights"],
      ["app/yearly-stats.tsx", "/yearly-stats"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("coingecko");
      expect(source).not.toContain("printToFileAsync");
    }
  });

  it("isola budget e obiettivi senza persistenza, promemoria o dati personali", () => {
    const routeStubs = [
      ["app/category-budget.tsx", "/category-budget"],
      ["app/financial-goals.tsx", "/financial-goals"],
      ["app/savings-goals.tsx", "/savings-goals"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("scheduleNotificationAsync");
    }

    expect(isFinancialRouteBlocked("/category-budget")).toBe(true);
  });

  it("isola pianificazione e obiettivi secondari senza calcoli o archivi legacy", () => {
    const routeStubs = [
      ["app/budget-planner.tsx", "/budget-planner"],
      ["app/financial-planner.tsx", "/financial-planner"],
      ["app/goal-contributions-history.tsx", "/goal-contributions-history"],
      ["app/spending-goal.tsx", "/spending-goal"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useBankAccounts");
      expect(source).not.toContain("printToFileAsync");
    }
  });

  it("isola i percorsi finali di obiettivi e pianificazione", () => {
    const routeStubs = [
      ["app/savings-goal.tsx", "/savings-goal"],
      ["app/savings-plan.tsx", "/savings-plan"],
      ["app/subscription-budget.tsx", "/subscription-budget"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("scheduleNotificationAsync");
      expect(source).not.toContain("useBankAccounts");
    }
  });

  it("copre challenge, fondo emergenza e ottimizzazione ricorrente", () => {
    const routeStubs = [
      ["app/savings-challenge.tsx", "/savings-challenge"],
      ["app/emergency-fund.tsx", "/emergency-fund"],
      ["app/recurring-optimizer.tsx", "/recurring-optimizer"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useRecurringPayments");
      expect(source).not.toContain("useBankAccounts");
    }

    expect(isFinancialRouteBlocked("/emergency-fund")).toBe(true);
  });

  it("isola gli ingressi di categoria collegati al budget legacy", () => {
    const routeStubs = [
      ["app/expense-categories-editor.tsx", "/expense-categories-editor"],
      ["app/category-detail.tsx", "/category-detail"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useBankAccounts");
    }
  });

  it("isola carte, credito e debito dietro la guardia tecnica comune", () => {
    const routeStubs = [
      ["app/(tabs)/credit-line.tsx", "/credit-line"],
      ["app/credit-card.tsx", "/credit-card"],
      ["app/card-subscriptions.tsx", "/card-subscriptions"],
      ["app/debt-tracker.tsx", "/debt-tracker"],
      ["app/loan-simulator.tsx", "/loan-simulator"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useCreditLine");
      expect(source).not.toContain("useCreditCard");
      expect(source).not.toContain("processPayment");
    }
  });

  it("isola le route finanziarie legacy residue senza import runtime", () => {
    const routeStubs = [
      ["app/(tabs)/gas-comparator.tsx", "/gas-comparator"], ["app/(tabs)/portfolio-multi.tsx", "/portfolio-multi"],
      ["app/(tabs)/price-alerts.tsx", "/price-alerts"], ["app/(tabs)/swap-analytics.tsx", "/swap-analytics"],
      ["app/add-to-wallet.tsx", "/add-to-wallet"], ["app/balance-sweep.tsx", "/balance-sweep"],
      ["app/bill-splitter.tsx", "/bill-splitter"], ["app/crypto-collateral.tsx", "/crypto-collateral"],
      ["app/crypto-tutorial.tsx", "/crypto-tutorial"], ["app/eosio-transfer.tsx", "/eosio-transfer"],
      ["app/expense-split.tsx", "/expense-split"], ["app/kyc-process.tsx", "/kyc-process"],
      ["app/loyalty-points.tsx", "/loyalty-points"], ["app/ob-connect.tsx", "/ob-connect"],
      ["app/pdf-reports.tsx", "/pdf-reports"], ["app/price-compare.tsx", "/price-compare"],
      ["app/qr-scanner.tsx", "/qr-scanner"], ["app/recurring-payments.tsx", "/recurring-payments"],
      ["app/send.tsx", "/send"], ["app/spending-report.tsx", "/spending-report"],
      ["app/subscription-history.tsx", "/subscription-history"], ["app/tax-estimator.tsx", "/tax-estimator"],
      ["app/tip-calculator.tsx", "/tip-calculator"], ["app/token-distribution.tsx", "/token-distribution"],
      ["app/top-holders.tsx", "/top-holders"], ["app/transaction-history.tsx", "/transaction-history"],
      ["app/wallet-detail.tsx", "/wallet-detail"], ["app/wallet-export.tsx", "/wallet-export"],
      ["app/wallet-import.tsx", "/wallet-import"], ["app/wallet-receive.tsx", "/wallet-receive"],
      ["app/wallet-tx-history.tsx", "/wallet-tx-history"], ["app/weekly-digest.tsx", "/weekly-digest"],
      ["app/wlfi-dashboard.tsx", "/wlfi-dashboard"], ["app/wlfi-markets.tsx", "/wlfi-markets"],
      ["app/wlfi-policy.tsx", "/wlfi-policy"], ["app/wlfi-transfer.tsx", "/wlfi-transfer"],
    ];

    for (const [relativePath, pathname] of routeStubs) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source).toContain("FinancialRouteGuard");
      expect(source).toContain(`pathname=\"${pathname}\"`);
      expect(source).not.toContain("AsyncStorage");
      expect(source).not.toContain("useEthereumWallet");
      expect(source).not.toContain("useBankAccounts");
    }
  });
});
