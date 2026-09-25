import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WlfiTransferScreen() {
  return <FinancialRouteGuard pathname="/wlfi-transfer" />;
}
