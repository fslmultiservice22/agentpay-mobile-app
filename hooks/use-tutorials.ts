import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number; // in seconds
  category: 'swap' | 'staking' | 'dao' | 'portfolio' | 'general';
  completed: boolean;
}

export interface TutorialState {
  tutorials: Tutorial[];
  currentTutorial: Tutorial | null;
  isPlaying: boolean;
  completedTutorials: string[];
}

const DEFAULT_TUTORIALS: Tutorial[] = [
  {
    id: 'tutorial-swap-1',
    title: 'Come fare uno Swap',
    description: 'Impara come scambiare token usando la Trading screen',
    videoUrl: 'https://example.com/videos/swap-tutorial.mp4',
    duration: 180,
    category: 'swap',
    completed: false,
  },
  {
    id: 'tutorial-staking-1',
    title: 'Come fare Staking',
    description: 'Guida completa al staking di token per guadagnare rewards',
    videoUrl: 'https://example.com/videos/staking-tutorial.mp4',
    duration: 240,
    category: 'staking',
    completed: false,
  },
  {
    id: 'tutorial-dao-1',
    title: 'Come votare in DAO',
    description: 'Partecipa alle decisioni della community votando le proposte',
    videoUrl: 'https://example.com/videos/dao-tutorial.mp4',
    duration: 200,
    category: 'dao',
    completed: false,
  },
  {
    id: 'tutorial-portfolio-1',
    title: 'Analizzare il tuo Portfolio',
    description: 'Usa il Portfolio Dashboard per monitorare i tuoi asset',
    videoUrl: 'https://example.com/videos/portfolio-tutorial.mp4',
    duration: 150,
    category: 'portfolio',
    completed: false,
  },
  {
    id: 'tutorial-general-1',
    title: 'Benvenuto in AgentPay',
    description: 'Tour introduttivo della app e delle principali funzionalità',
    videoUrl: 'https://example.com/videos/onboarding-tutorial.mp4',
    duration: 300,
    category: 'general',
    completed: false,
  },
];

export function useTutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[]>(DEFAULT_TUTORIALS);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  // Load completed tutorials from storage
  const loadCompletedTutorials = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_completed_tutorials');
      if (stored) {
        const completed = JSON.parse(stored);
        setCompletedTutorials(completed);
        // Update tutorials with completion status
        setTutorials((prev) =>
          prev.map((t) => ({
            ...t,
            completed: completed.includes(t.id),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load completed tutorials:', error);
    }
  }, []);

  // Start playing a tutorial
  const startTutorial = useCallback((tutorial: Tutorial) => {
    setCurrentTutorial(tutorial);
    setIsPlaying(true);
  }, []);

  // Pause tutorial
  const pauseTutorial = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Resume tutorial
  const resumeTutorial = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Mark tutorial as completed
  const completeTutorial = useCallback(
    async (tutorialId: string) => {
      try {
        const updated = [...completedTutorials, tutorialId];
        setCompletedTutorials(updated);
        await AsyncStorage.setItem('agentpay_completed_tutorials', JSON.stringify(updated));
        
        // Update tutorials
        setTutorials((prev) =>
          prev.map((t) => (t.id === tutorialId ? { ...t, completed: true } : t))
        );
      } catch (error) {
        console.error('Failed to mark tutorial as completed:', error);
      }
    },
    [completedTutorials]
  );

  // Get tutorials by category
  const getTutorialsByCategory = useCallback(
    (category: Tutorial['category']) => {
      return tutorials.filter((t) => t.category === category);
    },
    [tutorials]
  );

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (tutorials.length === 0) return 0;
    return Math.round((completedTutorials.length / tutorials.length) * 100);
  }, [tutorials, completedTutorials]);

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    setCurrentTutorial(null);
    setIsPlaying(false);
  }, []);

  return {
    tutorials,
    currentTutorial,
    isPlaying,
    completedTutorials,
    loadCompletedTutorials,
    startTutorial,
    pauseTutorial,
    resumeTutorial,
    completeTutorial,
    getTutorialsByCategory,
    getCompletionPercentage,
    skipTutorial,
  };
}
