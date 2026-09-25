import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { MonitorSnapshot } from "@/lib/operational-status";
import { buildTechnicalLogCsv, technicalLogFilename } from "@/lib/technical-log-csv";

export { buildTechnicalLogCsv, technicalLogFilename } from "@/lib/technical-log-csv";

export async function exportTechnicalLogLocally(entries: MonitorSnapshot[]): Promise<{ filename: string; mode: "download" | "share" }> {
  const filename = technicalLogFilename();
  const csv = buildTechnicalLogCsv(entries);

  if (Platform.OS === "web") {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      throw new Error("Download locale non disponibile in questo ambiente web.");
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return { filename, mode: "download" };
  }

  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error("Archivio locale non disponibile sul dispositivo.");
  const uri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Condivisione locale non disponibile sul dispositivo.");
  }
  await Sharing.shareAsync(uri, { dialogTitle: "Esporta registro tecnico AgentPay", mimeType: "text/csv" });
  return { filename, mode: "share" };
}
