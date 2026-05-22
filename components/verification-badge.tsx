import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { VerificationLevel } from '@/hooks/use-trader-verification';

interface VerificationBadgeProps {
  level: VerificationLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const BADGE_CONFIG = {
  unverified: { icon: '❌', color: '#9BA1A6', label: 'Unverified' },
  basic: { icon: '✓', color: '#687076', label: 'Verified' },
  intermediate: { icon: '⭐', color: '#F59E0B', label: 'Intermediate' },
  advanced: { icon: '⭐⭐', color: '#3B82F6', label: 'Advanced' },
  elite: { icon: '👑', color: '#FFD700', label: 'Elite' },
};

export function VerificationBadge({ level, size = 'medium', showLabel = true }: VerificationBadgeProps) {
  const colors = useColors();
  const config = BADGE_CONFIG[level];

  const sizeMap = {
    small: { iconSize: 12, containerSize: 20, fontSize: 10 },
    medium: { iconSize: 16, containerSize: 28, fontSize: 12 },
    large: { iconSize: 20, containerSize: 36, fontSize: 14 },
  };

  const sizeConfig = sizeMap[size];

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      width: sizeConfig.containerSize,
      height: sizeConfig.containerSize,
      borderRadius: sizeConfig.containerSize / 2,
      backgroundColor: config.color + '20',
      borderWidth: 2,
      borderColor: config.color,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: sizeConfig.iconSize,
    },
    label: {
      fontSize: sizeConfig.fontSize,
      fontWeight: '600',
      color: config.color,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      {showLabel && <Text style={styles.label}>{config.label}</Text>}
    </View>
  );
}
