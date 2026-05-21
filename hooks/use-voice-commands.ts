import { useState, useCallback, useEffect } from 'react';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  parameters?: Record<string, any>;
  enabled: boolean;
}

export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceCommandResult {
  success: boolean;
  command: string;
  result?: any;
  error?: string;
}

const DEFAULT_COMMANDS: VoiceCommand[] = [
  {
    id: 'cmd_swap',
    command: 'swap',
    action: 'swap_tokens',
    enabled: true,
  },
  {
    id: 'cmd_send',
    command: 'send',
    action: 'send_transaction',
    enabled: true,
  },
  {
    id: 'cmd_balance',
    command: 'balance',
    action: 'check_balance',
    enabled: true,
  },
  {
    id: 'cmd_portfolio',
    command: 'portfolio',
    action: 'show_portfolio',
    enabled: true,
  },
  {
    id: 'cmd_stake',
    command: 'stake',
    action: 'stake_tokens',
    enabled: true,
  },
  {
    id: 'cmd_unstake',
    command: 'unstake',
    action: 'unstake_tokens',
    enabled: true,
  },
  {
    id: 'cmd_history',
    command: 'history',
    action: 'show_history',
    enabled: true,
  },
  {
    id: 'cmd_settings',
    command: 'settings',
    action: 'open_settings',
    enabled: true,
  },
];

export function useVoiceCommands() {
  const [commands, setCommands] = useState<VoiceCommand[]>(DEFAULT_COMMANDS);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [commandHistory, setCommandHistory] = useState<
    Array<{ command: string; timestamp: number; result: VoiceCommandResult }>
  >([]);

  // Load commands from storage
  const loadCommands = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_voice_commands');
      if (stored) {
        setCommands(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load voice commands:', error);
    }
  }, []);

  // Save commands to storage
  const saveCommands = useCallback(async (updatedCommands: VoiceCommand[]) => {
    try {
      await AsyncStorage.setItem('agentpay_voice_commands', JSON.stringify(updatedCommands));
      setCommands(updatedCommands);
    } catch (error) {
      console.error('Failed to save voice commands:', error);
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setRecognizedText('');
      // Note: Actual speech recognition would require expo-speech or similar
      // This is a placeholder implementation
      console.log('Voice listening started');
    } catch (error) {
      console.error('Failed to start listening:', error);
      setIsListening(false);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      setIsListening(false);
      console.log('Voice listening stopped');
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }, []);

  // Process voice input
  const processVoiceInput = useCallback(
    async (text: string): Promise<VoiceCommandResult> => {
      try {
        const lowerText = text.toLowerCase();

        // Find matching command
        const matchedCommand = commands.find(
          (cmd) => cmd.enabled && lowerText.includes(cmd.command)
        );

        if (!matchedCommand) {
          return {
            success: false,
            command: text,
            error: 'Command not recognized',
          };
        }

        // Execute command
        const result: VoiceCommandResult = {
          success: true,
          command: matchedCommand.action,
          result: {
            action: matchedCommand.action,
            parameters: matchedCommand.parameters,
          },
        };

        // Add to history
        const updated = [
          ...commandHistory,
          {
            command: matchedCommand.action,
            timestamp: Date.now(),
            result,
          },
        ];
        setCommandHistory(updated);

        return result;
      } catch (error) {
        return {
          success: false,
          command: text,
          error: String(error),
        };
      }
    },
    [commands, commandHistory]
  );

  // Speak text (text-to-speech)
  const speak = useCallback(async (text: string, language: string = 'en') => {
    try {
      await Speech.speak(text, {
        language,
        pitch: 1.0,
        rate: 1.0,
      });
    } catch (error) {
      console.error('Failed to speak:', error);
    }
  }, []);

  // Add custom command
  const addCommand = useCallback(
    async (command: Omit<VoiceCommand, 'id'>) => {
      try {
        const newCommand: VoiceCommand = {
          ...command,
          id: `cmd_${Date.now()}`,
        };
        const updated = [...commands, newCommand];
        await saveCommands(updated);
      } catch (error) {
        console.error('Failed to add command:', error);
      }
    },
    [commands, saveCommands]
  );

  // Remove command
  const removeCommand = useCallback(
    async (commandId: string) => {
      try {
        const updated = commands.filter((c) => c.id !== commandId);
        await saveCommands(updated);
      } catch (error) {
        console.error('Failed to remove command:', error);
      }
    },
    [commands, saveCommands]
  );

  // Toggle command
  const toggleCommand = useCallback(
    async (commandId: string) => {
      try {
        const updated = commands.map((c) =>
          c.id === commandId ? { ...c, enabled: !c.enabled } : c
        );
        await saveCommands(updated);
      } catch (error) {
        console.error('Failed to toggle command:', error);
      }
    },
    [commands, saveCommands]
  );

  // Get command history
  const getCommandHistory = useCallback(() => {
    return commandHistory.slice(-50); // Last 50 commands
  }, [commandHistory]);

  // Clear history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  return {
    commands,
    isListening,
    recognizedText,
    commandHistory,
    startListening,
    stopListening,
    processVoiceInput,
    speak,
    addCommand,
    removeCommand,
    toggleCommand,
    getCommandHistory,
    clearHistory,
    loadCommands,
  };
}
