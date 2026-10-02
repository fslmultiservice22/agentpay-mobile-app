import Papa from "papaparse";

export const MAX_CSV_BYTES = 512 * 1024;
export const MAX_CSV_ROWS = 2000;

const EXPECTED_COLUMNS = ["data", "descrizione", "importo", "valuta"];

export type LocalCsvMovement = {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  currency: "EUR";
};

export type LocalCsvStatement = {
  movements: LocalCsvMovement[];
};

export type LocalCsvMonth = {
  month: string;
  incomeCents: number;
  expenseCents: number;
  count: number;
};

export class LocalCsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalCsvImportError";
  }
}

function parseDate(value: string, row: number): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new LocalCsvImportError(`Data non valida alla riga ${row}. Usa GG/MM/AAAA.`);
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (year < 1900 || year > 2100) {
    throw new LocalCsvImportError(`Anno non valido alla riga ${row}.`);
  }
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new LocalCsvImportError(`Data non valida alla riga ${row}.`);
  }
  return `${yearText}-${monthText}-${dayText}`;
}

function parseAmount(value: string, row: number): number {
  const match = /^([+-]?)(0|[1-9]\d{0,8}),(\d{2})$/.exec(value.trim());
  if (!match) throw new LocalCsvImportError(`Importo non valido alla riga ${row}. Usa -12,50 o 12,50.`);
  const cents = Number(match[2]) * 100 + Number(match[3]);
  if (!Number.isSafeInteger(cents)) throw new LocalCsvImportError(`Importo troppo alto alla riga ${row}.`);
  if (cents === 0) throw new LocalCsvImportError(`Importo zero non ammesso alla riga ${row}.`);
  return match[1] === "-" ? -cents : cents;
}

export function parseLocalCsvStatement(input: string): LocalCsvStatement {
  if (!input.trim()) throw new LocalCsvImportError("Il CSV è vuoto.");
  if (input.length > MAX_CSV_BYTES) throw new LocalCsvImportError("Il CSV supera il limite di 512 KiB.");
  if (typeof TextEncoder !== "function") {
    throw new LocalCsvImportError("Impossibile verificare la dimensione UTF-8 su questo dispositivo.");
  }
  if (new TextEncoder().encode(input).byteLength > MAX_CSV_BYTES) {
    throw new LocalCsvImportError("Il CSV supera il limite di 512 KiB.");
  }
  if (input.includes("\uFFFD")) throw new LocalCsvImportError("Il CSV contiene un carattere di sostituzione non supportato.");

  // TextEncoder silently replaces lone UTF-16 surrogates; reject them before parsing.
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = input.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) throw new LocalCsvImportError("Il CSV contiene Unicode non valido.");
      index += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      throw new LocalCsvImportError("Il CSV contiene Unicode non valido.");
    }
  }

  const normalizedInput = input.startsWith("\uFEFF") ? input.slice(1) : input;
  if (/\r(?!\n)/.test(normalizedInput)) {
    throw new LocalCsvImportError("Terminatori di riga non validi: usa LF o CRLF.");
  }
  if (normalizedInput.split(/\r?\n/, 1)[0] !== EXPECTED_COLUMNS.join(";")) {
    throw new LocalCsvImportError("Colonne richieste, nell'ordine: data;descrizione;importo;valuta. Altre colonne non sono accettate.");
  }
  if (normalizedInput.includes("\uFEFF")) {
    throw new LocalCsvImportError("BOM UTF-8 ammesso solo all'inizio del CSV.");
  }

  const parsed = Papa.parse<Record<string, string>>(normalizedInput, {
    delimiter: ";",
    header: true,
    // Only physically blank rows are ignorable; `;;;` must reach field validation.
    skipEmptyLines: true,
    dynamicTyping: false,
    fastMode: false,
  });
  const columns = parsed.meta.fields ?? [];
  if (columns.length !== EXPECTED_COLUMNS.length ||
    columns.some((column, index) => column !== EXPECTED_COLUMNS[index])) {
    throw new LocalCsvImportError("Colonne richieste, nell'ordine: data;descrizione;importo;valuta. Altre colonne non sono accettate.");
  }
  if (parsed.errors.length) throw new LocalCsvImportError("Il CSV contiene righe malformate o colonne mancanti.");
  if (parsed.data.length === 0) throw new LocalCsvImportError("Il CSV non contiene movimenti.");
  if (parsed.data.length > MAX_CSV_ROWS) throw new LocalCsvImportError("Il CSV supera il limite di 2000 movimenti.");

  const movements = parsed.data.map((item, index): LocalCsvMovement => {
    const row = index + 2;
    const description = item.descrizione?.trim().replace(/\s+/g, " ") ?? "";
    if (!description || Array.from(description).length > 160) {
      throw new LocalCsvImportError(`Descrizione vuota o troppo lunga alla riga ${row}.`);
    }
    if (item.valuta?.trim() !== "EUR") {
      throw new LocalCsvImportError(`Valuta non supportata alla riga ${row}: è ammesso solo EUR.`);
    }
    return {
      id: String(row),
      date: parseDate(item.data ?? "", row),
      description,
      amountCents: parseAmount(item.importo ?? "", row),
      currency: "EUR",
    };
  });

  // Preserve all rows, including genuinely identical movements: no silent deduplication.
  return { movements };
}

export function summarizeLocalCsvMonths(movements: LocalCsvMovement[]): LocalCsvMonth[] {
  const byMonth = new Map<string, LocalCsvMonth>();
  for (const movement of movements) {
    const month = movement.date.slice(0, 7);
    const summary = byMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0, count: 0 };
    if (movement.amountCents >= 0) summary.incomeCents += movement.amountCents;
    else summary.expenseCents += -movement.amountCents;
    summary.count += 1;
    byMonth.set(month, summary);
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}
