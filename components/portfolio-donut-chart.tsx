import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';

export interface DonutSlice {
  label: string;
  value: number;
}

interface PortfolioDonutChartProps {
  data: DonutSlice[];
  size: number;
  /** Ring thickness in pixels. */
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  emptyLabel?: string;
  /** Slices below this share are merged into an "other" slice. */
  minSharePercent?: number;
  otherLabel?: string;
}

/** Qualitative palette, stable across renders so the legend always matches. */
const SLICE_COLORS = [
  '#0a7ea4',
  '#22C55E',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#64748B',
];

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/** Builds an annular sector path between two angles. */
function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

/**
 * Donut chart with legend, drawn with react-native-svg.
 *
 * Replaces the grey placeholder that stood in for `PieChart` in the portfolio
 * dashboard, where the composition was computed but never displayed.
 */
export function PortfolioDonutChart({
  data,
  size,
  thickness = 26,
  centerLabel,
  centerValue,
  emptyLabel,
  minSharePercent = 2,
  otherLabel = 'Other',
}: PortfolioDonutChartProps) {
  const colors = useColors();

  const slices = useMemo(() => {
    const positive = data.filter(slice => slice.value > 0);
    const total = positive.reduce((sum, slice) => sum + slice.value, 0);
    if (total <= 0) return [];

    const sorted = [...positive].sort((a, b) => b.value - a.value);
    const main: DonutSlice[] = [];
    let otherValue = 0;

    sorted.forEach(slice => {
      const share = (slice.value / total) * 100;
      if (share < minSharePercent || main.length >= SLICE_COLORS.length - 1) {
        otherValue += slice.value;
      } else {
        main.push(slice);
      }
    });

    if (otherValue > 0) {
      main.push({ label: otherLabel, value: otherValue });
    }

    let angle = 0;
    return main.map((slice, index) => {
      const share = (slice.value / total) * 100;
      const sweep = (slice.value / total) * 360;
      const startAngle = angle;
      angle += sweep;
      return {
        ...slice,
        share,
        startAngle,
        // Avoid a zero-length arc that would render as an artefact.
        endAngle: Math.max(startAngle + 0.5, angle),
        color: SLICE_COLORS[index % SLICE_COLORS.length],
      };
    });
  }, [data, minSharePercent, otherLabel]);

  if (slices.length === 0) {
    return (
      <View
        style={{
          height: size,
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

  const center = size / 2;
  const outerRadius = center - 4;
  const innerRadius = outerRadius - thickness;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G>
            {slices.map(slice => (
              <Path
                key={slice.label}
                d={describeArc(center, center, outerRadius, innerRadius, slice.startAngle, slice.endAngle)}
                fill={slice.color}
              />
            ))}
            <Circle cx={center} cy={center} r={innerRadius} fill="transparent" />
          </G>
        </Svg>

        {/* Centre overlay, positioned above the ring */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          {centerValue && (
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{centerLabel}</Text>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flex: 1, paddingLeft: 16 }}>
        {slices.map(slice => (
          <View
            key={slice.label}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: slice.color,
                marginRight: 8,
              }}
            />
            <Text style={{ flex: 1, fontSize: 12, color: colors.foreground }} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>
              {slice.share.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
