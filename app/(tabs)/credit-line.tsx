import { ScrollView, Text, View, TouchableOpacity, Modal, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/hooks/use-i18n";
import { useCreditLine } from "@/hooks/use-credit-line";

export default function CreditLineScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { creditLine, requests, repayments, requestCredit, makeRepayment, getCreditUtilization } = useCreditLine();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');

  const handleRequestCredit = async () => {
    try {
      if (!requestAmount || !bankAccount) return;
      await requestCredit(parseFloat(requestAmount), bankAccount);
      setRequestAmount('');
      setBankAccount('');
      setShowRequestModal(false);
    } catch (error) {
      console.error('Credit request failed:', error);
    }
  };

  const handleMakeRepayment = async () => {
    try {
      if (!repaymentAmount) return;
      await makeRepayment(parseFloat(repaymentAmount));
      setRepaymentAmount('');
      setShowRepaymentModal(false);
    } catch (error) {
      console.error('Repayment failed:', error);
    }
  };

  if (!creditLine) {
    return (
      <ScreenContainer className="p-6">
        <Text className="text-foreground">{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  const utilization = getCreditUtilization();

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="bg-primary px-6 py-6">
          <Text className="text-white text-2xl font-bold">Credit Line</Text>
          <Text className="text-white/80 text-sm mt-1">Manage your revolving credit</Text>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6 gap-6">
          {/* Credit Limit Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <Text className="text-lg font-bold text-foreground">Credit Limit</Text>
            <View className="gap-2">
              <View className="flex-row justify-between items-end">
                <Text className="text-3xl font-bold text-primary">${creditLine.totalLimit.toFixed(2)}</Text>
                <Text className="text-xs text-muted">Total Limit</Text>
              </View>
              
              {/* Progress Bar */}
              <View className="bg-border rounded-full h-2 overflow-hidden">
                <View
                  className="bg-primary h-full"
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-muted">Used</Text>
                  <Text className="text-sm font-semibold text-foreground">${creditLine.usedCredit.toFixed(2)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted">Available</Text>
                  <Text className="text-sm font-semibold text-success">${creditLine.availableCredit.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Account Details</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted mb-2">Interest Rate</Text>
                <Text className="text-lg font-bold text-foreground">{creditLine.interestRate}%</Text>
              </View>
              <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted mb-2">Monthly Payment</Text>
                <Text className="text-lg font-bold text-foreground">${creditLine.monthlyPayment.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Status */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted">Status</Text>
              <View className="bg-success/20 rounded-full px-3 py-1">
                <Text className="text-xs font-semibold text-success capitalize">{creditLine.status}</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center pt-2 border-t border-border">
              <Text className="text-sm text-muted">Next Payment</Text>
              <Text className="text-sm font-semibold text-foreground">
                {new Date(creditLine.nextPaymentDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Recent Requests */}
          {requests.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Recent Requests</Text>
              {requests.slice(-3).reverse().map((req) => (
                <View key={req.id} className="bg-surface rounded-2xl p-4 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="font-semibold text-foreground">${req.amount.toFixed(2)}</Text>
                      <Text className="text-xs text-muted mt-1">{new Date(req.requestDate).toLocaleDateString()}</Text>
                    </View>
                    <View className={`rounded-full px-2 py-1 ${
                      req.status === 'approved' ? 'bg-success/20' :
                      req.status === 'transferred' ? 'bg-primary/20' :
                      'bg-warning/20'
                    }`}>
                      <Text className={`text-xs font-semibold capitalize ${
                        req.status === 'approved' ? 'text-success' :
                        req.status === 'transferred' ? 'text-primary' :
                        'text-warning'
                      }`}>
                        {req.status}
                      </Text>
                    </View>
                  </View>
                  {req.bankAccount && (
                    <Text className="text-xs text-muted">To: {req.bankAccount}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recent Repayments */}
          {repayments.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Recent Repayments</Text>
              {repayments.slice(-3).reverse().map((rep) => (
                <View key={rep.id} className="bg-surface rounded-2xl p-4 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="font-semibold text-foreground">${rep.amount.toFixed(2)}</Text>
                      <Text className="text-xs text-muted mt-1">{new Date(rep.date).toLocaleDateString()}</Text>
                    </View>
                    <View className="bg-success/20 rounded-full px-2 py-1">
                      <Text className="text-xs font-semibold text-success capitalize">{rep.status}</Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between text-xs text-muted">
                    <Text>Principal: ${rep.principalPaid.toFixed(2)}</Text>
                    <Text>Interest: ${rep.interestPaid.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 pb-6">
            <TouchableOpacity
              onPress={() => setShowRequestModal(true)}
              className="flex-1 bg-primary rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold">Request Credit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRepaymentModal(true)}
              className="flex-1 bg-surface border border-primary rounded-2xl py-4 items-center"
            >
              <Text className="text-primary font-bold">Make Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Request Credit Modal */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4">
            <Text className="text-2xl font-bold text-foreground">Request Credit</Text>
            
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Amount</Text>
              <TextInput
                placeholder="Enter amount"
                value={requestAmount}
                onChangeText={setRequestAmount}
                keyboardType="decimal-pad"
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
              <Text className="text-xs text-muted mt-2">Available: ${creditLine.availableCredit.toFixed(2)}</Text>
            </View>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Bank Account</Text>
              <TextInput
                placeholder="Enter bank account number"
                value={bankAccount}
                onChangeText={setBankAccount}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
            </View>

            {requestAmount && (
              <View className="bg-surface rounded-xl p-4 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Principal</Text>
                  <Text className="text-sm font-semibold text-foreground">${parseFloat(requestAmount || '0').toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Interest (Monthly)</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    ${((parseFloat(requestAmount || '0') * creditLine.interestRate / 12 / 100)).toFixed(2)}
                  </Text>
                </View>
                <View className="border-t border-border pt-2 flex-row justify-between">
                  <Text className="text-sm font-semibold text-foreground">Total</Text>
                  <Text className="text-sm font-bold text-primary">
                    ${(parseFloat(requestAmount || '0') + (parseFloat(requestAmount || '0') * creditLine.interestRate / 12 / 100)).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                className="flex-1 bg-surface border border-border rounded-xl py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRequestCredit}
                disabled={!requestAmount || !bankAccount}
                className="flex-1 bg-primary rounded-xl py-3 items-center disabled:opacity-50"
              >
                <Text className="text-white font-semibold">Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Repayment Modal */}
      <Modal visible={showRepaymentModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4">
            <Text className="text-2xl font-bold text-foreground">Make Repayment</Text>
            
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Amount</Text>
              <TextInput
                placeholder="Enter repayment amount"
                value={repaymentAmount}
                onChangeText={setRepaymentAmount}
                keyboardType="decimal-pad"
                className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
              <Text className="text-xs text-muted mt-2">Current Balance: ${creditLine.usedCredit.toFixed(2)}</Text>
            </View>

            {repaymentAmount && (
              <View className="bg-surface rounded-xl p-4 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Repayment Amount</Text>
                  <Text className="text-sm font-semibold text-foreground">${parseFloat(repaymentAmount || '0').toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Remaining Balance</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    ${Math.max(0, creditLine.usedCredit - parseFloat(repaymentAmount || '0')).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowRepaymentModal(false)}
                className="flex-1 bg-surface border border-border rounded-xl py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMakeRepayment}
                disabled={!repaymentAmount}
                className="flex-1 bg-primary rounded-xl py-3 items-center disabled:opacity-50"
              >
                <Text className="text-white font-semibold">Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
