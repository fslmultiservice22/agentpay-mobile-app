import { ScrollView, Text, View, TouchableOpacity, FlatList, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useI18n } from "@/hooks/use-i18n";
import * as Haptics from "expo-haptics";

export default function BankAccountsManageScreen() {
  const router = useRouter();
  const { accounts, removeAccount, setDefaultAccount } = useBankAccounts();
  const { t } = useI18n();

  const handleSetDefault = async (accountId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await setDefaultAccount(accountId);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    Alert.alert(
      "Remove Account",
      "Are you sure you want to remove this bank account?",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const success = await removeAccount(accountId);
              if (success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Success", "Bank account removed");
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Bank Accounts
            </Text>
            <Text className="text-base text-muted">
              Manage your connected bank accounts
            </Text>
          </View>

          {/* Accounts List */}
          {accounts.length > 0 ? (
            <View className="gap-3">
              {accounts.map((account) => (
                <View
                  key={account.id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <View className="gap-3">
                    {/* Account Header */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {account.accountHolder}
                        </Text>
                        <Text className="text-sm text-muted mt-1">
                          {account.maskedIBAN}
                        </Text>
                      </View>
                      {account.isDefault && (
                        <View className="bg-primary/20 rounded-full px-3 py-1">
                          <Text className="text-xs font-semibold text-primary">
                            Default
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Account Details */}
                    <View className="flex-row justify-between text-xs text-muted">
                      <Text>Country: {account.country}</Text>
                      <Text>Status: {account.status}</Text>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      {!account.isDefault && (
                        <TouchableOpacity
                          onPress={() => handleSetDefault(account.id)}
                          className="flex-1 bg-primary/10 rounded-lg py-2 items-center justify-center border border-primary/20"
                        >
                          <Text className="text-xs font-semibold text-primary">
                            Set as Default
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveAccount(account.id)}
                        className="flex-1 bg-error/10 rounded-lg py-2 items-center justify-center border border-error/20"
                      >
                        <Text className="text-xs font-semibold text-error">
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Last Used */}
                    {account.lastUsed && (
                      <Text className="text-xs text-muted">
                        Last used: {new Date(account.lastUsed).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-surface rounded-xl p-6 items-center justify-center border border-border">
              <Text className="text-lg font-semibold text-foreground mb-2">
                No bank accounts
              </Text>
              <Text className="text-sm text-muted text-center">
                Add your first bank account to receive credit transfers
              </Text>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Add Account Button */}
          <TouchableOpacity
            onPress={() => router.push("/bank-account-connect")}
            className="bg-primary rounded-lg py-3 items-center justify-center"
          >
            <Text className="text-white font-semibold">
              + Add Bank Account
            </Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-lg py-3 items-center justify-center border border-border bg-surface"
          >
            <Text className="text-foreground font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
