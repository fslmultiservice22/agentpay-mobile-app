import { describe, expect, it } from "vitest";
import { parseAdbDevices, selectAuthorizedPhysicalDevice } from "../scripts/check-android-device.mjs";

describe("readiness del telefono Android fisico", () => {
  it("distingue un emulatore da un telefono e non interpreta la riga introduttiva", () => {
    const devices = parseAdbDevices("List of devices attached\nemulator-5554\tdevice product:sdk\nABC123\tunauthorized usb:1-1\n");
    expect(devices).toEqual([
      { serial: "emulator-5554", state: "device", emulator: true },
      { serial: "ABC123", state: "unauthorized", emulator: false },
    ]);
  });

  it("consente un solo telefono autorizzato, anche se un emulatore è disponibile", () => {
    const devices = parseAdbDevices("List of devices attached\nemulator-5554\tdevice\nABC123\tdevice usb:1-1\n");
    expect(selectAuthorizedPhysicalDevice(devices)).toBe("ABC123");
  });

  it.each([
    ["nessun telefono", "List of devices attached\n"],
    ["solo emulatore", "List of devices attached\nemulator-5554\tdevice\n"],
    ["telefono offline", "List of devices attached\nABC123\toffline\n"],
    ["telefono non autorizzato", "List of devices attached\nABC123\tunauthorized\n"],
    ["due telefoni", "List of devices attached\nABC123\tdevice\nDEF456\tdevice\n"],
  ])("blocca %s", (_label, output) => {
    expect(() => selectAuthorizedPhysicalDevice(parseAdbDevices(output))).toThrow(/telefono fisico autorizzato/);
  });
});
