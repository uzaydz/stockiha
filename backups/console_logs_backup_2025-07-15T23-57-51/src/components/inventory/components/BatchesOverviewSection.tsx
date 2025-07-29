import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Package,
  TrendingDown,
  Filter,
  Eye,
  Archive,
  Info
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface BatchInfo {
  batch_id: string;
  batch_number: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  initial_quantity: number;
  current_quantity: number;
  used_quantity: number;
  purchase_price: number;
  total_value: number;
  received_date: string;
  expires_at?: string;
  days_until_expiry?: number;
  status: 'active' | 'expired' | 'low' | 'empty';
  last_movement_date?: string;
  supplier_name?: string;
}

interface BatchesOverviewSectionProps {
  batches: BatchInfo[];
  isLoading?: boolean;
}

// حالات الدفعات
const batchStatusConfig = {
  active: {
    label: 'نشطة',
    color: 'text-green-600',
    bg: 'bg-green-50',
    badge: 'default'
  },
  low: {
    label: 'كمية منخفضة',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    badge: 'warning'
  },
  expired: {
    label: 'منتهية الصلاحية',
    color: 'text-red-600',
    bg: 'bg-red-50',
    badge: 'destructive'
  },
  empty: {
    label: 'فارغة',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    badge: 'secondary'
  }
};

// تنسيق العملة
const formatCurrency = (amount: number | undefined | null): string => {
  const safeAmount = amount || 0;
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeAmount);
};

// تنسيق التاريخ
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'غير محدد';
  try {
    return new Date(dateString).toLocaleDateString('fr-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'تاريخ غير صحيح';
  }
};

// حساب نسبة الاستخدام
const getUsagePercentage = (batch: BatchInfo): number => {
  if (!batch || batch.initial_quantity === 0 || batch.initial_quantity === undefined) return 0;
  const used = batch.used_quantity || 0;
  return (used / batch.initial_quantity) * 100;
};

// تحديد مستوى الأولوية للدفعة
const getBatchPriority = (batch: BatchInfo): 'high' | 'medium' | 'low' => {
  if (!batch) return 'low';
  if (batch.status === 'expired') return 'high';
  if (batch.days_until_expiry !== undefined && batch.days_until_expiry <= 7) return 'high';
  if (batch.status === 'low' || (batch.days_until_expiry !== undefined && batch.days_until_expiry <= 30)) return 'medium';
  return 'low';
};

// مكون بطاقة الدفعة
const BatchCard = ({ batch }: { batch: BatchInfo }) => {
  // التحقق من صحة البيانات
  if (!batch || !batch.product_name || !batch.batch_number) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center text-red-500">
            <p className="text-sm">خطأ في بيانات الدفعة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = batchStatusConfig[batch.status] || {
    label: 'غير محدد',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    badge: 'default'
  };
  const usagePercentage = getUsagePercentage(batch);
  const priority = getBatchPriority(batch);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden",
        priority === 'high' && "border-red-200 shadow-red-100",
        priority === 'medium' && "border-yellow-200 shadow-yellow-100"
      )}>
        {priority === 'high' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        )}
        
        <CardContent className="p-4">
          {/* رأس البطاقة */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">{batch.product_name}</h4>
              <p className="text-xs text-muted-foreground">دفعة: {batch.batch_number}</p>
              {batch.product_sku && (
                <p className="text-xs text-muted-foreground">SKU: {batch.product_sku}</p>
              )}
            </div>
            
            <Badge variant={statusConfig.badge as any} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>

          {/* الكميات */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold">{(batch.current_quantity || 0).toLocaleString('fr-DZ')}</div>
              <div className="text-xs text-muted-foreground">الكمية الحالية</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(batch.total_value || 0)}
              </div>
              <div className="text-xs text-muted-foreground">القيمة الحالية</div>
            </div>
          </div>

          {/* مؤشر الاستخدام */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">نسبة الاستخدام</span>
              <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>

          {/* تاريخ الانتهاء */}
          {batch.expires_at && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" />
                <span className="text-muted-foreground">تنتهي في:</span>
                <span className={cn(
                  "font-medium",
                  batch.days_until_expiry !== undefined && batch.days_until_expiry <= 7 && "text-red-600",
                  batch.days_until_expiry !== undefined && batch.days_until_expiry <= 30 && batch.days_until_expiry > 7 && "text-yellow-600"
                )}>
                  {formatDate(batch.expires_at)}
                </span>
              </div>
              
              {batch.days_until_expiry !== undefined && (
                <div className="mt-1 text-xs">
                  {batch.days_until_expiry <= 0 ? (
                    <span className="text-red-600 font-medium">منتهية الصلاحية</span>
                  ) : batch.days_until_expiry === 1 ? (
                    <span className="text-red-600 font-medium">تنتهي غداً</span>
                  ) : batch.days_until_expiry <= 7 ? (
                    <span className="text-red-600 font-medium">تنتهي خلال {batch.days_until_expiry} أيام</span>
                  ) : batch.days_until_expiry <= 30 ? (
                    <span className="text-yellow-600 font-medium">تنتهي خلال {batch.days_until_expiry} يوم</span>
                  ) : (
                    <span className="text-green-600">تنتهي خلال {batch.days_until_expiry} يوم</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">تاريخ الاستلام</span>
              <span className="font-medium">{batch.received_date ? formatDate(batch.received_date) : 'غير محدد'}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">سعر الشراء</span>
              <span className="font-medium">{formatCurrency(batch.purchase_price || 0)}</span>
            </div>
            
            {batch.supplier_name && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">المورد</span>
                <span className="font-medium">{batch.supplier_name}</span>
              </div>
            )}
          </div>

          {/* إجراءات */}
          <div className="flex gap-2 mt-3 pt-2 border-t border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>عرض التفاصيل</p>
              </TooltipContent>
            </Tooltip>
            
            {batch.status === 'empty' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>أرشفة الدفعة</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * مكون قسم عرض الدفعات
 */
const BatchesOverviewSection: React.FC<BatchesOverviewSectionProps> = ({
  batches,
  isLoading = false
}) => {
  const [filterBy, setFilterBy] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('expiry');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              إدارة الدفعات (FIFO)
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

  if (batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            إدارة الدفعات (FIFO)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد دفعات مخزون في النظام</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // تصفية الدفعات
  const filteredBatches = batches.filter(batch => {
    if (!batch) return false;
    if (filterBy === 'all') return true;
    if (filterBy === 'active') return batch.status === 'active';
    if (filterBy === 'expiring_soon') return batch.days_until_expiry !== undefined && batch.days_until_expiry <= 30;
    if (filterBy === 'expired') return batch.status === 'expired';
    if (filterBy === 'low') return batch.status === 'low';
    if (filterBy === 'empty') return batch.status === 'empty';
    return true;
  });

  // ترتيب الدفعات
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (!a || !b) return 0;
    
    switch (sortBy) {
      case 'expiry':
        if (!a.days_until_expiry && !b.days_until_expiry) return 0;
        if (!a.days_until_expiry) return 1;
        if (!b.days_until_expiry) return -1;
        return a.days_until_expiry - b.days_until_expiry;
      case 'quantity':
        return (b.current_quantity || 0) - (a.current_quantity || 0);
      case 'value':
        return (b.total_value || 0) - (a.total_value || 0);
      case 'usage':
        return getUsagePercentage(b) - getUsagePercentage(a);
      case 'received':
        if (!a.received_date && !b.received_date) return 0;
        if (!a.received_date) return 1;
        if (!b.received_date) return -1;
        return new Date(b.received_date).getTime() - new Date(a.received_date).getTime();
      default:
        return 0;
    }
  });

  // حساب الإحصائيات
  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b && b.status === 'active').length;
  const expiredBatches = batches.filter(b => b && b.status === 'expired').length;
  const expiringSoon = batches.filter(b => b && b.days_until_expiry !== undefined && b.days_until_expiry <= 30 && b.days_until_expiry > 0).length;
  const totalValue = batches.reduce((sum, b) => sum + (b?.total_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalBatches}</div>
                <div className="text-sm text-muted-foreground">إجمالي الدفعات</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeBatches}</div>
                <div className="text-sm text-muted-foreground">دفعات نشطة</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{expiringSoon}</div>
                <div className="text-sm text-muted-foreground">تنتهي قريباً</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{expiredBatches}</div>
                <div className="text-sm text-muted-foreground">منتهية الصلاحية</div>
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
              <Info className="h-5 w-5" />
              دفعات المخزون التفصيلية
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="فلترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الدفعات</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="expiring_soon">تنتهي قريباً</SelectItem>
                  <SelectItem value="expired">منتهية الصلاحية</SelectItem>
                  <SelectItem value="low">كمية منخفضة</SelectItem>
                  <SelectItem value="empty">فارغة</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiry">تاريخ الانتهاء</SelectItem>
                  <SelectItem value="quantity">الكمية</SelectItem>
                  <SelectItem value="value">القيمة</SelectItem>
                  <SelectItem value="usage">نسبة الاستخدام</SelectItem>
                  <SelectItem value="received">تاريخ الاستلام</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            عرض {sortedBatches.length} من {totalBatches} دفعة • القيمة الإجمالية: {formatCurrency(totalValue)}
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedBatches.map((batch, index) => (
              <BatchCard 
                key={batch.batch_id || `batch-${index}`} 
                batch={batch} 
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchesOverviewSection;
