import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartProps } from './types';
import { formatNumber, formatPercentage, formatCurrency } from './utils';

const ProgressChart: React.FC<ChartProps> = ({
  title,
  data,
  icon,
  showAmounts = false,
  className
}) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border border-border/50 p-6 hover:shadow-lg transition-all duration-300",
          className
        )}
      >
        {/* العنوان */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">
              لا توجد بيانات متاحة
            </p>
          </div>
        </div>

        {/* حالة فارغة */}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-muted mb-3">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">لا توجد بيانات</p>
          <p className="text-xs text-muted-foreground">ستظهر البيانات هنا عند توفرها</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-border/50 p-6 hover:shadow-lg transition-all duration-300",
        className
      )}
    >
      {/* العنوان */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">
            آخر 30 يوماً • {formatNumber(total)} عنصر
            {showAmounts && totalAmount > 0 && (
              <span className="mr-2">• {formatCurrency(totalAmount)}</span>
            )}
          </p>
        </div>
      </div>

      {/* العناصر */}
      <div className="space-y-4">
        {data.map((item, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  {/* العنوان والإحصائيات */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatNumber(item.count)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatPercentage(item.percentage)}
                      </Badge>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <Progress 
                    value={item.percentage} 
                    className="h-2 bg-muted/50"
                    style={{
                      '--progress-background': item.color
                    } as React.CSSProperties}
                  />

                  {/* المبلغ (إذا كان متوفراً) */}
                  {showAmounts && item.amount !== undefined && item.amount > 0 && (
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="space-y-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm">العدد: {formatNumber(item.count)}</p>
                  <p className="text-sm">النسبة: {formatPercentage(item.percentage)}</p>
                  {item.amount !== undefined && item.amount > 0 && (
                    <p className="text-sm">المبلغ: {formatCurrency(item.amount)}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* الإجمالي */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">الإجمالي</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{formatNumber(total)}</span>
            {showAmounts && totalAmount > 0 && (
              <span className="text-muted-foreground">
                ({formatCurrency(totalAmount)})
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressChart;
