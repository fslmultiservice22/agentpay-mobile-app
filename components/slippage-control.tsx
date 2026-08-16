import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { MAX_SLIPPAGE_PERCENT, MIN_SLIPPAGE_PERCENT } from '@/lib/swap-quote-service';

interface SlippageControlProps {
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
}

export function SlippageControl({ value, onChange, presets = [0.1, 0.5, 1.0] }: SlippageControlProps) {
  const colors = useColors();
  const { t } = useI18n();
  const [customValue, setCustomValue] = useState(value.toString());
  const [isCustom, setIsCustom] = useState(!presets.includes(value));

  // Keep the field in sync when the tolerance changes from outside (for
  // instance when the trading screen resets it after a swap).
  useEffect(() => {
    setCustomValue(value.toString());
    setIsCustom(!presets.includes(value));
  }, [value, presets]);

  const handlePresetSelect = (preset: number) => {
    onChange(preset);
    setCustomValue(preset.toString());
    setIsCustom(false);
  };

  const handleCustomChange = (text: string) => {
    setCustomValue(text);
    setIsCustom(true);
    const numValue = parseFloat(text.replace(',', '.'));
    if (
      !isNaN(numValue) &&
      numValue >= MIN_SLIPPAGE_PERCENT &&
      numValue <= MAX_SLIPPAGE_PERCENT
    ) {
      onChange(numValue);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    valueText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    presetsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    presetButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    presetButtonInactive: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    presetButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    presetButtonTextActive: {
      color: colors.background,
    },
    presetButtonTextInactive: {
      color: colors.foreground,
    },
    customContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    customInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 14,
      color: colors.foreground,
    },
    customUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },
    warningContainer: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.warning,
      borderRadius: 8,
    },
    warningText: {
      fontSize: 12,
      color: colors.background,
    },
  });

  const isHighSlippage = value > 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('trading.slippageTolerance')}</Text>
        <Text style={styles.valueText}>{value.toFixed(2)}%</Text>
      </View>

      <View style={styles.presetsContainer}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              value === preset && !isCustom ? styles.presetButtonActive : styles.presetButtonInactive,
            ]}
            onPress={() => handlePresetSelect(preset)}
          >
            <Text
              style={[
                styles.presetButtonText,
                value === preset && !isCustom ? styles.presetButtonTextActive : styles.presetButtonTextInactive,
              ]}
            >
              {preset}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customContainer}>
        <TextInput
          style={styles.customInput}
          placeholder={t('trading.customSlippage')}
          placeholderTextColor={colors.muted}
          value={customValue}
          onChangeText={handleCustomChange}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <Text style={styles.customUnit}>%</Text>
      </View>

      {isHighSlippage && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>{t('trading.highSlippageWarning')}</Text>
        </View>
      )}
    </View>
  );
}
