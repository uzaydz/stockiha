import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventoryStatus } from './types';

interface InventoryStatusCardProps {
  data: InventoryStatus | null;
  isLoading: boolean;
}

interface StatusItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total: number;
  color: string;
  bgColor: string;
}

const StatusItem: React.FC<StatusItemProps> = ({
  icon: Icon,
  label,
  value,
  total,
  color,
  bgColor,
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", bgColor)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">
            ({percentage.toFixed(0)}%)
          </span>
        </div>
      </div>
      <Progress
        value={percentage}
        className="h-2"
        // @ts-ignore
        indicatorClassName={cn(
          "transition-all duration-500",
          color.replace('text-', 'bg-')
        )}
      />
    </div>
  );
};

const InventoryStatusCard: React.FC<InventoryStatusCardProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data?.totalProducts || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-purple-600" />
            حالة المخزون
          </CardTitle>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {total}
            <span className="text-sm font-normal text-muted-foreground mr-1">منتج</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {total === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد منتجات</p>
            </div>
          ) : (
            <>
              <StatusItem
                icon={CheckCircle}
                label="متوفر في المخزون"
                value={data?.inStock || 0}
                total={total}
                color="text-green-600"
                bgColor="bg-green-100 dark:bg-green-900/30"
              />

              <StatusItem
                icon={AlertTriangle}
                label="مخزون منخفض"
                value={data?.lowStock || 0}
                total={total}
                color="text-yellow-600"
                bgColor="bg-yellow-100 dark:bg-yellow-900/30"
              />

              <StatusItem
                icon={XCircle}
                label="نفذ من المخزون"
                value={data?.outOfStock || 0}
                total={total}
                color="text-red-600"
                bgColor="bg-red-100 dark:bg-red-900/30"
              />

              {/* ملخص سريع */}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">نسبة التوفر</span>
                  <span className={cn(
                    "font-bold",
                    (data?.inStock || 0) / total > 0.7 ? "text-green-600" :
                    (data?.inStock || 0) / total > 0.4 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {total > 0 ? (((data?.inStock || 0) / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                {(data?.outOfStock || 0) > 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    يوجد {data?.outOfStock} منتج يحتاج إلى إعادة تخزين
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InventoryStatusCard;
