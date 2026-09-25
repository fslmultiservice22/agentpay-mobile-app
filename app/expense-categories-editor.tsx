import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /expense-categories-editor senza categorie, archivi o modifiche personali. */
export default function ExpenseCategoriesEditorScreen() {
  return <FinancialRouteGuard pathname="/expense-categories-editor" />;
}
