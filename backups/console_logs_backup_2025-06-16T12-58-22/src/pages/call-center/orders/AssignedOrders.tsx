import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
// تم إزالة Layout العادي لأن CallCenterLayout يتم استخدامه في App.tsx
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ShieldAlert, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  AlertTriangle,
  Phone,
  Users,
  User,
  RefreshCw,
  Filter,
  Download,
  PhoneCall,
  MessageSquare,
  UserCheck,
  Eye,
  X,
  MoreHorizontal,
  Edit,
  FileText,
  Calendar,
  MapPin,
  AlertCircle,
  Search
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkUserPermissions } from "@/lib/api/permissions";
import { supabase } from "@/lib/supabase";
import { 
  ORDER_STATUS_LABELS, 
  getOrderCustomerName,
  getOrderCustomerContact,
  getTrackingField,
  SHIPPING_PROVIDER_NAMES,
  formatCurrency
} from "@/utils/ordersHelpers";
import { useOrderAutoAssignment, useOrderRealTimeMonitoring } from "@/hooks/useOrderAutoAssignment";
import { OrdersDataProvider } from "@/context/OrdersDataContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CallCenterOrdersTable from "@/components/call-center/CallCenterOrdersTable";

// Lazy load heavy components
const OrdersTable = lazy(() => import("@/components/orders/table/OrdersTable"));
const OrdersTableMobile = lazy(() => import("@/components/orders/OrdersTableMobile"));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// نوع بيانات الطلب مع معلومات الوكيل
interface AssignedOrder {
  id: string;
  customer_order_number: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  organization_id: string;
  form_data?: any;
  assigned_agent_id?: string;
  agent_priority: number;
  call_attempts: number;
  last_call_attempt?: string;
  next_call_scheduled?: string;
  assignment_timestamp?: string;
  call_center_priority: number;
  call_center_notes?: string;
  call_confirmation_status_id?: number;
  call_confirmation_notes?: string;
  order_items?: any[];
  call_center_agents?: {
    id: string;
    users: {
      id: string;
      name: string;
      email: string;
    };
  };
  // بيانات العميل (يمكن أن يكون من customers أو guest_customers)
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  // عنوان الشحن
  shipping_address?: {
    id: string;
    name?: string;
    street_address?: string;
    municipality?: string;
    state?: string;
    phone?: string;
  };
  // حقول مساعدة للوصول السريع
  customerName?: string;
  customerContact?: string;
}

// إحصائيات الطلبيات المُكلفة
interface AssignedOrdersStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  total_value: number;
  avg_response_time: number;
}

const AssignedOrders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const { user, userProfile, refreshData } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AssignedOrdersStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    total_value: 0,
    avg_response_time: 0
  });
  
  // Permissions state
  const [permissions, setPermissions] = useState({
    view: false,
    update: false,
    cancel: false,
    loading: true,
  });

  // View preferences
  const [viewMode, setViewMode] = useState<'table' | 'mobile'>('table');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'checkbox', 'expand', 'id', 'customer_name', 'customer_contact', 
    'total', 'items', 'status', 'call_confirmation', 'agent', 
    'call_attempts', 'priority', 'actions'
  ]);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);

  // Auto-assignment hook - فقط للمديرين
  const { triggerAutoAssignment, isProcessing } = useOrderAutoAssignment({
    enabled: userProfile?.role !== 'call_center_agent', // تعطيل للوكلاء العاديين
    interval: 60000, // زيادة الفترة إلى 60 ثانية لتقليل التكرار
    onAssignment: (orderId, agentId) => {
      console.log(`Order ${orderId} assigned to agent ${agentId}`);
      // إعادة تحميل الطلبيات فقط إذا كان الطلب مُكلف للوكيل الحالي
      if (userProfile?.call_center_agent_id === agentId || userProfile?.role !== 'call_center_agent') {
        fetchOrders();
      }
    },
    onError: (error) => {
      console.error('Auto-assignment error:', error);
    }
  });

  // Real-time monitoring for new orders - فقط للمديرين
  useOrderRealTimeMonitoring(
    userProfile?.role !== 'call_center_agent' 
      ? (newOrder) => {
          console.log('New order received:', newOrder);
          // تشغيل التوزيع التلقائي فوراً عند وصول طلب جديد
          triggerAutoAssignment();
        }
      : undefined
  );

  // Check viewport size for responsive design
  useEffect(() => {
    const checkViewport = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'table');
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // تحديث البيانات عند تحميل الصفحة
  useEffect(() => {
    if (user && !userProfile?.call_center_agent_id && userProfile?.role === 'call_center_agent') {
      console.log('🔄 Refreshing user data because call_center_agent_id is missing');
      refreshData();
    }
  }, [user, userProfile, refreshData]);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setPermissions(prev => ({ ...prev, loading: false }));
        return;
      }
      
      try {
        // للوكلاء: السماح بعرض الطلبيات المُكلفة لهم
        const isCallCenterAgent = userProfile?.role === 'call_center_agent';
        
        if (isCallCenterAgent) {
          // وكلاء مركز الاتصال لديهم صلاحيات كاملة لطلبياتهم
          setPermissions({
            view: true,
            update: true,
            cancel: false,
            loading: false,
          });
        } else {
          // للمستخدمين الآخرين: التحقق من الصلاحيات العادية
          const canView = await checkUserPermissions(user, 'viewOrders' as any);
          const canUpdate = await checkUserPermissions(user, 'updateOrders' as any);
          const canCancel = await checkUserPermissions(user, 'cancelOrders' as any);
          
          setPermissions({
            view: canView,
            update: canUpdate,
            cancel: canCancel,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissions({
          view: false,
          update: false,
          cancel: false,
          loading: false,
        });
      }
    };

    checkPermissions();
  }, [user, userProfile]);

  // Load data on mount
  useEffect(() => {
    // للوكلاء: تحميل البيانات مباشرة
    const isCallCenterAgent = userProfile?.role === 'call_center_agent';
    if ((isCallCenterAgent || permissions.view) && !permissions.loading && currentOrganization?.id) {
      fetchOrders();
    }
  }, [permissions.view, permissions.loading, currentOrganization?.id, userProfile]);

  // دالة جلب الطلبيات (تغيير الاسم من fetchAssignedOrders)
  const fetchOrders = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    // للوكلاء: السماح بالوصول مباشرة
    const isCallCenterAgent = userProfile?.role === 'call_center_agent';
    if (!isCallCenterAgent && !permissions.view) return;

    try {
      setLoading(true);
      setError(null);

      // بناء الاستعلام الأساسي أولاً
      let query = (supabase as any)
        .from('online_orders')
        .select(`
          *,
          order_items:online_order_items(*),
          call_center_agents!online_orders_assigned_agent_id_fkey(
            id,
            users(id, name, email)
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .not('assigned_agent_id', 'is', null);

      // إذا كان المستخدم وكيل اتصال، عرض طلبياته فقط
      if (userProfile?.role === 'call_center_agent') {
        console.log('🔍 Filtering orders for call center agent:', {
          userProfileId: userProfile.id,
          call_center_agent_id: userProfile.call_center_agent_id
        });
        
        // استخدام معرف الوكيل من userProfile إذا كان متوفراً
        if (userProfile.call_center_agent_id) {
          console.log('✅ Using call_center_agent_id from userProfile:', userProfile.call_center_agent_id);
          query = query.eq('assigned_agent_id', userProfile.call_center_agent_id);
        } else {
          console.log('⚠️ call_center_agent_id not found in userProfile, fetching from database...');
          // جلب معرف الوكيل من جدول call_center_agents كبديل
          const { data: agentData, error: agentError } = await supabase
            .from('call_center_agents' as any)
            .select('id')
            .eq('user_id', userProfile.id)
            .single();
          
          console.log('📊 Agent data from database:', { agentData, agentError });
          
          if ((agentData as any)?.id) {
            console.log('✅ Using agent_id from database:', (agentData as any).id);
            query = query.eq('assigned_agent_id', (agentData as any).id);
          } else {
            console.log('❌ No agent data found for user:', userProfile.id);
          }
        }
      }

      const { data: ordersData, error: ordersError } = await query
        .order('assignment_timestamp', { ascending: false }) as any;

      if (ordersError) throw ordersError;

      // جلب بيانات العملاء والعناوين بشكل منفصل
      const orderIds = (ordersData || []).map((order: any) => order.id);
      const customerIds = (ordersData || []).map((order: any) => order.customer_id).filter(Boolean);
      const addressIds = (ordersData || []).map((order: any) => order.shipping_address_id).filter(Boolean);

      // جلب بيانات العملاء المسجلين (فقط إذا كان هناك معرفات)
      const { data: customersData } = customerIds.length > 0 ? await supabase
        .from('customers')
        .select('id, name, email, phone')
        .in('id', customerIds) : { data: [] };

      // جلب بيانات العملاء الضيوف (فقط إذا كان هناك معرفات)
      const { data: guestCustomersData } = customerIds.length > 0 ? await supabase
        .from('guest_customers')
        .select('id, name, phone')
        .in('id', customerIds) : { data: [] };

      // جلب بيانات العناوين (فقط إذا كان هناك معرفات)
      const { data: addressesData } = addressIds.length > 0 ? await supabase
        .from('addresses')
        .select('id, name, street_address, municipality, state, phone')
        .in('id', addressIds) : { data: [] };

      // معالجة البيانات لتحويلها إلى التنسيق المطلوب
      const processedOrders = (ordersData || []).map((order: any) => {
        // العثور على بيانات العميل
        const customer = customersData?.find(c => c.id === order.customer_id) ||
                        guestCustomersData?.find(gc => gc.id === order.customer_id) ||
                        null;

        // العثور على بيانات العنوان
        const address = addressesData?.find(a => a.id === order.shipping_address_id) || null;
        
        // معالجة form_data إذا كان string
        let formData = order.form_data;
        if (typeof formData === 'string') {
          try {
            formData = JSON.parse(formData);
          } catch (e) {
            formData = null;
          }
        }

        const processedOrder = {
          ...order,
          customer,
          shipping_address: address,
          form_data: formData,
          // إضافة helper functions للوصول السريع للبيانات
          customerName: customer?.name || 
                       formData?.fullName || 
                       formData?.name || 
                       getOrderCustomerName(order) ||
                       `عميل #${order.customer_order_number}`,
          customerContact: customer?.phone || 
                          formData?.phone || 
                          address?.phone || 
                          getOrderCustomerContact(order)
        };

        // تسجيل مؤقت للتشخيص
        console.log('🔍 Order processed:', {
          orderId: order.id,
          customer_order_number: order.customer_order_number,
          customer: customer,
          form_data: formData,
          customerName: processedOrder.customerName,
          customerContact: processedOrder.customerContact
        });

        return processedOrder;
      });

      setOrders(processedOrders as unknown as AssignedOrder[]);

      // حساب الإحصائيات
      const ordersStats = calculateStats((ordersData || []) as unknown as AssignedOrder[]);
      setStats(ordersStats);

    } catch (err: any) {
      console.error('Error fetching assigned orders:', err);
      setError('فشل في جلب الطلبيات المُكلفة');
      toast({
        title: "خطأ",
        description: "فشل في جلب الطلبيات المُكلفة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, permissions.view, toast, userProfile]);

  // Calculate statistics
  const calculateStats = (orders: AssignedOrder[]): AssignedOrdersStats => {
    const stats = {
      total: orders.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      total_value: 0,
      avg_response_time: 0
    };

    orders.forEach(order => {
      stats.total_value += parseFloat(order.total.toString());
      
      // تصنيف حسب حالة الاتصال
      if (order.call_attempts === 0) {
        stats.pending++;
      } else if (order.call_confirmation_status_id) {
        stats.completed++;
      } else if (order.call_attempts >= 3) {
        stats.failed++;
      } else {
        stats.in_progress++;
      }
    });

    return stats;
  };

  // Manual auto-assign function (for button click)
  const manualAutoAssign = useCallback(async () => {
    await triggerAutoAssignment();
  }, [triggerAutoAssignment]);

  // Update order status
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string, userId?: string) => {
    if (!permissions.update) {
      toast({
        title: "غير مسموح",
        description: "ليس لديك صلاحية لتحديث الطلبيات",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(userId && { employee_id: userId })
        })
        .eq('id', orderId);

      if (error) throw error;

      // تحديث الحالة المحلية
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب بنجاح",
      });

    } catch (err: any) {
      console.error('Error updating order status:', err);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  }, [permissions.update, toast]);

  // Update call confirmation
  const handleUpdateCallConfirmation = useCallback(async (
    orderId: string, 
    statusId: number, 
    notes?: string, 
    userId?: string
  ) => {
    if (!permissions.update) return;

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          call_confirmation_status_id: statusId,
          call_confirmation_notes: notes,
          call_confirmation_updated_at: new Date().toISOString(),
          call_confirmation_updated_by: userId || user?.id,
          call_attempts: (supabase as any).sql`call_attempts + 1`
        })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة تأكيد الاتصال",
      });

    } catch (err: any) {
      console.error('Error updating call confirmation:', err);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة تأكيد الاتصال",
        variant: "destructive",
      });
    }
  }, [permissions.update, user?.id, fetchOrders, toast]);

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchLower) ||
        (order.customer_order_number?.toString() || "").includes(searchLower) ||
        getOrderCustomerName(order as any).toLowerCase().includes(searchLower) ||
        getOrderCustomerContact(order as any).toLowerCase().includes(searchLower) ||
        order.status.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(paginatedOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Reset selections
  const resetSelections = () => {
    setSelectedOrders([]);
  };

  const handleResetSelections = () => {
    resetSelections();
  };

  // Bulk actions
  const handleBulkUpdateStatus = async (orderIds: string[], newStatus: string) => {
    try {
      // Implement bulk status update
      toast({
        title: "تم تحديث الطلبيات",
        description: `تم تحديث ${orderIds.length} طلبية بنجاح`,
      });
      resetSelections();
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث الطلبيات",
        variant: "destructive",
      });
    }
  };

  // Page navigation
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    resetSelections();
  };

  // دوال التفاعل مع الطلبيات
  const handleViewOrder = (orderId: string) => {
    // التنقل إلى صفحة تفاصيل الطلبية
    console.log('عرض الطلبية:', orderId);
  };

  const handleCallCustomer = (phone: string) => {
    // فتح تطبيق الهاتف أو نظام الاتصال
    if (phone && phone !== 'لا توجد بيانات اتصال') {
      window.open(`tel:${phone}`, '_self');
    }
  };

  // دوال مساعدة للحالة
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-call-center-success text-white';
      case 'pending':
        return 'bg-call-center-warning text-white';
      case 'processing':
        return 'bg-call-center-info text-white';
      case 'cancelled':
        return 'bg-call-center-error text-white';
      default:
        return 'bg-call-center-foreground-muted text-white';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'processing':
        return 'قيد المعالجة';
      case 'completed':
        return 'مكتملة';
      case 'cancelled':
        return 'ملغية';
      default:
        return status;
    }
  };

  // دالة تنسيق التاريخ
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-MA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'تاريخ غير صحيح';
    }
  };

  // إذا لم يكن هناك مستخدم مسجل دخول
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مسموح</AlertTitle>
          <AlertDescription>
            يجب تسجيل الدخول أولاً
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // للوكلاء: السماح بالوصول مباشرة، للآخرين: التحقق من الصلاحيات
  if (!permissions.view) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مسموح</AlertTitle>
          <AlertDescription>
            ليس لديك صلاحية لعرض الطلبيات المُكلفة
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <OrdersDataProvider>
      <div className="space-y-6 p-6">
        {/* Header with enhanced stats - تصميم محسن مطابق للطلبيات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="call-center-glass border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-call-center-foreground-muted">إجمالي الطلبيات</p>
                  <p className="text-3xl font-bold text-call-center-foreground bg-gradient-to-r from-call-center-primary to-call-center-accent bg-clip-text text-transparent">
                    {stats.total}
                  </p>
                  <p className="text-xs text-call-center-foreground-muted">
                    {stats.total > 0 ? `+${((stats.completed / stats.total) * 100).toFixed(1)}% مكتملة` : 'لا توجد طلبيات'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-call-center-primary/10 group-hover:bg-call-center-primary/20 transition-colors duration-300">
                  <Package className="h-8 w-8 text-call-center-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="call-center-glass border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-call-center-foreground-muted">قيد المعالجة</p>
                  <p className="text-3xl font-bold text-call-center-foreground">
                    {stats.in_progress}
                  </p>
                  <p className="text-xs text-call-center-foreground-muted">
                    {stats.total > 0 ? `${((stats.in_progress / stats.total) * 100).toFixed(1)}% من الإجمالي` : 'لا توجد'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors duration-300">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="call-center-glass border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-call-center-foreground-muted">مكتملة</p>
                  <p className="text-3xl font-bold text-call-center-foreground">
                    {stats.completed}
                  </p>
                  <p className="text-xs text-call-center-foreground-muted">
                    {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% معدل الإنجاز` : 'لا توجد'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors duration-300">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="call-center-glass border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-call-center-foreground-muted">إجمالي القيمة</p>
                  <p className="text-3xl font-bold text-call-center-foreground font-mono">
                    {stats.total_value.toLocaleString()} د.م.
                  </p>
                  <p className="text-xs text-call-center-foreground-muted">
                    {stats.total > 0 ? `${(stats.total_value / stats.total).toFixed(0)} د.م. متوسط الطلب` : 'لا توجد قيمة'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-call-center-accent/10 group-hover:bg-call-center-accent/20 transition-colors duration-300">
                  <DollarSign className="h-8 w-8 text-call-center-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Search and filters - تصميم محسن مطابق للطلبيات الرئيسية */}
        <div className="rounded-lg border border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center lg:justify-between">
              {/* Enhanced Search */}
              <div className="relative flex items-center w-full lg:w-80">
                <Search className="absolute left-3 h-4 w-4 text-call-center-foreground-muted" />
                <Input
                  type="search"
                  placeholder="البحث في الطلبيات..."
                  className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-call-center-border bg-call-center-bg/50 backdrop-blur-sm focus:border-call-center-primary/50 focus:ring-2 focus:ring-call-center-primary/20 transition-all duration-200 text-call-center-foreground placeholder:text-call-center-foreground-muted"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Enhanced Filters and actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {selectedOrders.length > 0 && (
                  <div className="bg-call-center-primary/10 border border-call-center-primary/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm">
                    <span className="font-semibold text-call-center-primary">{selectedOrders.length}</span>
                    <span className="text-call-center-primary/80">طلب محدد</span>
                  </div>
                )}
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200">
                    <SelectValue placeholder="حالة الطلب" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm">
                    <SelectItem value="all" className="call-center-hover">جميع الحالات</SelectItem>
                    <SelectItem value="pending" className="call-center-hover">معلق</SelectItem>
                    <SelectItem value="processing" className="call-center-hover">قيد المعالجة</SelectItem>
                    <SelectItem value="completed" className="call-center-hover">مكتمل</SelectItem>
                    <SelectItem value="cancelled" className="call-center-hover">ملغي</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200">
                  <Filter className="h-4 w-4" />
                  <span>تصفية متقدمة</span>
                </Button>
                
                <Button variant="outline" size="sm" className="gap-2 px-4 py-2 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200">
                  <Download className="h-4 w-4" />
                  <span>تصدير البيانات</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOrders}
                  disabled={loading}
                  className="gap-2 px-4 py-2 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'جاري التحديث...' : 'تحديث'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Orders Table - جدول محسن مطابق للطلبيات الرئيسية */}
        {error ? (
          <div className="rounded-lg border border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden">
            <div className="p-12 text-center">
              <div className="p-4 rounded-full bg-red-500/10 mb-6 inline-block">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-call-center-foreground">خطأ في تحميل البيانات</h3>
              <p className="text-call-center-foreground-muted mb-6 max-w-md mx-auto">{error}</p>
              <Button 
                onClick={fetchOrders} 
                className="gap-2 px-6 py-3 rounded-lg bg-call-center-primary hover:bg-call-center-primary/90 text-white transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        ) : (
          <CallCenterOrdersTable
            orders={filteredOrders}
            selectedOrders={selectedOrders}
            expandedOrders={expandedOrders}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            loading={loading}
            onSelectAll={handleSelectAll}
            onSelectOrder={handleSelectOrder}
            onToggleExpand={handleToggleExpand}
            onPageChange={handlePageChange}
            onViewOrder={handleViewOrder}
            onCallCustomer={handleCallCustomer}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onResetSelections={resetSelections}
            getStatusVariant={getStatusVariant}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            formatDate={formatDate}
          />
        )}

        {/* Enhanced Empty state - حالة فارغة محسنة */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-lg border border-call-center-border/30 bg-call-center-bg/50 backdrop-blur-sm overflow-hidden">
            <div className="p-12 text-center">
              <div className="p-4 rounded-full bg-call-center-bg-muted/20 mb-6 inline-block">
                <Package className="h-12 w-12 opacity-40 text-call-center-foreground-muted" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-call-center-foreground">لا توجد طلبيات</h3>
              <p className="text-call-center-foreground-muted max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'لم يتم العثور على طلبيات تطابق معايير البحث والتصفية المحددة.'
                  : 'لم يتم تكليفك بأي طلبيات بعد. ستظهر الطلبيات المُكلفة لك هنا.'
                }
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <div className="mt-6 flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="gap-2 px-4 py-2 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200"
                  >
                    مسح البحث
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setStatusFilter('all')}
                    className="gap-2 px-4 py-2 rounded-lg border-call-center-border/40 bg-call-center-bg/50 backdrop-blur-sm hover:bg-call-center-accent/50 hover:border-call-center-primary/30 transition-all duration-200"
                  >
                    إظهار جميع الحالات
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OrdersDataProvider>
  );
};

export default AssignedOrders; 