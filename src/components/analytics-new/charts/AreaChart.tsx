/**
 * ============================================
 * STOCKIHA ANALYTICS - AREA CHART
 * مخطط المساحة - Nivo
 * ============================================
 */

import React, { memo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { LineSvgProps } from '@nivo/line';
import type { LegendProps } from '@nivo/legends';
import { useTheme } from 'next-themes';
import { nivoThemeDark, nivoThemeLight, chartColors, hexToRgba } from '../utils/theme';
import { formatAxisValue, formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface AreaChartData {
  id: string;
  label?: string;
  color?: string;
  data: Array<{
    x: string | number;
    y: number;
  }>;
}

export interface AreaChartProps {
  data: AreaChartData[];
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  areaOpacity?: number;
  enablePoints?: boolean;
  pointSize?: number;
  enableGridX?: boolean;
  enableGridY?: boolean;
  curve?: 'linear' | 'natural' | 'monotoneX' | 'step' | 'stepAfter' | 'stepBefore' | 'catmullRom';
  colors?: string[];
  yFormat?: 'currency' | 'number' | 'percent';
  xFormat?: (value: any) => string;
  stacked?: boolean;
  animate?: boolean;
  legend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  gradientColors?: { start: string; end: string };
  className?: string;
}

// ==================== Gradient Definition ====================

const AreaGradient: React.FC<{
  id: string;
  color: string;
  opacity?: number;
}> = ({ id, color, opacity = 0.3 }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={opacity} />
    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
  </linearGradient>
);

// ==================== Main Component ====================

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  areaOpacity = 0.2,
  enablePoints = false,
  pointSize = 6,
  enableGridX = false,
  enableGridY = true,
  curve = 'monotoneX',
  colors,
  yFormat = 'currency',
  xFormat,
  stacked = false,
  animate = true,
  legend = false,
  legendPosition = 'bottom',
  tooltip = true,
  margin = { top: 20, right: 20, bottom: 50, left: 60 },
  gradientColors,
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const nivoTheme = isDark ? nivoThemeDark : nivoThemeLight;

  // Format Y axis values
  const formatYValue = (value: number) => {
    switch (yFormat) {
      case 'currency':
        return formatAxisValue(value);
      case 'percent':
        return `${value}%`;
      default:
        return String(value);
    }
  };

  const formatTooltipValue = (value: number) => {
    switch (yFormat) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return String(value);
    }
  };

  // Colors - convert readonly array to mutable for type compatibility
  const chartColorScheme = colors || [...chartColors.series];

  // Legend config
  const legendConfig: LegendProps[] | undefined = legend ? [
    {
      anchor: legendPosition === 'bottom' ? 'bottom' : legendPosition === 'top' ? 'top' : legendPosition === 'left' ? 'left' : 'right',
      direction: legendPosition === 'left' || legendPosition === 'right' ? 'column' : 'row',
      justify: false,
      translateX: legendPosition === 'right' ? 100 : legendPosition === 'left' ? -100 : 0,
      translateY: legendPosition === 'bottom' ? 50 : legendPosition === 'top' ? -50 : 0,
      itemsSpacing: 10,
      itemDirection: 'right-to-left',
      itemWidth: 80,
      itemHeight: 20,
      itemOpacity: 0.75,
      symbolSize: 10,
      symbolShape: 'circle',
      symbolBorderColor: 'rgba(0, 0, 0, .5)',
      effects: [
        {
          on: 'hover',
          style: {
            itemOpacity: 1,
          },
        },
      ],
    },
  ] : undefined;

  return (
    <div style={{ height }} className={className}>
      <ResponsiveLine
        data={data}
        theme={nivoTheme}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: stacked,
          reverse: false,
        }}
        curve={curve}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: xAxisLabel,
          legendOffset: 36,
          legendPosition: 'middle',
          format: xFormat,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: yAxisLabel,
          legendOffset: -50,
          legendPosition: 'middle',
          format: formatYValue,
        }}
        colors={chartColorScheme as any}
        lineWidth={2}
        enablePoints={enablePoints}
        pointSize={pointSize}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableArea={true}
        areaOpacity={areaOpacity}
        areaBlendMode="normal"
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        useMesh={true}
        animate={animate}
        motionConfig="gentle"
        legends={legendConfig}
        isInteractive={tooltip}
        defs={[
          ...data.map((serie, index) => ({
            id: `gradient-${serie.id}`,
            type: 'linearGradient' as const,
            colors: [
              { offset: 0, color: chartColorScheme[index % chartColorScheme.length], opacity: 0.4 },
              { offset: 100, color: chartColorScheme[index % chartColorScheme.length], opacity: 0 },
            ],
          })),
        ]}
        fill={data.map((serie) => ({
          match: { id: serie.id },
          id: `gradient-${serie.id}`,
        }))}
        tooltip={({ point }) => (
          <div className="bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-zinc-200/50 dark:border-zinc-800/50 min-w-[140px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <div
                className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: point.seriesColor, boxShadow: `0 0 8px ${point.seriesColor}` }}
              />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {point.seriesId}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tracking-tight">
                {formatTooltipValue(point.data.y as number)}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-500 font-medium">
                {point.data.xFormatted}
              </div>
            </div>
          </div>
        )}
        crosshairType="x"
      />
    </div>
  );
};

export default memo(AreaChart);
