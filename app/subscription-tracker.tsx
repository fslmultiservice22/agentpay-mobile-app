import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert, StyleSheet, Switch } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { pushNotificationsService } from "@/lib/push-notifications-service";

// ── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'annual';
  category: string;
  nextRenewal: string; // ISO date
  reminderEnabled: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'agentpay_subscriptions';

const CATEGORIES = [
  { id: 'streaming', label: 'Streaming', icon: 'play-circle-outline' as const },
  { id: 'musica', label: 'Musica', icon: 'music-note' as const },
  { id: 'cloud', label: 'Cloud/Storage', icon: 'cloud' as const },
  { id: 'fitness', label: 'Fitness', icon: 'fitness-center' as const },
  { id: 'news', label: 'News/Magazine', icon: 'article' as const },
  { id: 'software', label: 'Software', icon: 'computer' as const },
  { id: 'gaming', label: 'Gaming', icon: 'sports-esports' as const },
  { id: 'altro', label: 'Altro', icon: 'category' as const },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function SubscriptionTrackerScreen() {
  const router = useRouter();
  const colors = useColors();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCycle, setFormCycle] = useState<'monthly' | 'annual'>('monthly');
  const [formCategory, setFormCategory] = useState('streaming');
  const [formNextRenewal, setFormNextRenewal] = useState('');
  const [formReminder, setFormReminder] = useState(true);

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSubscriptions(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Error loading subscriptions:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSubscriptions(); }, [loadSubscriptions]));
  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  const saveSubscriptions = async (subs: Subscription[]) => {
    setSubscriptions(subs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  };

  // KPI calculations
  const totalMonthly = subscriptions.reduce((sum, s) => {
    return sum + (s.cycle === 'monthly' ? s.amount : s.amount / 12);
  }, 0);
  const totalAnnual = subscriptions.reduce((sum, s) => {
    return sum + (s.cycle === 'annual' ? s.amount : s.amount * 12);
  }, 0);

  // Form handlers
  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCycle('monthly');
    setFormCategory('streaming');
    setFormNextRenewal('');
    setFormReminder(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome dell\'abbonamento');
      return;
    }
    const amt = parseFloat(formAmount.replace(',', '.'));
    if (!amt || amt <= 0) {
      Alert.alert('Errore', 'Inserisci un importo valido');
      return;
    }
    // Default next renewal: 30 days from now
    let nextRenewal = formNextRenewal;
    if (!nextRenewal) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      nextRenewal = d.toISOString().split('T')[0];
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingId) {
      // Update existing
      const updated = subscriptions.map(s =>
        s.id === editingId
          ? { ...s, name: formName.trim(), amount: amt, cycle: formCycle, category: formCategory, nextRenewal, reminderEnabled: formReminder }
          : s
      );
      await saveSubscriptions(updated);
    } else {
      // Create new
      const newSub: Subscription = {
        id: `sub_${Date.now()}`,
        name: formName.trim(),
        amount: amt,
        cycle: formCycle,
        category: formCategory,
        nextRenewal,
        reminderEnabled: formReminder,
        createdAt: Date.now(),
      };
      await saveSubscriptions([...subscriptions, newSub]);
    }

    // Schedule reminder if enabled
    if (formReminder) {
      try {
        await pushNotificationsService.sendLocalNotification({
          title: `Rinnovo: ${formName.trim()}`,
          body: `Il tuo abbonamento ${formName.trim()} (\u20AC${amt.toFixed(2)}/${formCycle === 'monthly' ? 'mese' : 'anno'}) si rinnova il ${nextRenewal}`,
          type: 'general',
          data: { subscriptionName: formName.trim() },
        });
      } catch { /* non-blocking */ }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
  };

  const handleEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setFormName(sub.name);
    setFormAmount(sub.amount.toString());
    setFormCycle(sub.cycle);
    setFormCategory(sub.category);
    setFormNextRenewal(sub.nextRenewal);
    setFormReminder(sub.reminderEnabled);
    setShowForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = (sub: Subscription) => {
    Alert.alert(
      'Elimina abbonamento',
      `Vuoi eliminare "${sub.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const updated = subscriptions.filter(s => s.id !== sub.id);
            await saveSubscriptions(updated);
          },
        },
      ]
    );
  };

  const toggleReminder = async (sub: Subscription) => {
    const updated = subscriptions.map(s =>
      s.id === sub.id ? { ...s, reminderEnabled: !s.reminderEnabled } : s
    );
    await saveSubscriptions(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Days until next renewal
  const daysUntilRenewal = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCategoryIcon = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.icon || 'category';
  };

  const getCategoryLabel = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.label || 'Altro';
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Abbonamenti</Text>
        <TouchableOpacity
          onPress={() => { setShowForm(true); setEditingId(null); }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>Costo Mensile</Text>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>€{totalMonthly.toFixed(2)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>Costo Annuale</Text>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>€{totalAnnual.toFixed(2)}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.kpiLabel, { color: colors.muted }]}>Attivi</Text>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>{subscriptions.length}</Text>
          </View>
        </View>

        {/* Form */}
        {showForm && (
          <View style={[styles.formContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              {editingId ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Nome (es. Netflix, Spotify...)"
              placeholderTextColor={colors.muted}
              value={formName}
              onChangeText={setFormName}
            />

            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Importo (€)"
                placeholderTextColor={colors.muted}
                value={formAmount}
                onChangeText={setFormAmount}
                keyboardType="decimal-pad"
              />
              <View style={styles.cycleToggle}>
                <TouchableOpacity
                  onPress={() => setFormCycle('monthly')}
                  style={[styles.cycleBtn, formCycle === 'monthly' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.cycleBtnText, { color: formCycle === 'monthly' ? '#fff' : colors.muted }]}>Mensile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormCycle('annual')}
                  style={[styles.cycleBtn, formCycle === 'annual' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.cycleBtnText, { color: formCycle === 'annual' ? '#fff' : colors.muted }]}>Annuale</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category selector */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setFormCategory(cat.id)}
                    style={[
                      styles.catChip,
                      { borderColor: formCategory === cat.id ? colors.primary : colors.border,
                        backgroundColor: formCategory === cat.id ? colors.primary + '15' : colors.background }
                    ]}
                  >
                    <MaterialIcons name={cat.icon} size={14} color={formCategory === cat.id ? colors.primary : colors.muted} />
                    <Text style={{ fontSize: 12, color: formCategory === cat.id ? colors.primary : colors.muted }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Prossimo rinnovo (YYYY-MM-DD)"
              placeholderTextColor={colors.muted}
              value={formNextRenewal}
              onChangeText={setFormNextRenewal}
            />

            <View style={[styles.formRow, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>Promemoria rinnovo</Text>
              <Switch
                value={formReminder}
                onValueChange={setFormReminder}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={formReminder ? colors.primary : colors.muted}
              />
            </View>

            <View style={[styles.formRow, { marginTop: 12 }]}>
              <TouchableOpacity onPress={resetForm} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{editingId ? 'Aggiorna' : 'Aggiungi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Subscription List */}
        {subscriptions.length === 0 && !showForm ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
            <MaterialIcons name="subscriptions" size={48} color={colors.muted} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.foreground, marginTop: 16 }}>
              Nessun abbonamento
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8 }}>
              Aggiungi i tuoi abbonamenti per monitorare i costi ricorrenti e ricevere promemoria prima dei rinnovi.
            </Text>
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Aggiungi Abbonamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 8 }}>
            {subscriptions
              .sort((a, b) => daysUntilRenewal(a.nextRenewal) - daysUntilRenewal(b.nextRenewal))
              .map(sub => {
                const days = daysUntilRenewal(sub.nextRenewal);
                const isUrgent = days <= 7 && days >= 0;
                const isOverdue = days < 0;
                return (
                  <View
                    key={sub.id}
                    style={[styles.subCard, {
                      backgroundColor: colors.surface,
                      borderColor: isUrgent ? colors.warning : isOverdue ? colors.error : colors.border,
                    }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.subIcon, { backgroundColor: colors.primary + '15' }]}>
                        <MaterialIcons name={getCategoryIcon(sub.category) as any} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subName, { color: colors.foreground }]}>{sub.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>
                          {getCategoryLabel(sub.category)} · {sub.cycle === 'monthly' ? 'Mensile' : 'Annuale'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.subAmount, { color: colors.foreground }]}>
                          €{sub.amount.toFixed(2)}
                        </Text>
                        <Text style={{ fontSize: 11, color: isUrgent ? colors.warning : isOverdue ? colors.error : colors.muted }}>
                          {isOverdue ? `Scaduto ${Math.abs(days)}g fa` : days === 0 ? 'Oggi' : `Tra ${days}g`}
                        </Text>
                      </View>
                    </View>

                    {/* Actions row */}
                    <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                      <TouchableOpacity onPress={() => toggleReminder(sub)} style={styles.actionBtn}>
                        <MaterialIcons
                          name={sub.reminderEnabled ? 'notifications-active' : 'notifications-off'}
                          size={16}
                          color={sub.reminderEnabled ? colors.primary : colors.muted}
                        />
                        <Text style={{ fontSize: 11, color: sub.reminderEnabled ? colors.primary : colors.muted, marginLeft: 4 }}>
                          {sub.reminderEnabled ? 'Attivo' : 'Disattivo'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEdit(sub)} style={styles.actionBtn}>
                        <MaterialIcons name="edit" size={16} color={colors.muted} />
                        <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4 }}>Modifica</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(sub)} style={styles.actionBtn}>
                        <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                        <Text style={{ fontSize: 11, color: colors.error, marginLeft: 4 }}>Elimina</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Link to recurring-optimizer */}
        {subscriptions.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/recurring-optimizer')}
            style={[styles.linkBtn, { borderColor: colors.primary }]}
          >
            <MaterialIcons name="auto-fix-high" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 8 }}>
              Analizza con Ottimizzatore Ricorrenti
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 8 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700' },
  formContainer: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  cycleToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden' },
  cycleBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  cycleBtnText: { fontSize: 12, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  subCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  subIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  subName: { fontSize: 15, fontWeight: '600' },
  subAmount: { fontSize: 15, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  linkBtn: { marginHorizontal: 16, marginTop: 20, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
