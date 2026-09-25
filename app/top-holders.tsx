import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function TopHoldersScreen() {
  return <FinancialRouteGuard pathname="/top-holders" />;
}
