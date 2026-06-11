import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { validateIBAN, formatIBAN } from "@/lib/iban-validator";
import { useI18n } from "@/hooks/use-i18n";
import * as Haptics from "expo-haptics";

export default function BankAccountConnectScreen() {
  const router = useRouter();
  const { addAccount } = useBankAccounts();
  const { t } = useI18n();
  
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [ibanError, setIbanError] = useState<string | null>(null);

  const handleIbanChange = (text: string) => {
    const formatted = formatIBAN(text.replace(/\s/g, ""));
    setIban(formatted);
    setIbanError(null);
  };

  const handleAddAccount = async () => {
    try {
      // Validate inputs
      if (!iban.trim()) {
        setIbanError("IBAN is required");
        return;
      }

      if (!accountHolder.trim()) {
        Alert.alert("Error", "Account holder name is required");
        return;
      }

      // Validate IBAN
      const validation = validateIBAN(iban);
      if (!validation.isValid) {
        setIbanError(validation.error || "Invalid IBAN");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await addAccount(iban, accountHolder);

      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Bank account connected successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Failed to add bank account");
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Connect Bank Account
            </Text>
            <Text className="text-base text-muted">
              Add your IBAN to receive credit transfers
            </Text>
          </View>

          {/* Info Card */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Why connect your bank account?
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Receive credit transfers directly to your bank account{"\n"}
              • Fast and secure IBAN validation{"\n"}
              • Track all transfers in one place{"\n"}
              • Manage multiple bank accounts
            </Text>
          </View>

          {/* IBAN Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              IBAN (International Bank Account Number)
            </Text>
            <TextInput
              placeholder="e.g., DE89 3704 0044 0532 0130 00"
              placeholderTextColor="#9BA1A6"
              value={iban}
              onChangeText={handleIbanChange}
              editable={!loading}
              className={`bg-surface border rounded-lg px-4 py-3 text-foreground ${
                ibanError ? "border-error" : "border-border"
              }`}
              maxLength={34}
            />
            {ibanError && (
              <Text className="text-xs text-error">{ibanError}</Text>
            )}
            {iban && !ibanError && (
              <Text className="text-xs text-success">✓ IBAN format valid</Text>
            )}
          </View>

          {/* Account Holder Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Account Holder Name
            </Text>
            <TextInput
              placeholder="Your full name"
              placeholderTextColor="#9BA1A6"
              value={accountHolder}
              onChangeText={setAccountHolder}
              editable={!loading}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            />
          </View>

          {/* IBAN Info */}
          {iban && !ibanError && (
            <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-xs text-primary font-semibold mb-1">
                IBAN Details
              </Text>
              <Text className="text-xs text-foreground">
                Country: {iban.slice(0, 2)} • Length: {iban.replace(/\s/g, "").length} characters
              </Text>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleAddAccount}
              disabled={loading || !iban || !accountHolder}
              className={`rounded-lg py-3 items-center justify-center ${
                loading || !iban || !accountHolder
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}
            >
              <Text className="text-white font-semibold">
                {loading ? "Connecting..." : "Connect Account"}
              </Text>
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
              🔒 Your IBAN is encrypted and stored securely on your device
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
