/** Pilota CSV locale: nessuna rete, provider, persistenza o operazione finanziaria. */
export const MAX_LOCAL_CSV_BYTES = 100_000;
export const MAX_LOCAL_CSV_ROWS = 100;
export const MAX_LOCAL_DESCRIPTION_LENGTH = 160;
export const MAX_LOCAL_CATEGORY_LENGTH = 60;

export type ExpenseEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
};
export type ExpenseImportIssue = { row: number; message: string };
export type ExpenseImportResult = {
  entries: ExpenseEntry[];
  issues: ExpenseImportIssue[];
};
export type ExpenseSummary = {
  entryCount: number;
  totalsByCurrency: Record<string, number>;
  byCategory: Record<string, Record<string, number>>;
};

type Column = "date" | "description" | "amount" | "currency" | "category";
const HEADERS: Record<Column, string[]> = {
  date: ["date", "data", "giorno"],
  description: [
    "description",
    "descrizione",
    "causale",
    "merchant",
    "esercente",
  ],
  amount: ["amount", "importo", "spesa", "debit", "addebito"],
  currency: ["currency", "valuta", "divisa"],
  category: ["category", "categoria"],
};
const SENSITIVE_FIELD =
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\d[ -]*?){13,19}\b|\b(?:iban|swift|bic|codice\s*fiscale|account\s*(?:number|id)|numero\s*(?:di\s*)?conto)\b/i;

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** RFC-style quoted fields incl. separators and newlines; malformed quotes are rejected. */
function parseRecords(
  csv: string,
  delimiter: ";" | ",",
): { fields: string[]; row: number }[] | null {
  const records: { fields: string[]; row: number }[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let row = 1;
  let recordRow = 1;
  for (let index = 0; index < csv.length; index += 1) {
    const ch = csv[index];
    if (quoted) {
      if (ch === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (ch === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += ch;
        if (ch === "\n") row += 1;
      }
    } else if (ch === delimiter || ch === "\n") {
      fields.push(field.trim());
      field = "";
      afterQuote = false;
      if (ch === "\n") {
        if (fields.some((item) => item !== ""))
          records.push({ fields, row: recordRow });
        fields = [];
        row += 1;
        recordRow = row;
      }
    } else if (ch === '"' && field === "" && !afterQuote) {
      quoted = true;
    } else if (afterQuote && ch === " ") {
      /* whitespace after quoted field */
    } else if (ch === '"' || afterQuote) {
      return null;
    } else {
      field += ch;
    }
  }
  if (quoted) return null;
  fields.push(field.trim());
  if (fields.some((item) => item !== ""))
    records.push({ fields, row: recordRow });
  return records;
}

function parseAmount(value: string): number | null {
  const raw = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw.replace(",", "."));
  return Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}

function fatal(message: string, row = 1): ExpenseImportResult {
  return { entries: [], issues: [{ row, message }] };
}

export function parseExpenseCsv(csv: string): ExpenseImportResult {
  if (new TextEncoder().encode(csv).length > MAX_LOCAL_CSV_BYTES)
    return fatal("File troppo grande: massimo 100 KB.", 0);
  const text = csv.replace(/\r\n?/g, "\n");
  if (!text.trim()) return fatal("Il CSV è vuoto.", 0);
  const headerLine = text.split("\n", 1)[0];
  const delimiter =
    (headerLine.match(/;/g) ?? []).length >
    (headerLine.match(/,/g) ?? []).length
      ? ";"
      : ",";
  const records = parseRecords(text, delimiter);
  if (!records) return fatal("CSV non valido: verificare le virgolette.");
  if (records.length > MAX_LOCAL_CSV_ROWS + 1)
    return fatal("Troppe righe: massimo 100.", 0);
  const headers = records[0].fields.map(normalizeHeader);
  const mapped = headers.map((header) =>
    (Object.keys(HEADERS) as Column[]).find((key) =>
      HEADERS[key].includes(header),
    ),
  );
  if (
    headers.some((header, index) => !header || !mapped[index]) ||
    new Set(mapped).size !== mapped.length
  ) {
    return fatal(
      "Sono ammesse solo colonne data, descrizione, importo, valuta e categoria, senza duplicati. Rimuovere identificativi e colonne extra.",
    );
  }
  const indices = Object.fromEntries(
    mapped.map((key, index) => [key, index]),
  ) as Partial<Record<Column, number>>;
  if (
    indices.date === undefined ||
    indices.description === undefined ||
    indices.amount === undefined
  ) {
    return fatal("Colonne obbligatorie mancanti: data, descrizione e importo.");
  }
  // Fail closed: no partial preview if any identifying data appears anywhere in the CSV.
  if (
    records
      .slice(1)
      .some(({ fields }) => fields.some((value) => SENSITIVE_FIELD.test(value)))
  ) {
    return fatal(
      "Possibile dato identificativo rilevato. Anonimizzare il file prima dell'importazione.",
      0,
    );
  }
  const entries: ExpenseEntry[] = [];
  const issues: ExpenseImportIssue[] = [];
  for (const { fields, row } of records.slice(1)) {
    const date = fields[indices.date] ?? "";
    const description = fields[indices.description] ?? "";
    const amount = parseAmount(fields[indices.amount] ?? "");
    const currency =
      indices.currency === undefined
        ? "EUR"
        : (fields[indices.currency] ?? "").toUpperCase();
    const category =
      indices.category === undefined ? "" : (fields[indices.category] ?? "");
    if (
      fields.length !== headers.length ||
      !validDate(date) ||
      !description ||
      description.length > MAX_LOCAL_DESCRIPTION_LENGTH ||
      category.length > MAX_LOCAL_CATEGORY_LENGTH ||
      amount === null ||
      amount <= 0 ||
      !/^[A-Z]{3}$/.test(currency)
    ) {
      issues.push({
        row,
        message:
          "Riga ignorata: formato, data ISO, importo positivo, valuta o testo non validi.",
      });
      continue;
    }
    entries.push({
      id: `local-${row}`,
      date,
      description,
      amount,
      currency,
      ...(category ? { category } : {}),
    });
  }
  return { entries, issues };
}

export function summarizeExpenses(entries: ExpenseEntry[]): ExpenseSummary {
  // Le categorie sono input del CSV: Map evita proprietà ereditate come
  // "__proto__" e "constructor" durante l'accumulo dei totali.
  const totalsCents = new Map<string, number>();
  const categoriesCents = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    const cents = Math.round(entry.amount * 100);
    const category = entry.category || "Senza categoria";
    totalsCents.set(
      entry.currency,
      (totalsCents.get(entry.currency) ?? 0) + cents,
    );
    const categoryTotals =
      categoriesCents.get(category) ?? new Map<string, number>();
    categoryTotals.set(
      entry.currency,
      (categoryTotals.get(entry.currency) ?? 0) + cents,
    );
    categoriesCents.set(category, categoryTotals);
  }
  return {
    entryCount: entries.length,
    totalsByCurrency: Object.fromEntries(
      [...totalsCents].map(([currency, cents]) => [currency, cents / 100]),
    ),
    byCategory: Object.fromEntries(
      [...categoriesCents].map(([category, totals]) => [
        category,
        Object.fromEntries(
          [...totals].map(([currency, cents]) => [currency, cents / 100]),
        ),
      ]),
    ),
  };
}
