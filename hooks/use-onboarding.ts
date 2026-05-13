import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: string;
}

export interface OnboardingState {
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  isCompleted: boolean;
  completedSteps: string[];
  isLoading: boolean;
}

const ONBOARDING_KEY = 'agentpay_onboarding_completed';
const ONBOARDING_STEPS_KEY = 'agentpay_onboarding_steps';

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AgentPay',
    description: 'Your secure Web3 wallet for managing crypto assets',
    icon: '👋',
  },
  {
    id: 'security',
    title: 'Secure Your Wallet',
    description: 'Enable biometric authentication and backup your seed phrase',
    icon: '🔒',
    action: 'enable_biometric',
  },
  {
    id: 'connect',
    title: 'Connect Your Wallet',
    description: 'Connect MetaMask or WalletConnect to get started',
    icon: '🔗',
    action: 'connect_wallet',
  },
  {
    id: 'portfolio',
    title: 'View Your Portfolio',
    description: 'Track your assets and monitor your investments',
    icon: '📊',
  },
  {
    id: 'trading',
    title: 'Start Trading',
    description: 'Swap tokens and explore DeFi opportunities',
    icon: '💱',
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'You\'re ready to explore the world of Web3',
    icon: '🎉',
  },
];

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isOnboarding: true,
    currentStep: 0,
    steps: DEFAULT_STEPS,
    isCompleted: false,
    completedSteps: [],
    isLoading: false,
  });

  const isMountedRef = useRef(true);

  // Controlla se l'onboarding è stato completato
  const checkOnboardingStatus = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
      }));

      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      const completedSteps = await AsyncStorage.getItem(ONBOARDING_STEPS_KEY);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnboarding: !completed,
          isCompleted: !!completed,
          completedSteps: completedSteps ? JSON.parse(completedSteps) : [],
          isLoading: false,
        }));
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    }
  }, []);

  // Completa uno step
  const completeStep = useCallback(async (stepId: string) => {
    try {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, stepId],
        }));
      }

      // Salva lo step completato
      const completedSteps = state.completedSteps.concat(stepId);
      await AsyncStorage.setItem(ONBOARDING_STEPS_KEY, JSON.stringify(completedSteps));
    } catch (err) {
      console.error('Failed to complete step:', err);
    }
  }, [state.completedSteps]);

  // Vai al prossimo step
  const nextStep = useCallback(async () => {
    const currentStepId = state.steps[state.currentStep]?.id;
    if (currentStepId) {
      await completeStep(currentStepId);
    }

    if (state.currentStep < state.steps.length - 1) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1,
        }));
      }
    }
  }, [state.currentStep, state.steps, completeStep]);

  // Vai al passo precedente
  const previousStep = useCallback(() => {
    if (state.currentStep > 0) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          currentStep: prev.currentStep - 1,
        }));
      }
    }
  }, [state.currentStep]);

  // Completa l'onboarding
  const completeOnboarding = useCallback(async () => {
    try {
      // Completa l'ultimo step
      const lastStepId = state.steps[state.steps.length - 1]?.id;
      if (lastStepId) {
        await completeStep(lastStepId);
      }

      // Salva il completamento
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnboarding: false,
          isCompleted: true,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      return false;
    }
  }, [state.steps, completeStep]);

  // Salta l'onboarding
  const skipOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnboarding: false,
          isCompleted: true,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
      return false;
    }
  }, []);

  // Resetta l'onboarding
  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await AsyncStorage.removeItem(ONBOARDING_STEPS_KEY);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isOnboarding: true,
          currentStep: 0,
          isCompleted: false,
          completedSteps: [],
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to reset onboarding:', err);
      return false;
    }
  }, []);

  // Controlla lo stato dell'onboarding al mount
  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    checkOnboardingStatus,
    completeStep,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}
