import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
 Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getPinConfig, setPinConfig, disablePin, verifyPin } from "@/lib/pin-lock";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from '@expo/vector-icons';

type Mode = "menu" | "set_new" | "confirm_new" | "verify_disable" | "verify_change";

// ── PIN Pad ───────────────────────────────────────────────────────────────────
function PinPad({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  const handleKey = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key === "") {
      return;
    } else if (value.length < 4) {
      onChange(value + key);
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 8 }}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: i < value.length ? colors.primary : colors.border,
              borderWidth: 2,
              borderColor: i < value.length ? colors.primary : colors.muted,
            }}
          />
        ))}
      </View>

      {/* Keypad */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {keys.map((key, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => handleKey(key)}
            disabled={key === ""}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: key === "⌫" ? colors.error + "15" : key === "" ? "transparent" : colors.surface,
              borderWidth: key === "" ? 0 : 1.5,
              borderColor: key === "⌫" ? colors.error + "40" : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{
              fontSize: key === "⌫" ? 20 : 24,
              fontWeight: "700",
              color: key === "⌫" ? colors.error : colors.foreground,
            }}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PinSetupScreen() {
  const router = useRouter();
  const colors = useColors();

  const [pinConfig, setPinConfigState] = useState<{ enabled: boolean; readOnlyMode: boolean } | null>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      getPinConfig().then((c) => {
        setPinConfigState(c ? { enabled: c.enabled, readOnlyMode: c.readOnlyMode } : null);
      });
      setMode("menu");
      setPin("");
      setConfirmPin("");
      setError("");
    }, [])
  );

  // Auto-advance when PIN is 4 digits
  const handlePinChange = (v: string) => {
    setPin(v);
    setError("");
    if (v.length === 4 && mode === "set_new") {
      setMode("confirm_new");
      setConfirmPin("");
    }
  };

  const handleConfirmChange = async (v: string) => {
    setConfirmPin(v);
    setError("");
    if (v.length === 4) {
      if (v !== pin) {
        setError("I PIN non corrispondono. Riprova.");
        setConfirmPin("");
        setPin("");
        setMode("set_new");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        // Save PIN
        setLoading(true);
        await setPinConfig(v, true);
        setPinConfigState({ enabled: true, readOnlyMode: true });
        setLoading(false);
        setMode("menu");
        setPin("");
        setConfirmPin("");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ PIN impostato", "La modalità sola lettura con PIN è attiva.");
      }
    }
  };

  const handleVerifyDisable = async (v: string) => {
    setPin(v);
    if (v.length === 4) {
      const ok = await verifyPin(v);
      if (ok) {
        await disablePin();
        setPinConfigState(null);
        setMode("menu");
        setPin("");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ PIN rimosso", "La protezione PIN è stata disattivata.");
      } else {
        setError("PIN errato. Riprova.");
        setPin("");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const renderMenu = () => (
    <View style={{ gap: 16 }}>
      {/* Status card */}
      <View style={{
        backgroundColor: pinConfig?.enabled ? colors.success + "12" : colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: pinConfig?.enabled ? colors.success + "40" : colors.border,
        padding: 20,
        gap: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <MaterialIcons name="lock" size={32} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.foreground }}>
              {pinConfig?.enabled ? "PIN attivo" : "PIN non impostato"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              {pinConfig?.enabled
                ? "La modalità sola lettura è attiva. Le operazioni di scrittura richiedono il PIN."
                : "Imposta un PIN per proteggere le operazioni di scrittura (nuovo bonifico, modifica conti)."}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      {!pinConfig?.enabled ? (
        <TouchableOpacity
          onPress={() => { setMode("set_new"); setPin(""); setError(""); }}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>🔐 Imposta PIN</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => { setMode("verify_disable"); setPin(""); setError(""); }}
            style={{
              backgroundColor: colors.error + "12",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.error + "30",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.error }}>🗑 Rimuovi PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setMode("set_new"); setPin(""); setError(""); }}
            style={{
              backgroundColor: colors.primary + "12",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.primary + "30",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>✏️ Cambia PIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
      }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>ℹ️ Come funziona</Text>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
          Con il PIN attivo, le schermate di consultazione (storico, statistiche, conti) rimangono accessibili liberamente. Le operazioni di scrittura (nuovo bonifico, aggiunta conto, modifica profilo) richiedono il PIN.
        </Text>
      </View>
    </View>
  );

  const renderPinEntry = (title: string, subtitle: string, onChangeFn: (v: string) => void, currentVal: string) => (
    <View style={{ gap: 24, alignItems: "center" }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.foreground }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>{subtitle}</Text>
        {error ? (
          <Text style={{ fontSize: 13, color: colors.error, fontWeight: "600", marginTop: 4 }}>{error}</Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <PinPad value={currentVal} onChange={onChangeFn} colors={colors} />
      )}
      <TouchableOpacity onPress={() => { setMode("menu"); setPin(""); setConfirmPin(""); setError(""); }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>Annulla</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>Protezione PIN</Text>
        <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          Modalità sola lettura con PIN a 4 cifre
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {mode === "menu" && renderMenu()}
        {mode === "set_new" && renderPinEntry(
          "Imposta nuovo PIN",
          "Inserisci 4 cifre per il tuo PIN",
          handlePinChange,
          pin
        )}
        {mode === "confirm_new" && renderPinEntry(
          "Conferma PIN",
          "Reinserisci il PIN per confermare",
          handleConfirmChange,
          confirmPin
        )}
        {mode === "verify_disable" && renderPinEntry(
          "Inserisci PIN attuale",
          "Verifica il PIN per disattivarlo",
          handleVerifyDisable,
          pin
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
