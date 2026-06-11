import { ScrollView, Text, View, StyleSheet, ActivityIndicator, Pressable, Modal, TextInput, Switch } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { MOCK_PRICE_ALERTS, getAlertDescription, formatPrice, getAlertColor } from '@/lib/alerts/price-alerts-config';

export default function PriceAlertsScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<typeof MOCK_PRICE_ALERTS>(MOCK_PRICE_ALERTS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [newAlertAsset, setNewAlertAsset] = useState('');
  const [newAlertType, setNewAlertType] = useState<'above' | 'below'>('above');
  const [newAlertPrice, setNewAlertPrice] = useState('');

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
    subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, color: colors.muted, marginBottom: 12, fontWeight: '600' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    value: { fontSize: 12, color: colors.muted },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primary },
    badgeText: { fontSize: 10, fontWeight: '600', color: colors.background },
    addButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
    addButtonText: { fontSize: 14, fontWeight: '600', color: colors.background },
    deleteButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.error },
    deleteButtonText: { fontSize: 10, fontWeight: '600', color: colors.background },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
    input: { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12, color: colors.foreground, fontSize: 14 },
    typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeButtonText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
    typeButtonTextActive: { color: colors.background },
    createButton: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
    createButtonText: { fontSize: 14, fontWeight: '600', color: colors.background },
    cancelButton: { backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyStateIcon: { fontSize: 48, marginBottom: 12 },
    emptyStateText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
    alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    alertInfo: { flex: 1 },
    alertAsset: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
    alertDesc: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    alertStatus: { fontSize: 11, color: colors.muted },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  });

  const handleCreateAlert = () => {
    if (!newAlertAsset || !newAlertPrice) return;

    const newAlert: typeof MOCK_PRICE_ALERTS[0] = {
      id: Date.now().toString(),
      type: newAlertType === 'above' ? 'price_above' : 'price_below',
      asset: newAlertAsset.toUpperCase(),
      targetPrice: parseFloat(newAlertPrice),
      currentPrice: 0,
      status: 'active',
      createdAt: Date.now(),
      notificationSent: false,
    };

    setAlerts([...alerts, newAlert]);
    setNewAlertAsset('');
    setNewAlertPrice('');
    setShowCreateModal(false);
  };

  const handleDeleteAlert = (alertId: string) => {
    setAlerts(alerts.filter((a) => a.id !== alertId));
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === alertId
          ? { ...a, status: a.status === 'active' ? 'disabled' : 'active' }
          : a
      )
    );
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Price Alerts</Text>
          <Text style={styles.subtitle}>Get notified when prices change</Text>
        </View>

        {/* Create Alert Button */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <Pressable onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={styles.addButtonText}>Create Alert</Text>
          </Pressable>
        </Animated.View>

        {/* Alerts List */}
        {alerts.length > 0 ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Your Alerts ({alerts.length})</Text>
            <View style={styles.card}>
              {alerts.map((alert, index) => (
                <Animated.View
                  key={alert.id}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.alertItem, { borderBottomWidth: index === alerts.length - 1 ? 0 : 1 }]}
                >
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertAsset}>{alert.asset}</Text>
                    <Text style={styles.alertDesc}>{getAlertDescription(alert)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.statusBadge, { backgroundColor: getAlertColor(alert.status, colors) }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.background }}>
                          {alert.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.alertStatus}>
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Switch
                      value={alert.status === 'active'}
                      onValueChange={() => handleToggleAlert(alert.id)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                    <Pressable
                      onPress={() => handleDeleteAlert(alert.id)}
                      style={styles.deleteButton}
                    >
                      <MaterialIcons name="delete" size={14} color={colors.background} />
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.section, styles.emptyState]}>
            <MaterialIcons name="notifications-none" size={48} color={colors.muted} />
            <Text style={styles.emptyStateText}>No price alerts yet</Text>
            <Text style={[styles.emptyStateText, { marginTop: 8 }]}>
              Create your first alert to get started
            </Text>
          </Animated.View>
        )}

        {/* Info Section */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.card}>
            <View style={[styles.row, { borderBottomWidth: 1 }]}>
              <View>
                <Text style={styles.label}>1. Create Alert</Text>
                <Text style={styles.value}>Set a price target for any asset</Text>
              </View>
            </View>
            <View style={[styles.row, { borderBottomWidth: 1 }]}>
              <View>
                <Text style={styles.label}>2. Get Notified</Text>
                <Text style={styles.value}>Receive push notification when triggered</Text>
              </View>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.label}>3. Take Action</Text>
                <Text style={styles.value}>React quickly to market opportunities</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Create Alert Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInRight.duration(300)} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Price Alert</Text>

            <TextInput
              style={styles.input}
              placeholder="Asset (e.g., ETH, BTC)"
              placeholderTextColor={colors.muted}
              value={newAlertAsset}
              onChangeText={setNewAlertAsset}
            />

            <Text style={[styles.label, { marginBottom: 8 }]}>Alert Type</Text>
            <View style={styles.typeSelector}>
              <Pressable
                onPress={() => setNewAlertType('above')}
                style={[styles.typeButton, newAlertType === 'above' && styles.typeButtonActive]}
              >
                <Text style={[styles.typeButtonText, newAlertType === 'above' && styles.typeButtonTextActive]}>
                  Price Above
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setNewAlertType('below')}
                style={[styles.typeButton, newAlertType === 'below' && styles.typeButtonActive]}
              >
                <Text style={[styles.typeButtonText, newAlertType === 'below' && styles.typeButtonTextActive]}>
                  Price Below
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Target Price (USD)"
              placeholderTextColor={colors.muted}
              value={newAlertPrice}
              onChangeText={setNewAlertPrice}
              keyboardType="decimal-pad"
            />

            <Pressable onPress={handleCreateAlert} style={styles.createButton}>
              <Text style={styles.createButtonText}>Create Alert</Text>
            </Pressable>

            <Pressable onPress={() => setShowCreateModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
