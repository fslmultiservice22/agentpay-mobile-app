import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { analytics } from '@/lib/analytics';

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to AgentPay',
    description: 'Your all-in-one crypto wallet and trading platform',
    icon: 'wallet.pass.fill',
    color: '#0a7ea4',
  },
  {
    title: 'Explore Features',
    description: 'Tap the menu icon to access 12+ advanced features',
    icon: 'line.3.horizontal',
    color: '#22C55E',
  },
  {
    title: 'Manage Your Wallet',
    description: 'Connect your wallet and manage multiple chains',
    icon: 'key.fill',
    color: '#F59E0B',
  },
  {
    title: 'Trade & Analyze',
    description: 'Access trading tools, analytics, and copy trading',
    icon: 'chart.line.uptrend.xyaxis',
    color: '#8B5CF6',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Track onboarding started
  useEffect(() => {
    analytics.trackOnboardingStarted();
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    analytics.trackOnboardingSkipped();
    handleComplete();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Track onboarding completed
      analytics.trackOnboardingCompleted();
      // Mark onboarding as completed
      await AsyncStorage.setItem('onboarding_completed', 'true');
      // Navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      width: '100%',
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.primary,
      width: `${progress}%`,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${step.color}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 40,
      lineHeight: 24,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    skipButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    nextButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.background,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 40,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    activeDot: {
      width: 24,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
  });

  return (
    <ScreenContainer className="flex-1">
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <IconSymbol
              size={60}
              name={step.icon as any}
              color={step.color}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{step.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{step.description}</Text>

          {/* Dots */}
          <View style={styles.dots}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={index === currentStep ? styles.activeDot : styles.dot}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Back' : 'Skip'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
