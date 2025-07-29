import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Eye,
  Download,
  ShoppingCart,
  Package,
  Edit,
  RotateCcw,
  Settings,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import InventoryActivityDetails from './InventoryActivityDetails';

// أنواع البيانات
interface InventoryActivity {
  id: string;
  created_at: string;
  operation_type: string;
  quantity: number;
  previous_stock?: number;
  new_stock?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  product?: {
    name?: string;
    sku?: string;
    purchase_price?: number;
    selling_price?: number;
    current_stock?: number;
  };
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  transaction_value?: number;
  status_indicator?: string;
  context_info?: any;
}

interface InventoryActivitiesTableProps {
  activities: InventoryActivity[];
  isLoading?: boolean;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  onExport?: () => void;
  detailed?: boolean;
}

// أيقونات أنواع العمليات
const operationIcons = {
  purchase: { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  sale: { icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-50' },
  adjustment: { icon: Edit, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  return: { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
  manual: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50' },
  transfer: { icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' }
};

// تسميات أنواع العمليات
const operationLabels = {
  purchase: 'شراء',
  sale: 'بيع',
  adjustment: 'تعديل',
  return: 'إرجاع',
  manual: 'يدوي',
  transfer: 'نقل'
};

// تنسيق العملة
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2
  }).format(amount);
};

// تنسيق التاريخ والوقت
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('fr-DZ');
  const timeStr = date.toLocaleTimeString('fr-DZ', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${dateStr} ${timeStr}`;
};

// تنسيق الكمية مع الاتجاه
const QuantityChange = ({ 
  change, 
  before, 
  after, 
  operationType 
}: { 
  change: number; 
  before?: number; 
  after?: number;
  operationType?: string; 
}) => {
  // تحديد اتجاه التغيير بناءً على نوع العملية
  const isIncrease = operationType === 'return' || operationType === 'purchase' || operationType === 'adjustment_positive';
  const isDecrease = operationType === 'sale' || operationType === 'loss' || operationType === 'adjustment_negative' || operationType === 'damage';
  
  // التأكد من وجود القيم وتحويلها إلى أرقام صحيحة
  const safeChange = typeof change === 'number' && !isNaN(change) ? change : 0;
  const safeBefore = typeof before === 'number' && !isNaN(before) ? before : 0;
  const safeAfter = typeof after === 'number' && !isNaN(after) ? after : 0;
  
  // حساب التغيير الفعلي مع الإشارة الصحيحة
  const actualChange = isIncrease ? safeChange : (isDecrease ? -safeChange : 0);
  
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isIncrease && "text-green-600",
        isDecrease && "text-red-600",
        !isIncrease && !isDecrease && "text-gray-500"
      )}>
        {isIncrease && <TrendingUp className="h-3 w-3" />}
        {isDecrease && <TrendingDown className="h-3 w-3" />}
        {!isIncrease && !isDecrease && <Minus className="h-3 w-3" />}
        <span>
          {isIncrease && '+'}
          {isDecrease && '-'}
          {safeChange.toLocaleString('fr-DZ')}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {safeBefore.toLocaleString('fr-DZ')} ← {safeAfter.toLocaleString('fr-DZ')}
      </div>
    </div>
  );
};

/**
 * مكون جدول أنشطة المخزون المحسن
 */
const InventoryActivitiesTable: React.FC<InventoryActivitiesTableProps> = ({
  activities,
  isLoading = false,
  totalCount = activities.length,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onSortChange,
  onExport,
  detailed = false
}) => {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // state لعرض تفاصيل الحركة
  const [selectedActivity, setSelectedActivity] = useState<InventoryActivity | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // معالج عرض التفاصيل
  const handleViewDetails = (activity: InventoryActivity) => {
    setSelectedActivity(activity);
    setShowDetails(true);
  };

  // معالج إغلاق التفاصيل
  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedActivity(null);
  };

  // حساب الصفحات
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // معالج الترتيب
  const handleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSortChange?.(field, newDirection);
  };

  // رأس الجدول مع الترتيب
  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="text-right">
      <Button
        variant="ghost"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {children}
        <ArrowUpDown className={cn(
          "mr-2 h-4 w-4 transition-colors",
          sortField === field ? "text-primary" : "text-muted-foreground"
        )} />
      </Button>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card className="bg-background/95 border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
            </div>
            <div className="h-9 bg-gray-200 rounded w-28 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5 text-primary" />
              حركات المخزون
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              عرض {startIndex.toLocaleString('ar-DZ')} - {endIndex.toLocaleString('ar-DZ')} من {totalCount.toLocaleString('ar-DZ')} حركة
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* تبديل عرض الجدول/البطاقات للهواتف */}
            <div className="flex rounded-lg border bg-background lg:hidden">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <Package className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            
            {onExport && (
              <Button variant="outline" onClick={onExport} size="sm">
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-3 bg-muted/50 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">لا توجد حركات مخزون</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              لم يتم العثور على أي حركات مخزون في الفترة المحددة. جرب تغيير الفلاتر أو الفترة الزمنية.
            </p>
          </div>
        ) : (
          <>
            {/* عرض الجدول للكمبيوتر */}
            <div className={cn("overflow-x-auto", viewMode === 'cards' ? "lg:block hidden" : "block")}>
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <SortableHeader field="created_at">التاريخ والوقت</SortableHeader>
                    <TableHead className="text-right font-semibold">نوع العملية</TableHead>
                    <SortableHeader field="product_name">المنتج</SortableHeader>
                    <TableHead className="text-right font-semibold">تغيير الكمية</TableHead>
                    <SortableHeader field="total_cost">القيمة</SortableHeader>
                    <SortableHeader field="user_name">المستخدم</SortableHeader>
                    <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                    <TableHead className="text-right font-semibold">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {activities.map((activity, index) => {
                    const operationConfig = operationIcons[activity.operation_type as keyof typeof operationIcons] || operationIcons.manual;
                    const OperationIcon = operationConfig.icon;
                    
                    return (
                      <motion.tr
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                      >
                        <TableCell className="text-right py-4">
                          <div className="text-sm font-medium">
                            {formatDateTime(activity.created_at)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-2 rounded-lg", operationConfig.bg)}>
                              <OperationIcon className={cn("h-4 w-4", operationConfig.color)} />
                            </div>
                            <span className="text-sm font-medium">
                              {operationLabels[activity.operation_type as keyof typeof operationLabels] || activity.operation_type}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{activity.product?.name}</div>
                            {activity.product?.sku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {activity.product?.sku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          <QuantityChange
                            change={activity.quantity}
                            before={activity.previous_stock}
                            after={activity.new_stock}
                            operationType={activity.operation_type}
                          />
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          {activity.transaction_value ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {formatCurrency(activity.transaction_value)}
                              </div>
                              {activity.product?.purchase_price && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(activity.product?.purchase_price)}/وحدة
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          {activity.user?.name ? (
                            <div className="text-sm space-y-1">
                              <div className="font-medium">{activity.user?.name}</div>
                              {activity.user?.role && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.user?.role === 'admin' ? 'مدير' : 
                                   activity.user?.role === 'employee' ? 'موظف' : 
                                   activity.user?.role === 'manager' ? 'مدير قسم' : 
                                   activity.user?.role}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Settings className="h-3 w-3" />
                                <span>تحديث تلقائي</span>
                              </div>
                              {activity.reference_type && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {activity.reference_type === 'order' ? 'طلب إنترنت' :
                                   activity.reference_type === 'pos_order' ? 'نقطة البيع' :
                                   activity.reference_type === 'supplier_purchase' ? 'مشتريات' :
                                   activity.reference_type === 'system' ? 'النظام' :
                                   activity.reference_type}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          {activity.notes ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-sm text-muted-foreground truncate max-w-32 cursor-help">
                                  {activity.notes}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p>{activity.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right py-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                onClick={() => handleViewDetails(activity)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>عرض التفاصيل</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* عرض البطاقات للهواتف */}
            <div className={cn("lg:hidden space-y-3 p-4", viewMode === 'table' && "hidden")}>
              {activities.map((activity, index) => {
                const operationConfig = operationIcons[activity.operation_type as keyof typeof operationIcons] || operationIcons.manual;
                const OperationIcon = operationConfig.icon;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="bg-card border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", operationConfig.bg)}>
                          <OperationIcon className={cn("h-4 w-4", operationConfig.color)} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {operationLabels[activity.operation_type as keyof typeof operationLabels] || activity.operation_type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(activity.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewDetails(activity)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-sm">{activity.product?.name}</div>
                        {activity.product?.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {activity.product?.sku}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <QuantityChange
                          change={activity.quantity}
                          before={activity.previous_stock}
                          after={activity.new_stock}
                          operationType={activity.operation_type}
                        />
                        
                        {activity.transaction_value && (
                          <div className="text-right">
                            <div className="font-medium text-sm">{formatCurrency(activity.transaction_value)}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-muted-foreground">
                          {activity.user?.name || 'تحديث تلقائي'}
                        </div>
                        {activity.notes && (
                          <div className="text-muted-foreground truncate max-w-32">
                            {activity.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* شريط التنقل بين الصفحات المحسن */}
        {totalPages > 1 && onPageChange && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20 gap-4">
            <div className="text-sm text-muted-foreground">
              صفحة {currentPage.toLocaleString('ar-DZ')} من {totalPages.toLocaleString('ar-DZ')} • 
              عرض {activities.length.toLocaleString('ar-DZ')} عنصر
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              
              {/* أرقام الصفحات المحسنة */}
              <div className="flex items-center space-x-1 space-x-reverse">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className="w-9 h-8 p-0"
                    >
                      {pageNum.toLocaleString('ar-DZ')}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* مكون عرض تفاصيل الحركة */}
      <InventoryActivityDetails
        activity={selectedActivity}
        open={showDetails}
        onClose={handleCloseDetails}
      />
    </Card>
  );
};

export default InventoryActivitiesTable;
