import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function QrScannerScreen() {
  return <FinancialRouteGuard pathname="/qr-scanner" />;
}
