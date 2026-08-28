import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(new URL(".", import.meta.url).pathname, "..");
const sourceRoots = ["app", "components", "hooks", "lib", "server", "shared"];

const ignoredDirectories = new Set(["node_modules", ".git", "dist", ".expo", "tests", "__tests__"]);
const allowedBoundaryFiles = new Set([
  "server/_core/index.ts",
  "server/routes/enable-banking.ts",
  "server/routes/codego.ts",
]);
const ignoredFiles = new Set([
  "financial-import-boundary.test.ts",
  "financial-surface-policy.test.ts",
  "phase-a-hardening.test.ts",
  "trpc-codego-boundary.test.ts",
]);

const forbiddenImportPatterns = [
  /from\s*["'][^"']*(?:use-codego-card|use-credit-card|crypto-backed-credit|contactless-payments|payment-notifications|spending-report|subscription-manager|codego-router)[^"']*["']/,
  /import\s*\(\s*["'][^"']*(?:use-codego-card|use-credit-card|crypto-backed-credit|contactless-payments|payment-notifications|spending-report|subscription-manager|codego-router)[^"']*["']\s*\)/,
  /from\s*["'][^"']*(?:wallester|codego|stripe|paypal|enable-banking)[^"']*["']/i,
  /import\s*\(\s*["'][^"']*(?:wallester|codego|stripe|paypal|enable-banking)[^"']*["']\s*\)/i,
];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) return [];
    if (ignoredFiles.has(entry.name)) return [];
    return [path];
  });
}

describe("financial import boundary", () => {
  it("does not introduce legacy or provider imports into active source code", () => {
    const violations = sourceRoots.flatMap((root) => {
      const directory = join(projectRoot, root);
      if (!statSync(directory, { throwIfNoEntry: false })) return [];
      return collectSourceFiles(directory).flatMap((file) => {
        const relativePath = relative(projectRoot, file);
        if (allowedBoundaryFiles.has(relativePath)) return [];
        const source = readFileSync(file, "utf8");
        return forbiddenImportPatterns.some((pattern) => pattern.test(source))
          ? [relative(projectRoot, file)]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
