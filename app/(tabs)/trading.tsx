import { ProtectedTabPlaceholder } from "@/components/protected-tab-placeholder";

const UNAVAILABLE_TRADING_ITEMS = [
  "Quotazioni, mercati e segnali in tempo reale.",
  "Ordini, posizioni, swap o operazioni simulate.",
  "Collegamenti a exchange, wallet o provider esterni.",
] as const;

export default function TradingScreen() {
  return (
    <ProtectedTabPlaceholder
      eyebrow="Beta tecnica"
      title="Trading non attivo"
      summary="Il tab resta accessibile per spiegare il perimetro del prodotto, ma non carica servizi di mercato né componenti operativi."
      unavailableItems={UNAVAILABLE_TRADING_ITEMS}
    />
  );
}
