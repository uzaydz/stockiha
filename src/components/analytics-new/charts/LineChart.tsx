/**
 * ============================================
 * STOCKIHA ANALYTICS - LINE CHART
 * مخطط الخطوط - Nivo
 * ============================================
 */

import React, { memo, useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { LineSvgProps, Serie } from '@nivo/line';
import { useTheme } from 'next-themes';
import { nivoThemeDark, nivoThemeLight, chartColors } from '../utils/theme';
import { formatAxisValue, formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface LineChartData {
  id: string;
  label?: string;
  color?: string;
  data: Array<{
    x: string | number;
    y: number;
  }>;
}

export interface LineChartProps {
  data: LineChartData[];
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  enableArea?: boolean;
  areaOpacity?: number;
  enablePoints?: boolean;
  pointSize?: number;
  enableGridX?: boolean;
  enableGridY?: boolean;
  curve?: 'linear' | 'natural' | 'monotoneX' | 'step' | 'stepAfter' | 'stepBefore' | 'catmullRom';
  colors?: string[];
  yFormat?: 'currency' | 'number' | 'percent';
  xFormat?: (value: any) => string;
  animate?: boolean;
  legend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  className?: string;
}

// ==================== Main Component ====================

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 300,
  xAxisLabel,
  yAxisLabel,
  enableArea = false,
  areaOpacity = 0.15,
  enablePoints = true,
  pointSize = 6,
  enableGridX = false,
  enableGridY = true,
  curve = 'monotoneX',
  colors,
  yFormat = 'currency',
  xFormat,
  animate = true,
  legend = false,
  legendPosition = 'bottom',
  tooltip = true,
  margin = { top: 20, right: 20, bottom: 50, left: 60 },
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

  // Tooltip formatter
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
  const legendConfig: LineSvgProps['legends'] = legend ? [
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
          stacked: false,
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
        colors={chartColorScheme}
        lineWidth={2.5}
        enablePoints={enablePoints}
        pointSize={pointSize}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableArea={enableArea}
        areaOpacity={areaOpacity}
        areaBlendMode="normal"
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        useMesh={true}
        animate={animate}
        motionConfig="gentle"
        legends={legendConfig}
        isInteractive={tooltip}
        tooltip={({ point }) => (
          <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: point.serieColor }}
              />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {point.serieId}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatTooltipValue(point.data.yFormatted as number)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {point.data.xFormatted}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default memo(LineChart);
