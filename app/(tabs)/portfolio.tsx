import { ProtectedTabPlaceholder } from "@/components/protected-tab-placeholder";

const UNAVAILABLE_PORTFOLIO_ITEMS = [
  "Saldi, asset, indirizzi e cronologia blockchain.",
  "Importazione, esportazione o custodia di wallet.",
  "Carte, conti, IBAN e dati provenienti da provider esterni.",
] as const;

export default function PortfolioScreen() {
  return (
    <ProtectedTabPlaceholder
      eyebrow="Beta tecnica"
      title="Portafoglio non attivo"
      summary="Il tab mostra soltanto lo stato protetto della funzione e non legge, genera o conserva dati finanziari o chiavi wallet."
      unavailableItems={UNAVAILABLE_PORTFOLIO_ITEMS}
    />
  );
}
