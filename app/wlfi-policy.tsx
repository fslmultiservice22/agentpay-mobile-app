import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WlfiPolicyScreen() {
  return <FinancialRouteGuard pathname="/wlfi-policy" />;
}
