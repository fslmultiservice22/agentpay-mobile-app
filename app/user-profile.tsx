import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Alert, ActivityIndicator, Platform, Switch, KeyboardAvoidingView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useThemeContext } from '@/lib/theme-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const PROFILE_KEY = 'agentpay_user_profile';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  currency: string;
  avatarUri: string;
  notifyTransfers: boolean;
  notifyPriceAlerts: boolean;
  notifyMarketing: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  phone: '',
  currency: 'EUR',
  avatarUri: '',
  notifyTransfers: true,
  notifyPriceAlerts: true,
  notifyMarketing: false,
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
        setDraft({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setDraft({ ...profile });
    setIsEditing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancel = () => {
    setDraft({ ...profile });
    setIsEditing(false);
    setCurrencyPickerVisible(false);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto.');
      return;
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido.');
      return;
    }
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
      setProfile({ ...draft });
      setIsEditing(false);
      setCurrencyPickerVisible(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Errore', 'Impossibile salvare il profilo. Riprova.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (field: keyof UserProfile, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Avatar picker ────────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    if (!isEditing) return;

    Alert.alert(
      'Foto Profilo',
      'Scegli come aggiungere la tua foto',
      [
        {
          text: 'Galleria',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              updateDraft('avatarUri', result.assets[0].uri);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
        {
          text: 'Fotocamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permesso negato', "Consenti l'accesso alla fotocamera nelle impostazioni del dispositivo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              updateDraft('avatarUri', result.assets[0].uri);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
        {
          text: 'Rimuovi foto',
          style: 'destructive',
          onPress: () => updateDraft('avatarUri', ''),
        },
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Dark mode toggle ─────────────────────────────────────────────────────────
  const isDark = colorScheme === 'dark';
  const handleToggleDarkMode = (value: boolean) => {
    const newScheme = value ? 'dark' : 'light';
    setColorScheme(newScheme);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ScreenContainer containerClassName="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const displayProfile = isEditing ? draft : profile;
  const initials = getInitials(displayProfile.name || 'Utente');
  const avatarUri = displayProfile.avatarUri;

  return (
    <ScreenContainer containerClassName="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>← Indietro</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>Profilo</Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                  Gestisci le tue informazioni
                </Text>
              </View>
              <TouchableOpacity
                onPress={isEditing ? handleSave : handleEdit}
                disabled={isSaving}
                style={{
                  backgroundColor: isEditing ? '#fff' : 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ fontWeight: '700', color: isEditing ? colors.primary : '#fff', fontSize: 14 }}>
                    {isEditing ? 'Salva' : 'Modifica'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginTop: -36 }}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={isEditing ? 0.7 : 1}
              style={{ position: 'relative' }}
            >
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: colors.surface,
                borderWidth: 4, borderColor: colors.background,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
              }}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{initials}</Text>
                )}
              </View>
              {/* Camera badge */}
              {isEditing && (
                <View style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: 13,
                  backgroundColor: colors.primary,
                  borderWidth: 2, borderColor: colors.background,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 13 }}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
            {isEditing && (
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
                Tocca per cambiare foto
              </Text>
            )}
          </View>

          <View style={{ padding: 24, gap: 24 }}>
            {/* Personal Info */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Informazioni Personali
              </Text>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {/* Name */}
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: '600' }}>Nome Completo *</Text>
                  {isEditing ? (
                    <TextInput
                      value={draft.name}
                      onChangeText={(v) => updateDraft('name', v)}
                      placeholder="Es. Mario Rossi"
                      placeholderTextColor={colors.muted}
                      style={{ fontSize: 16, color: colors.foreground, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4 }}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: profile.name ? colors.foreground : colors.muted }}>
                      {profile.name || 'Non impostato'}
                    </Text>
                  )}
                </View>

                {/* Email */}
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: '600' }}>Email</Text>
                  {isEditing ? (
                    <TextInput
                      value={draft.email}
                      onChangeText={(v) => updateDraft('email', v)}
                      placeholder="Es. mario@email.com"
                      placeholderTextColor={colors.muted}
                      style={{ fontSize: 16, color: colors.foreground, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4 }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: profile.email ? colors.foreground : colors.muted }}>
                      {profile.email || 'Non impostato'}
                    </Text>
                  )}
                </View>

                {/* Phone */}
                <View style={{ padding: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: '600' }}>Telefono</Text>
                  {isEditing ? (
                    <TextInput
                      value={draft.phone}
                      onChangeText={(v) => updateDraft('phone', v)}
                      placeholder="Es. +39 333 1234567"
                      placeholderTextColor={colors.muted}
                      style={{ fontSize: 16, color: colors.foreground, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4 }}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: profile.phone ? colors.foreground : colors.muted }}>
                      {profile.phone || 'Non impostato'}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Preferences */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Preferenze
              </Text>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {/* Currency */}
                <TouchableOpacity
                  onPress={() => isEditing && setCurrencyPickerVisible((v) => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <View>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4, fontWeight: '600' }}>Valuta Preferita</Text>
                    <Text style={{ fontSize: 16, color: colors.foreground, fontWeight: '600' }}>
                      {displayProfile.currency}
                    </Text>
                  </View>
                  {isEditing && <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>}
                </TouchableOpacity>

                {/* Currency picker inline */}
                {isEditing && currencyPickerVisible && (
                  <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    {CURRENCIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => { updateDraft('currency', c); setCurrencyPickerVisible(false); }}
                        style={{
                          flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                          backgroundColor: draft.currency === c ? colors.primary : colors.background,
                          borderWidth: 1, borderColor: draft.currency === c ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: draft.currency === c ? '#fff' : colors.foreground }}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Dark mode toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>
                      {isDark ? '🌙 Tema Scuro' : '☀️ Tema Chiaro'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                      {isDark ? 'Interfaccia con sfondo scuro' : 'Interfaccia con sfondo chiaro'}
                    </Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={handleToggleDarkMode}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={isDark ? '#fff' : colors.muted}
                  />
                </View>
              </View>
            </View>

            {/* Notifications */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Notifiche
              </Text>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {[
                  { key: 'notifyTransfers' as const, label: 'Trasferimenti', desc: 'Notifiche per ogni pagamento inviato o ricevuto' },
                  { key: 'notifyPriceAlerts' as const, label: 'Avvisi di Prezzo', desc: 'Variazioni significative del portafoglio crypto' },
                  { key: 'notifyMarketing' as const, label: 'Novità e Offerte', desc: 'Aggiornamenti del prodotto e promozioni', last: true },
                ].map(({ key, label, desc, last }) => (
                  <View key={key} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{label}</Text>
                      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{desc}</Text>
                    </View>
                    <Switch
                      value={displayProfile[key] as boolean}
                      onValueChange={(v) => isEditing && updateDraft(key, v)}
                      disabled={!isEditing}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={displayProfile[key] ? '#fff' : colors.muted}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Cancel button when editing */}
            {isEditing && (
              <TouchableOpacity
                onPress={handleCancel}
                style={{ padding: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.muted }}>Annulla modifiche</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
