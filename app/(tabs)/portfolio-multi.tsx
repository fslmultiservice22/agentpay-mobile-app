import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function PortfolioMultiScreen() {
  return <FinancialRouteGuard pathname="/portfolio-multi" />;
}
