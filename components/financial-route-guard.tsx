import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getFinancialRouteGuard } from "@/lib/financial-route-policy";
import { useColors } from "@/hooks/use-colors";

export function FinancialRouteGuard({ pathname }: { pathname: string | null | undefined }) {
  const colors = useColors();
  const router = useRouter();
  const definition = getFinancialRouteGuard(pathname);

  if (!definition) return null;

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <View style={{ alignItems: "center", paddingTop: 20 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}18` }}>
            <MaterialIcons name={definition.icon} size={34} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 25, fontWeight: "800", marginTop: 16, textAlign: "center" }}>{definition.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" }}>{definition.summary}</Text>
        </View>

        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${colors.warning}55`, backgroundColor: `${colors.warning}12`, padding: 16 }}>
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "800" }}>Perimetro protetto</Text>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
            Questa schermata non mostra dati fittizi e non avvia pagamenti, firme, wallet, carte, trasferimenti o provider esterni.
          </Text>
        </View>

        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>Prerequisiti prima dell’attivazione</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {definition.prerequisites.map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <MaterialIcons name="check-circle-outline" size={18} color={colors.muted} style={{ marginTop: 1 }} />
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginLeft: 8, flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Apri il pannello tecnico"
          onPress={() => router.replace("/dashboard")}
          style={{ borderRadius: 14, paddingVertical: 15, alignItems: "center", backgroundColor: colors.primary }}
        >
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>Apri pannello tecnico</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
