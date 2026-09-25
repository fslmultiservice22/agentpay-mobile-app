import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function EosioTransferScreen() {
  return <FinancialRouteGuard pathname="/eosio-transfer" />;
}
