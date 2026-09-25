import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function PriceAlertsScreen() {
  return <FinancialRouteGuard pathname="/price-alerts" />;
}
