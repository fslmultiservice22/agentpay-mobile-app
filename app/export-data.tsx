import { FinancialRouteGuard } from "@/components/financial-route-guard";

/**
 * Mantiene l'URL legacy per compatibilità, senza caricare dati di conto,
 * trasferimenti, IBAN o funzioni di esportazione finanziaria.
 */
export default function ExportDataScreen() {
  return <FinancialRouteGuard pathname="/export-data" />;
}
