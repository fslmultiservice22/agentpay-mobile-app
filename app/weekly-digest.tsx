import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WeeklyDigestScreen() {
  return <FinancialRouteGuard pathname="/weekly-digest" />;
}
