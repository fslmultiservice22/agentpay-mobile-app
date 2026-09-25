import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function ObConnectScreen() {
  return <FinancialRouteGuard pathname="/ob-connect" />;
}
