import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator , Platform } from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { wlfiNotificationService } from "@/lib/wlfi-notification-service";

interface SwapToken { symbol: string; name: string; icon: string; }
const TOKENS: SwapToken[] = [
  { symbol: 'USD1', name: 'USD1 Stablecoin', icon: '\uD83C\uDFDB\uFE0F' },
  { symbol: 'USDC', name: 'USD Coin', icon: '\uD83D\uDCB5' },
  { symbol: 'USDT', name: 'Tether USD', icon: '\uD83D\uDCB2' },
  { symbol: 'DAI', name: 'Dai Stablecoin', icon: '\uD83D\uDD36' },
];
const RATES: Record<string, Record<string, number>> = {
  'USD1': { 'USDC': 0.9998, 'USDT': 0.9997, 'DAI': 0.9996 },
  'USDC': { 'USD1': 1.0002, 'USDT': 0.9999, 'DAI': 0.9998 },
  'USDT': { 'USD1': 1.0003, 'USDC': 1.0001, 'DAI': 0.9999 },
  'DAI':  { 'USD1': 1.0004, 'USDC': 1.0002, 'USDT': 1.0001 },
};
const FEE = 0.003;

export default function WLFISwapScreen() {
  const router = useRouter();
  const colors = useColors();
  const [from, setFrom] = useState(TOKENS[0]);
  const [to, setTo] = useState(TOKENS[1]);
  const [amt, setAmt] = useState('');
  const [slip, setSlip] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'from'|'to'|null>(null);
  const [history, setHistory] = useState<{id:string;from:string;to:string;fa:number;ta:number;ts:number}[]>([]);

  const haptic = useCallback(() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, []);
  const rate = RATES[from.symbol]?.[to.symbol] || 1;
  const parsed = parseFloat(amt);
  const out = !isNaN(parsed) && parsed > 0 ? parsed * rate * (1 - FEE) : 0;
  const fee = !isNaN(parsed) && parsed > 0 ? parsed * rate * FEE : 0;

  const flip = () => { haptic(); const t = from; setFrom(to); setTo(t); };

  const swap = async () => {
    if (!parsed || parsed <= 0) { Alert.alert('Errore', 'Importo non valido'); return; }
    haptic(); setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      setHistory(h => [{ id: `s_${Date.now()}`, from: from.symbol, to: to.symbol, fa: parsed, ta: out, ts: Date.now() }, ...h].slice(0, 10));
      await wlfiNotificationService.notifySwapComplete({ fromToken: from.symbol, toToken: to.symbol, fromAmount: parsed, toAmount: out });
      setAmt('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Swap Completato', `${parsed.toFixed(2)} ${from.symbol} \u2192 ${out.toFixed(2)} ${to.symbol}`);
    } catch { Alert.alert('Errore', 'Swap fallito'); } finally { setBusy(false); }
  };

  const pickToken = (token: SwapToken) => {
    if (picker === 'from') setFrom(token); else setTo(token);
    setPicker(null); haptic();
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="bg-primary px-6 py-5 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><MaterialIcons name="arrow-back" size={24} color="white" /></TouchableOpacity>
          <View className="flex-1"><Text className="text-white text-xl font-bold">Swap USD1</Text><Text className="text-white/70 text-xs mt-0.5">DEX Aggregator</Text></View>
        </View>
        <View className="px-6 py-6 gap-5">
          <View className="bg-surface rounded-2xl p-5 border border-border gap-3">
            <Text className="text-sm text-muted">Da</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => { haptic(); setPicker('from'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ fontSize: 20 }}>{from.icon}</Text><Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{from.symbol}</Text><MaterialIcons name="keyboard-arrow-down" size={16} color={colors.muted} />
              </TouchableOpacity>
              <TextInput placeholder="0.00" value={amt} onChangeText={setAmt} keyboardType="decimal-pad" style={{ flex: 1, fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'right' }} placeholderTextColor={colors.muted} />
            </View>
          </View>
          <View className="items-center -my-2" style={{ zIndex: 10 }}><TouchableOpacity onPress={flip} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="swap-vert" size={22} color="white" /></TouchableOpacity></View>
          <View className="bg-surface rounded-2xl p-5 border border-border gap-3">
            <Text className="text-sm text-muted">A (Riceverai)</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => { haptic(); setPicker('to'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ fontSize: 20 }}>{to.icon}</Text><Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{to.symbol}</Text><MaterialIcons name="keyboard-arrow-down" size={16} color={colors.muted} />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 24, fontWeight: '700', color: out > 0 ? colors.foreground : colors.muted, textAlign: 'right' }}>{out > 0 ? out.toFixed(4) : '0.00'}</Text>
            </View>
          </View>
          {out > 0 && (
            <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
              <View className="flex-row justify-between"><Text className="text-xs text-muted">Tasso</Text><Text className="text-xs font-semibold text-foreground">1 {from.symbol} = {rate.toFixed(4)} {to.symbol}</Text></View>
              <View className="flex-row justify-between"><Text className="text-xs text-muted">Fee (0.3%)</Text><Text className="text-xs font-semibold text-foreground">{fee.toFixed(4)} {to.symbol}</Text></View>
              <View className="flex-row justify-between"><Text className="text-xs text-muted">Slippage</Text><Text className="text-xs font-semibold text-foreground">{slip}%</Text></View>
              <View className="flex-row justify-between"><Text className="text-xs text-muted">Min. Ricevuto</Text><Text className="text-xs font-semibold text-success">{(out * (1 - slip / 100)).toFixed(4)} {to.symbol}</Text></View>
            </View>
          )}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Slippage</Text>
            <View className="flex-row gap-2">
              {[0.1, 0.5, 1.0, 2.0].map(s => (
                <TouchableOpacity key={s} onPress={() => { haptic(); setSlip(s); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: slip === s ? colors.primary : colors.surface, borderWidth: 1, borderColor: slip === s ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: slip === s ? 'white' : colors.foreground }}>{s}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={swap} disabled={busy || out <= 0} style={{ backgroundColor: busy || out <= 0 ? colors.muted : colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: busy || out <= 0 ? 0.5 : 1 }}>
            {busy ? <ActivityIndicator color="white" size="small" /> : <MaterialIcons name="swap-horiz" size={20} color="white" />}
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>{busy ? 'Swapping...' : 'Esegui Swap'}</Text>
          </TouchableOpacity>
          {history.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Swap Recenti</Text>
              {history.map(s => (
                <View key={s.id} className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2"><MaterialIcons name="swap-horiz" size={16} color={colors.primary} /><Text className="text-sm font-semibold text-foreground">{s.fa.toFixed(2)} {s.from} {'->'} {s.ta.toFixed(2)} {s.to}</Text></View>
                  <Text className="text-xs text-muted">{new Date(s.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {picker && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Seleziona Token</Text>
            {TOKENS.filter(t => t.symbol !== (picker === 'from' ? to.symbol : from.symbol)).map(token => (
              <TouchableOpacity key={token.symbol} onPress={() => pickToken(token)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 }}>
                <Text style={{ fontSize: 24 }}>{token.icon}</Text><View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{token.symbol}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{token.name}</Text></View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setPicker(null)} style={{ alignItems: 'center', paddingVertical: 12 }}><Text style={{ color: colors.muted, fontWeight: '600' }}>Annulla</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
