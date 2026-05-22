import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import Svg, { Circle } from 'react-native-svg';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  radius?: number;
  strokeWidth?: number;
}

export function PieChart({ data, radius = 80, strokeWidth = 15 }: PieChartProps) {
  const colors = useColors();

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dashoffset for each segment
  let currentOffset = 0;
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const strokeDasharray = (percentage / 100) * circumference;
    const offset = currentOffset;
    currentOffset += strokeDasharray;

    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset: -offset,
    };
  });

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    legend: {
      marginTop: 20,
      width: '100%',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    legendLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '600',
    },
    legendValue: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Pie Chart SVG */}
      <Svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2} viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}>
        {segments.map((segment, index) => (
          <Circle
            key={index}
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          />
        ))}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
            <Text style={styles.legendLabel}>{segment.label}</Text>
            <Text style={styles.legendValue}>{segment.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
