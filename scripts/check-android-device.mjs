import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** ADB output is parsed without writing device identifiers to logs or artifacts. */
export function parseAdbDevices(output) {
  return output.split(/\r?\n/).map((line) => {
    const m = /^(\S+)\s+(device|unauthorized|offline|recovery|sideload)(?:\s|$)/.exec(line.trim());
    return m ? { serial: m[1], state: m[2], emulator: /^emulator-\d+$/.test(m[1]) } : null;
  }).filter(Boolean);
}

export function selectAuthorizedPhysicalDevice(devices) {
  const physical = devices.filter((d) => !d.emulator);
  if (physical.length !== 1 || physical[0].state !== "device") {
    throw new Error("Serve un solo telefono fisico autorizzato da adb; controlla USB debugging e il dialogo RSA sul telefono.");
  }
  return physical[0].serial;
}

function adb(args) {
  const result = spawnSync(process.env.ADB_PATH || "adb", args, { encoding: "utf8", timeout: 7000 });
  if (result.error) {
    throw new Error(result.error.code === "ENOENT" ? "Android platform-tools (adb) non installato su questo computer." : "adb non disponibile entro sette secondi.");
  }
  if (result.status !== 0) throw new Error("adb non risponde correttamente; verifica l'installazione e la connessione USB.");
  return result.stdout.trim();
}

function main() {
  const serial = selectAuthorizedPhysicalDevice(parseAdbDevices(adb(["devices", "-l"])));
  if (adb(["-s", serial, "shell", "getprop", "ro.kernel.qemu"]) === "1") {
    throw new Error("Il dispositivo individuato è virtuale, non un telefono Android fisico.");
  }
  const version = adb(["-s", serial, "shell", "getprop", "ro.build.version.release"]);
  console.log(JSON.stringify({ ok: true, physical: true, authorized: true, androidVersion: version, installed: false, built: false }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (e) { console.error(`ANDROID_DEVICE_CHECK_BLOCKED: ${e.message}`); process.exitCode = 2; }
}
