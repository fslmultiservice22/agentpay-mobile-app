import { Switch, Text, View } from "react-native";

import type { ThemeColorPalette } from "@/constants/theme";

interface NotificationSectionTitleProps {
  title: string;
  colors: ThemeColorPalette;
}

interface NotificationToggleRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  colors: ThemeColorPalette;
}

export function NotificationSectionTitle({
  title,
  colors,
}: NotificationSectionTitleProps) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

export function NotificationToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
  colors,
}: NotificationToggleRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 14,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 22, width: 32, textAlign: "center" }}>
        {icon}
      </Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}
        >
          {label}
        </Text>
        {description ? (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        trackColor={{ false: colors.border, true: `${colors.primary}80` }}
        thumbColor={value ? colors.primary : colors.muted}
        disabled={disabled}
      />
    </View>
  );
}
