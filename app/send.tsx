import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function SendScreen() {
  return <FinancialRouteGuard pathname="/send" />;
}
