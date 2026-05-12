import { ScrollView, Text, View, TouchableOpacity, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

/**
 * Home Screen - AgentPay Wallet Dashboard
 *
 * Displays wallet balance, recent transactions, and quick action buttons.
 */
export default function HomeScreen() {
  const colors = useColors();
  const [balance, setBalance] = useState("1,250.50");
  const [gasBalance, setGasBalance] = useState("0.85");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const recentTransactions = [
    { id: "1", type: "sent", amount: "50.00", address: "0x1234...5678", date: "Today", status: "confirmed" },
    { id: "2", type: "received", amount: "100.00", address: "0x9876...4321", date: "Yesterday", status: "confirmed" },
    { id: "3", type: "sent", amount: "25.50", address: "0xabcd...ef01", date: "2 days ago", status: "confirmed" },
  ];

  return (
    <ScreenContainer className="p-4 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={undefined}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 pb-8">
          {/* Header */}
          <View className="gap-2 mt-2">
            <Text className="text-base text-muted">Total Balance</Text>
            <Text className="text-5xl font-bold text-foreground">USD1 {balance}</Text>
            <Text className="text-sm text-muted">Gas Balance: {gasBalance} BNB</Text>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-3 justify-between">
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">Send</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">Receive</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">History</Text>
            </Pressable>
          </View>

          {/* Recent Transactions */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Recent Transactions</Text>
            {recentTransactions.map((tx) => (
              <View
                key={tx.id}
                className="bg-surface rounded-xl p-4 border border-border flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {tx.type === "sent" ? "Sent" : "Received"}
                  </Text>
                  <Text className="text-sm text-muted mt-1">{tx.address}</Text>
                  <Text className="text-xs text-muted mt-1">{tx.date}</Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`font-semibold ${
                      tx.type === "sent" ? "text-error" : "text-success"
                    }`}
                  >
                    {tx.type === "sent" ? "-" : "+"}{tx.amount}
                  </Text>
                  <Text className="text-xs text-success mt-1">Confirmed</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
