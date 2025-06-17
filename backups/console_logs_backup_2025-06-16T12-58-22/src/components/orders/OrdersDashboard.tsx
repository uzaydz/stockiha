import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  DollarSign,
  Target
} from "lucide-react";
import { formatCurrency } from "@/utils/ordersHelpers";
import { cn } from "@/lib/utils";

type OrderCounts = {
  all: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

type OrdersDashboardProps = {
  orderCounts: OrderCounts;
  orderStats: {
    totalSales: number;
    avgOrderValue: number;
    salesTrend: number;
    pendingAmount: number;
  };
  statsCards?: Array<{
    title: string;
    value: number;
    icon: React.ComponentType<any>;
    trend?: number;
    color: string;
  }>;
  loading?: boolean;
};

// Enhanced loading skeleton for stat cards
const StatCardSkeleton = memo(() => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
));

StatCardSkeleton.displayName = 'StatCardSkeleton';

const OrdersDashboard = ({ orderCounts, orderStats, loading = false }: OrdersDashboardProps) => {
  // Enhanced animated stat card component
  const AnimatedStatCard = memo(({ 
    title, 
    value, 
    icon: Icon, 
    description = "", 
    trend = 0,
    isCurrency = false,
    badgeText = "",
    badgeVariant = "default",
    index = 0,
    color = "text-primary"
  }: {
    title: string;
    value: number;
    icon: React.ComponentType<any>;
    description?: string;
    trend?: number;
    isCurrency?: boolean;
    badgeText?: string;
    badgeVariant?: any;
    index?: number;
    color?: string;
  }) => {
    const cardVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          duration: 0.5,
          delay: index * 0.1,
          ease: "easeOut"
        }
      }
    };

    const iconVariants = {
      initial: { scale: 1, rotate: 0 },
      hover: { scale: 1.1, rotate: 5 },
    };

    const valueVariants = {
      initial: { scale: 1 },
      animate: { scale: [1, 1.05, 1] },
    };

    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        className="group"
      >
        <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-accent/5 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {title}
            </CardTitle>
            <motion.div 
              variants={iconVariants}
              initial="initial"
              whileHover="hover"
              className={cn(
                "p-2 rounded-full transition-all duration-300",
                "bg-gradient-to-br from-primary/10 to-primary/20",
                "group-hover:from-primary/20 group-hover:to-primary/30"
              )}
            >
              <Icon className={cn("h-4 w-4", color)} />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div 
              variants={valueVariants}
              animate="animate"
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
            >
              {isCurrency ? formatCurrency(value) : value.toLocaleString()}
              {badgeText && (
                <Badge variant={badgeVariant} className="text-xs mr-2 py-0 ml-2">
                  {badgeText}
                </Badge>
              )}
            </motion.div>
            {(description || trend !== 0) && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.3 }}
                className="text-xs text-muted-foreground mt-2 flex items-center"
              >
                {trend !== 0 && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.4 }}
                      className="flex items-center"
                    >
                      {trend > 0 ? (
                        <TrendingUp className="h-3 w-3 ml-1 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 ml-1 text-red-500" />
                      )}
                      <span className={cn(
                        "font-medium",
                        trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {Math.abs(trend)}% 
                      </span>
                    </motion.div>
                    <span className="mx-1 text-muted-foreground text-xs">
                      مقارنة بالفترة السابقة
                    </span>
                  </>
                )}
                {description && <span className="text-xs">{description}</span>}
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  AnimatedStatCard.displayName = 'AnimatedStatCard';

  // Main stats configuration
  const mainStats = [
    {
      title: "إجمالي المبيعات",
      value: orderStats.totalSales,
      icon: DollarSign,
      trend: orderStats.salesTrend,
      isCurrency: true,
      color: "text-emerald-600",
    },
    {
      title: "متوسط قيمة الطلب",
      value: orderStats.avgOrderValue,
      icon: Target,
      isCurrency: true,
      color: "text-blue-600",
    },
    {
      title: "طلبات قيد الانتظار",
      value: orderCounts.pending,
      icon: Clock,
      badgeText: formatCurrency(orderStats.pendingAmount),
      badgeVariant: "outline",
      color: "text-amber-600",
    },
    {
      title: "إجمالي الطلبات",
      value: orderCounts.all,
      icon: Package,
      description: "إجمالي عدد الطلبات",
      color: "text-violet-600",
    },
  ];

  // Status stats configuration
  const statusStats = [
    {
      title: "قيد المعالجة",
      value: orderCounts.processing,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "تم الشحن",
      value: orderCounts.shipped,
      icon: Truck,
      color: "text-purple-600",
    },
    {
      title: "تم التسليم",
      value: orderCounts.delivered,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "ملغاة",
      value: orderCounts.cancelled,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Main stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        
        {/* Status stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i + 4} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main performance stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-lg font-semibold mb-4 text-foreground">إحصائيات الأداء</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mainStats.map((stat, index) => (
            <AnimatedStatCard
              key={stat.title}
              {...stat}
              index={index}
            />
          ))}
        </div>
      </motion.div>

      {/* Order status breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold mb-4 text-foreground">حالات الطلبات</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statusStats.map((stat, index) => (
            <AnimatedStatCard
              key={stat.title}
              {...stat}
              index={index + 4}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OrdersDashboard;
