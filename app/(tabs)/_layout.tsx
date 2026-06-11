import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text, ScrollView } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

/**
 * Custom Tab Bar Label Component
 * Shows icon + label with proper sizing and spacing
 */
function TabBarLabel({
  focused,
  color,
  label,
}: {
  focused: boolean;
  color: string;
  label: string;
}) {
  return (
    <View className="items-center gap-1">
      <Text
        className={`text-xs font-semibold ${
          focused ? "text-primary" : "text-muted"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 70 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          paddingHorizontal: 4,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "flex-start",
        },
        tabBarLabelPosition: "below-icon",
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 0,
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="house.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Trading */}
      <Tabs.Screen
        name="trading"
        options={{
          title: "Trading",
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol
                size={28}
                name="chart.line.uptrend.xyaxis"
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Portfolio */}
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="briefcase.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol
                size={28}
                name="square.grid.2x2.fill"
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="gear" color={color} />
            </View>
          ),
        }}
      />

      {/* Hidden screens - accessible via navigation but not shown in tab bar */}
      {/* Copy Trade */}
      <Tabs.Screen
        name="copy-trade-tracking"
        options={{
          title: "Copy Trade",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="doc.text.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Leaderboard */}
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="star.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Telegram */}
      <Tabs.Screen
        name="telegram"
        options={{
          title: "Telegram",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <Text style={{ fontSize: 28 }}>📱</Text>
            </View>
          ),
        }}
      />

      {/* Alerts */}
      <Tabs.Screen
        name="price-alerts"
        options={{
          title: "Alerts",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="bell.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Swap */}
      <Tabs.Screen
        name="cross-chain-swap"
        options={{
          title: "Swap",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol
                size={28}
                name="arrow.left.arrow.right"
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Gas */}
      <Tabs.Screen
        name="gas-comparator"
        options={{
          title: "Gas",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="bolt.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Rebalance */}
      <Tabs.Screen
        name="rebalancing-dashboard"
        options={{
          title: "Rebalance",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="arrow.2.squarepath" color={color} />
            </View>
          ),
        }}
      />

      {/* Multi Portfolio */}
      <Tabs.Screen
        name="portfolio-multi"
        options={{
          title: "Multi Portfolio",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="folder.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Swap Analytics */}
      <Tabs.Screen
        name="swap-analytics"
        options={{
          title: "Swap Analytics",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="chart.bar.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Credit Line */}
      <Tabs.Screen
        name="credit-line"
        options={{
          title: "Credit",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="creditcard.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* Social Trading */}
      <Tabs.Screen
        name="social-trading"
        options={{
          title: "Social Trading",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="network" color={color} />
            </View>
          ),
        }}
      />

      {/* Transfer Funds */}
      <Tabs.Screen
        name="transfer-funds"
        options={{
          title: "Transfer",
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <View className={focused ? "scale-110" : ""}>
              <IconSymbol size={28} name="paperplane.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
