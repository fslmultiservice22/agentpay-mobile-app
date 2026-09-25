import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function CurrencyConverterScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "800" }}>Convertitore non attivo</Text>
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
              I tassi fiat e crypto esterni sono disattivati per policy. L’app non recupera quotazioni, prezzi o dati di mercato.
            </Text>
          </View>

          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, padding: 18 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Salvaguardie attive</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>• Nessuna chiamata a provider di cambio o mercato.</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>• Nessun valore simulato è presentato come tasso aggiornato.</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>• La riattivazione richiede revisione separata della fonte dati.</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.back()}
            style={{ alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14 }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Torna alla dashboard tecnica</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
