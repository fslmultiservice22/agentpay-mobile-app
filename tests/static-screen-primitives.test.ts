import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const notificationSettings = readFileSync(
  new URL("../app/notification-settings.tsx", import.meta.url),
  "utf8",
);
const monthlyComparison = readFileSync(
  new URL("../app/monthly-comparison.tsx", import.meta.url),
  "utf8",
);

function indexOfOrThrow(source: string, value: string) {
  const index = source.indexOf(value);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("primitive statiche delle schermate", () => {
  it("usa componenti notifiche estratti e un singolo import Expo Router", () => {
    expect(notificationSettings).toContain(
      'from "@/components/notification-settings-primitives"',
    );
    expect(notificationSettings).toContain(
      'import { useFocusEffect, useRouter } from "expo-router"',
    );
    expect(notificationSettings).not.toMatch(
      /const\s+(SectionTitle|ToggleRow)\s*=/,
    );
  });

  it("dichiara grafici fuori dal render e carica lo storico nel callback di focus", () => {
    expect(monthlyComparison).toMatch(/function BarChart\(/);
    expect(monthlyComparison).toMatch(/function SavingsRateChart\(/);
    expect(monthlyComparison).not.toMatch(
      /const\s+(BarChart|SavingsRateChart)\s*=/,
    );
    expect(monthlyComparison).toContain(
      'import { useFocusEffect, useRouter } from "expo-router"',
    );
    expect(monthlyComparison).toContain("useFocusEffect(");
    expect(
      indexOfOrThrow(monthlyComparison, "AsyncStorage.getItem"),
    ).toBeLessThan(indexOfOrThrow(monthlyComparison, "return () =>"));
  });
});
