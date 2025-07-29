import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Package,
  FileText,
  DollarSign,
  Calendar,
  User,
  ShoppingCart,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { RETURN_REASONS_ARRAY, getReturnReasonLabel } from '@/constants/returnReasons';

// Types
interface Return {
  id: string;
  return_number: string;
  original_order_id?: string; // جعله اختياري للإرجاع المباشر
  original_order_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  return_type: string;
  return_reason: string;
  return_reason_description?: string;
  original_total: number;
  return_amount: number;
  refund_amount: number;
  restocking_fee?: number;
  status: string;
  refund_method?: string;
  notes?: string;
  internal_notes?: string;
  requires_manager_approval?: boolean;
  organization_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  processed_by?: string;
  processed_at?: string;
  approval_notes?: string;
  rejection_reason?: string;
  rejected_by?: string;
  rejected_at?: string;
  items_count?: number; // مؤقت - سيتم حسابها
  is_direct_return?: boolean; // للإرجاع المباشر من نقطة البيع
}

interface ReturnItem {
  id: string;
  return_id: string;
  original_order_item_id?: string; // اختياري للإرجاع المباشر
  product_id: string;
  product_name: string;
  product_sku?: string;
  original_quantity: number;
  return_quantity: number;
  original_unit_price: number;
  return_unit_price: number;
  total_return_amount: number;
  // معلومات المتغيرات مباشرة في ReturnItem للإرجاع المباشر
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
  variant_display_name?: string;
  variant_info?: {
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
    variant_display_name?: string;
    type?: string;
  };
  condition_status?: string;
  resellable?: boolean;
  inventory_returned?: boolean;
  inventory_returned_at?: string;
  inventory_notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Order {
  id: string;
  customer_order_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    // إضافة دعم المتغيرات
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
    variant_display_name?: string;
    already_returned_quantity: number;
    available_for_return: number;
    has_previous_returns: boolean;
  }>;
}

const ProductReturns: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();

  // State
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loadingReturnItems, setLoadingReturnItems] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
    direct: 0,
    totalAmount: 0,
    directAmount: 0
  });

  // Create return form
  const [createForm, setCreateForm] = useState({
    orderId: '',
    returnType: 'partial' as 'full' | 'partial',
    returnReason: 'customer_request',
    description: '',
    refundMethod: 'cash' as 'cash' | 'card' | 'credit' | 'exchange' | 'store_credit',
    notes: '',
    selectedItems: [] as Array<{
      id: string; // order_item_id
      product_id: string;
      product_name: string;
      product_sku?: string;
      original_quantity: number;
      return_quantity: number;
      original_unit_price: number;
      condition_status: string;
      // إضافة دعم المتغيرات
      color_id?: string;
      size_id?: string;
      color_name?: string;
      size_name?: string;
      variant_display_name?: string;
    }>
  });

  const [searchOrderId, setSearchOrderId] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searchingOrder, setSearchingOrder] = useState(false);

  // Fetch returns
  const fetchReturns = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('returns')
        .select(`
          *,
          return_items(count)
        `)
        .eq('organization_id', currentOrganization.id);

      // تطبيق الفلاتر
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('return_type', typeFilter);
      }

      // البحث النصي
      if (searchQuery.trim()) {
        query = query.or(`
          return_number.ilike.%${searchQuery}%,
          customer_name.ilike.%${searchQuery}%,
          original_order_number.ilike.%${searchQuery}%
        `);
      }

      // فلتر التاريخ
      if (dateRange.from) {
        query = query.filter('created_at', 'gte', dateRange.from);
      }
      if (dateRange.to) {
        query = query.filter('created_at', 'lte', dateRange.to + 'T23:59:59');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;
      
      // تحويل البيانات لتتطابق مع Return interface
      const returnsData = data?.map((item: any) => ({
        ...item,
        items_count: item.return_items?.[0]?.count || 0,
        customer_name: item.customer_name || 'غير محدد',
        // تحديد نوع الإرجاع بناءً على وجود original_order_id
        return_type: item.original_order_id ? item.return_type || 'partial' : 'direct',
        // إضافة علامة للإرجاع المباشر
        is_direct_return: !item.original_order_id
      })) || [];
      
      setReturns(returnsData as Return[]);

      // حساب العدد الكلي للصفحات
      const { count } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);
      
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (error) {
      setReturns([]);
      // toast.error('حدث خطأ في جلب طلبات الإرجاع');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, statusFilter, typeFilter, currentPage, searchQuery, dateRange]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data: returns } = await supabase
        .from('returns')
        .select('status, return_amount, return_type, original_order_id')
        .eq('organization_id', currentOrganization.id);

      if (returns) {
        const stats = returns.reduce((acc: any, r: any) => {
          acc.total++;
          
          // تحديد نوع الإرجاع
          const isDirect = !r.original_order_id;
          if (isDirect) acc.direct++;
          
          // تحويل الحالات لتتطابق مع الحالات المتوقعة
          if (r.status === 'pending') acc.pending++;
          else if (r.status === 'approved') acc.approved++;
          else if (r.status === 'completed' || r.status === 'processed') acc.completed++;
          else if (r.status === 'rejected') acc.rejected++;
          
          acc.totalAmount += parseFloat(r.return_amount || '0');
          if (isDirect) acc.directAmount += parseFloat(r.return_amount || '0');
          
          return acc;
        }, {
          total: 0,
          pending: 0,
          approved: 0,
          completed: 0,
          rejected: 0,
          direct: 0, // إحصائية الإرجاع المباشر
          totalAmount: 0,
          directAmount: 0 // قيمة الإرجاع المباشر
        });

        setStats(stats);
      }
    } catch (error) {
      // قيم افتراضية
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        direct: 0,
        totalAmount: 0,
        directAmount: 0
      });
    }
  }, [currentOrganization?.id]);

  // Search for order with variants support
  const searchOrder = async () => {
    if (!searchOrderId || !currentOrganization?.id) return;

    setSearchingOrder(true);
    try {
      // البحث في قاعدة البيانات عن الطلبية
      let query = supabase
        .from('orders')
        .select(`
          id,
          customer_order_number,
          total,
          created_at,
          order_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            color_id,
            size_id,
            color_name,
            size_name,
            variant_display_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_online', false);

      // التحقق من نوع البحث - رقم طلبية أم UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchOrderId);
      const isNumber = /^\d+$/.test(searchOrderId);

      if (isUUID) {
        query = query.eq('id', searchOrderId);
      } else if (isNumber) {
        query = query.eq('customer_order_number', parseInt(searchOrderId));
      } else {
        throw new Error('صيغة رقم الطلبية غير صحيحة');
      }

      // التحقق من عدد النتائج أولاً
      let totalCount = 0;
      if (isNumber) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id)
          .eq('is_online', false)
          .eq('customer_order_number', parseInt(searchOrderId));
        totalCount = count || 0;
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const firstOrder = data[0];
        
        // جلب اسم العميل منفصلاً إذا كان موجوداً
        let customerName = 'زائر';
        if (firstOrder.customer_id) {
          try {
            const { data: customer } = await supabase
              .from('customers')
              .select('name, first_name, last_name')
              .eq('id', firstOrder.customer_id)
              .single();
            
            if (customer) {
              customerName = customer.name || 
                           (customer.first_name && customer.last_name ? 
                            `${customer.first_name} ${customer.last_name}` : 
                            customer.first_name || customer.last_name || 'زائر');
            }
          } catch (e) {
          }
        }

        // إضافة معلومات إضافية للمتغيرات
        const orderData: Order = {
          ...firstOrder,
          customer_order_number: String(firstOrder.customer_order_number),
          customer_name: customerName,
          order_items: firstOrder.order_items?.map((item: any) => ({
            ...item,
            product_sku: item.product_sku || '',
            already_returned_quantity: 0, // سيتم جلبها من قاعدة البيانات لاحقاً
            available_for_return: item.quantity,
            has_previous_returns: false
          })) || []
        };

        setFoundOrder(orderData);
        setCreateForm(prev => ({ ...prev, orderId: firstOrder.id }));
        
        // إشعار في حالة وجود أكثر من طلبية بنفس الرقم
        if (totalCount > 1) {
          toast.info(`تم العثور على ${totalCount} طلبيات برقم ${searchOrderId}، تم اختيار الأحدث`);
        }
      } else {
        toast.error('لم يتم العثور على الطلبية');
        setFoundOrder(null);
      }
    } catch (error) {
      toast.error('حدث خطأ في البحث عن الطلبية');
      setFoundOrder(null);
    } finally {
      setSearchingOrder(false);
    }
  };

  // Create return request with variants support
  const createReturnRequest = async () => {
    if (!foundOrder || !user?.id || !currentOrganization?.id || createForm.selectedItems.length === 0) {
      toast.error('يجب اختيار عناصر للإرجاع');
      return;
    }

    try {
      // حساب القيم الإجمالية
      const returnAmount = createForm.selectedItems.reduce((sum, item) => 
        sum + (item.return_quantity * item.original_unit_price), 0);
      
      // إنشاء رقم طلب الإرجاع
      const returnNumber = `RET-${Date.now()}`;

      const returnData = {
        return_number: returnNumber,
        original_order_id: foundOrder.id,
        original_order_number: foundOrder.customer_order_number,
        customer_name: foundOrder.customer_name,
        return_type: createForm.returnType,
        return_reason: createForm.returnReason,
        return_reason_description: createForm.description || null,
        original_total: foundOrder.total,
        return_amount: returnAmount,
        refund_amount: returnAmount, // سيتم تحديثها لاحقاً حسب السياسة
        restocking_fee: 0,
        status: 'pending',
        refund_method: createForm.refundMethod,
        notes: createForm.notes || null,
        requires_manager_approval: returnAmount > 10000, // سياسة المراجعة
        organization_id: currentOrganization.id,
        created_by: user.id
      };

      // إدراج طلب الإرجاع
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([returnData])
        .select()
        .single();

      if (returnError) throw returnError;

      // إدراج عناصر الإرجاع
      if (returnRecord) {
        const returnItemsData = createForm.selectedItems.map(item => ({
          return_id: returnRecord.id,
          original_order_item_id: item.id, // ID من order_items
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          original_quantity: item.original_quantity,
          return_quantity: item.return_quantity,
          original_unit_price: item.original_unit_price,
          return_unit_price: item.original_unit_price, // نفس السعر مؤقتاً
          total_return_amount: item.return_quantity * item.original_unit_price,
          condition_status: 'good', // افتراضي
          resellable: true, // افتراضي
          inventory_returned: false,
          variant_info: (item.color_id || item.size_id) ? {
            color_id: item.color_id,
            size_id: item.size_id,
            color_name: item.color_name,
            size_name: item.size_name,
            variant_display_name: item.variant_display_name,
            type: item.color_id && item.size_id ? 'color_size' : 
                  item.color_id ? 'color_only' : 
                  item.size_id ? 'size_only' : 'main'
          } : null
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItemsData);

        if (itemsError) throw itemsError;
      }

      toast.success('تم إنشاء طلب الإرجاع بنجاح');
      setIsCreateDialogOpen(false);
      resetCreateForm();
      fetchReturns();
      fetchStats();
    } catch (error) {
      toast.error('حدث خطأ في إنشاء طلب الإرجاع');
    }
  };

  // Process return
  const processReturn = async (returnId: string, action: 'approve' | 'reject' | 'process', notes?: string) => {
    if (!user?.id) return;

    try {
      // استبدال RPC بحل مؤقت
      toast.success(`تم ${action === 'approve' ? 'الموافقة على' : action === 'reject' ? 'رفض' : 'معالجة'} طلب الإرجاع (مؤقت)`);
      fetchReturns();
      fetchStats();
      setIsActionDialogOpen(false);
    } catch (error) {
      toast.error('حدث خطأ في معالجة طلب الإرجاع');
    }
  };

  // Fetch return items with variants
  const fetchReturnItems = async (returnId: string) => {
    if (!currentOrganization?.id) return;

    setLoadingReturnItems(true);
    try {
      const { data, error } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // تحويل البيانات لتتطابق مع ReturnItem interface
      const returnItemsData = data?.map((item: any) => ({
        ...item,
        condition_status: item.condition_status || 'good',
        resellable: item.resellable !== undefined ? item.resellable : true,
        inventory_returned: item.inventory_returned || false,
        // دعم المتغيرات للإرجاع المباشر
        color_name: item.color_name || item.variant_info?.color_name,
        size_name: item.size_name || item.variant_info?.size_name,
        variant_display_name: item.variant_display_name || item.variant_info?.variant_display_name,
        variant_info: item.variant_info || {
          color_id: item.color_id,
          size_id: item.size_id,
          color_name: item.color_name,
          size_name: item.size_name,
          variant_display_name: item.variant_display_name
        }
      })) || [];
      
      setReturnItems(returnItemsData as ReturnItem[]);
    } catch (error) {
      toast.error('حدث خطأ في جلب عناصر الإرجاع');
      setReturnItems([]);
    } finally {
      setLoadingReturnItems(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      orderId: '',
      returnType: 'partial',
      returnReason: 'customer_request',
      description: '',
      refundMethod: 'cash',
      notes: '',
      selectedItems: []
    });
    setFoundOrder(null);
    setSearchOrderId('');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' دج';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'موافق عليه', variant: 'default' as const, icon: CheckCircle },
      processing: { label: 'قيد المعالجة', variant: 'outline' as const, icon: RefreshCw },
      completed: { label: 'مكتمل', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'ملغي', variant: 'secondary' as const, icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get reason label - استخدام الدالة المساعدة
  const getReasonLabel = (reason: string) => {
    return getReturnReasonLabel(reason);
  };

  useEffect(() => {
    fetchReturns();
    fetchStats();
  }, [fetchReturns, fetchStats]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeft className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">إدارة إرجاع المنتجات</h1>
              <p className="text-sm text-muted-foreground mt-1">
                إدارة طلبات الإرجاع من الطلبيات والإرجاع المباشر من نقطة البيع
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => { fetchReturns(); fetchStats(); }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  طلب إرجاع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>إنشاء طلب إرجاع جديد</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* البحث عن الطلبية */}
                  <div className="space-y-4">
                    <Label>البحث عن الطلبية</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="رقم الطلبية أو معرف الطلبية"
                        value={searchOrderId}
                        onChange={(e) => setSearchOrderId(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={searchOrder}
                        disabled={!searchOrderId || searchingOrder}
                      >
                        {searchingOrder ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* تفاصيل الطلبية */}
                  {foundOrder && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          تفاصيل الطلبية #{foundOrder.customer_order_number}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>العميل</Label>
                            <p className="font-medium">{foundOrder.customer_name}</p>
                          </div>
                          <div>
                            <Label>المجموع الإجمالي</Label>
                            <p className="font-medium">{formatCurrency(foundOrder.total)}</p>
                          </div>
                        </div>

                        {/* عناصر الطلبية */}
                        <div>
                          <Label>عناصر الطلبية</Label>
                          <div className="mt-2 border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>المنتج</TableHead>
                                  <TableHead>المتغير</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  <TableHead>السعر</TableHead>
                                  <TableHead>المجموع</TableHead>
                                  {createForm.returnType === 'partial' && (
                                    <TableHead>إرجاع؟</TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {foundOrder.order_items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{item.product_name}</p>
                                        {item.product_sku && (
                                          <p className="text-sm text-muted-foreground">رمز المنتج: {item.product_sku}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {item.variant_display_name ? (
                                        <div className="text-sm">
                                          <p className="font-medium">{item.variant_display_name}</p>
                                          <div className="flex gap-2 text-muted-foreground">
                                            {item.color_name && <span>اللون: {item.color_name}</span>}
                                            {item.size_name && <span>المقاس: {item.size_name}</span>}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">المنتج الأساسي</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <p>{item.quantity}</p>
                                        {item.already_returned_quantity > 0 && (
                                          <p className="text-sm text-red-500">
                                            مرجع: {item.already_returned_quantity}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell>{formatCurrency(item.total_price)}</TableCell>
                                    {createForm.returnType === 'partial' && (
                                      <TableCell>
                                        <input
                                          type="checkbox"
                                          disabled={item.available_for_return <= 0}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setCreateForm(prev => ({
                                                ...prev,
                                                selectedItems: [
                                                  ...prev.selectedItems,
                                                  {
                                                    order_item_id: item.id,
                                                    return_quantity: item.available_for_return,
                                                    condition_status: 'good',
                                                    color_id: item.color_id,
                                                    size_id: item.size_id,
                                                    color_name: item.color_name,
                                                    size_name: item.size_name,
                                                    variant_display_name: item.variant_display_name
                                                  }
                                                ]
                                              }));
                                            } else {
                                              setCreateForm(prev => ({
                                                ...prev,
                                                selectedItems: prev.selectedItems.filter(
                                                  si => si.order_item_id !== item.id
                                                )
                                              }));
                                            }
                                          }}
                                        />
                                        {item.available_for_return <= 0 && (
                                          <p className="text-xs text-red-500 mt-1">غير متاح للإرجاع</p>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* تفاصيل الإرجاع */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>نوع الإرجاع</Label>
                            <Select 
                              value={createForm.returnType} 
                              onValueChange={(value: 'full' | 'partial') => 
                                setCreateForm(prev => ({ ...prev, returnType: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">إرجاع كامل</SelectItem>
                                <SelectItem value="partial">إرجاع جزئي</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>سبب الإرجاع</Label>
                            <Select 
                              value={createForm.returnReason} 
                              onValueChange={(value) => 
                                setCreateForm(prev => ({ ...prev, returnReason: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RETURN_REASONS_ARRAY.map((reason) => (
                                  <SelectItem key={reason.value} value={reason.value}>
                                    {reason.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>وصف السبب</Label>
                          <Textarea
                            placeholder="اكتب تفاصيل سبب الإرجاع..."
                            value={createForm.description}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Label>طريقة الاسترداد</Label>
                          <Select 
                            value={createForm.refundMethod} 
                            onValueChange={(value: any) => 
                              setCreateForm(prev => ({ ...prev, refundMethod: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">نقدي</SelectItem>
                              <SelectItem value="card">بطاقة</SelectItem>
                              <SelectItem value="credit">رصيد</SelectItem>
                              <SelectItem value="exchange">استبدال</SelectItem>
                              <SelectItem value="store_credit">رصيد متجر</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>ملاحظات إضافية</Label>
                          <Textarea
                            placeholder="أي ملاحظات إضافية..."
                            value={createForm.notes}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            إلغاء
                          </Button>
                          <Button onClick={createReturnRequest}>
                            إنشاء طلب الإرجاع
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">إرجاع مباشر</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.direct}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">في الانتظار</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">موافق عليها</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">مرفوضة</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">قيمة الإرجاع</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>الفلاتر:</Label>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="approved">موافق عليها</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="full">إرجاع كامل</SelectItem>
                  <SelectItem value="partial">إرجاع جزئي</SelectItem>
                  <SelectItem value="direct">إرجاع مباشر</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="البحث برقم الإرجاع أو العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <CardTitle>طلبات الإرجاع</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الإرجاع</TableHead>
                      <TableHead>الطلبية الأصلية</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell className="font-medium">
                          {returnItem.return_number}
                        </TableCell>
                        <TableCell>
                          {returnItem.is_direct_return ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              إرجاع مباشر
                            </Badge>
                          ) : (
                            `#${returnItem.original_order_number}`
                          )}
                        </TableCell>
                        <TableCell>{returnItem.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant={returnItem.return_type === 'full' ? 'default' : returnItem.return_type === 'direct' ? 'outline' : 'secondary'}>
                            {returnItem.return_type === 'full' ? 'كامل' : 
                             returnItem.return_type === 'direct' ? 'مباشر' : 'جزئي'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {returnItem.is_direct_return ? (
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4 text-orange-600" />
                              <span className="text-orange-700 font-medium">نقطة البيع</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <ShoppingCart className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-700 font-medium">طلبية</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getReasonLabel(returnItem.return_reason)}</TableCell>
                        <TableCell>{formatCurrency(returnItem.return_amount)}</TableCell>
                        <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                        <TableCell>
                          {new Date(returnItem.created_at).toLocaleDateString('ar')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReturn(returnItem);
                                fetchReturnItems(returnItem.id);
                                setIsDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {returnItem.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReturn(returnItem);
                                  setIsActionDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {returns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات إرجاع
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                تفاصيل طلب الإرجاع {selectedReturn?.return_number}
              </DialogTitle>
            </DialogHeader>
            
            {selectedReturn && (
              <div className="space-y-6">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>رقم الإرجاع:</span>
                        <span className="font-medium">{selectedReturn.return_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الطلبية الأصلية:</span>
                        {selectedReturn.is_direct_return ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            إرجاع مباشر - نقطة البيع
                          </Badge>
                        ) : (
                          <span className="font-medium">#{selectedReturn.original_order_number}</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>النوع:</span>
                        <Badge variant={selectedReturn.return_type === 'full' ? 'default' : selectedReturn.return_type === 'direct' ? 'outline' : 'secondary'}>
                          {selectedReturn.return_type === 'full' ? 'إرجاع كامل' : 
                           selectedReturn.return_type === 'direct' ? 'إرجاع مباشر' : 'إرجاع جزئي'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>الحالة:</span>
                        {getStatusBadge(selectedReturn.status)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">العميل والمبالغ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>العميل:</span>
                        <span className="font-medium">{selectedReturn.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>المبلغ الأصلي:</span>
                        <span className="font-medium">{formatCurrency(selectedReturn.original_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>مبلغ الإرجاع:</span>
                        <span className="font-medium">{formatCurrency(selectedReturn.return_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>مبلغ الاسترداد:</span>
                        <span className="font-medium text-green-600">{formatCurrency(selectedReturn.refund_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* السبب والملاحظات */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">السبب والملاحظات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>سبب الإرجاع</Label>
                      <p className="mt-1">{getReasonLabel(selectedReturn.return_reason)}</p>
                    </div>
                    {selectedReturn.return_reason_description && (
                      <div>
                        <Label>وصف السبب</Label>
                        <p className="mt-1">{selectedReturn.return_reason_description}</p>
                      </div>
                    )}
                    {selectedReturn.notes && (
                      <div>
                        <Label>ملاحظات</Label>
                        <p className="mt-1">{selectedReturn.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* عناصر الإرجاع */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">عناصر الإرجاع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReturnItems ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>المنتج</TableHead>
                              <TableHead>المتغير</TableHead>
                              <TableHead>الكمية المرجعة</TableHead>
                              <TableHead>السعر</TableHead>
                              <TableHead>المجموع</TableHead>
                              <TableHead>الحالة</TableHead>
                              <TableHead>قابل للبيع؟</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {returnItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.product_sku && (
                                      <p className="text-sm text-muted-foreground">رمز المنتج: {item.product_sku}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {item.variant_display_name ? (
                                    <div className="text-sm">
                                      <p className="font-medium">{item.variant_display_name}</p>
                                      <div className="flex gap-2 text-muted-foreground">
                                        {item.color_name && <span>اللون: {item.color_name}</span>}
                                        {item.size_name && <span>المقاس: {item.size_name}</span>}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">المنتج الأساسي</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p>{item.return_quantity}</p>
                                    <p className="text-sm text-muted-foreground">من أصل {item.original_quantity}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{formatCurrency(item.return_unit_price)}</TableCell>
                                <TableCell>{formatCurrency(item.total_return_amount)}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    item.condition_status === 'good' ? 'default' :
                                    item.condition_status === 'damaged' ? 'destructive' :
                                    'secondary'
                                  }>
                                    {item.condition_status === 'good' ? 'جيد' :
                                     item.condition_status === 'damaged' ? 'تالف' :
                                     item.condition_status === 'defective' ? 'معيب' :
                                     item.condition_status === 'expired' ? 'منتهي الصلاحية' :
                                     item.condition_status === 'opened' ? 'مفتوح' : item.condition_status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.resellable ? 'default' : 'secondary'}>
                                    {item.resellable ? 'نعم' : 'لا'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {returnItems.length === 0 && !loadingReturnItems && (
                          <div className="text-center py-8 text-muted-foreground">
                            لا توجد عناصر إرجاع
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Return Action Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>معالجة طلب الإرجاع</DialogTitle>
            </DialogHeader>
            
            {selectedReturn && (
              <div className="space-y-4">
                <p>هل تريد معالجة طلب الإرجاع {selectedReturn.return_number}؟</p>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => processReturn(selectedReturn.id, 'approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    موافقة
                  </Button>
                  <Button 
                    onClick={() => processReturn(selectedReturn.id, 'reject')}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    رفض
                  </Button>
                  {selectedReturn.status === 'approved' && (
                    <Button 
                      onClick={() => processReturn(selectedReturn.id, 'process')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      معالجة
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProductReturns;
