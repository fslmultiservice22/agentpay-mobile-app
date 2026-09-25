/**
 * Stripe Widget — Widget Home per accesso rapido a Stripe
 */
import { Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function StripeWidget() {
  const router = useRouter();

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text style={{ fontSize: 20 }}>💳</Text>
          <Text className="text-foreground font-semibold ml-2">Stripe Payments</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/stripe-dashboard" as any)}>
          <Text className="text-primary text-xs font-medium">Apri →</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 bg-primary/10 rounded-xl py-3 items-center"
          onPress={() => router.push("/stripe-payment-link" as any)}
        >
          <Text style={{ fontSize: 16 }}>🔗</Text>
          <Text className="text-primary text-xs font-medium mt-1">Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-primary/10 rounded-xl py-3 items-center"
          onPress={() => router.push("/stripe-products" as any)}
        >
          <Text style={{ fontSize: 16 }}>📦</Text>
          <Text className="text-primary text-xs font-medium mt-1">Prodotti</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-primary/10 rounded-xl py-3 items-center"
          onPress={() => router.push("/stripe-customers" as any)}
        >
          <Text style={{ fontSize: 16 }}>👥</Text>
          <Text className="text-primary text-xs font-medium mt-1">Clienti</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
