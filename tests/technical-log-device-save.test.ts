import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonitorSnapshot } from "../lib/operational-status";

const mock = vi.hoisted(() => ({
  platform: { OS: "android" },
  getInitial: vi.fn(),
  request: vi.fn(),
  create: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: mock.platform }));
vi.mock("expo-file-system/legacy", () => ({
  EncodingType: { UTF8: "utf8" },
  StorageAccessFramework: {
    getUriForDirectoryInRoot: mock.getInitial,
    requestDirectoryPermissionsAsync: mock.request,
    createFileAsync: mock.create,
  },
  writeAsStringAsync: mock.write,
  readAsStringAsync: mock.read,
  deleteAsync: mock.remove,
}));

import { localStorageTreeId, saveTechnicalLogOnDevice } from "../lib/technical-log-export";
import { buildTechnicalLogCsv } from "../lib/technical-log-csv";

const entries: MonitorSnapshot[] = [{
  checkedAt: "2026-08-25T19:40:00.000Z",
  overallStatus: "healthy",
  checks: [
    { id: "api", label: "Backend", status: "healthy", detail: "Stato tecnico." },
    { id: "runtime", label: "Runtime", status: "healthy", detail: "Processo attivo." },
    { id: "financial_policy", label: "Policy Fase A", status: "healthy", detail: "Operazioni disattivate." },
  ],
}];
const downloadTree = "content://com.android.externalstorage.documents/tree/primary%3ADownload";
const documentTree = "content://com.android.externalstorage.documents/tree/primary%3ADocuments";
const documentInitialUri = "content://com.android.externalstorage.documents/tree/primary:Documents/document/primary:Documents";

beforeEach(() => {
  mock.platform.OS = "android";
  for (const fn of [mock.getInitial, mock.request, mock.create, mock.write, mock.read, mock.remove]) fn.mockReset();
  mock.getInitial.mockReturnValue(documentInitialUri);
  mock.request.mockResolvedValue({ granted: true, directoryUri: downloadTree });
  mock.create.mockImplementation(async (_dir: string, name: string) =>
    `content://com.android.externalstorage.documents/document/primary%3ADownload%2F${name}.csv`);
  mock.write.mockResolvedValue(undefined);
  mock.read.mockResolvedValue(buildTechnicalLogCsv(entries));
  mock.remove.mockResolvedValue(undefined);
});

describe("salvataggio CSV sul dispositivo, senza cloud", () => {
  it("accetta solo i due alberi primari locali esatti", () => {
    expect(localStorageTreeId(downloadTree)).toBe("primary:Download");
    expect(localStorageTreeId(documentTree)).toBe("primary:Documents");
    expect(localStorageTreeId(`${downloadTree}/document/primary%3ADownload`)).toBe("primary:Download");
    expect(localStorageTreeId(`${downloadTree}%2FCloud`)).toBeNull();
    expect(localStorageTreeId("content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fsub"))
      .toBeNull();
    expect(localStorageTreeId("content://com.google.android.apps.docs.storage/tree/primary%3ADownload"))
      .toBeNull();
    expect(localStorageTreeId("content://com.android.externalstorage.documents.evil/tree/primary%3ADownload"))
      .toBeNull();
    expect(localStorageTreeId("content://com.android.externalstorage.documents/tree/primary%3ADownload?x=1"))
      .toBeNull();
  });

  it("salva e rilegge il CSV solo nella cartella locale selezionata, senza share sheet", async () => {
    const result = await saveTechnicalLogOnDevice(entries);
    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("Unexpected cancelled result");
    expect(result.mode).toBe("device");
    expect(result.filename).toMatch(/^agentpay-registro-tecnico-.*\.csv$/);
    expect(mock.getInitial).toHaveBeenCalledWith("Documents");
    expect(mock.request).toHaveBeenCalledWith(documentInitialUri);
    expect(mock.create).toHaveBeenCalledWith(downloadTree, result.filename.slice(0, -4), "text/csv");
    expect(mock.write).toHaveBeenCalledWith(expect.stringContaining("/document/primary%3ADownload%2F"), buildTechnicalLogCsv(entries), { encoding: "utf8" });
    expect(mock.read).toHaveBeenCalledTimes(1);
    expect(mock.remove).not.toHaveBeenCalled();
  });

  it("accetta una URI file tree/document solo nello stesso albero Download", async () => {
    mock.create.mockImplementation(async (_dir: string, name: string) =>
      `content://com.android.externalstorage.documents/tree/primary%3ADownload/document/primary%3ADownload%2F${name}.csv`);
    const result = await saveTechnicalLogOnDevice(entries);
    expect(result.status).toBe("saved");
    expect(mock.write).toHaveBeenCalledTimes(1);
  });

  it("salva anche in Documenti della memoria primaria, mai in un provider esterno", async () => {
    mock.request.mockResolvedValue({ granted: true, directoryUri: documentTree });
    mock.create.mockImplementation(async (_dir: string, name: string) =>
      `content://com.android.externalstorage.documents/document/primary%3ADocuments%2F${name}.csv`);
    const result = await saveTechnicalLogOnDevice(entries);
    expect(result.status).toBe("saved");
    expect(mock.request).toHaveBeenCalledWith(documentInitialUri);
    expect(mock.create).toHaveBeenCalledWith(documentTree, expect.any(String), "text/csv");
  });

  it("verifica comunque la directory restituita se il suggerimento iniziale non è disponibile", async () => {
    mock.getInitial.mockImplementation(() => { throw new Error("initial location unavailable"); });
    const result = await saveTechnicalLogOnDevice(entries);
    expect(result.status).toBe("saved");
    expect(mock.request).toHaveBeenCalledWith(undefined);
    expect(mock.create).toHaveBeenCalledWith(downloadTree, expect.any(String), "text/csv");
  });

  it("rifiuta una URI file restituita sotto un albero diverso", async () => {
    mock.create.mockImplementation(async (_dir: string, name: string) =>
      `content://com.android.externalstorage.documents/tree/primary%3ADocuments/document/primary%3ADownload%2F${name}.csv`);
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("Salvataggio non verificato");
    expect(mock.write).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });

  it("annulla senza creare alcun file", async () => {
    mock.request.mockResolvedValue({ granted: false });
    expect(await saveTechnicalLogOnDevice(entries)).toEqual({ status: "cancelled" });
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.write).not.toHaveBeenCalled();
  });

  it("rifiuta Drive e altri provider prima della creazione", async () => {
    mock.request.mockResolvedValue({ granted: true, directoryUri: "content://com.google.android.apps.docs.storage/tree/example" });
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("cartelle cloud non sono consentite");
    expect(mock.create).not.toHaveBeenCalled();
  });

  it("rifiuta un file con URI restituita da un provider inatteso senza scrivere o cancellare", async () => {
    mock.create.mockResolvedValue("content://com.google.android.apps.docs.storage/document/other");
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("Salvataggio non verificato");
    expect(mock.write).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });

  it("pulisce il file locale appena creato se la scrittura fallisce", async () => {
    mock.write.mockRejectedValue(new Error("test failure"));
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("file incompleto è stato rimosso");
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });

  it("pulisce il file locale se la rilettura non corrisponde", async () => {
    mock.read.mockResolvedValue("incomplete");
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("file incompleto è stato rimosso");
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });

  it("non dichiara pulizia riuscita se il provider non consente di eliminare un file parziale", async () => {
    mock.write.mockRejectedValue(new Error("test failure"));
    mock.remove.mockRejectedValue(new Error("test cleanup failure"));
    await expect(saveTechnicalLogOnDevice(entries)).rejects.toThrow("controlla la cartella locale");
  });

  it("non richiede permessi quando i dati tecnici non sono validi", async () => {
    await expect(saveTechnicalLogOnDevice([])).rejects.toThrow();
    expect(mock.request).not.toHaveBeenCalled();
  });
});
