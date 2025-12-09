/**
 * ============================================
 * STOCKIHA ANALYTICS - BAR CHART
 * مخطط الأعمدة - Nivo
 * ============================================
 */

import React, { memo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { BarDatum, BarSvgProps } from '@nivo/bar';
import { useTheme } from 'next-themes';
import { nivoThemeDark, nivoThemeLight, chartColors } from '../utils/theme';
import { formatAxisValue, formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface BarChartProps {
  data: BarDatum[];
  keys: string[];
  indexBy: string;
  height?: number;
  layout?: 'vertical' | 'horizontal';
  groupMode?: 'grouped' | 'stacked';
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  yFormat?: 'currency' | 'number' | 'percent';
  enableGridX?: boolean;
  enableGridY?: boolean;
  enableLabel?: boolean;
  labelSkipWidth?: number;
  labelSkipHeight?: number;
  borderRadius?: number;
  innerPadding?: number;
  padding?: number;
  animate?: boolean;
  legend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  colorBy?: 'id' | 'indexValue';
  className?: string;
}

// ==================== Main Component ====================

const BarChart: React.FC<BarChartProps> = ({
  data,
  keys,
  indexBy,
  height = 300,
  layout = 'vertical',
  groupMode = 'grouped',
  colors,
  xAxisLabel,
  yAxisLabel,
  yFormat = 'currency',
  enableGridX = false,
  enableGridY = true,
  enableLabel = true,
  labelSkipWidth = 12,
  labelSkipHeight = 12,
  borderRadius = 4,
  innerPadding = 2,
  padding = 0.3,
  animate = true,
  legend = false,
  legendPosition = 'bottom',
  tooltip = true,
  margin = { top: 20, right: 20, bottom: 50, left: 60 },
  colorBy = 'id',
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const nivoTheme = isDark ? nivoThemeDark : nivoThemeLight;

  // Format values
  const formatValue = (value: number) => {
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

  // Colors
  const chartColorScheme = colors || chartColors.series;

  // Legend config
  const legendConfig: BarSvgProps<BarDatum>['legends'] = legend ? [
    {
      dataFrom: 'keys',
      anchor: legendPosition === 'bottom' ? 'bottom' : legendPosition === 'top' ? 'top' : legendPosition === 'left' ? 'left' : 'right',
      direction: legendPosition === 'left' || legendPosition === 'right' ? 'column' : 'row',
      justify: false,
      translateX: legendPosition === 'right' ? 120 : legendPosition === 'left' ? -100 : 0,
      translateY: legendPosition === 'bottom' ? 50 : legendPosition === 'top' ? -40 : 0,
      itemsSpacing: 10,
      itemWidth: 100,
      itemHeight: 20,
      itemDirection: 'right-to-left',
      itemOpacity: 0.85,
      symbolSize: 12,
      symbolShape: 'square',
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
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        theme={nivoTheme}
        margin={margin}
        layout={layout}
        groupMode={groupMode}
        padding={padding}
        innerPadding={innerPadding}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={chartColorScheme}
        colorBy={colorBy}
        borderRadius={borderRadius}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: layout === 'vertical' ? xAxisLabel : yAxisLabel,
          legendPosition: 'middle',
          legendOffset: 36,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: layout === 'vertical' ? yAxisLabel : xAxisLabel,
          legendPosition: 'middle',
          legendOffset: -50,
          format: formatValue,
        }}
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        enableLabel={enableLabel}
        labelSkipWidth={labelSkipWidth}
        labelSkipHeight={labelSkipHeight}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        animate={animate}
        motionConfig="gentle"
        legends={legendConfig}
        isInteractive={tooltip}
        tooltip={({ id, value, color, indexValue }) => (
          <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {id}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatTooltipValue(value)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {indexValue}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default memo(BarChart);
