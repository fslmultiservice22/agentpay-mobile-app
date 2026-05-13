import { useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useValidation } from '@/hooks/use-validation';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useWalletAPI } from '@/hooks/use-wallet-api';

export default function SendScreen() {
  const router = useRouter();
  const { validateTransaction } = useValidation();
  const { sendTransactionConfirmedNotification, sendTransactionPendingNotification } = usePushNotifications();
  const { sendTransaction, loading } = useWalletAPI();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('50');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const balance = '2.5';

  const handleSend = async () => {
    setError('');
    setSuccess(false);

    const validation = validateTransaction(recipient, amount, balance);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid transaction');
      return;
    }

    try {
      const result = await sendTransaction(recipient, amount);
      
      if (result) {
        await sendTransactionPendingNotification(result.hash, amount);
        setSuccess(true);
        setRecipient('');
        setAmount('');
        
        setTimeout(() => {
          sendTransactionConfirmedNotification(result.hash, amount);
        }, 3000);
      }
    } catch (err) {
      setError('Failed to send transaction');
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="gap-4">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Send Payment</Text>
          <Text className="text-base text-muted">Transfer funds to another wallet</Text>
        </View>

        <View className="bg-surface border border-border rounded-lg p-4">
          <Text className="text-muted text-sm">Available Balance</Text>
          <Text className="text-2xl font-bold text-foreground">{balance} ETH</Text>
        </View>

        <View className="gap-2">
          <Text className="text-foreground font-semibold">Recipient Address</Text>
          <TextInput
            className="bg-surface border border-border rounded-lg p-3 text-foreground"
            placeholder="0x..."
            placeholderTextColor="#999"
            value={recipient}
            onChangeText={setRecipient}
            editable={!loading}
          />
        </View>

        <View className="gap-2">
          <Text className="text-foreground font-semibold">Amount (ETH)</Text>
          <TextInput
            className="bg-surface border border-border rounded-lg p-3 text-foreground"
            placeholder="0.0"
            placeholderTextColor="#999"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </View>

        <View className="gap-2">
          <Text className="text-foreground font-semibold">Gas Price (Gwei)</Text>
          <TextInput
            className="bg-surface border border-border rounded-lg p-3 text-foreground"
            placeholder="50"
            placeholderTextColor="#999"
            value={gasPrice}
            onChangeText={setGasPrice}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </View>

        {error && (
          <View className="bg-red-100 border border-red-300 rounded-lg p-3">
            <Text className="text-red-800">{error}</Text>
          </View>
        )}

        {success && (
          <View className="bg-green-100 border border-green-300 rounded-lg p-3">
            <Text className="text-green-800">Transaction sent successfully!</Text>
          </View>
        )}

        <TouchableOpacity
          className={`rounded-lg p-4 items-center justify-center flex-row gap-2 ${loading ? 'bg-gray-400' : 'bg-primary'}`}
          onPress={handleSend}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="white" />}
          <Text className="text-white font-semibold text-base">{loading ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-lg p-4 items-center justify-center border border-border"
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text className="text-foreground font-semibold text-base">Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
