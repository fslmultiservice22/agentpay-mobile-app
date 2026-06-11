import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useCreditLine } from "@/hooks/use-credit-line";
import { useI18n } from "@/hooks/use-i18n";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function CreditTransferScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const { accounts, getDefaultAccount, createTransfer } = useBankAccounts();
  const { creditLine, requestCredit } = useCreditLine();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set default account on load
    const defaultAccount = getDefaultAccount();
    if (defaultAccount) {
      setSelectedAccountId(defaultAccount.id);
    }
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const amount = parseFloat(transferAmount) || 0;
  const monthlyInterest = (amount * (creditLine?.interestRate || 0)) / 12 / 100;
  const totalAmount = amount + monthlyInterest;

  const handleTransfer = async () => {
    try {
      // Validation
      if (!selectedAccountId) {
        setError("Please select a bank account");
        return;
      }

      if (!transferAmount || amount <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      if (!creditLine || amount > creditLine.availableCredit) {
        setError("Amount exceeds available credit");
        return;
      }

      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Create transfer
      const transfer = await createTransfer(selectedAccountId, amount);

      if (transfer) {
        // Request credit from credit line
        await requestCredit(amount, selectedAccount?.maskedIBAN || "");

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Transfer Initiated",
          `€${amount.toFixed(2)} will be transferred to ${selectedAccount?.accountHolder}`,
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Failed to create transfer");
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  if (!creditLine) {
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
              Transfer Credit
            </Text>
            <Text className="text-base text-muted">
              Transfer credit to your bank account
            </Text>
          </View>

          {/* Available Credit Info */}
          <View className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <Text className="text-xs text-primary font-semibold mb-1">
              Available Credit
            </Text>
            <Text className="text-2xl font-bold text-primary">
              €{creditLine.availableCredit.toFixed(2)}
            </Text>
          </View>

          {/* Bank Account Selection */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              Select Bank Account
            </Text>

            {accounts.length > 0 ? (
              <View className="gap-2">
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setSelectedAccountId(account.id)}
                    className={`rounded-lg p-4 border-2 ${
                      selectedAccountId === account.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          {account.accountHolder}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          {account.maskedIBAN}
                        </Text>
                      </View>
                      {selectedAccountId === account.id && (
                        <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                          <Text className="text-white text-xs font-bold">✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm text-muted mb-2">
                  No bank accounts connected
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/bank-account-connect")}
                  className="bg-primary rounded-lg py-2 items-center mt-2"
                >
                  <Text className="text-white text-xs font-semibold">
                    Add Bank Account
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              Transfer Amount
            </Text>
            <TextInput
              placeholder="Enter amount"
              placeholderTextColor={colors.muted}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="decimal-pad"
              editable={!loading}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            />
          </View>

          {/* Transfer Summary */}
          {amount > 0 && (
            <View className="bg-surface rounded-lg p-4 border border-border gap-3">
              <Text className="text-sm font-semibold text-foreground mb-1">
                Transfer Summary
              </Text>

              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Amount</Text>
                <Text className="text-sm font-semibold text-foreground">
                  €{amount.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Interest (Monthly)</Text>
                <Text className="text-sm font-semibold text-foreground">
                  €{monthlyInterest.toFixed(2)}
                </Text>
              </View>

              <View className="border-t border-border pt-3 flex-row justify-between">
                <Text className="text-sm font-semibold text-foreground">
                  Total Amount
                </Text>
                <Text className="text-sm font-bold text-primary">
                  €{totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View className="bg-error/10 rounded-lg p-3 border border-error/20">
              <Text className="text-xs text-error">{error}</Text>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleTransfer}
              disabled={loading || !selectedAccountId || !transferAmount || amount <= 0}
              className={`rounded-lg py-3 items-center justify-center ${
                loading || !selectedAccountId || !transferAmount || amount <= 0
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  Transfer €{amount.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading}
              className="rounded-lg py-3 items-center justify-center border border-border bg-surface"
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View className="bg-surface rounded-lg p-3 border border-border">
            <Text className="text-xs text-muted text-center">
              🔒 Transfers are processed securely and encrypted
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
