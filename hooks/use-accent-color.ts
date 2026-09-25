import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCENT_KEY = "agentpay_accent_color";

export interface AccentPalette {
  id: string;
  name: string;
  emoji: string;
  light: string;
  dark: string;
}

export const ACCENT_PALETTES: AccentPalette[] = [
  { id: "blue",   name: "Oceano",    emoji: "🔵", light: "#0a7ea4", dark: "#0a7ea4" },
  { id: "green",  name: "Smeraldo",  emoji: "🟢", light: "#16a34a", dark: "#22c55e" },
  { id: "purple", name: "Viola",     emoji: "🟣", light: "#7c3aed", dark: "#a78bfa" },
  { id: "orange", name: "Arancio",   emoji: "🟠", light: "#ea580c", dark: "#fb923c" },
  { id: "rose",   name: "Rosa",      emoji: "🌸", light: "#e11d48", dark: "#fb7185" },
];

export function useAccentColor() {
  const [accentId, setAccentId] = useState<string>("blue");

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_KEY).then((val) => {
      if (val && ACCENT_PALETTES.find((p) => p.id === val)) {
        setAccentId(val);
      }
    });
  }, []);

  const setAccent = useCallback(async (id: string) => {
    setAccentId(id);
    await AsyncStorage.setItem(ACCENT_KEY, id);
  }, []);

  const currentPalette = ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];

  return { accentId, currentPalette, setAccent, palettes: ACCENT_PALETTES };
}
