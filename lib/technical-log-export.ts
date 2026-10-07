import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { MonitorSnapshot } from "./operational-status";
import { buildTechnicalLogCsv, technicalLogFilename } from "./technical-log-csv";

export { buildTechnicalLogCsv, technicalLogFilename } from "./technical-log-csv";

type SaveResult =
  | { status: "saved"; filename: string; mode: "device" | "download" }
  | { status: "cancelled" };

/** Only messages raised by this class may be displayed verbatim in the UI. */
export class DeviceSaveError extends Error {}

const LOCAL_AUTHORITY = "com.android.externalstorage.documents";
const LOCAL_ROOTS = new Set(["primary:Download", "primary:Documents"]);

/** Only the two explicitly approved top-level folders in Android's primary local storage. */
export function localStorageTreeId(uri: string): string | null {
  const match = /^content:\/\/com\.android\.externalstorage\.documents\/tree\/([^/?#]+)(?:\/document\/([^/?#]+))?$/.exec(uri);
  if (!match) return null;
  try {
    const treeId = decodeURIComponent(match[1]);
    if (!LOCAL_ROOTS.has(treeId)) return null;
    if (match[2] && decodeURIComponent(match[2]) !== treeId) return null;
    return treeId;
  } catch {
    return null;
  }
}

function matchesCreatedLocalFile(uri: string, treeId: string, filename: string): boolean {
  const prefix = `content://${LOCAL_AUTHORITY}/`;
  if (!uri.startsWith(prefix)) return false;
  const match = /^(?:document\/([^/?#]+)|tree\/([^/?#]+)\/document\/([^/?#]+))$/.exec(uri.slice(prefix.length));
  if (!match) return false;
  try {
    if (match[2] && decodeURIComponent(match[2]) !== treeId) return false;
    return decodeURIComponent(match[1] ?? match[3]) === `${treeId}/${filename}`;
  } catch {
    return false;
  }
}

export async function saveTechnicalLogOnDevice(entries: MonitorSnapshot[]): Promise<SaveResult> {
  // Validate the technical-only data before requesting any filesystem permission.
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new DeviceSaveError("Nessun dato tecnico disponibile da salvare.");
  }
  const csv = buildTechnicalLogCsv(entries);
  const filename = technicalLogFilename();

  if (Platform.OS === "web") {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      throw new DeviceSaveError("Download locale non disponibile in questo ambiente web.");
    }
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    try {
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
    return { status: "saved", filename, mode: "download" };
  }

  if (Platform.OS !== "android") {
    throw new DeviceSaveError("Salvataggio locale non disponibile su questo dispositivo.");
  }

  let initialUri: string | undefined;
  try {
    initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
  } catch {
    // Some Android providers ignore the initial location. The returned URI is
    // still checked against the strict local-only allowlist before any write.
  }
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
  if (!permission.granted) return { status: "cancelled" };

  const treeId = localStorageTreeId(permission.directoryUri);
  if (!treeId) {
    throw new DeviceSaveError("Scegli Download o Documenti nella memoria interna; le cartelle cloud non sono consentite.");
  }

  let createdUri: string | null = null;
  try {
    // SAF adds the CSV extension from the MIME type. Do not pass '.csv' twice.
    createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      filename.slice(0, -4),
      "text/csv",
    );
    if (!matchesCreatedLocalFile(createdUri, treeId, filename)) {
      throw new Error("Il provider locale ha restituito un percorso file inatteso.");
    }
    await FileSystem.writeAsStringAsync(createdUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    const actual = await FileSystem.readAsStringAsync(createdUri, { encoding: FileSystem.EncodingType.UTF8 });
    if (actual !== csv) throw new Error("Il file salvato non supera la verifica.");
    return { status: "saved", filename, mode: "device" };
  } catch {
    // Delete only a newly-created file whose exact local URI we can verify;
    // never delete an existing file or a URI returned by an unknown provider.
    let cleaned = false;
    if (createdUri && matchesCreatedLocalFile(createdUri, treeId, filename)) {
      try {
        await FileSystem.deleteAsync(createdUri, { idempotent: true });
        cleaned = true;
      } catch {
        // The user must check the selected local folder for a partial file.
      }
    }
    throw new DeviceSaveError(cleaned
      ? "Salvataggio non riuscito: il file incompleto è stato rimosso."
      : "Salvataggio non verificato: controlla la cartella locale ed elimina eventuali file incompleti.");
  }
}
