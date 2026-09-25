/**
 * Price Alerts Screen
 * Gestione alert di prezzo per i token del portafoglio
 */
import { useState, useCallback } from 'react';
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFocusEffect, useRouter } from 'expo-router';
import { priceAlertMonitor, type PriceAlertRule } from '@/lib/price-alert-monitor';
import { getTopTokens } from '@/lib/evm-portfolio';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

export default function PriceAlertsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [alerts, setAlerts] = useState<PriceAlertRule[]>([]);
  const [stats, setStats] = useState({ totalAlerts: 0, activeAlerts: 0, totalTriggers: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newThreshold, setNewThreshold] = useState('10');
  const [newDirection, setNewDirection] = useState<'up' | 'down' | 'both'>('both');

  const loadData = useCallback(async () => {
    const [alertList, statistics] = await Promise.all([
      priceAlertMonitor.getAlerts(),
      priceAlertMonitor.getStatistics(),
    ]);
    setAlerts(alertList);
    setStats(statistics);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleToggle = async (id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await priceAlertMonitor.toggleAlert(id);
    await loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Elimina Alert', 'Vuoi eliminare questo alert di prezzo?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await priceAlertMonitor.removeAlert(id);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadData();
        }
      },
    ]);
  };

  const handleCreateDefaults = async () => {
    const topTokens = getTopTokens(10);
    const tokens = topTokens.map(t => ({
      symbol: t.symbol,
      name: t.name,
      chain: t.chainName,
      price: t.price,
    }));
    const created = await priceAlertMonitor.createDefaultAlerts(tokens);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Alert Creati', `${created} alert predefiniti creati (soglia ±10%) per i tuoi top token.`);
    await loadData();
  };

  const handleCreate = async () => {
    const threshold = parseFloat(newThreshold);
    if (!newSymbol.trim() || isNaN(threshold) || threshold <= 0) {
      Alert.alert('Errore', 'Inserisci un simbolo valido e una soglia > 0%');
      return;
    }
    await priceAlertMonitor.createAlert({
      tokenSymbol: newSymbol.trim().toUpperCase(),
      tokenName: newSymbol.trim().toUpperCase(),
      chain: 'Multi-chain',
      thresholdPercent: threshold,
      direction: newDirection,
      referencePrice: 0, // Verrà aggiornato al primo check
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCreateModal(false);
    setNewSymbol('');
    setNewThreshold('10');
    await loadData();
  };

  const s = makeStyles(colors);

  return (
    <ScreenContainer className="flex-1">
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>🔔 Alert Prezzi</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ padding: 4 }}>
            <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Statistiche */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{stats.totalAlerts}</Text>
            <Text style={s.statLabel}>Totali</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: colors.primary }]}>{stats.activeAlerts}</Text>
            <Text style={s.statLabel}>Attivi</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: colors.warning }]}>{stats.totalTriggers}</Text>
            <Text style={s.statLabel}>Scattati</Text>
          </View>
        </View>

        {/* Pulsante crea alert predefiniti */}
        {alerts.length === 0 && (
          <TouchableOpacity style={s.defaultButton} onPress={handleCreateDefaults}>
            <Text style={s.defaultButtonText}>⚡ Crea Alert Predefiniti (Top 10 Token)</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              Soglia ±10% per i token con più valore nel tuo portafoglio
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista alert */}
        {alerts.map((alert) => (
          <View key={alert.id} style={s.alertCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.alertSymbol}>{alert.tokenSymbol}</Text>
                  <View style={[s.badge, { backgroundColor: alert.enabled ? colors.primary + '20' : colors.muted + '20' }]}>
                    <Text style={{ fontSize: 10, color: alert.enabled ? colors.primary : colors.muted }}>
                      {alert.enabled ? 'ATTIVO' : 'PAUSA'}
                    </Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={{ fontSize: 10, color: colors.warning }}>
                      {alert.direction === 'up' ? '↑' : alert.direction === 'down' ? '↓' : '↕'} ±{alert.thresholdPercent}%
                    </Text>
                  </View>
                </View>
                <Text style={s.alertChain}>{alert.chain} • Rif: ${alert.referencePrice.toFixed(4)}</Text>
                {alert.triggerCount > 0 && (
                  <Text style={{ fontSize: 11, color: colors.warning, marginTop: 2 }}>
                    Scattato {alert.triggerCount}x • Ultimo: {alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).toLocaleDateString('it-IT') : '-'}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleToggle(alert.id)} style={s.iconBtn}>
                  <MaterialIcons name={alert.enabled ? 'pause' : 'play-arrow'} size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(alert.id)} style={s.iconBtn}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {alerts.length > 0 && (
          <TouchableOpacity style={[s.defaultButton, { marginTop: 16 }]} onPress={handleCreateDefaults}>
            <Text style={[s.defaultButtonText, { fontSize: 13 }]}>+ Aggiungi Alert Predefiniti</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Crea Alert */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.background }]}>
            <Text style={s.modalTitle}>Nuovo Alert di Prezzo</Text>

            <Text style={s.inputLabel}>Simbolo Token</Text>
            <TextInput
              style={[s.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="es. ETH, BTC, MATIC"
              placeholderTextColor={colors.muted}
              value={newSymbol}
              onChangeText={setNewSymbol}
              autoCapitalize="characters"
            />

            <Text style={s.inputLabel}>Soglia Variazione (%)</Text>
            <TextInput
              style={[s.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="10"
              placeholderTextColor={colors.muted}
              value={newThreshold}
              onChangeText={setNewThreshold}
              keyboardType="numeric"
            />

            <Text style={s.inputLabel}>Direzione</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['both', 'up', 'down'] as const).map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={[s.dirBtn, newDirection === dir && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                  onPress={() => setNewDirection(dir)}
                >
                  <Text style={{ color: newDirection === dir ? colors.primary : colors.foreground, fontWeight: '600' }}>
                    {dir === 'both' ? '↕ Entrambe' : dir === 'up' ? '↑ Solo su' : '↓ Solo giù'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowCreateModal(false)}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleCreate}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Crea Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    statValue: { fontSize: 24, fontWeight: '700', color: colors.foreground },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
    alertCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    alertSymbol: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    alertChain: { fontSize: 12, color: colors.muted, marginTop: 4 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    iconBtn: { padding: 6, borderRadius: 8, backgroundColor: colors.surface },
    defaultButton: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
    defaultButtonText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16 },
    dirBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    modalBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  });
}
