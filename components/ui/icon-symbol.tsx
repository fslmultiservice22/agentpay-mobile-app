// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Home
  "house.fill": "home",
  // Trading
  "chart.line.uptrend.xyaxis": "trending-up",
  // Portfolio
  "briefcase.fill": "work",
  // Dashboard
  "square.grid.2x2.fill": "dashboard",
  // Copy Trade
  "doc.text.fill": "description",
  // Leaderboard
  "star.fill": "star",
  // Settings
  "gear": "settings",
  // Alerts
  "bell.fill": "notifications",
  // Swap
  "arrow.left.arrow.right": "swap-horiz",
  // Gas
  "bolt.fill": "flash-on",
  // Rebalance
  "arrow.2.squarepath": "sync",
  // Multi Portfolio
  "folder.fill": "folder",
  // Swap Analytics
  "chart.bar.fill": "bar-chart",
  // Credit
  "creditcard.fill": "credit-card",
  // Social Trading
  "network": "people",
  // Fallback icons
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
