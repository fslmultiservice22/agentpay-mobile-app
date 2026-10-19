import { describe, expect, it } from "vitest";
import {
  MAX_LOCAL_CSV_BYTES,
  MAX_LOCAL_CATEGORY_LENGTH,
  MAX_LOCAL_DESCRIPTION_LENGTH,
  parseExpenseCsv,
  summarizeExpenses,
} from "../lib/local-expense-csv-adapter";

describe("pilota CSV locale (solo dati sintetici)", () => {
  it("legge importi italiani con separatore semicolon", () => {
    const parsed = parseExpenseCsv(
      "data;descrizione;importo;valuta;categoria\n2026-09-01;Categoria A;12,50;EUR;Casa\n2026-09-02;Categoria B;8,00;EUR;Mobilità",
    );
    expect(parsed.issues).toEqual([]);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toMatchObject({ amount: 12.5, currency: "EUR" });
  });

  it("gestisce virgolette, separatori e righe multiple", () => {
    const parsed = parseExpenseCsv(
      'date,description,amount,currency\n2026-09-01,"Categoria, generica",4.20,EUR\n2026-09-02,"Descrizione\nfittizia",2.10,EUR',
    );
    expect(parsed.issues).toEqual([]);
    expect(parsed.entries[0].description).toBe("Categoria, generica");
    expect(parsed.entries[1].description).toBe("Descrizione\nfittizia");
    expect(parsed.entries[1].id).toBe("local-3");
  });

  it("segnala righe incomplete e date impossibili senza esporre il contenuto", () => {
    const parsed = parseExpenseCsv(
      "data;descrizione;importo\n2026-02-30;Fittizio;12,00\n2026-09-02;Secondo;",
    );
    expect(parsed.entries).toHaveLength(0);
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.issues[0].row).toBe(2);
    expect(parsed.issues[0].message).not.toContain("Fittizio");
  });

  it("rifiuta colonne extra o duplicate", () => {
    expect(
      parseExpenseCsv("data;descrizione;importo;iban\n2026-09-01;A;5,00;test")
        .entries,
    ).toEqual([]);
    expect(
      parseExpenseCsv(
        "data;descrizione;importo;importo\n2026-09-01;A;5,00;5,00",
      ).entries,
    ).toEqual([]);
  });

  it("rifiuta identificativi anche in una sola riga, senza anteprima parziale", () => {
    const parsed = parseExpenseCsv(
      "data;descrizione;importo\n2026-09-01;Test;5,00\n2026-09-02;me@example.com;9,00",
    );
    expect(parsed.entries).toEqual([]);
    expect(parsed.issues[0].message).not.toContain("me@example.com");
  });

  it("rifiuta importi negativi e formati fuori schema", () => {
    expect(
      parseExpenseCsv("data;descrizione;importo\n2026-09-01;Rimborso;-10,00")
        .entries,
    ).toEqual([]);
    expect(
      parseExpenseCsv("data;descrizione;importo\n2026-09-01;A;1.234,56")
        .entries,
    ).toEqual([]);
    expect(
      parseExpenseCsv('data;descrizione;importo\n2026-09-01;"Non chiuso;10,00')
        .issues[0].message,
    ).toContain("virgolette");
  });

  it("impone il limite del file prima di eseguire parsing", () => {
    expect(
      parseExpenseCsv("X".repeat(MAX_LOCAL_CSV_BYTES + 1)).issues[0].message,
    ).toContain("100 KB");
  });

  it("rifiuta descrizioni e categorie eccessive senza divulgarne il contenuto", () => {
    const longDescription = "D".repeat(MAX_LOCAL_DESCRIPTION_LENGTH + 1);
    const longCategory = "C".repeat(MAX_LOCAL_CATEGORY_LENGTH + 1);
    for (const row of [
      `2026-09-01;${longDescription};1,00;EUR;Categoria A`,
      `2026-09-01;Descrizione A;1,00;EUR;${longCategory}`,
    ]) {
      const parsed = parseExpenseCsv(
        `data;descrizione;importo;valuta;categoria\n${row}`,
      );
      expect(parsed.entries).toEqual([]);
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.issues[0].message).not.toContain(longDescription);
      expect(parsed.issues[0].message).not.toContain(longCategory);
    }
  });

  it("riepiloga centesimi e valute senza mescolarle", () => {
    const parsed = parseExpenseCsv(
      "data;descrizione;importo;valuta;categoria\n2026-09-01;A;0,10;EUR;Casa\n2026-09-02;B;0,20;EUR;Casa\n2026-09-03;C;1,00;USD;Casa",
    );
    expect(summarizeExpenses(parsed.entries)).toEqual({
      entryCount: 3,
      totalsByCurrency: { EUR: 0.3, USD: 1 },
      byCategory: { Casa: { EUR: 0.3, USD: 1 } },
    });
  });

  it("tratta __proto__ e constructor come categorie ordinarie senza modificare Object.prototype", () => {
    const parsed = parseExpenseCsv(
      "data;descrizione;importo;valuta;categoria\n2026-09-01;A;2,00;EUR;__proto__\n2026-09-02;B;3,00;EUR;constructor",
    );
    expect(parsed.issues).toEqual([]);
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, "EUR");
    try {
      const summary = summarizeExpenses(parsed.entries);
      expect(summary.entryCount).toBe(2);
      expect(summary.totalsByCurrency.EUR).toBe(5);
      expect(
        Object.prototype.hasOwnProperty.call(summary.byCategory, "__proto__"),
      ).toBe(true);
      expect(
        Object.getOwnPropertyDescriptor(summary.byCategory, "__proto__")?.value
          .EUR,
      ).toBe(2);
      expect(
        Object.getOwnPropertyDescriptor(summary.byCategory, "constructor")
          ?.value.EUR,
      ).toBe(3);
      expect(Object.getOwnPropertyDescriptor(Object.prototype, "EUR")).toEqual(
        previous,
      );
    } finally {
      if (previous) Reflect.defineProperty(Object.prototype, "EUR", previous);
      else Reflect.deleteProperty(Object.prototype, "EUR");
    }
  });
});
