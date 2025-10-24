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
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className={cn("font-bold text-primary", sizeClasses[size])}>
            {formatValue(value)}
          </div>
          
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center gap-1">
              <div 
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  trend.isPositive 
                    ? "bg-primary/10 text-primary" 
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;
