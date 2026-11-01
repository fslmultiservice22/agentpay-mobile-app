import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requiredPreviewVariables = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_APP_ID",
  "EXPO_PUBLIC_OAUTH_PORTAL_URL",
  "EXPO_PUBLIC_OAUTH_SERVER_URL",
  "EXPO_PUBLIC_OWNER_NAME",
  "EXPO_PUBLIC_OWNER_OPEN_ID",
] as const;

const mocks = vi.hoisted(() => ({
  spawnSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({ spawnSync: mocks.spawnSync }));

const expoConfig = JSON.stringify({
  name: "AgentPay Wallet",
  slug: "agentpay-mobile-app",
  owner: "trading23",
  version: "1.1.1",
  android: { package: "space.manus.agentpay.mobile.app.t20260512140915" },
  extra: { localCsvPilotBuildAllowed: false },
});

const envFixture = requiredPreviewVariables
  .map((name, index) => {
    const value = index === 0
      ? "https://synthetic.example.test/api?token=SYNTHETIC_VALUE&next=a=b"
      : `SYNTHETIC_VALUE_${index}`;
    return `\u001b[1m${name}\u001b[22m=${value}`;
  })
  .join("\r\n");

function successfulSpawn(command: string, args: string[]) {
  if (command === "npx" && args[0] === "expo") return { status: 0, stdout: expoConfig, stderr: "" };
  if (args.includes("whoami")) return { status: 0, stdout: "trading23\n", stderr: "" };
  if (args.includes("build:version:get")) {
    return { status: 0, stdout: "Android versionCode - 10246\n", stderr: "" };
  }
  if (args.includes("env:list")) return { status: 0, stdout: envFixture, stderr: "" };
  throw new Error(`Unexpected subprocess: ${command} ${args.join(" ")}`);
}

describe("EAS preview environment preflight", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("EAS_PREFLIGHT_OFFLINE", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("estrae deterministicamente i sei nomi dal formato short reale, senza valori", async () => {
    const { parseEasShortVariableNames } = await import("../scripts/eas-preview-variable-names.mjs");
    const fixture = `${envFixture}\r\nNOT_A_VARIABLE whitespace value\r\nvalue mentions prefixEXPO_PUBLIC_APP_ID=not-a-name`;

    expect(parseEasShortVariableNames(fixture)).toEqual(new Set(requiredPreviewVariables));
    expect(parseEasShortVariableNames(fixture)).not.toContain("SYNTHETIC_VALUE_1");
    expect(parseEasShortVariableNames("EXPO_PUBLIC_APP_ID SYNTHETIC_VALUE\n"))
      .toEqual(new Set());
  });

  it("verifica il preflight con output EAS sintetico e non stampa mai valori", async () => {
    mocks.spawnSync.mockImplementation(successfulSpawn);
    const logs: string[] = [];
    const errors: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));

    await import("../scripts/verify-eas-prelaunch.mjs");

    const output = logs.join("\n");
    for (const name of requiredPreviewVariables) expect(output).toContain(name);
    expect(output).toContain('"present"');
    expect(output).not.toContain("SYNTHETIC_VALUE");
    expect(output).not.toContain("token=");
    expect(errors).toEqual([]);
    expect(logSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("in offline interroga solo expo config e marca tutti i nomi skipped-offline", async () => {
    vi.stubEnv("EAS_PREFLIGHT_OFFLINE", "1");
    mocks.spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "npx" && args[0] === "expo") return { status: 0, stdout: expoConfig, stderr: "" };
      throw new Error(`Unexpected offline subprocess: ${command} ${args.join(" ")}`);
    });
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../scripts/verify-eas-prelaunch.mjs");

    expect(mocks.spawnSync).toHaveBeenCalledTimes(1);
    expect(mocks.spawnSync).toHaveBeenCalledWith(
      "npx",
      ["expo", "config", "--type", "public", "--json"],
      expect.objectContaining({ encoding: "utf8" }),
    );
    const result = JSON.parse(logs.at(-1) ?? "{}");
    expect(result.previewVariablePresence).toEqual(
      Object.fromEntries(requiredPreviewVariables.map((name) => [name, "skipped-offline"])),
    );
  });

  it("segnala soltanto il nome mancante senza propagare valori EAS", async () => {
    const missingName = requiredPreviewVariables.at(-1)!;
    const missingFixture = envFixture
      .split("\r\n")
      .filter((line) => !line.includes(missingName))
      .join("\r\n");
    mocks.spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "npx" && args[0] === "expo") return { status: 0, stdout: expoConfig, stderr: "" };
      if (args.includes("whoami")) return { status: 0, stdout: "trading23\n", stderr: "" };
      if (args.includes("build:version:get")) {
        return { status: 0, stdout: "Android versionCode - 10246\n", stderr: "" };
      }
      if (args.includes("env:list")) return { status: 0, stdout: missingFixture, stderr: "" };
      throw new Error(`Unexpected subprocess: ${command} ${args.join(" ")}`);
    });
    const logs: string[] = [];
    const errors: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    await expect(import("../scripts/verify-eas-prelaunch.mjs")).rejects.toThrow("process.exit(1)");
    const output = `${logs.join("\n")}\n${errors.join("\n")}`;
    expect(output).toContain(missingName);
    expect(output).not.toContain("SYNTHETIC_VALUE");
    expect(output).not.toContain("token=");
  });

  it("nasconde stdout, stderr ed error.message quando env:list fallisce", async () => {
    const failure = "SYNTHETIC_ENV_FAILURE_SENTINEL";
    mocks.spawnSync.mockImplementation((command: string, args: string[]) => {
      if (command === "npx" && args[0] === "expo") return { status: 0, stdout: expoConfig, stderr: "" };
      if (args.includes("whoami")) return { status: 0, stdout: "trading23\n", stderr: "" };
      if (args.includes("build:version:get")) {
        return { status: 0, stdout: "Android versionCode - 10246\n", stderr: "" };
      }
      return {
        status: 1,
        stdout: `stdout ${failure}`,
        stderr: `stderr ${failure}`,
        error: new Error(`error.message ${failure}`),
      };
    });
    const logs: string[] = [];
    const errors: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    await expect(import("../scripts/verify-eas-prelaunch.mjs")).rejects.toThrow("process.exit(1)");
    const output = `${logs.join("\n")}\n${errors.join("\n")}`;
    expect(output).not.toContain(failure);
    expect(output).not.toContain("stdout");
    expect(output).not.toContain("stderr");
    expect(output).not.toContain("error.message");
  });
});
