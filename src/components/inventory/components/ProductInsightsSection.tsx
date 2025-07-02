import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Star,
  Activity,
  BarChart3,
  Target,
  Clock,
  DollarSign,
  Layers,
  Filter
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface ProductInsight {
  product_id: string;
  product_name?: string;
  sku?: string;
  current_stock?: number;
  purchase_price?: number;
  selling_price?: number;
  movement_stats?: {
    total_movements: number;
    total_quantity_moved: number;
    last_movement: string;
  };
  operations_breakdown?: {
    sales: number;
    purchases: number;
    adjustments: number;
  };
  sales_value?: number;
  status?: 'low_stock' | 'out_of_stock' | 'high_activity' | 'normal';
  
  // حقول محسوبة
  total_operations?: number;
  total_in?: number;
  total_out?: number;
  net_change?: number;
  avg_cost?: number;
  total_value?: number;
  turnover_rate?: number;
  days_since_last_activity?: number;
  stock_level_status?: 'low' | 'normal' | 'high' | 'out_of_stock';
  trend?: 'increasing' | 'decreasing' | 'stable';
}

interface ProductInsightsSectionProps {
  productInsights: ProductInsight[];
  isLoading?: boolean;
}

// حالات مستوى المخزون
const stockLevelConfig = {
  out_of_stock: {
    label: 'نفدت الكمية',
    color: 'text-red-600',
    bg: 'bg-red-50',
    badge: 'destructive'
  },
  low: {
    label: 'مخزون منخفض',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    badge: 'warning'
  },
  normal: {
    label: 'مخزون عادي',
    color: 'text-green-600',
    bg: 'bg-green-50',
    badge: 'default'
  },
  high: {
    label: 'مخزون عالي',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: 'secondary'
  }
};

// اتجاهات المنتجات
const trendConfig = {
  increasing: {
    icon: TrendingUp,
    color: 'text-green-600',
    label: 'متزايد'
  },
  decreasing: {
    icon: TrendingDown,
    color: 'text-red-600',
    label: 'متناقص'
  },
  stable: {
    icon: Activity,
    color: 'text-gray-600',
    label: 'ثابت'
  }
};

// تنسيق العملة
const formatCurrency = (amount: number | undefined | null): string => {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeAmount);
};

// حساب مؤشر الأداء
const getPerformanceScore = (insight: ProductInsight): number => {
  let score = 50; // نقطة البداية

  // التأكد من وجود القيم قبل استخدامها
  const turnoverRate = insight.turnover_rate || 0;
  const stockStatus = insight.stock_level_status || 'normal';
  const daysSinceActivity = insight.days_since_last_activity || 0;
  const trend = insight.trend || 'stable';

  // زيادة النقاط للدوران السريع
  if (turnoverRate > 2) score += 20;
  else if (turnoverRate > 1) score += 10;

  // تقليل النقاط للمخزون المنخفض أو النافد
  if (stockStatus === 'out_of_stock') score -= 30;
  else if (stockStatus === 'low') score -= 15;

  // زيادة النقاط للنشاط الحديث
  if (daysSinceActivity <= 7) score += 15;
  else if (daysSinceActivity <= 30) score += 5;
  else score -= 10;

  // تعديل حسب الاتجاه
  if (trend === 'increasing') score += 10;
  else if (trend === 'decreasing') score -= 10;

  return Math.max(0, Math.min(100, score));
};

/**
 * دالة مساعدة لحساب القيم المحسوبة من البيانات الأساسية
 */
const enhanceProductInsight = (insight: ProductInsight): ProductInsight => {
  // حساب القيمة الإجمالية من المخزون الحالي وسعر البيع أو سعر الشراء كبديل
  const price = insight.selling_price || insight.purchase_price || 0;
  const totalValue = (insight.current_stock || 0) * price;
  
  // حساب الداخل والخارج من operations_breakdown
  const operationBreakdown = insight.operations_breakdown || { sales: 0, purchases: 0, adjustments: 0 };
  const totalIn = (operationBreakdown.purchases || 0) + (operationBreakdown.adjustments || 0);
  const totalOut = (operationBreakdown.sales || 0);
  const netChange = totalIn - totalOut;
  
  // حساب معدل الدوران
  const turnoverRate = totalOut > 0 ? (totalOut / Math.max((insight.current_stock || 0), 1)) : 0;
  
  // حساب متوسط التكلفة
  const avgCost = insight.purchase_price || 0;
  
  // تحديد حالة المخزون بناءً على status من قاعدة البيانات أو الحساب اليدوي
  const stockLevelStatus: 'low' | 'normal' | 'high' | 'out_of_stock' = 
    insight.status === 'out_of_stock' ? 'out_of_stock' :
    insight.status === 'low_stock' ? 'low' :
    (insight.current_stock || 0) === 0 ? 'out_of_stock' :
    (insight.current_stock || 0) <= 5 ? 'low' : 'normal';
  
  // تحديد الاتجاه
  const trend: 'increasing' | 'decreasing' | 'stable' = 
    netChange > 0 ? 'increasing' : netChange < 0 ? 'decreasing' : 'stable';
  
  // حساب الأيام منذ آخر نشاط
  const daysSinceLastActivity = insight.movement_stats?.last_movement ? 
    Math.floor((Date.now() - new Date(insight.movement_stats.last_movement).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  return {
    ...insight,
    total_value: totalValue,
    total_in: totalIn,
    total_out: totalOut,
    net_change: netChange,
    turnover_rate: turnoverRate,
    avg_cost: avgCost,
    stock_level_status: stockLevelStatus,
    trend: trend,
    days_since_last_activity: daysSinceLastActivity,
    total_operations: insight.movement_stats?.total_movements || 0
  };
};

// مكون بطاقة المنتج
const ProductInsightCard = ({ insight, rank }: { insight: ProductInsight; rank: number }) => {
  const safeInsight = enhanceProductInsight(insight);

  const stockConfig = stockLevelConfig[safeInsight.stock_level_status] || stockLevelConfig.normal;
  const trendConfigData = trendConfig[safeInsight.trend] || trendConfig.stable;
  const TrendIcon = trendConfigData?.icon || Activity;
  const performanceScore = getPerformanceScore(safeInsight);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.05 }}
    >
      <Card className="relative overflow-hidden h-full">
        <CardContent className="p-4">
          {/* رأس البطاقة */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{safeInsight.product_name || 'منتج غير محدد'}</h4>
              {safeInsight.sku && (
                <p className="text-xs text-muted-foreground">SKU: {safeInsight.sku}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={stockConfig.badge as any} className="text-xs">
                {stockConfig.label}
              </Badge>
              <div className="flex items-center gap-1">
                <TrendIcon className={cn("h-3 w-3", trendConfigData.color)} />
              </div>
            </div>
          </div>

          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold">
                {(safeInsight.current_stock || 0).toLocaleString('fr-DZ')}
              </div>
              <div className="text-xs text-muted-foreground">المخزون الحالي</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(safeInsight.total_value)}
              </div>
              <div className="text-xs text-muted-foreground">القيمة الإجمالية</div>
            </div>
          </div>

          {/* مؤشر الأداء */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">مؤشر الأداء</span>
              <span className="font-medium">{performanceScore}%</span>
            </div>
            <Progress 
              value={performanceScore} 
              className={cn(
                "h-2",
                performanceScore >= 70 && "text-green-600",
                performanceScore >= 40 && performanceScore < 70 && "text-yellow-600",
                performanceScore < 40 && "text-red-600"
              )}
            />
          </div>

          {/* الحركات */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span>الداخل</span>
              </div>
              <span className="font-medium text-green-600">
                +{(safeInsight.total_in || 0).toLocaleString('fr-DZ')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span>الخارج</span>
              </div>
              <span className="font-medium text-red-600">
                -{(safeInsight.total_out || 0).toLocaleString('fr-DZ')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs border-t pt-2">
              <span className="font-medium">صافي التغيير</span>
              <span className={cn(
                "font-bold",
                safeInsight.net_change > 0 && "text-green-600",
                safeInsight.net_change < 0 && "text-red-600",
                safeInsight.net_change === 0 && "text-gray-600"
              )}>
                {(safeInsight.net_change || 0) > 0 ? '+' : ''}{(safeInsight.net_change || 0).toLocaleString('fr-DZ')}
              </span>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                <span>معدل الدوران</span>
              </div>
              <span className="font-medium">
                {(safeInsight.turnover_rate || 0).toFixed(1)}x
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>متوسط التكلفة</span>
              </div>
              <span className="font-medium">
                {formatCurrency(safeInsight.avg_cost)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>آخر نشاط</span>
              </div>
              <span className="font-medium">
                {(safeInsight.days_since_last_activity || 0) === 0 ? 'اليوم' : 
                 (safeInsight.days_since_last_activity || 0) === 1 ? 'أمس' :
                 `منذ ${(safeInsight.days_since_last_activity || 0)} يوم`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * مكون قسم رؤى المنتجات
 */
const ProductInsightsSection: React.FC<ProductInsightsSectionProps> = ({
  productInsights,
  isLoading = false
}) => {
  const [sortBy, setSortBy] = useState<string>('performance');
  const [filterBy, setFilterBy] = useState<string>('all');

  // تحسين البيانات بحساب القيم المطلوبة
  const enhancedInsights = productInsights.map(enhanceProductInsight);

  // إضافة تحقق مؤقت للبيانات
  useEffect(() => {
    if (productInsights.length > 0) {
      console.log('📊 Product Insights Data:', {
        original: productInsights[0],
        enhanced: enhancedInsights[0],
        totalProducts: productInsights.length
      });
    }
  }, [productInsights]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              رؤى المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enhancedInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            رؤى المنتجات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد بيانات للمنتجات في هذه الفترة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // تصفية المنتجات
  const filteredInsights = enhancedInsights.filter(insight => {
    if (filterBy === 'all') return true;
    if (filterBy === 'low_stock') return insight.stock_level_status === 'low' || insight.stock_level_status === 'out_of_stock';
    if (filterBy === 'high_performance') return getPerformanceScore(insight) >= 70;
    if (filterBy === 'needs_attention') return getPerformanceScore(insight) < 40;
    return true;
  });

  // ترتيب المنتجات
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return getPerformanceScore(b) - getPerformanceScore(a);
      case 'value':
        return b.total_value - a.total_value;
      case 'activity':
        return a.days_since_last_activity - b.days_since_last_activity;
      case 'turnover':
        return b.turnover_rate - a.turnover_rate;
      case 'stock':
        return b.current_stock - a.current_stock;
      default:
        return 0;
    }
  });

  // حساب الإحصائيات العامة
  const totalProducts = enhancedInsights.length;
  const lowStockProducts = enhancedInsights.filter(p => p.stock_level_status === 'low' || p.stock_level_status === 'out_of_stock').length;
  const highPerformanceProducts = enhancedInsights.filter(p => getPerformanceScore(p) >= 70).length;
  const totalValue = enhancedInsights.reduce((sum, p) => sum + (p.total_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <div className="text-sm text-muted-foreground">منتج نشط</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{lowStockProducts}</div>
                <div className="text-sm text-muted-foreground">مخزون منخفض</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{highPerformanceProducts}</div>
                <div className="text-sm text-muted-foreground">أداء عالي</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">القيمة الإجمالية</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* عوامل التحكم */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              رؤى المنتجات التفصيلية
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="فلترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المنتجات</SelectItem>
                  <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                  <SelectItem value="high_performance">أداء عالي</SelectItem>
                  <SelectItem value="needs_attention">يحتاج انتباه</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">مؤشر الأداء</SelectItem>
                  <SelectItem value="value">القيمة</SelectItem>
                  <SelectItem value="activity">النشاط</SelectItem>
                  <SelectItem value="turnover">معدل الدوران</SelectItem>
                  <SelectItem value="stock">المخزون</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            عرض {sortedInsights.length} من {totalProducts} منتج
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedInsights.map((insight, index) => (
              <ProductInsightCard
                key={insight.product_id}
                insight={insight}
                rank={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductInsightsSection; 