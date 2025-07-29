import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCardProps } from './types';
import { formatNumber } from './utils';

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = "blue",
  className
}) => {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800",
    green: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800",
    purple: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800",
    orange: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800",
    red: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800"
  };

  const iconColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-gradient-to-br rounded-xl border p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group",
        colorClasses[color],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </p>
          <p className={cn("text-3xl font-bold", iconColorClasses[color])}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              {trend === "up" ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend === "up" ? "text-green-600" : "text-red-600"
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm group-hover:scale-110 transition-transform duration-300",
          iconColorClasses[color]
        )}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard; 