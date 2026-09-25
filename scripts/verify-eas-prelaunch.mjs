import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const expected = {
  name: "AgentPay Wallet",
  slug: "agentpay-mobile-app",
  owner: "trading23",
  version: "1.1.1",
  androidPackage: "space.manus.agentpay.mobile.app.t20260512140915",
  minimumRemoteVersionCode: 10235,
};
const requiredPreviewVariables = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_APP_ID",
  "EXPO_PUBLIC_OAUTH_PORTAL_URL",
  "EXPO_PUBLIC_OAUTH_SERVER_URL",
  "EXPO_PUBLIC_OWNER_NAME",
  "EXPO_PUBLIC_OWNER_OPEN_ID",
];

function fail(message) {
  console.error(`PRELAUNCH_CHECK_FAILED: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "comando fallito").trim().split("\n").slice(-3).join(" | ");
    fail(`${command} ${args.join(" ")} — ${detail}`);
  }

  return result.stdout.trim();
}

const easConfig = JSON.parse(readFileSync(resolve(projectRoot, "eas.json"), "utf8"));
const prelaunch = easConfig?.build?.prelaunch;
const rootRoute = readFileSync(resolve(projectRoot, "server/routes/root.ts"), "utf8");
const bankingPolicy = readFileSync(resolve(projectRoot, "lib/enable-banking-sandbox-policy.ts"), "utf8");

if (easConfig?.cli?.version !== ">= 23.2.0") fail("versione EAS CLI non fissata a >= 23.2.0");
if (easConfig?.cli?.appVersionSource !== "remote") fail("appVersionSource deve restare remote");
if (prelaunch?.node !== "22.14.0") fail("il profilo prelaunch deve usare Node 22.14.0");
if (prelaunch?.environment !== "preview") fail("il profilo prelaunch deve usare l'ambiente preview");
if (prelaunch?.distribution !== "internal") fail("il profilo prelaunch deve restare internal");
if (prelaunch?.developmentClient !== false) fail("developmentClient deve essere false");
if (prelaunch?.autoIncrement !== true) fail("autoIncrement deve essere true");
if (prelaunch?.android?.buildType !== "apk") fail("il profilo prelaunch deve produrre un APK");
if (prelaunch?.android?.credentialsSource !== "remote") fail("il profilo prelaunch deve usare credenziali remote");
if (easConfig?.submit?.prelaunch) fail("il profilo prelaunch non deve avere configurazione submit");
if (!rootRoute.includes("financialServicesEnabled: false")) fail("la root tecnica non dichiara i servizi finanziari disattivati");
for (const disabledFlag of ["networkRequestsAllowed: false", "consentAllowed: false", "registrationAllowed: false"]) {
  if (!bankingPolicy.includes(disabledFlag)) fail(`policy finanziaria non protetta: ${disabledFlag}`);
}

const expoJson = run("npx", ["expo", "config", "--type", "public", "--json"]);
const expoConfig = JSON.parse(expoJson);

if (expoConfig.name !== expected.name) fail(`nome app inatteso: ${expoConfig.name}`);
if (expoConfig.slug !== expected.slug) fail(`slug inatteso: ${expoConfig.slug}`);
if (expoConfig.owner !== expected.owner) fail(`owner inatteso: ${expoConfig.owner}`);
if (expoConfig.version !== expected.version) fail(`versione inattesa: ${expoConfig.version}`);
if (expoConfig.android?.package !== expected.androidPackage) fail(`package Android inatteso: ${expoConfig.android?.package}`);

const offline = process.env.EAS_PREFLIGHT_OFFLINE === "1";
let remoteVersionCode = null;
if (!offline) {
  const whoami = run("npx", ["eas-cli@23.2.0", "whoami"]);
  const availableIdentities = whoami.split("\n").map((line) => line.trim().replace(/^•\s*/, ""));
  const ownerIsAvailable = availableIdentities.some(
    (line) => line === expected.owner || line.startsWith(`${expected.owner} (`),
  );
  if (!ownerIsAvailable) fail("account EAS owner non disponibile nella sessione corrente");

  const remoteVersionOutput = run("npx", [
    "eas-cli@23.2.0",
    "build:version:get",
    "--platform",
    "android",
    "--non-interactive",
  ]);
  const remoteVersionMatch = remoteVersionOutput.match(/Android versionCode\s*-\s*(\d+)/i);
  if (!remoteVersionMatch) fail("versionCode Android remoto non leggibile");
  remoteVersionCode = Number(remoteVersionMatch[1]);
  if (remoteVersionCode < expected.minimumRemoteVersionCode) {
    fail(
      `versionCode remoto ${remoteVersionCode} inferiore alla baseline sicura ${expected.minimumRemoteVersionCode}; impostarlo prima della build`,
    );
  }

  const previewEnvironmentOutput = run("npx", [
    "eas-cli@23.2.0",
    "env:list",
    "preview",
    "--format",
    "short",
  ]);
  const availablePreviewVariables = new Set(
    previewEnvironmentOutput
      .split("\n")
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s/)?.[1])
      .filter(Boolean),
  );
  const missingPreviewVariables = requiredPreviewVariables.filter(
    (name) => !availablePreviewVariables.has(name),
  );
  if (missingPreviewVariables.length > 0) {
    fail(`variabili pubbliche mancanti nell'ambiente EAS preview: ${missingPreviewVariables.join(", ")}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      profile: "prelaunch",
      platform: "android",
      buildType: "apk",
      distribution: "internal",
      environment: "preview",
      node: "22.14.0",
      appVersion: expected.version,
      package: expected.androidPackage,
      owner: expected.owner,
      accountCheck: offline ? "skipped-offline" : "verified",
      remoteVersionCode: offline ? "skipped-offline" : remoteVersionCode,
      minimumRemoteVersionCode: expected.minimumRemoteVersionCode,
      previewVariableCheck: offline ? "skipped-offline" : "verified",
      submitConfigured: false,
      financialServicesEnabled: false,
    },
    null,
    2,
  ),
);
