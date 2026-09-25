import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';


const ONBOARDING_STEPS = [
  {
    emoji: '🛡️',
    title: 'Benvenuto in AgentPay',
    description: 'Uno spazio personale per esplorare dashboard, impostazioni e controlli tecnici. Le funzioni finanziarie restano disattivate.',
    color: '#0a7ea4',
    bg: '#E6F4FE',
    features: ['Dashboard tecnica', 'Controlli locali', 'Storico tecnico'],
  },
  {
    emoji: '📊',
    title: 'Organizzazione locale',
    description: 'Configura preferenze e promemoria locali. I dati di esempio o le informazioni finanziarie non vengono presentati come operazioni reali.',
    color: '#22C55E',
    bg: '#F0FDF4',
    features: ['Preferenze locali', 'Promemoria tecnici', 'Riepiloghi disponibili'],
  },
  {
    emoji: '⭐',
    title: 'Accessibilità & preferenze',
    description: 'Personalizza il percorso iniziale, consulta i controlli tecnici e scegli impostazioni che restano disponibili sul dispositivo.',
    color: '#F59E0B',
    bg: '#FFFBEB',
    features: ['Ricerca locale', 'Riduci movimento', 'Preferenze applicazione'],
  },
  {
    emoji: '🔐',
    title: 'Sicurezza & Privacy',
    description: 'Le credenziali restano separate dal codice. Il monitor tecnico e l’export CSV non includono saldi, indirizzi, carte o segreti.',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    features: ['Monitor tecnico', 'Export locale', 'Provider disattivati'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      animateTransition(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      animateTransition(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleComplete();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '👋 Benvenuto in AgentPay!',
              body: 'Il monitor tecnico è pronto. Le funzioni finanziarie restano disattivate.',
              sound: true,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
          });
        }
      }
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <ScreenContainer containerClassName="flex-1" style={{ backgroundColor: step.bg }}>
      {/* Skip button */}
      {!isLastStep && (
        <TouchableOpacity
          onPress={handleSkip}
          style={{ position: 'absolute', top: 16, right: 24, zIndex: 10, paddingVertical: 8, paddingHorizontal: 16 }}
        >
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>Salta</Text>
        </TouchableOpacity>
      )}

      {/* Main content */}
      <Animated.View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        {/* Emoji icon */}
        <View style={{
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: step.color + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          borderWidth: 2,
          borderColor: step.color + '30',
        }}>
          <Text style={{ fontSize: 60 }}>{step.emoji}</Text>
        </View>

        {/* Step counter */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: step.color, letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' }}>
          {currentStep + 1} / {ONBOARDING_STEPS.length}
        </Text>

        {/* Title */}
        <Text style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.foreground,
          textAlign: 'center',
          marginBottom: 14,
          lineHeight: 34,
        }}>{step.title}</Text>

        {/* Description */}
        <Text style={{
          fontSize: 15,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 24,
          maxWidth: 300,
          marginBottom: 28,
        }}>
          {step.description}
        </Text>

        {currentStep === 0 && (
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ width: '100%', maxWidth: 320, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 20, borderRadius: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' }}
          >
            <Text accessibilityLabel="Attenzione" style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={{ flex: 1, color: '#9A3412', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
              Beta tecnica: carte, credito, pagamenti, saldi e trasferimenti sono inattivi. Non inserire dati bancari.
            </Text>
          </View>
        )}

        {/* Feature pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 }}>
          {step.features.map((feat, i) => (
            <View key={i} style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: step.color + '18',
              borderWidth: 1,
              borderColor: step.color + '35',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: step.color }}>✓ {feat}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Dots indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        {ONBOARDING_STEPS.map((_, index) => (
          <TouchableOpacity key={index} onPress={() => { if (index !== currentStep) animateTransition(index); }}>
            <View style={{
              height: 8,
              width: index === currentStep ? 28 : 8,
              borderRadius: 4,
              backgroundColor: index === currentStep ? step.color : colors.border,
            }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32 }}>
        {!isFirstStep ? (
          <TouchableOpacity
            onPress={handleBack}
            style={{
              flex: 1,
              paddingVertical: 16,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: step.color + '60',
              alignItems: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: step.color }}>← Indietro</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          onPress={handleNext}
          disabled={isLoading}
          style={{
            flex: 2,
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: step.color,
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
            {isLoading ? 'Caricamento...' : isLastStep ? 'Inizia ora →' : 'Avanti →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
