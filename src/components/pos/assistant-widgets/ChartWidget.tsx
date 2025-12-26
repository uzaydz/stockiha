import React, { useId } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChartDataPoint {
    label: string;
    value: number;
    [key: string]: any;
}

export interface ChartWidgetProps {
    title: string;
    description?: string;
    chartType: 'area' | 'bar';
    data: ChartDataPoint[];
    color?: string;
    trend?: {
        value: number; // percentage
        direction: 'up' | 'down' | 'neutral';
        label?: string;
    };
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl p-3 text-xs ring-1 ring-black/5 dark:ring-white/10">
                <p className="text-muted-foreground mb-1 font-medium">{label}</p>
                <p className="text-foreground font-bold text-sm tracking-tight">
                    {payload[0].value.toLocaleString()} دج
                </p>
            </div>
        );
    }
    return null;
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({
    title,
    description,
    chartType,
    data,
    color = "#f97316", // Default brand orange
    trend
}) => {
    // Safe default color if none provided
    const chartColor = color || "#f97316";
    // Generate a safe, unique ID for the SVG gradient
    const uniqueId = useId().replace(/:/g, '');
    const gradientId = `chart-gradient-${uniqueId}`;

    return (
        <Card className="w-full max-w-sm overflow-hidden border border-border/60 bg-background/60 dark:bg-card/40 backdrop-blur-md shadow-sm">
            <CardHeader className="p-5 pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold text-foreground tracking-tight">{title}</CardTitle>
                        {description && <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                            trend.direction === 'up' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                trend.direction === 'down' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                                    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                        )}>
                            {trend.direction === 'up' ? <TrendingUp size={12} strokeWidth={2.5} /> :
                                trend.direction === 'down' ? <TrendingDown size={12} strokeWidth={2.5} /> :
                                    <Minus size={12} strokeWidth={2.5} />}
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
                <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'area' ? (
                            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="label"
                                    hide={false}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    dy={10}
                                    interval="preserveStartEnd"
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ stroke: chartColor, strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.3 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#${gradientId})`}
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        ) : (
                            <BarChart data={data} barGap={4}>
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    dy={10}
                                    interval={0}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill={chartColor}
                                    radius={[4, 4, 4, 4]}
                                    barSize={20}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
