import { useState } from 'react';
import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';

export default function SendScreen() {
  const router = useRouter();
  const { address, balance } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!recipientAddress.trim()) {
      Alert.alert('Error', 'Please enter recipient address');
      return;
    }
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    setLoading(true);
    try {
      // Simulate sending transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('Success', `Sent ${amount} ETH to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Send Payment</Text>
            <Text className="text-base text-muted">Balance: {balance} ETH</Text>
          </View>

          {/* Recipient Address */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Recipient Address</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholder="0x..."
              placeholderTextColor="#999"
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              editable={!loading}
            />
          </View>

          {/* Amount */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Amount (ETH)</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholder="0.0"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!loading}
            />
          </View>

          {/* Gas Fee Info */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-2">
            <Text className="text-sm font-semibold text-foreground">Transaction Details</Text>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Gas Fee:</Text>
              <Text className="text-sm text-foreground font-semibold">0.001 ETH</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Total:</Text>
              <Text className="text-sm text-foreground font-semibold">{parseFloat(amount || '0') + 0.001} ETH</Text>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            className={`rounded-lg p-4 items-center justify-center ${loading ? 'bg-primary opacity-50' : 'bg-primary'}`}
            onPress={handleSend}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-base">
              {loading ? 'Sending...' : 'Send Payment'}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            className="rounded-lg p-4 items-center justify-center border border-border"
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text className="text-foreground font-semibold text-base">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
