import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useColors } from "@/hooks/use-colors";

export default function TransferHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { transfers, accounts, loading } = useBankAccounts();
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all");

  const filteredTransfers = transfers.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const sortedTransfers = [...filteredTransfers].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.accountHolder || "Unknown Account";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/20 text-success";
      case "processing":
        return "bg-warning/20 text-warning";
      case "failed":
        return "bg-error/20 text-error";
      default:
        return "bg-muted/20 text-muted";
    }
  };

  const renderTransferItem = ({ item }: { item: any }) => (
    <View className="bg-surface rounded-xl p-4 border border-border mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-foreground">
            €{item.amount.toFixed(2)}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getAccountName(item.accountId)}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-semibold capitalize">
            {item.status}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between text-xs text-muted pt-2 border-t border-border">
        <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text>Ref: {item.reference}</Text>
      </View>

      {item.completedAt && (
        <Text className="text-xs text-muted mt-2">
          Completed: {new Date(item.completedAt).toLocaleString()}
        </Text>
      )}

      {item.error && (
        <Text className="text-xs text-error mt-2">Error: {item.error}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Transfer History
            </Text>
            <Text className="text-base text-muted">
              View all your bank transfers
            </Text>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row gap-2 flex-wrap">
            {(["all", "completed", "pending", "failed"] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilter(status)}
                className={`rounded-full px-4 py-2 ${
                  filter === status
                    ? "bg-primary"
                    : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-xs font-semibold capitalize ${
                    filter === status ? "text-white" : "text-foreground"
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transfers List */}
          {sortedTransfers.length > 0 ? (
            <View>
              <Text className="text-sm font-semibold text-muted mb-3">
                {sortedTransfers.length} transfer{sortedTransfers.length !== 1 ? "s" : ""}
              </Text>
              <FlatList
                data={sortedTransfers}
                renderItem={renderTransferItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <View className="bg-surface rounded-xl p-6 items-center justify-center border border-border">
              <Text className="text-lg font-semibold text-foreground mb-2">
                No transfers yet
              </Text>
              <Text className="text-sm text-muted text-center">
                Your transfer history will appear here
              </Text>
            </View>
          )}

          {/* Stats */}
          {transfers.length > 0 && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">
                Statistics
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                  <Text className="text-xs text-muted mb-1">Total Transfers</Text>
                  <Text className="text-lg font-bold text-foreground">
                    {transfers.length}
                  </Text>
                </View>
                <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                  <Text className="text-xs text-muted mb-1">Total Amount</Text>
                  <Text className="text-lg font-bold text-foreground">
                    €{transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => router.push("/credit-transfer")}
              className="bg-primary rounded-lg py-3 items-center justify-center"
            >
              <Text className="text-white font-semibold">
                + New Transfer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-lg py-3 items-center justify-center border border-border bg-surface"
            >
              <Text className="text-foreground font-semibold">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
