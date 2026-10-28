import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

/**
 * Percorso mantenuto come segnaposto per l'esperimento CSV reale.
 *
 * Il picker resta intenzionalmente irraggiungibile in ogni profilo finché la
 * revisione privacy non è approvata. La demo sintetica vive nel percorso
 * separato /local-csv-pilot e conserva il gate esistente.
 */
export default function LocalExpensePilot() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Import CSV reale non disponibile</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>
          La selezione di file personali o di estratti conto è disabilitata in
          ogni profilo finché la revisione privacy non sarà approvata.
        </Text>
        <Text style={[styles.copy, { color: colors.muted }]}>
          Per ora è disponibile soltanto la demo con dati sintetici incorporati,
          nel percorso separato e già soggetto al suo gate. Nessun file viene
          aperto, letto, copiato o inviato.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Torna alle impostazioni"
          onPress={() => router.back()}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 14, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "800" },
  copy: { fontSize: 15, lineHeight: 22 },
  button: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    marginTop: 8,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
