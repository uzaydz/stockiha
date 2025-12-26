import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsData {
    totalSales: number;
    totalOrders: number;
    totalProfit?: number;
    averageOrderValue?: number;
    comparison?: {
        diff: number;
        percentage: string;
        trend: 'up' | 'down' | 'neutral';
    };
}

interface StatsWidgetProps {
    data: StatsData;
    title?: string;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ data, title }) => {
    return (
        <div className="w-full mt-2 grid grid-cols-2 gap-2">
            {/* Total Sales Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-2 p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1 text-emerald-100 text-xs font-medium uppercase tracking-wider">
                        <DollarSign className="w-3.5 h-3.5" />
                        {title || 'الإجمالي'}
                    </div>
                    <div className="text-3xl font-bold tracking-tight font-mono">
                        {data.totalSales.toLocaleString()} <span className="text-lg opacity-80">دج</span>
                    </div>

                    {data.comparison && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {data.comparison.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{data.comparison.diff > 0 ? '+' : ''}{data.comparison.diff} ({data.comparison.percentage}%)</span>
                        </div>
                    )}
                </div>

                {/* Decorative Circles */}
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 blur-xl" />
            </motion.div>

            {/* Orders Count */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center gap-1"
            >
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-1">
                    <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{data.totalOrders}</div>
                <div className="text-[10px] text-gray-500 font-medium">الطلبات</div>
            </motion.div>

            {/* Profit (if available) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center gap-1"
            >
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1">
                    <Wallet className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {(data.totalProfit ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-medium">الأرباح التقديرية</div>
            </motion.div>
        </div>
    );
};
