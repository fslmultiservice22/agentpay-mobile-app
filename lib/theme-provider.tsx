import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance,
  View,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { ACCENT_PALETTES } from "@/hooks/use-accent-color";

const ACCENT_KEY = "agentpay_accent_color";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  accentColor: string;
  setAccentById: (id: string) => Promise<void>;
  accentId: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const detectedSystemScheme = useSystemColorScheme();
  const systemScheme: ColorScheme =
    detectedSystemScheme === "dark" ? "dark" : "light";
  const [colorScheme, setColorSchemeState] =
    useState<ColorScheme>(systemScheme);
  const [accentId, setAccentId] = useState<string>("blue");

  // Load saved accent on mount
  useEffect(() => {
    AsyncStorage.getItem(ACCENT_KEY).then((val) => {
      if (val && ACCENT_PALETTES.find((p) => p.id === val)) {
        setAccentId(val);
      }
    });
  }, []);

  const currentAccent = ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];
  const accentColor = colorScheme === "dark" ? currentAccent.dark : currentAccent.light;

  const setAccentById = useCallback(async (id: string) => {
    setAccentId(id);
    await AsyncStorage.setItem(ACCENT_KEY, id);
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme, accent?: string) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, token === "primary" && accent ? accent : value);
      });
    }
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyScheme(scheme, accentColor);
    },
    [applyScheme, accentColor],
  );

  useEffect(() => {
    applyScheme(colorScheme, accentColor);
  }, [applyScheme, colorScheme, accentColor]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": accentColor,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme, accentColor],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      accentColor,
      setAccentById,
      accentId,
    }),
    [colorScheme, setColorScheme, accentColor, setAccentById, accentId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
