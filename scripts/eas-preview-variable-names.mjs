import { stripVTControlCharacters } from "node:util";

/**
 * EAS CLI 23.2.0 env:list --format short emits bold(NAME)=VALUE, not
 * whitespace-separated columns. Extract names only: never return values.
 * Empty, redacted, and values containing '=' all represent a present name.
 */
export function parseEasShortVariableNames(output) {
  const names = new Set();
  for (const line of output.split(/\r?\n/u)) {
    const match = stripVTControlCharacters(line).match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)=/u,
    );
    if (match) names.add(match[1]);
  }
  return names;
}
