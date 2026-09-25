import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function KycProcessScreen() {
  return <FinancialRouteGuard pathname="/kyc-process" />;
}
