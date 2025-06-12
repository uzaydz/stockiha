import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import OrdersList from "@/components/orders/OrdersList";
import OrderDetails from "@/components/orders/OrderDetails";
import OrderFilters from "@/components/orders/OrderFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkUserPermissions } from "@/lib/api/permissions";

// استيراد المكونات الجديدة
import OrdersTable from "@/components/orders/table/OrdersTable";
import { Order } from "@/components/orders/table/OrderTableTypes";
import OrdersDashboard from "@/components/orders/OrdersDashboard";
import OrdersAdvancedFilters from "@/components/orders/OrdersAdvancedFilters";
import { OrdersDataProvider } from '@/context/OrdersDataContext';

// استيراد دالة تكامل الشحن
import { sendOrderToShippingProvider } from "@/utils/ecotrackShippingIntegration";

// تعريف أنواع حالات الطلب
type OrderStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// تعريف أنواع الصلاحيات المتعلقة بالطلبات
type OrderPermissions = 'viewOrders' | 'updateOrderStatus' | 'cancelOrders';

// إضافة نوع معدل للطلب لتجنب أخطاء التدقيق
type ProcessedOrder = Omit<Order, 'employee_id'> & {
  employee_id?: string | null;
};

const Orders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus>('all');
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  
  // إضافة متغيرات حالة جديدة
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [orderStats, setOrderStats] = useState({
    totalSales: 0,
    avgOrderValue: 0,
    salesTrend: 0,
    pendingAmount: 0
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact', 'total', 'items', 'status', 'call_confirmation', 'shipping_provider', 'source', 'actions'
  ]);
  
  // متغيرات للتحميل المتدرج والتخزين المؤقت
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(0);
  const ordersCache = useRef<Record<string, Order[]>>({});
  const loadingRef = useRef(false);
  
  // إضافة حالات للصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasUpdatePermission, setHasUpdatePermission] = useState(false);
  const [hasCancelPermission, setHasCancelPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  // بيانات حالات تأكيد الإتصال
  const [callConfirmationStatuses, setCallConfirmationStatuses] = useState<any[]>([]);
  const [callConfirmationLoading, setCallConfirmationLoading] = useState(false);

  // حساب العدد الإجمالي للصفحات
  const totalPages = useMemo(() => {
    return Math.ceil((orderCounts.all || 0) / pageSize);
  }, [orderCounts.all, pageSize]);

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية مشاهدة الطلبات
        const canViewOrders = await checkUserPermissions(user, 'viewOrders' as any);
        setHasViewPermission(canViewOrders);
        
        // التحقق من صلاحية تحديث حالة الطلبات
        const canUpdateOrders = await checkUserPermissions(user, 'updateOrderStatus' as any);
        setHasUpdatePermission(canUpdateOrders);
        
        // التحقق من صلاحية إلغاء الطلبات
        const canCancelOrders = await checkUserPermissions(user, 'cancelOrders' as any);
        setHasCancelPermission(canCancelOrders);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك للوصول إلى هذه الصفحة"
        });
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  // جلب عدد الطلبات حسب الحالة - هذه الدالة تحسن الأداء عن طريق استعلام منفصل للعد فقط
  const fetchOrderCounts = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      // استعلام للحصول على عدد الطلبات حسب الحالة
      const { data, error } = await supabase.rpc('get_orders_count_by_status', {
        org_id: currentOrganization.id
      });
      
      if (error) throw error;
      
      if (data) {
        const counts = {
          all: 0,
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0
        };
        
        data.forEach(item => {
          counts[item.status] = item.count;
          counts.all += item.count;
        });
        
        setOrderCounts(counts);
      }
    } catch (error) {
    }
  }, [currentOrganization?.id]);

  // استرجاع إحصاءات الطلبات
  const fetchOrderStats = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      // استعلام للحصول على إجمالي المبيعات ومتوسط قيمة الطلب
      const { data, error } = await supabase.rpc('get_order_stats', {
        org_id: currentOrganization.id
      });
      
      if (error) throw error;
      
      if (data) {
        // <-- START: Cast RPC result to any -->
        const statsData = data as any; 
        setOrderStats({
          totalSales: statsData.total_sales || 0,
          avgOrderValue: statsData.avg_order_value || 0,
          salesTrend: statsData.sales_trend || 0,
          pendingAmount: statsData.pending_amount || 0
        });
        // <-- END: Cast RPC result to any -->
      }
    } catch (error) {
    }
  }, [currentOrganization?.id]);

  // استرجاع الطلبات بتحميل متدرج
  const fetchOrders = useCallback(async (page = 0, status = 'all', search = '', dateFrom: string | null = null, dateTo: string | null = null) => {
    if (!currentOrganization?.id || !hasViewPermission || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      // تكوين مفتاح التخزين المؤقت
      const cacheKey = `${status}-${search}-${dateFrom}-${dateTo}-${page}`;
      
      // التحقق من وجود البيانات في التخزين المؤقت
      if (ordersCache.current[cacheKey]) {
        setOrders(prevOrders => {
          if (page === 0) return ordersCache.current[cacheKey];
          return [...prevOrders, ...ordersCache.current[cacheKey]];
        });
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      // بناء استعلام قاعدة البيانات
      let query = supabase
        .from('online_orders')
        .select(`
          id,
          customer_id,
          subtotal,
          tax,
          discount,
          total,
          status,
          payment_method,
          payment_status,
          shipping_address_id,
          shipping_method,
          shipping_cost,
          shipping_option,
          notes,
          employee_id,
          created_at,
          updated_at,
          organization_id,
          slug,
          customer_order_number,
          created_from,
          call_confirmation_status_id,
          call_confirmation_notes,
          call_confirmation_updated_at,
          call_confirmation_updated_by,
          form_data,
          metadata,
          yalidine_tracking_id,
          zrexpress_tracking_id,
          ecotrack_tracking_id,

          order_items:online_order_items(id, product_id, product_name, quantity, unit_price, total_price, color_id, color_name, size_id, size_name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      // إضافة المرشحات
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      if (search) {
        query = query.or(`customer_order_number.ilike.%${search}%,id.ilike.%${search}%`);
      }
      
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      
      // تنفيذ الاستعلام
      const { data: ordersData, error } = await query;
      
      if (error) throw error;
      
      // <-- START: Added log for raw Supabase data -->
      console.log("🔍 [Orders] Raw ordersData from Supabase (with tracking IDs):", ordersData?.slice(0, 3).map(order => ({
        id: order.id,
        customer_order_number: order.customer_order_number,
        yalidine_tracking_id: order.yalidine_tracking_id,
        zrexpress_tracking_id: order.zrexpress_tracking_id,
        ecotrack_tracking_id: order.ecotrack_tracking_id,
        status: order.status
      })));
      // <-- END: Added log for raw Supabase data -->

      // <-- START: Cast ordersData to any[] -->
      const rawOrders: any[] = ordersData || []; 
      // <-- END: Cast ordersData to any[] -->

      // استخراج معرفات العملاء والعناوين
      const customerIds = rawOrders
        .filter(order => order.customer_id)
        .map(order => order.customer_id);
      
      const addressIds = rawOrders
        .filter(order => order.shipping_address_id)
        .map(order => order.shipping_address_id);
      
      let customersData: any[] = [];
      let guestCustomersData: any[] = [];
      let addressesData: any[] = [];
      
      // جلب بيانات العناوين إذا كانت هناك معرفات
      if (addressIds.length > 0) {
        const { data: addresses, error: addressesError } = await supabase
          .from('addresses')
          .select('*')
          .in('id', addressIds);
          
        if (addressesError) {
        } else {
          addressesData = addresses || [];
          
          // استخراج معرفات الولايات والبلديات
          const provinceIds = addressesData
            .filter(addr => addr.state && !isNaN(parseInt(addr.state)))
            .map(addr => parseInt(addr.state));
            
          const municipalityIds = addressesData
            .filter(addr => addr.municipality && !isNaN(parseInt(addr.municipality)))
            .map(addr => parseInt(addr.municipality));
          
          // جلب أسماء الولايات
          if (provinceIds.length > 0) {
            const { data: provinces, error: provincesError } = await supabase
              .from('yalidine_provinces_global')
              .select('id, name')
              .in('id', provinceIds);
              
            if (provincesError) {
            } else if (provinces) {
              // إضافة أسماء الولايات إلى بيانات العناوين
              addressesData = addressesData.map(addr => {
                if (addr.state && !isNaN(parseInt(addr.state))) {
                  const province = provinces.find(p => p.id === parseInt(addr.state));
                  if (province) {
                    return {
                      ...addr,
                      state_name: province.name
                    };
                  }
                }
                return addr;
              });
            }
          }
          
          // جلب أسماء البلديات
          if (municipalityIds.length > 0) {
            const { data: municipalities, error: municipalitiesError } = await supabase
              .from('yalidine_municipalities_global')
              .select('id, name')
              .in('id', municipalityIds);
              
            if (municipalitiesError) {
            } else if (municipalities) {
              // إضافة أسماء البلديات إلى بيانات العناوين
              addressesData = addressesData.map(addr => {
                if (addr.municipality && !isNaN(parseInt(addr.municipality))) {
                  const municipality = municipalities.find(m => m.id === parseInt(addr.municipality));
                  if (municipality) {
                    return {
                      ...addr,
                      municipality_name: municipality.name
                    };
                  }
                }
                return addr;
              });
            }
          }
        }
      }
      
      // جلب بيانات العملاء إذا كانت هناك معرفات
      if (customerIds.length > 0) {
        // 1. أولاً، جلب بيانات العملاء المسجلين
        const { data: regularCustomers, error: customersError } = await supabase
          .from('customers')
          .select('id, name, phone, email, organization_id')
          .in('id', customerIds)
          .eq('organization_id', currentOrganization.id);
          
        if (customersError) {
        } else {
          customersData = regularCustomers || [];
        }
        
        // 2. جلب بيانات العملاء الضيوف
        const { data: guestCustomers, error: guestCustomersError } = await supabase
          .from('guest_customers')
          .select('id, name, phone, organization_id')
          .in('id', customerIds)
          .eq('organization_id', currentOrganization.id);
          
        if (guestCustomersError) {
        } else {
          guestCustomersData = guestCustomers || [];
        }
      }
      
      // دمج بيانات العملاء والضيوف
      const allCustomersData = [
        ...customersData,
        ...guestCustomersData.map(guest => ({
          ...guest,
          email: null // إضافة حقل email فارغ للتوافق مع نموذج بيانات العملاء
        }))
      ];
      
      // استخراج معرفات حالات تأكيد الإتصال
      const confirmationStatusIds = rawOrders
        .filter(order => order.call_confirmation_status_id)
        .map(order => order.call_confirmation_status_id);
      
      let confirmationStatusesData: any[] = [];
      
      // جلب بيانات حالات تأكيد الإتصال إذا كانت هناك معرفات
      if (confirmationStatusIds.length > 0) {
        const { data: statusesData, error: statusesError } = await supabase
          .from('call_confirmation_statuses')
          .select('*')
          .in('id', confirmationStatusIds)
          .eq('organization_id', currentOrganization.id);
          
        if (statusesError) {
        } else {
          confirmationStatusesData = statusesData || [];
        }
      }
      
      // ربط بيانات العملاء بالطلبات وضبط الحقول المطلوبة
      const processedOrders: Order[] = rawOrders.map(order => {
        // معالجة بيانات العنوان إذا كانت موجودة
        let shippingAddress = null;
        if (order.shipping_address_id) {
          const addressData = addressesData.find(addr => addr.id === order.shipping_address_id);
          if (addressData) {
            shippingAddress = {
              id: addressData.id || '',
              name: addressData.name || undefined,
              street_address: addressData.street_address || undefined,
              state: addressData.state_name || addressData.state || undefined,
              municipality: addressData.municipality_name || addressData.municipality || undefined,
              country: addressData.country || undefined,
              phone: addressData.phone || undefined
            };
          }
        }
        
        // البحث عن بيانات العميل
        const customer = order.customer_id ? allCustomersData.find(c => c.id === order.customer_id) || null : null;
        
        // إضافة حقل color_code لكل عنصر إذا لم يكن موجوداً
        const orderItems = Array.isArray(order.order_items) 
          ? order.order_items.map(item => ({
              ...item,
              color_code: null // إضافة القيمة الافتراضية
            }))
          : [];
        
        // معالجة بيانات form_data إذا كانت موجودة
        let formData = order.form_data;
        if (typeof formData === 'string') {
          try {
            formData = JSON.parse(formData);
          } catch (e) {
            formData = null;
          }
        }
        
        // إنشاء كائن الطلب المعالج
        return {
          id: order.id,
          customer_id: order.customer_id,
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          discount: order.discount ? Number(order.discount) : null,
          total: Number(order.total),
          status: order.status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          shipping_address_id: order.shipping_address_id,
          shipping_method: order.shipping_method,
          shipping_cost: order.shipping_cost ? Number(order.shipping_cost) : null,
          shipping_option: order.shipping_option,
          notes: order.notes,
          employee_id: order.employee_id || null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          organization_id: order.organization_id,
          slug: order.slug,
          customer_order_number: order.customer_order_number,
          created_from: order.created_from,
          // بيانات تأكيد الإتصال
          call_confirmation_status_id: order.call_confirmation_status_id,
          call_confirmation_notes: order.call_confirmation_notes,
          call_confirmation_updated_at: order.call_confirmation_updated_at,
          call_confirmation_updated_by: order.call_confirmation_updated_by,
          call_confirmation_status: order.call_confirmation_status_id 
            ? confirmationStatusesData.find(s => s.id === order.call_confirmation_status_id) || null
            : null,
          // حقول تتبع الشحن - الحقول المفقودة!
          yalidine_tracking_id: order.yalidine_tracking_id,
          zrexpress_tracking_id: order.zrexpress_tracking_id,
          ecotrack_tracking_id: order.ecotrack_tracking_id,
          customer: customer,
          shipping_address: shippingAddress,
          order_items: orderItems,
          form_data: formData,
          metadata: order.metadata
        };
      });
      
      // <-- START: Added log for processed orders -->
      console.log("🔍 [Orders] Processed orders (with tracking IDs):", processedOrders?.slice(0, 3).map(order => ({
        id: order.id,
        customer_order_number: order.customer_order_number,
        yalidine_tracking_id: order.yalidine_tracking_id,
        zrexpress_tracking_id: order.zrexpress_tracking_id,
        ecotrack_tracking_id: order.ecotrack_tracking_id,
        status: order.status
      })));
      // <-- END: Added log for processed orders -->

      // تخزين البيانات في ذاكرة التخزين المؤقت
      ordersCache.current[cacheKey] = processedOrders;
      
      // تحديث حالة الطلبات - عرض الطلبات الجديدة فقط (pagination)
      setOrders(processedOrders);
      
      // تحديث مؤشر وجود المزيد من الطلبات
      setHasMoreOrders(processedOrders.length === pageSize);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الطلبات",
        description: "حدث خطأ أثناء محاولة جلب الطلبات. يرجى المحاولة مرة أخرى."
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrganization?.id, hasViewPermission, pageSize, toast]);

  // تحميل المزيد من الطلبات عند التمرير
  const loadMoreOrders = useCallback(() => {
    if (hasMoreOrders && !loadingRef.current) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      const dateFrom = dateRange.from ? dateRange.from.toISOString() : null;
      const dateTo = dateRange.to ? dateRange.to.toISOString() : null;
      
      fetchOrders(nextPage, filterStatus, searchTerm, dateFrom, dateTo);
    }
  }, [currentPage, dateRange, fetchOrders, filterStatus, hasMoreOrders, searchTerm]);

  // دالة للانتقال إلى صفحة محددة
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || loadingRef.current) return;
    
    // إعادة ضبط الطلبات عند الانتقال لصفحة جديدة
    setOrders([]);
    setCurrentPage(page - 1); // تحويل من 1-based إلى 0-based
    
    const dateFrom = dateRange.from ? dateRange.from.toISOString() : null;
    const dateTo = dateRange.to ? dateRange.to.toISOString() : null;
    
    fetchOrders(page - 1, filterStatus, searchTerm, dateFrom, dateTo);
  }, [dateRange, fetchOrders, filterStatus]);

  // تصفية الطلبات عند تغيير المرشحات
  const handleFilterChange = useCallback(({ status, searchTerm, dateRange }) => {
    // إعادة ضبط الصفحة والطلبات عند تغيير المرشحات
    setCurrentPage(0);
    setOrders([]);
    
    // تحديث متغيرات الحالة
    if (status) setFilterStatus(status);
    if (searchTerm !== undefined) setSearchTerm(searchTerm);
    if (dateRange) setDateRange(dateRange);
    
    // جلب البيانات المصفاة من الخادم (الصفحة الأولى)
    const dateFrom = dateRange?.from ? dateRange.from.toISOString() : null;
    const dateTo = dateRange?.to ? dateRange.to.toISOString() : null;
    
    fetchOrders(0, status || filterStatus, searchTerm || "", dateFrom, dateTo);
    
  }, [fetchOrders, filterStatus]);

  // تحديث حالة طلب واحد
  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    try {
      // تحديث الحالة في قاعدة البيانات
      const { error } = await supabase
        .from('online_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      
      // تحديث الحالة محليًا
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
      
      // تحديث الطلبات المصفاة أيضًا
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
      
      // تحديث العدادات
      await fetchOrderCounts();
      
      toast({
        title: "تم تحديث حالة الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث حالة الطلب",
        description: "حدث خطأ أثناء محاولة تحديث حالة الطلب. يرجى المحاولة مرة أخرى."
      });
    }
  }, [currentOrganization?.id, fetchOrderCounts, hasUpdatePermission, toast]);

  // تحديث حالة عدة طلبات دفعة واحدة
  const bulkUpdateOrderStatus = useCallback(async (orderIds: string[], status: string) => {
    if (!currentOrganization?.id || !hasUpdatePermission || orderIds.length === 0) return;
    
    try {
      // تحديث الحالة في قاعدة البيانات
      const { error } = await supabase
        .from('online_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      
      // تحديث الحالة محليًا
      setOrders(prevOrders => 
        prevOrders.map(order => 
          orderIds.includes(order.id) ? { ...order, status } : order
        )
      );
      
      // تحديث الطلبات المصفاة أيضًا
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          orderIds.includes(order.id) ? { ...order, status } : order
        )
      );
      
      // تحديث العدادات
      await fetchOrderCounts();
      
      toast({
        title: "تم تحديث حالة الطلبات",
        description: `تم تحديث حالة ${orderIds.length} طلب بنجاح`,
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث حالة الطلبات",
        description: "حدث خطأ أثناء محاولة تحديث حالة الطلبات. يرجى المحاولة مرة أخرى."
      });
    }
  }, [currentOrganization?.id, fetchOrderCounts, hasUpdatePermission, toast]);

  // جلب حالات تأكيد الإتصال
  const fetchCallConfirmationStatuses = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setCallConfirmationLoading(true);
      
      const { data, error } = await supabase
        .from('call_confirmation_statuses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('is_default', { ascending: false })
        .order('name');
        
      if (error) throw error;
      
      setCallConfirmationStatuses(data || []);
    } catch (error) {
    } finally {
      setCallConfirmationLoading(false);
    }
  }, [currentOrganization?.id]);

  // تحديث حالة تأكيد الإتصال للطلب
  const updateOrderCallConfirmation = useCallback(async (orderId: string, statusId: number, notes?: string) => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    try {
      // استدعاء وظيفة تحديث حالة تأكيد الإتصال
      const { data, error } = await supabase.rpc(
        'update_order_call_confirmation',
        {
          p_order_id: orderId,
          p_status_id: statusId,
          p_notes: notes || null,
          p_user_id: user?.id || null,
        }
      );
      
      if (error) throw error;
      
      // العثور على معلومات الحالة المحدثة
      const statusInfo = callConfirmationStatuses.find(s => s.id === statusId);
      
      // تحديث حالة الطلب محلياً
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { 
            ...order, 
            call_confirmation_status_id: statusId,
            call_confirmation_notes: notes,
            call_confirmation_updated_at: new Date().toISOString(),
            call_confirmation_updated_by: user?.id || null,
            call_confirmation_status: statusInfo
          } : order
        )
      );
      
      // تحديث الطلبات المصفاة أيضاً
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { 
            ...order, 
            call_confirmation_status_id: statusId,
            call_confirmation_notes: notes,
            call_confirmation_updated_at: new Date().toISOString(),
            call_confirmation_updated_by: user?.id || null,
            call_confirmation_status: statusInfo
          } : order
        )
      );
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة تأكيد الإتصال للطلب بنجاح",
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء محاولة تحديث حالة تأكيد الإتصال للطلب، يرجى المحاولة مرة أخرى",
      });
    }
  }, [callConfirmationStatuses, currentOrganization?.id, hasUpdatePermission, toast, user?.id]);

  // دالة مساعدة لتحديد حقل التتبع المناسب
  const getTrackingField = (providerCode: string): string => {
    switch (providerCode) {
      case 'yalidine':
        return 'yalidine_tracking_id';
      case 'zrexpress':
        return 'zrexpress_tracking_id';
      case 'maystro':
        return 'maystro_tracking_id';
      default:
        // جميع شركات Ecotrack تستخدم نفس الحقل
        return 'ecotrack_tracking_id';
    }
  };

  // دالة مساعدة للحصول على اسم الشركة باللغة العربية
  const getProviderDisplayName = (providerCode: string): string => {
    const providerNames: { [key: string]: string } = {
      'yalidine': 'ياليدين',
      'zrexpress': 'زر إكسبرس',
      'maystro': 'مايسترو ديليفري',
      'ecotrack': 'إيكوتراك',
      'anderson_delivery': 'أندرسون ديليفري',
      'areex': 'أريكس',
      'ba_consult': 'بي إي كونسلت',
      'conexlog': 'كونكسلوغ',
      'coyote_express': 'كويوت إكسبرس',
      'dhd': 'دي إتش دي',
      'distazero': 'ديستازيرو',
      'e48hr_livraison': '48 ساعة',
      'fretdirect': 'فريت دايركت',
      'golivri': 'غو ليفري',
      'mono_hub': 'مونو هاب',
      'msm_go': 'إم إس إم غو',
      'imir_express': 'إمير إكسبرس',
      'packers': 'باكرز',
      'prest': 'بريست',
      'rb_livraison': 'آر بي ليفريزون',
      'rex_livraison': 'ريكس ليفريزون',
      'rocket_delivery': 'روكيت ديليفري',
      'salva_delivery': 'سالفا ديليفري',
      'speed_delivery': 'سبيد ديليفري',
      'tsl_express': 'تي إس إل إكسبرس',
      'worldexpress': 'ورلد إكسبرس'
    };
    
    return providerNames[providerCode] || providerCode;
  };

  // إرسال الطلب إلى مزود الشحن
  const handleSendToProvider = useCallback(async (orderId: string, providerCode: string) => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    const providerDisplayName = getProviderDisplayName(providerCode);
    
    try {
      toast({
        title: "جاري الإرسال...",
        description: `جاري إرسال الطلب إلى ${providerDisplayName}`,
      });

      const result = await sendOrderToShippingProvider(
        orderId, 
        providerCode, 
        currentOrganization.id
      );
      
      if (result.success) {
        // تحديد الحقل الصحيح للتتبع
        const trackingField = getTrackingField(providerCode);

        // تحديث الطلب محلياً
        const updateOrder = (order: any) => 
          order.id === orderId ? { 
            ...order, 
            [trackingField]: result.trackingNumber,
            shipping_provider: providerCode,
            status: 'processing'
          } : order;

        setOrders(prevOrders => prevOrders.map(updateOrder));
        setFilteredOrders(prevOrders => prevOrders.map(updateOrder));

        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال الطلب إلى ${providerDisplayName} برقم التتبع: ${result.trackingNumber}`,
          className: "bg-green-100 border-green-400 text-green-700",
        });
      } else {
        toast({
          variant: "destructive",
          title: "فشل في الإرسال",
          description: result.message || "حدث خطأ أثناء إرسال الطلب",
        });
      }
    } catch (error) {
      console.error('❌ [Orders] خطأ في إرسال الطلب:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الإرسال",
        description: `حدث خطأ أثناء محاولة إرسال الطلب إلى ${providerDisplayName}. يرجى المحاولة مرة أخرى.`,
      });
    }
  }, [currentOrganization?.id, hasUpdatePermission, toast]);

  // استرجاع الطلبات والإحصاءات عند تحميل الصفحة
  useEffect(() => {
    if (currentOrganization?.id && hasViewPermission && !permissionLoading) {
      fetchOrderCounts();
      fetchOrderStats();
      fetchOrders(0, 'all', '', null, null);
      fetchCallConfirmationStatuses();
    }
  }, [currentOrganization?.id, fetchOrderCounts, fetchOrderStats, fetchOrders, hasViewPermission, permissionLoading]);

  // تحديث الطلبات المصفاة عند تغيير الطلبات أو حالة التصفية
  useEffect(() => {
    if (orders.length > 0) {
      const filtered = filterStatus === 'all' 
        ? orders 
        : orders.filter(order => order.status === filterStatus);
      setFilteredOrders(filtered);
    }
  }, [orders, filterStatus]);

  // جذر الواجهة الرئيسية
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
        </div>
        
        {/* عرض رسالة الخطأ إذا لم يكن لديه صلاحية المشاهدة */}
        {!hasViewPermission && !permissionLoading && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>غير مصرح</AlertTitle>
            <AlertDescription>
              ليس لديك صلاحية لعرض صفحة الطلبات. يرجى التواصل مع مدير النظام.
            </AlertDescription>
          </Alert>
        )}
        
        {/* عرض رسالة التحميل أثناء التحقق من الصلاحيات */}
        {permissionLoading && (
          <div className="flex items-center justify-center w-full h-48">
            <Loader2 className="h-8 w-8 animate-spin ml-2" />
            <span>جاري التحميل...</span>
          </div>
        )}
        
        {/* عرض محتوى الصفحة إذا كان لديه صلاحية المشاهدة */}
        {hasViewPermission && !permissionLoading && (
          <Tabs defaultValue="table" className="space-y-4">
            <TabsContent value="table" className="space-y-4">
              {/* لوحة البيانات والإحصاءات */}
              <OrdersDashboard 
                orderCounts={orderCounts}
                orderStats={orderStats}
              />
              
              {/* مرشحات البحث المتقدمة */}
              <Card>
                <CardContent className="pt-6">
                  <OrdersAdvancedFilters
                    orderCounts={orderCounts}
                    onFilterChange={handleFilterChange}
                    activeStatus={filterStatus}
                    setActiveStatus={setFilterStatus}
                  />
                </CardContent>
              </Card>
              
              {/* جدول الطلبات */}
              {(() => {
                console.log("🔍 [Orders] البيانات المُمررة إلى OrdersTable:", filteredOrders?.slice(0, 2).map(order => ({
                  id: order.id,
                  customer_order_number: order.customer_order_number,
                  yalidine_tracking_id: order.yalidine_tracking_id,
                  zrexpress_tracking_id: order.zrexpress_tracking_id,
                  ecotrack_tracking_id: order.ecotrack_tracking_id
                })));
                return null;
              })()}
              <OrdersTable
                orders={filteredOrders}
                loading={loading}
                onUpdateStatus={updateOrderStatus}
                onUpdateCallConfirmation={updateOrderCallConfirmation}
                onSendToProvider={handleSendToProvider}
                onBulkUpdateStatus={bulkUpdateOrderStatus}
                hasUpdatePermission={hasUpdatePermission}
                hasCancelPermission={hasCancelPermission}
                visibleColumns={visibleColumns}
                currentUserId={user?.id}
                currentPage={currentPage + 1}
                totalItems={orderCounts.all}
                pageSize={pageSize}
                hasNextPage={currentPage + 1 < totalPages}
                hasPreviousPage={currentPage > 0}
                onPageChange={handlePageChange}
                hasMoreOrders={hasMoreOrders}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

// تطبيق Provider على المكون الرئيسي
const OrdersWithProvider = () => {
  return (
    <OrdersDataProvider>
      <Orders />
    </OrdersDataProvider>
  );
};

export default OrdersWithProvider;
