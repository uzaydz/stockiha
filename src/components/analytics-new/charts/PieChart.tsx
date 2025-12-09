/**
 * ============================================
 * STOCKIHA ANALYTICS - PIE CHART
 * مخطط الفطيرة/الدائري - Nivo
 * ============================================
 */

import React, { memo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { PieSvgProps } from '@nivo/pie';
import { useTheme } from 'next-themes';
import { nivoThemeDark, nivoThemeLight, chartColors } from '../utils/theme';
import { formatCurrency, formatPercent } from '../utils/formatters';

// ==================== Types ====================

export interface PieChartDatum {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDatum[];
  height?: number;
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  colors?: string[];
  valueFormat?: 'currency' | 'number' | 'percent';
  enableArcLabels?: boolean;
  enableArcLinkLabels?: boolean;
  arcLinkLabelsSkipAngle?: number;
  arcLabelsSkipAngle?: number;
  activeOuterRadiusOffset?: number;
  animate?: boolean;
  legend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  centerLabel?: React.ReactNode;
  sortByValue?: boolean;
  className?: string;
}

// ==================== Center Label Component ====================

const CenterLabel: React.FC<{
  centerX: number;
  centerY: number;
  children: React.ReactNode;
}> = ({ centerX, centerY, children }) => {
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: '14px',
        fontWeight: 600,
        fill: 'currentColor',
      }}
    >
      {children}
    </text>
  );
};

// ==================== Main Component ====================

const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  innerRadius = 0.6,
  padAngle = 0.5,
  cornerRadius = 4,
  colors,
  valueFormat = 'currency',
  enableArcLabels = false,
  enableArcLinkLabels = true,
  arcLinkLabelsSkipAngle = 10,
  arcLabelsSkipAngle = 10,
  activeOuterRadiusOffset = 8,
  animate = true,
  legend = false,
  legendPosition = 'right',
  tooltip = true,
  margin = { top: 20, right: 80, bottom: 20, left: 80 },
  centerLabel,
  sortByValue = true,
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const nivoTheme = isDark ? nivoThemeDark : nivoThemeLight;

  // Format values
  const formatValue = (value: number) => {
    switch (valueFormat) {
      case 'currency':
        return formatCurrency(value, { compact: true });
      case 'percent':
        return formatPercent(value);
      default:
        return String(value);
    }
  };

  // Colors
  const chartColorScheme = colors || chartColors.series;

  // Legend config
  const legendConfig: PieSvgProps<PieChartDatum>['legends'] = legend ? [
    {
      anchor: legendPosition === 'right' ? 'right' : legendPosition === 'left' ? 'left' : legendPosition === 'top' ? 'top' : 'bottom',
      direction: legendPosition === 'left' || legendPosition === 'right' ? 'column' : 'row',
      justify: false,
      translateX: legendPosition === 'right' ? 80 : legendPosition === 'left' ? -80 : 0,
      translateY: legendPosition === 'bottom' ? 50 : legendPosition === 'top' ? -50 : 0,
      itemsSpacing: 8,
      itemWidth: 100,
      itemHeight: 20,
      itemTextColor: isDark ? '#a1a1aa' : '#71717a',
      itemDirection: 'right-to-left',
      itemOpacity: 1,
      symbolSize: 12,
      symbolShape: 'circle',
      effects: [
        {
          on: 'hover',
          style: {
            itemTextColor: isDark ? '#fafafa' : '#18181b',
          },
        },
      ],
    },
  ] : undefined;

  // Calculate total for percentage
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ height }} className={className}>
      <ResponsivePie
        data={data}
        theme={nivoTheme}
        margin={margin}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={activeOuterRadiusOffset}
        colors={chartColorScheme}
        borderWidth={0}
        enableArcLabels={enableArcLabels}
        arcLabelsSkipAngle={arcLabelsSkipAngle}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        enableArcLinkLabels={enableArcLinkLabels}
        arcLinkLabelsSkipAngle={arcLinkLabelsSkipAngle}
        arcLinkLabelsTextColor={isDark ? '#a1a1aa' : '#71717a'}
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLinkLabelsDiagonalLength={16}
        arcLinkLabelsStraightLength={16}
        sortByValue={sortByValue}
        animate={animate}
        motionConfig="gentle"
        legends={legendConfig}
        isInteractive={tooltip}
        tooltip={({ datum }) => {
          const percentage = ((datum.value / total) * 100).toFixed(1);
          return (
            <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: datum.color }}
                />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {datum.label}
                </span>
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                {formatValue(datum.value)}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {percentage}%
              </div>
            </div>
          );
        }}
        layers={[
          'arcs',
          'arcLabels',
          'arcLinkLabels',
          'legends',
          centerLabel ? ({ centerX, centerY }) => (
            <CenterLabel centerX={centerX} centerY={centerY}>
              {centerLabel}
            </CenterLabel>
          ) : () => null,
        ]}
      />
    </div>
  );
};

export default memo(PieChart);
