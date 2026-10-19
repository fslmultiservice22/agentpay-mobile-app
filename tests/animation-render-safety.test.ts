import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const splashScreen = readFileSync(
  new URL("../components/splash-screen.tsx", import.meta.url),
  "utf8",
);
const onboarding = readFileSync(
  new URL("../app/onboarding.tsx", import.meta.url),
  "utf8",
);

describe("animazioni di avvio", () => {
  it("inizializza i valori Animated come stato stabile senza leggere ref nel render", () => {
    expect(splashScreen).not.toContain("useRef(");
    expect(onboarding).not.toContain("useRef(");
    expect(splashScreen).toContain("useState(() => new Animated.Value(0.3))");
    expect(onboarding).toContain("useState(() => new Animated.Value(1))");
  });

  it("arresta le animazioni dello splash quando il componente viene smontato", () => {
    expect(splashScreen).toContain("entranceAnimation.stop()");
    expect(splashScreen).toContain("animation.stop()");
    expect(splashScreen).toContain("clearTimeout(finishTimer)");
  });
});
