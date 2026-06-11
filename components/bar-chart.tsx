import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface BarChartData {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  barHeight?: number;
}

export function BarChart({ data, height = 200, barHeight = 30 }: BarChartProps) {
  const colors = useColors();

  // Find max value for scaling
  const maxValue = Math.max(...data.map((item) => item.value));

  const styles = StyleSheet.create({
    container: {
      height,
      justifyContent: 'space-around',
      paddingVertical: 16,
    },
    barContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    label: {
      width: 60,
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '600',
    },
    barWrapper: {
      flex: 1,
      height: barHeight,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginHorizontal: 8,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 8,
    },
    value: {
      width: 50,
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
      textAlign: 'right',
    },
  });

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <View key={index} style={styles.barContainer}>
            <Text style={styles.label}>{item.label}</Text>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>${item.value.toFixed(0)}</Text>
          </View>
        );
      })}
    </View>
  );
}
