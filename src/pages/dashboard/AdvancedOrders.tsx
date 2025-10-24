import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useAdvancedOrders } from '@/hooks/useAdvancedOrders';

// Types
import { 
  AdvancedOrder, 
  OrderFilters, 
  OrderStats,
  formatOrderStatus,
  formatPaymentStatus,
  formatPaymentMethod,
  getOrderStatusColor,
  getPaymentStatusColor,
  formatCurrency,
  formatDate,
  formatShortDate,
  SORT_OPTIONS,
  PAGE_SIZE_OPTIONS
} from '@/types/advancedOrders';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  MoreHorizontal,
  Eye,
  Edit,
  Package,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  TrendingUp,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Mail,
  User,
  XCircle,
  Loader2
} from 'lucide-react';

// مكون بطاقات الإحصائيات
const StatsCards: React.FC<{ stats: any; loading: boolean }> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبيات</p>
              <p className="text-2xl font-bold">{(stats.total_orders || 0).toLocaleString()}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue || 0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.average_order_value || 0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">طلبيات الانتظار</p>
              <p className="text-2xl font-bold">{(stats.pending_orders || 0).toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// مكون قسم الفلاتر
const FiltersSection: React.FC<{
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
}> = ({ filters, onFiltersChange, onRefresh, onExport, loading }) => {
  const [searchTerm, setSearchTerm] = useState(filters.search_term || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search_term: searchTerm });
  }, [searchTerm, filters, onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof OrderFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  }, [filters, onFiltersChange]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">البحث والفلترة</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* البحث الأساسي */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>

          {/* الفلاتر السريعة */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="processing">قيد المعالجة</SelectItem>
                <SelectItem value="shipped">تم الشحن</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sort_by || 'created_at'}
              onValueChange={(value) => handleFilterChange('sort_by', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sort_order || 'desc'}
              onValueChange={(value) => handleFilterChange('sort_order', value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">تنازلي</SelectItem>
                <SelectItem value="asc">تصاعدي</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              فلاتر متقدمة
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          {/* الفلاتر المتقدمة */}
          <Collapsible open={showAdvancedFilters}>
            <CollapsibleContent>
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">من تاريخ</label>
                    <Input
                      type="date"
                      value={filters.date_from || ''}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={filters.date_to || ''}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">مزود الشحن</label>
                    <Select
                      value={filters.shipping_provider || 'all'}
                      onValueChange={(value) => handleFilterChange('shipping_provider', value === 'all' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مزود الشحن" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المزودين</SelectItem>
                        <SelectItem value="yalidine">يالدين</SelectItem>
                        <SelectItem value="zrexpress">ZR Express</SelectItem>
                        <SelectItem value="ecotrack">Ecotrack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون صف الطلب القابل للتوسيع
const OrderRow: React.FC<{
  order: any;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onViewDetails: (order: any) => void;
}> = ({ order, isSelected, onSelect, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        </TableCell>
        <TableCell className="w-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          #{order.id}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{order.customer_name}</span>
            <span className="text-sm text-muted-foreground">{order.customer_phone}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{formatCurrency(order.total)}</span>
            <span className="text-sm text-muted-foreground">
              {order.items?.length || 0} منتج
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={getOrderStatusColor(order.status)}>
            {formatOrderStatus(order.status)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={getPaymentStatusColor(order.payment_status)}>
            {formatPaymentStatus(order.payment_status)}
          </Badge>
        </TableCell>
        <TableCell>
          {order.shipping_provider && (
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="text-sm">{order.shipping_provider}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {order.call_confirmation_status}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatShortDate(order.created_at)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(order)}>
                <Eye className="h-4 w-4 mr-2" />
                عرض التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone className="h-4 w-4 mr-2" />
                اتصال
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={11} className="p-0">
            <div className="p-4 bg-muted/20 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">معلومات العميل</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{order.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{order.customer_phone}</span>
                    </div>
                    {order.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{order.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">تفاصيل الطلب</h4>
                  <div className="space-y-1 text-sm">
                    <div>المجموع الفرعي: {formatCurrency(order.subtotal)}</div>
                    <div>الضريبة: {formatCurrency(order.tax)}</div>
                    <div>الخصم: {formatCurrency(order.discount)}</div>
                    <div>الشحن: {formatCurrency(order.shipping_cost)}</div>
                    <div className="font-medium">الإجمالي: {formatCurrency(order.total)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">المنتجات</h4>
                  <div className="space-y-1 text-sm">
                    {order.items && order.items.length > 0 ? (
                      <>
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={`${order.id}-item-${index}`} className="flex justify-between">
                            <span>{item.product_name}</span>
                            <span>{item.quantity}x</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-muted-foreground">
                            و {order.items.length - 3} منتج آخر...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">لا توجد منتجات</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// المكون الرئيسي
const AdvancedOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useTenant();

  // استخدام الـ hook المخصص
  const {
    orders,
    stats,
    loading,
    error,
    hasMore,
    currentPage,
    totalCount,
    filters,
    loadMore,
    refresh,
    applyFilters,
    goToPage,
    exportToCSV
  } = useAdvancedOrders({
    pageSize: 20,
    enablePolling: true,
    pollingInterval: 60000
  });

  // حالة التحديد المتعدد
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // معالجة التحديد المتعدد
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  }, [orders]);

  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    setSelectAll(newSelected.size === orders.length);
  }, [selectedOrders, orders.length]);

  // معالجة عرض التفاصيل
  const handleViewDetails = useCallback((order: AdvancedOrder) => {
    // يمكن إضافة modal أو صفحة منفصلة للتفاصيل
  }, []);

  // معالجة الأخطاء
  useEffect(() => {
    if (error) {
      toast({
        title: "خطأ",
        description: error || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // التحقق من الصلاحيات
  if (!user || !currentOrganization) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">غير مصرح لك بالوصول لهذه الصفحة</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">الطلبيات المتقدمة</h1>
          <p className="text-muted-foreground">
            إدارة وتتبع جميع الطلبيات الأونلاين بطريقة متقدمة ومحسنة
          </p>
        </div>

        {/* بطاقات الإحصائيات */}
        <StatsCards stats={stats} loading={loading} />

        {/* قسم الفلاتر */}
        <FiltersSection
          filters={filters}
          onFiltersChange={applyFilters}
          onRefresh={refresh}
          onExport={exportToCSV}
          loading={loading}
        />

        {/* جدول الطلبيات */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>الطلبيات ({totalCount.toLocaleString()})</CardTitle>
              {selectedOrders.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedOrders.size} طلب محدد
                  </span>
                  <Button variant="outline" size="sm">
                    إجراءات متعددة
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && orders.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>جاري تحميل الطلبيات...</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>حالة الطلب</TableHead>
                      <TableHead>حالة الدفع</TableHead>
                      <TableHead>الشحن</TableHead>
                      <TableHead>تأكيد المكالمة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        isSelected={selectedOrders.has(order.id)}
                        onSelect={(checked) => handleSelectOrder(order.id, checked)}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </TableBody>
                </Table>
                
                {orders.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">لا توجد طلبيات</p>
                    <p className="text-muted-foreground">
                      لم يتم العثور على طلبيات تطابق معايير البحث الحالية
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* التحميل المتدرج */}
            {hasMore && (
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      جاري التحميل...
                    </>
                  ) : (
                    'تحميل المزيد'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdvancedOrders;
