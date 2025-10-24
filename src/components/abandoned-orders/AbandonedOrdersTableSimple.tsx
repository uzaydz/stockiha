import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  RefreshCw,
  Send,
  Trash2,
  ShoppingCart,
  Clock,
  DollarSign,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface AbandonedOrder {
  id: string;
  organization_id: string;
  product_id?: string;
  productDetails?: { name: string; image_url?: string } | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  province_name?: string | null;
  municipality_name?: string | null;
  address?: string | null;
  total_amount: number;
  status: 'pending' | 'recovered' | 'cancelled';
  cart_items?: any[] | null;
  last_activity_at: string;
  created_at: string;
  abandoned_hours?: number;
}

interface AbandonedOrdersTableSimpleProps {
  data: AbandonedOrder[];
  loading: boolean;
  onViewOrder?: (order: AbandonedOrder) => void;
  onRecoverOrder?: (order: AbandonedOrder) => void;
  onSendReminder?: (order: AbandonedOrder) => void;
  onDeleteOrder?: (order: AbandonedOrder) => void;
}

const AbandonedOrdersTableSimple: React.FC<AbandonedOrdersTableSimpleProps> = ({
  data,
  loading,
  onViewOrder,
  onRecoverOrder,
  onSendReminder,
  onDeleteOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // تصفية البيانات
  const filteredData = useMemo(() => {
    let filtered = data;

    // فلترة حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query) ||
        order.productDetails?.name?.toLowerCase().includes(query)
      );
    }

    // فلترة حسب الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [data, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // دالة تنسيق الوقت
  const formatTimeAgo = (hours?: number) => {
    if (!hours) return '-';
    if (hours < 1) return 'أقل من ساعة';
    if (hours < 24) return `${Math.floor(hours)} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  };

  // دالة الحصول على Badge الحالة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/20">
            <Clock className="ml-1 h-3 w-3" />
            معلق
          </Badge>
        );
      case 'recovered':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
            <RefreshCw className="ml-1 h-3 w-3" />
            مسترجع
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            <Trash2 className="ml-1 h-3 w-3" />
            ملغي
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // حساب الإحصائيات
  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      totalValue: filteredData.reduce((sum, order) => sum + order.total_amount, 0),
      withContact: filteredData.filter(o => o.customer_phone || o.customer_email).length,
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث عن عميل أو منتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="recovered">مسترجع</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ShoppingCart className="h-4 w-4" />
            إجمالي الطلبات
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            القيمة الإجمالية
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatPrice(stats.totalValue)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Phone className="h-4 w-4" />
            لديهم معلومات اتصال
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.withContact}
          </div>
        </div>
      </div>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">المنتج</TableHead>
              <TableHead className="text-right">العناصر</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">منذ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>لم يتم العثور على طلبات متروكة</p>
                    <p className="text-sm">
                      {(searchQuery || statusFilter !== 'all')
                        ? 'جرب تغيير معايير البحث'
                        : 'لا توجد طلبات متروكة حالياً'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{order.customer_name || 'غير محدد'}</p>
                          {order.customer_phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {order.customer_phone}
                            </div>
                          )}
                        </div>
                      </div>
                      {order.municipality_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mr-10">
                          <MapPin className="h-3 w-3" />
                          {order.municipality_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    <div className="flex items-center gap-2">
                      {order.productDetails?.image_url && (
                        <img
                          src={order.productDetails.image_url}
                          alt={order.productDetails.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span className="text-sm line-clamp-2">
                        {order.productDetails?.name || 'منتجات متعددة'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    <Badge variant="secondary" className="font-normal">
                      <Package className="ml-1 h-3 w-3" />
                      {order.cart_items?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatPrice(order.total_amount)}
                    </span>
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatTimeAgo(order.abandoned_hours)}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => onViewOrder?.(order)}>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      {onViewOrder && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewOrder(order)}
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === 'pending' && onRecoverOrder && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onRecoverOrder(order)}
                          title="استرجاع الطلب"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === 'pending' && onSendReminder && (order.customer_phone || order.customer_email) && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => onSendReminder(order)}
                          title="إرسال تذكير"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteOrder && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDeleteOrder(order)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? "bg-primary" : ""}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AbandonedOrdersTableSimple;
