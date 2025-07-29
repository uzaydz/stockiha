import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage, getColorByType } from './utils';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon?: LucideIcon;
  type?: 'revenue' | 'profit' | 'cost' | 'debt' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  className?: string;
  valueType?: 'currency' | 'percentage' | 'number';
  size?: 'sm' | 'md' | 'lg';
}

const MetricCard = React.memo<MetricCardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  type = 'success',
  trend,
  isLoading = false,
  className,
  valueType = 'currency',
  size = 'md'
}) => {
  const colorClass = getColorByType(type);
  
  const formatValue = (val: number): string => {
    switch (valueType) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'number':
        return val.toLocaleString('ar-DZ');
      default:
        return val.toString();
    }
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className={cn("font-bold animate-pulse bg-muted rounded h-8 w-32", sizeClasses[size])}></div>
          <div className="h-3 bg-muted animate-pulse rounded w-20 mt-2"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={cn("group", className)}
    >
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-transparent hover:border-l-primary">
        {/* خلفية متدرجة خفيفة */}
        <div 
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorClass}20 0%, transparent 100%)` 
          }}
        />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </CardTitle>
          {Icon && (
            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
              <Icon 
                className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" 
                style={{ color: colorClass }}
              />
            </div>
          )}
        </CardHeader>
        
        <CardContent className="relative z-10">
          <div className="space-y-2">
            <div 
              className={cn("font-bold transition-colors group-hover:scale-105 transform duration-300", sizeClasses[size])}
              style={{ color: colorClass }}
            >
              {formatValue(value)}
            </div>
            
            {subtitle && (
              <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                {subtitle}
              </p>
            )}
            
            {trend && (
              <div className="flex items-center gap-1">
                <div 
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    trend.isPositive 
                      ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400" 
                      : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        {/* شريط التحميل المتحرك */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent w-full transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </Card>
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;
