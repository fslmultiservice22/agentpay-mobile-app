import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';

export interface AreaChartPoint {
  timestamp: number;
  value: number;
}

interface PortfolioAreaChartProps {
  data: AreaChartPoint[];
  width: number;
  height: number;
  /** Labels rendered under the chart; usually the first, middle and last date. */
  showAxisLabels?: boolean;
  emptyLabel?: string;
}

const PADDING_X = 8;
const PADDING_Y = 12;

/**
 * Lightweight area chart drawn with react-native-svg.
 *
 * Replaces the placeholder grey rectangles that stood in for `LineChart` in the
 * portfolio dashboard: the value series is now actually rendered, with a
 * gradient fill, a baseline and a highlighted last point.
 */
export function PortfolioAreaChart({
  data,
  width,
  height,
  showAxisLabels = true,
  emptyLabel,
}: PortfolioAreaChartProps) {
  const colors = useColors();

  const geometry = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(point => point.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    // Flat series would divide by zero; pad the range so the line sits mid-height.
    const range = maxValue - minValue || Math.max(maxValue, 1) * 0.1 || 1;

    const innerWidth = width - PADDING_X * 2;
    const innerHeight = height - PADDING_Y * 2;
    const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

    const coordinates = data.map((point, index) => {
      const x = PADDING_X + (data.length > 1 ? index * step : innerWidth / 2);
      const y = PADDING_Y + (1 - (point.value - minValue) / range) * innerHeight;
      return { x, y, ...point };
    });

    const linePath = coordinates
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(' ');

    const areaPath =
      coordinates.length > 1
        ? `${linePath} L${coordinates[coordinates.length - 1].x.toFixed(2)},${(
            height - PADDING_Y
          ).toFixed(2)} L${coordinates[0].x.toFixed(2)},${(height - PADDING_Y).toFixed(2)} Z`
        : '';

    const first = values[0];
    const last = values[values.length - 1];

    return {
      coordinates,
      linePath,
      areaPath,
      minValue,
      maxValue,
      positive: last >= first,
      last: coordinates[coordinates.length - 1],
    };
  }, [data, width, height]);

  if (!geometry) {
    return (
      <View
        style={{
          width,
          height,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>{emptyLabel ?? ''}</Text>
      </View>
    );
  }

  const strokeColor = geometry.positive ? colors.success : colors.error;
  const midY = PADDING_Y + (height - PADDING_Y * 2) / 2;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="portfolioAreaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={strokeColor} stopOpacity="0.28" />
            <Stop offset="1" stopColor={strokeColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Reference gridlines */}
        <Line
          x1={PADDING_X}
          y1={PADDING_Y}
          x2={width - PADDING_X}
          y2={PADDING_Y}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={PADDING_X}
          y1={midY}
          x2={width - PADDING_X}
          y2={midY}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={PADDING_X}
          y1={height - PADDING_Y}
          x2={width - PADDING_X}
          y2={height - PADDING_Y}
          stroke={colors.border}
          strokeWidth={1}
        />

        {geometry.areaPath.length > 0 && <Path d={geometry.areaPath} fill="url(#portfolioAreaFill)" />}

        <Path
          d={geometry.linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <Circle cx={geometry.last.x} cy={geometry.last.y} r={8} fill={`${strokeColor}33`} />
        <Circle cx={geometry.last.x} cy={geometry.last.y} r={4} fill={strokeColor} />
      </Svg>

      {showAxisLabels && data.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING_X }}>
          <Text style={{ fontSize: 10, color: colors.muted }}>
            {new Date(data[0].timestamp).toLocaleDateString()}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted }}>
            {new Date(data[data.length - 1].timestamp).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}
