import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  type BiometricType,
} from '@/lib/biometric-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

const BIOMETRIC_LOCK_KEY = 'biometric_lock_enabled';
const PIN_HASH_KEY = 'agentpay_pin_hash';

// Simple hash for PIN (not cryptographic — just for demo)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const colors = useColors();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);
  const [hasPIN, setHasPIN] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // PIN modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm' | 'current'>('enter');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [biometricVal, pinVal] = await Promise.all([
        AsyncStorage.getItem(BIOMETRIC_LOCK_KEY),
        AsyncStorage.getItem(PIN_HASH_KEY),
      ]);

      // Default biometric to enabled if available
      setBiometricEnabled(biometricVal !== 'false');
      setHasPIN(!!pinVal);

      const availability = await checkBiometricAvailability();
      setBiometricAvailable(availability.available && availability.enrolled);
      if (availability.types.length > 0) setBiometricType(availability.types[0]);
    } catch (err) {
      console.error('Error loading security settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (value) {
      // Require biometric auth to enable
      const result = await authenticateWithBiometric('Conferma per abilitare il blocco biometrico');
      if (!result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, value ? 'true' : 'false');
    setBiometricEnabled(value);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSetPIN = () => {
    setPinStep('enter');
    setPinInput('');
    setPinConfirm('');
    setPinError('');
    setPinModalVisible(true);
  };

  const handleRemovePIN = () => {
    Alert.alert(
      'Rimuovi PIN',
      'Sei sicuro di voler rimuovere il PIN di sicurezza?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(PIN_HASH_KEY);
            setHasPIN(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handlePinInput = (digit: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = pinStep === 'confirm' ? pinConfirm : pinInput;
    if (current.length >= 6) return;

    const newVal = current + digit;
    if (pinStep === 'confirm') {
      setPinConfirm(newVal);
      if (newVal.length === 6) validatePIN(newVal);
    } else {
      setPinInput(newVal);
      if (newVal.length === 6) {
        setTimeout(() => {
          setPinStep('confirm');
          setPinError('');
        }, 200);
      }
    }
  };

  const handlePinDelete = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pinStep === 'confirm') {
      setPinConfirm((prev) => prev.slice(0, -1));
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  const validatePIN = async (confirm: string) => {
    if (confirm !== pinInput) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError('I PIN non corrispondono. Riprova.');
      setPinConfirm('');
      setPinInput('');
      setPinStep('enter');
      return;
    }
    await AsyncStorage.setItem(PIN_HASH_KEY, hashPin(pinInput));
    setHasPIN(true);
    setPinModalVisible(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ PIN impostato', 'Il tuo PIN di sicurezza è stato salvato.');
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'faceid': return 'Face ID';
      case 'iris': return 'Riconoscimento Iris';
      default: return 'Impronta Digitale';
    }
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'faceid': return '🪪';
      case 'iris': return '👁️';
      default: return '🔏';
    }
  };

  const currentPinDisplay = pinStep === 'confirm' ? pinConfirm : pinInput;

  if (isLoading) {
    return (
      <ScreenContainer containerClassName="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>← Indietro</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>Sicurezza</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Gestisci accesso e protezione dell&apos;app
          </Text>
        </View>

        <View style={{ padding: 24, gap: 24 }}>
          {/* Biometric section */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Autenticazione Biometrica
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 28, marginRight: 14 }}>{getBiometricIcon()}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{getBiometricLabel()}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                    {biometricAvailable
                      ? 'Sblocca l\'app con ' + getBiometricLabel()
                      : 'Non disponibile su questo dispositivo'}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled && biometricAvailable}
                  onValueChange={handleToggleBiometric}
                  disabled={!biometricAvailable}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={biometricEnabled ? '#fff' : colors.muted}
                />
              </View>

              {!biometricAvailable && (
                <View style={{ padding: 14, backgroundColor: colors.warning + '10' }}>
                  <Text style={{ fontSize: 13, color: colors.warning, fontWeight: '600' }}>
                    ⚠️ Biometria non configurata sul dispositivo. Vai nelle Impostazioni del sistema per abilitarla.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* PIN section */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              PIN di Sicurezza
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: hasPIN ? 1 : 0, borderBottomColor: colors.border }}>
                <MaterialIcons name="help-outline" size={28} color={colors.foreground} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
                    {hasPIN ? 'PIN Configurato' : 'Imposta PIN'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                    {hasPIN ? 'PIN a 6 cifre attivo' : 'Aggiungi un PIN a 6 cifre come backup'}
                  </Text>
                </View>
                <View style={{ backgroundColor: hasPIN ? colors.success + '20' : colors.border + '40', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: hasPIN ? colors.success : colors.muted }}>
                    {hasPIN ? 'Attivo' : 'Non impostato'}
                  </Text>
                </View>
              </View>

              {hasPIN ? (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={handleSetPIN}
                    style={{ flex: 1, padding: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Cambia PIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRemovePIN}
                    style={{ flex: 1, padding: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.error }}>Rimuovi PIN</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSetPIN}
                  style={{ padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>+ Imposta PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Session info */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Sessione Attiva
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Dispositivo</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                  {Platform.OS === 'ios' ? '📱 iPhone' : Platform.OS === 'android' ? '📱 Android' : '💻 Web'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Ultimo accesso</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                  {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Stato</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>Attiva</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Security tips */}
          <View style={{ backgroundColor: colors.primary + '08', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.primary + '20' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>💡 Consigli di Sicurezza</Text>
            {[
              'Usa sempre la biometria per proteggere l\'app',
              'Non condividere mai il tuo PIN o seed phrase',
              'Verifica sempre l\'IBAN prima di inviare un trasferimento',
            ].map((tip, i) => (
              <Text key={i} style={{ fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 4 }}>• {tip}</Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{pinStep === 'confirm' ? 'Conferma PIN' : 'Imposta PIN'}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                {pinStep === 'confirm' ? 'Reinserisci il PIN per confermare' : 'Scegli un PIN a 6 cifre'}
              </Text>
            </View>

            {/* PIN dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 28 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: i < currentPinDisplay.length ? colors.primary : colors.border,
                }} />
              ))}
            </View>

            {/* Error */}
            {pinError ? (
              <Text style={{ textAlign: 'center', color: colors.error, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                {pinError}
              </Text>
            ) : null}

            {/* Numpad */}
            <View style={{ paddingHorizontal: 40, gap: 12 }}>
              {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                  {row.map((digit, di) => (
                    <TouchableOpacity
                      key={di}
                      onPress={() => digit === '⌫' ? handlePinDelete() : digit ? handlePinInput(digit) : null}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: digit === '⌫' ? colors.error + '15' : digit ? colors.surface : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: digit && digit !== '⌫' ? 1 : 0,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: digit === '⌫' ? 20 : 22, fontWeight: '700', color: digit === '⌫' ? colors.error : colors.foreground }}>
                        {digit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setPinModalVisible(false)}
              style={{ marginTop: 20, alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
