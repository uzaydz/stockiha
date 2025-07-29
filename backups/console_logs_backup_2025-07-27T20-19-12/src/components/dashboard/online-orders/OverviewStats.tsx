import React from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import StatCard from './StatCard';
import { OrderOverview } from './types';
import { formatCurrency, formatPercentage } from './utils';

interface OverviewStatsProps {
  overview: OrderOverview;
  isLoading?: boolean;
}

const OverviewStats: React.FC<OverviewStatsProps> = ({ overview, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-xl border p-6 h-[140px] animate-pulse">
            <div className="flex items-center justify-between h-full">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                <div className="h-8 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-12"></div>
              </div>
              <div className="h-12 w-12 bg-muted animate-pulse rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "إجمالي الطلبات",
      value: overview.totalOrders,
      icon: <Package className="h-6 w-6" />,
      color: "blue" as const,
      trend: "up" as const,
      trendValue: "+12%"
    },
    {
      title: "إجمالي الإيرادات",
      value: formatCurrency(overview.totalRevenue),
      icon: <DollarSign className="h-6 w-6" />,
      color: "green" as const,
      trend: "up" as const,
      trendValue: "+8.2%"
    },
    {
      title: "متوسط قيمة الطلب",
      value: formatCurrency(overview.averageOrderValue),
      icon: <TrendingUp className="h-6 w-6" />,
      color: "purple" as const,
      trend: "up" as const,
      trendValue: "+5.1%"
    },
    {
      title: "معدل الإكمال",
      value: formatPercentage(overview.completionRate),
      icon: <CheckCircle className="h-6 w-6" />,
      color: "orange" as const,
      trend: "up" as const,
      trendValue: "+2.3%"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {statsData.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <StatCard {...stat} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default OverviewStats; 