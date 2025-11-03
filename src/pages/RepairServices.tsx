import React, { useState, useEffect, useCallback } from 'react';
// import { supabase } from '@/lib/supabase';
import { 
  listLocalRepairOrders,
  listLocalRepairLocations,
  changeLocalRepairStatus,
  addLocalRepairPayment,
  getLocalRepairOrderDetailed,
  deleteLocalRepairOrder
} from '@/api/localRepairService';
import { useUser } from '../context/UserContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

// إضافة POSDataProvider
import { POSDataProvider } from '@/context/POSDataContext';

// مكونات واجهة المستخدم
import Layout from '@/components/Layout';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
 } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { 
  Wrench, 
  PlusCircle, 
  Filter, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit2, 
  DollarSign, 
  Trash2, 
  FileText, 
  Printer, 
  Share2,
  Loader2,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  X,
  SlidersHorizontal,
  Smartphone,
  MapPin
} from 'lucide-react';

import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import { ShareRepairDialog } from '@/components/repair/ShareRepairDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';
import { buildTrackingUrl } from '@/lib/utils/store-url';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

// تعريف واجهات البيانات
interface RepairLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  is_default?: boolean;
  is_active?: boolean;
}

interface RepairOrder {
  id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  device_type?: string;
  repair_location_id?: string;
  custom_location?: string;
  issue_description?: string;
  status: string;
  total_price: number;
  paid_amount: number;
  price_to_be_determined_later?: boolean;
  received_by: string;
  received_by_name?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: string;
  repair_notes?: string;
  repair_tracking_code?: string;
  organization_id: string;
  images?: RepairImage[];
  history?: RepairHistory[];
  repair_location?: RepairLocation;
  staff?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface RepairImage {
  id: string;
  repair_order_id: string;
  image_url: string;
  image_type: 'before' | 'after';
  description?: string;
  created_at: string;
}

interface RepairHistory {
  id: string;
  repair_order_id: string;
  status: string;
  notes?: string;
  created_by: string;
  created_at: string;
  users?: {
    name: string;
  };
}

interface StatusCounts {
  pending: number;
  'in-progress': number;
  waiting_for_customer: number;
  'waiting-for-parts': number;
  completed: number;
  cancelled: number;
  delivered: number;
}

const statusColors: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  'جاري التصليح': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  'مكتمل': 'bg-green-100 text-green-800 hover:bg-green-200',
  'ملغي': 'bg-red-100 text-red-800 hover:bg-red-200',
  'معلق': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  'تم الاستلام': 'bg-teal-100 text-teal-800 hover:bg-teal-200',
};

// تعريف حالات الطلبية
const statusOptions = [
  { value: 'قيد الانتظار', label: 'قيد الانتظار' },
  { value: 'جاري التصليح', label: 'جاري التصليح' },
  { value: 'مكتمل', label: 'مكتمل' },
  { value: 'معلق', label: 'معلق' },
  { value: 'ملغي', label: 'ملغي' },
  { value: 'تم الاستلام', label: 'تم الاستلام' },
];

// مكون صفحة خدمات التصليح الرئيسي
interface RepairServicesContentProps extends POSSharedLayoutControls {}

const RepairServicesContent: React.FC<RepairServicesContentProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { user, organizationId } = useUser();
  const { currentOrganization } = useTenant();
  
  // حالة الصفحة
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<RepairOrder[]>([]);
  
  // حالة الفلترة المتقدمة
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'phone' | 'order' | 'device'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');
  
  // بيانات للفلترة
  const [repairLocations, setRepairLocations] = useState<RepairLocation[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  
  // حالة نوافذ العمل
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<{ orderId: string, trackingCode: string } | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  
  // حالة نافذة تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<RepairOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // الإحصائيات
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
  
  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      // Local-first: load from IndexedDB
      const [ordersRaw, locationsRaw] = await Promise.all([
        listLocalRepairOrders(organizationId),
        listLocalRepairLocations(organizationId)
      ]);
      const locMap = new Map<string, any>();
      for (const l of locationsRaw) locMap.set(l.id, l);
      const typedData: RepairOrder[] = ordersRaw.map((o: any) => ({
        ...o,
        total_price: (o.total_price ?? 0) as number,
        repair_location: o.repair_location_id ? locMap.get(o.repair_location_id) : undefined,
      }));
      setRepairOrders(typedData);

      const uniqueDeviceTypes = [...new Set(
        typedData
          .map(order => order.device_type)
          .filter((type): type is string => !!type && type.trim() !== '' && type !== 'غير محدد')
      )].sort();
      setDeviceTypes(uniqueDeviceTypes);

      const statusCounts = {
        total: typedData.length,
        pending: typedData.filter(order => order.status === 'قيد الانتظار').length,
        inProgress: typedData.filter(order => order.status === 'جاري التصليح').length,
        completed: typedData.filter(order => order.status === 'مكتمل').length,
        cancelled: typedData.filter(order => order.status === 'ملغي').length,
      };
      setStats(statusCounts);
      setRepairLocations(locationsRaw as any);
    } catch (error) {
      toast.error('فشل في جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // جلب طلبيات التصليح وبيانات الفلترة
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // تصفية الطلبيات المتقدمة
  useEffect(() => {
    let filtered = [...repairOrders];
    
    // تصفية حسب التبويب
    if (activeTab !== 'all') {
      const statusMap: Record<string, string> = {
        'pending': 'قيد الانتظار',
        'inProgress': 'جاري التصليح',
        'completed': 'مكتمل',
        'cancelled': 'ملغي',
      };
      
      filtered = filtered.filter(order => order.status === statusMap[activeTab]);
    }
    
    // تصفية حسب مكان التصليح
    if (selectedLocation !== 'all') {
      if (selectedLocation === 'custom') {
        filtered = filtered.filter(order => order.custom_location && !order.repair_location_id);
      } else {
        filtered = filtered.filter(order => order.repair_location_id === selectedLocation);
      }
    }
    
    // تصفية حسب نوع الجهاز
    if (selectedDeviceType !== 'all') {
      filtered = filtered.filter(order => order.device_type === selectedDeviceType);
    }
    
    // تصفية حسب البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      switch (searchType) {
        case 'name':
          filtered = filtered.filter(order => 
            order.customer_name.toLowerCase().includes(query)
          );
          break;
        case 'phone':
          filtered = filtered.filter(order => 
            order.customer_phone.includes(query)
          );
          break;
        case 'order':
          filtered = filtered.filter(order => 
            (order.order_number && order.order_number.toLowerCase().includes(query)) ||
            (order.repair_tracking_code && order.repair_tracking_code.toLowerCase().includes(query))
          );
          break;
        case 'device':
          filtered = filtered.filter(order => 
            order.device_type && order.device_type.toLowerCase().includes(query)
          );
          break;
        default: // 'all'
          filtered = filtered.filter(order => 
            order.customer_name.toLowerCase().includes(query) ||
            order.customer_phone.includes(query) ||
            (order.order_number && order.order_number.toLowerCase().includes(query)) ||
            (order.repair_tracking_code && order.repair_tracking_code.toLowerCase().includes(query)) ||
            (order.device_type && order.device_type.toLowerCase().includes(query)) ||
            (order.repair_location?.name && order.repair_location.name.toLowerCase().includes(query)) ||
            (order.custom_location && order.custom_location.toLowerCase().includes(query))
          );
      }
    }
    
    // ترتيب النتائج
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.total_price - b.total_price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.total_price - a.total_price);
        break;
      default: // 'newest'
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    setFilteredOrders(filtered);
  }, [repairOrders, activeTab, searchQuery, selectedLocation, selectedDeviceType, searchType, sortBy]);
  
  // دالة إعادة تعيين الفلاتر
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('all');
    setSelectedDeviceType('all');
    setSearchType('all');
    setSortBy('newest');
    setActiveTab('all');
  };
  
  // عدد الفلاتر النشطة
  const activeFiltersCount = [
    searchQuery !== '',
    selectedLocation !== 'all',
    selectedDeviceType !== 'all',
    searchType !== 'all',
    sortBy !== 'newest',
    activeTab !== 'all'
  ].filter(Boolean).length;
  
  // التعامل مع إضافة طلبية جديدة
  const handleAddSuccess = async (orderId: string, trackingCode: string) => {
    try {
      const data = await getLocalRepairOrderDetailed(orderId);
      if (data) {
        const typedData = data as unknown as RepairOrder;
        setRepairOrders([typedData, ...repairOrders]);
        setStats(prev => ({ ...prev, total: prev.total + 1, pending: typedData.status === 'قيد الانتظار' ? prev.pending + 1 : prev.pending }));
        setSelectedOrder(typedData);
        calculateQueuePosition(typedData);
        setIsPrintDialogOpen(true);
      }
      toast.success('تم إضافة طلبية التصليح بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة الطلبية');
    }
  };
  
  // التعامل مع نجاح التعديل
  const handleEditSuccess = async () => {
    try {
      await fetchData();
      toast.success('تم تحديث طلبية التصليح بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  };
  
  // مشاركة رابط التتبع
  const shareTrackingLink = () => {
    if (!trackingInfo) return;
    
    const trackingUrl = buildTrackingUrl(trackingInfo.trackingCode, currentOrganization);
    
    // نسخ الرابط إلى الحافظة
    navigator.clipboard.writeText(trackingUrl)
      .then(() => {
        toast.success('تم نسخ رابط التتبع إلى الحافظة');
      })
      .catch(() => {
        toast.error('فشل في نسخ الرابط');
      });
  };
  
  // التعامل مع عرض تفاصيل طلبية
  const handleViewOrder = (order: RepairOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
    // حساب ترتيب الطابور
    calculateQueuePosition(order);
  };
  
  // التعامل مع تعديل طلبية
  const handleEditOrder = (order: RepairOrder) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  // حساب ترتيب الطلبية في الجدول
  const calculateQueuePosition = (order: RepairOrder) => {
    // البحث عن ترتيب الطلبية في قائمة الطلبيات المفلترة
    const orderIndex = filteredOrders.findIndex(o => o.id === order.id);
    const position = orderIndex >= 0 ? orderIndex + 1 : 0;

    setQueuePosition(position);
  };
  
  // تحديث حالة طلبية التصليح
  const updateOrderStatus = async (orderId: string, newStatus: string, notes: string = '') => {
    try {
      await changeLocalRepairStatus(orderId, newStatus, notes, user?.id);
      // 3. تحديث الحالة في الواجهة
      if (selectedOrder && selectedOrder.id === orderId) {
        // إنشاء نسخة جديدة من التاريخ
        const newHistoryEntry = {
          id: `temp-${Date.now()}`,
          repair_order_id: orderId,
          status: newStatus,
          notes: notes,
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          users: {
            name: user?.name || 'المستخدم الحالي'
          }
        };
        
        // تحديث حالة الطلبية المحددة
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus,
          history: selectedOrder.history ? 
            [newHistoryEntry, ...selectedOrder.history] : 
            [newHistoryEntry]
        });
      }
      
      // 4. تحديث قائمة الطلبيات
      setRepairOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      toast.success(`تم تحديث حالة الطلبية إلى "${newStatus}" بنجاح`);
      return true;
    } catch (error: any) {
      toast.error(`فشل في تحديث حالة الطلبية: ${error.message}`);
      return false;
    }
  };
  
  // تسجيل دفعة جديدة
  const handleAddPayment = async (orderId: string, amount: number) => {
    if (!amount || amount <= 0 || !orderId) {
      toast.error('يرجى إدخال مبلغ صحيح للدفعة');
      return false;
    }
    
    try {
      setIsProcessingPayment(true);
      await addLocalRepairPayment(orderId, amount, user?.id);
      // الحصول على المبلغ الجديد من الحالة المحلية
      const current = repairOrders.find(o => o.id === orderId);
      const newPaidAmount = (current?.paid_amount || 0) + amount;
      
      // تحديث واجهة المستخدم
      // 1. تحديث الطلبية المحددة إذا كانت هي نفسها
      if (selectedOrder && selectedOrder.id === orderId) {
        const newHistoryEntry = {
          id: `temp-${Date.now()}`,
          repair_order_id: orderId,
          status: 'دفعة جديدة',
          notes: `تم استلام دفعة بمبلغ ${amount.toLocaleString()} دج. المبلغ الإجمالي المدفوع: ${newPaidAmount.toLocaleString()} دج`,
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          users: {
            name: user?.name || 'المستخدم الحالي'
          }
        };
        
        setSelectedOrder({
          ...selectedOrder,
          paid_amount: newPaidAmount,
          history: selectedOrder.history ? 
            [newHistoryEntry, ...selectedOrder.history] : 
            [newHistoryEntry]
        });
      }
      
      // 2. تحديث قائمة الطلبيات
      setRepairOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? 
          { ...order, paid_amount: newPaidAmount } : 
          order
        )
      );
      
      toast.success(`تم تسجيل دفعة بمبلغ ${amount.toLocaleString()} دج بنجاح`);
      setPaymentAmount(0);
      return true;
    } catch (error: any) {
      toast.error(`فشل في تسجيل الدفعة: ${error.message}`);
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  // تنسيق التاريخ والوقت
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };
  
  // حذف طلبية التصليح
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // حذف محلي (سيتم مزامنة الحذف لاحقاً)
      await deleteLocalRepairOrder(orderToDelete.id);
      
      // 3. تحديث القائمة والإحصائيات
      setRepairOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderToDelete.id)
      );
      
      // تحديث الإحصائيات
      setStats(prev => {
        const newStats = { ...prev };
        newStats.total -= 1;
        
        // تحديث الإحصائية حسب حالة الطلبية المحذوفة
        switch (orderToDelete.status) {
          case 'قيد الانتظار':
            newStats.pending -= 1;
            break;
          case 'جاري التصليح':
            newStats.inProgress -= 1;
            break;
          case 'مكتمل':
            newStats.completed -= 1;
            break;
          case 'ملغي':
            newStats.cancelled -= 1;
            break;
        }
        
        return newStats;
      });
      
      // إغلاق النوافذ
      setIsDeleteDialogOpen(false);
      setIsViewDialogOpen(false);
      setOrderToDelete(null);
      setSelectedOrder(null);
      
      toast.success('تم حذف طلبية التصليح بنجاح');
    } catch (error: any) {
      toast.error(`فشل في حذف الطلبية: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  // تسجيل زر التحديث في شريط العنوان
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => fetchData());
      return () => onRegisterRefresh(null);
    }
  }, [onRegisterRefresh, fetchData]);

  // إرسال حالة الصفحة للعنوان (تحميل/اتصال)
  useEffect(() => {
    const state: POSLayoutState = {
      isRefreshing: Boolean(isLoading),
      connectionStatus: 'connected',
      executionTime: undefined
    };
    if (onLayoutStateChange) onLayoutStateChange(state);
  }, [onLayoutStateChange, isLoading]);

  const pageContent = (
    <>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wrench className="h-7 w-7" />
              خدمات التصليح
            </h1>
            <p className="text-muted-foreground">
              إدارة طلبيات التصليح وتتبع حالتها
            </p>
          </div>
          
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            طلبية تصليح جديدة
          </Button>
        </div>
        
        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبيات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">جاري التصليح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">مكتمل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ملغي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* شريط التبويب والبحث */}
        <div className="bg-card rounded-md shadow-sm border">
          <div className="flex flex-col gap-4 p-4">
            {/* التبويبات */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
                <TabsTrigger value="pending">قيد الانتظار ({stats.pending})</TabsTrigger>
                <TabsTrigger value="inProgress">جاري التصليح ({stats.inProgress})</TabsTrigger>
                <TabsTrigger value="completed">مكتمل ({stats.completed})</TabsTrigger>
                <TabsTrigger value="cancelled">ملغي ({stats.cancelled})</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* شريط البحث والفلاتر */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* البحث */}
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      searchType === 'name' ? "البحث بالاسم..." :
                      searchType === 'phone' ? "البحث برقم الهاتف..." :
                      searchType === 'order' ? "البحث برقم الطلبية..." :
                      searchType === 'device' ? "البحث بنوع الجهاز..." :
                      "البحث في جميع الحقول..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                  />
                </div>
                
                <Select value={searchType} onValueChange={(value) => setSearchType(value as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحقول</SelectItem>
                    <SelectItem value="name">الاسم</SelectItem>
                    <SelectItem value="phone">رقم الهاتف</SelectItem>
                    <SelectItem value="order">رقم الطلبية</SelectItem>
                    <SelectItem value="device">نوع الجهاز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* الفلاتر والترتيب */}
              <div className="flex gap-2">
                <Button
                  variant={isAdvancedFilterOpen ? "default" : "outline"}
                  onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  فلاتر متقدمة
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      ترتيب
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('newest')}>
                      الأحدث أولاً
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                      الأقدم أولاً
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('price_asc')}>
                      السعر (تصاعدي)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('price_desc')}>
                      السعر (تنازلي)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" onClick={resetFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    إعادة تعيين
                  </Button>
                )}
              </div>
            </div>
            
            {/* الفلاتر المتقدمة */}
            {isAdvancedFilterOpen && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* فلتر مكان التصليح */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      مكان التصليح
                    </Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مكان التصليح" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأماكن</SelectItem>
                        <SelectItem value="custom">أماكن مخصصة</SelectItem>
                        {repairLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* فلتر نوع الجهاز */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      نوع الجهاز
                    </Label>
                    <Select value={selectedDeviceType} onValueChange={setSelectedDeviceType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الجهاز" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأجهزة</SelectItem>
                        {deviceTypes.map((deviceType) => (
                          <SelectItem key={deviceType} value={deviceType}>
                            {deviceType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* إحصائيات سريعة */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">النتائج المفلترة</Label>
                    <div className="text-2xl font-bold text-primary">
                      {filteredOrders.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      من أصل {repairOrders.length} طلبية
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* جدول طلبيات التصليح */}
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Wrench className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">لا توجد طلبيات تصليح</h3>
                <p className="text-muted-foreground mb-4">لم يتم العثور على طلبيات تصليح تطابق معايير البحث</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  إضافة طلبية جديدة
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلبية</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>نوع الجهاز</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>مكان التصليح</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>المدفوع</TableHead>
                    <TableHead>تاريخ الاستلام</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium" onClick={() => handleViewOrder(order)}>
                        <div className="flex flex-col">
                          <span>{order.order_number || order.id.slice(0, 8)}</span>
                          {order.repair_tracking_code && (
                            <span className="text-xs text-muted-foreground">
                              {order.repair_tracking_code}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        {order.device_type ? (
                          <Badge variant="outline" className="gap-1">
                            <Smartphone className="h-3 w-3" />
                            {order.device_type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">غير محدد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto">
                              <Badge className={`${statusColors[order.status] || 'bg-secondary'} cursor-pointer`}>
                                {order.status}
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Badge>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {statusOptions.map((status) => (
                              <DropdownMenuItem
                                key={status.value}
                                disabled={order.status === status.value}
                                onClick={() => updateOrderStatus(order.id, status.value)}
                              >
                                <div className={`w-2 h-2 rounded-full ${statusColors[status.value]?.split(' ')?.[0] || 'bg-gray-200'} mr-2`} />
                                {status.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {order.repair_location ? order.repair_location.name : order.custom_location || 'غير محدد'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        {order.price_to_be_determined_later ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                            يحدد لاحقاً
                          </Badge>
                        ) : (
                          <span className="font-medium">{order.total_price.toLocaleString()} دج</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        {order.price_to_be_determined_later ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className="font-medium">{order.paid_amount.toLocaleString()} دج</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm" onClick={() => handleViewOrder(order)}>
                        {formatDateTime(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(order);
                              }}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                تعديل الطلبية
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setPaymentAmount(0);
                                  setIsPaymentDialogOpen(true);
                                }}
                                disabled={order.price_to_be_determined_later}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                تسجيل دفعة
                                {order.price_to_be_determined_later && (
                                  <span className="text-xs text-muted-foreground mr-2">(السعر غير محدد)</span>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                calculateQueuePosition(order);
                                setIsPrintDialogOpen(true);
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                طباعة إيصال
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setTrackingInfo({
                                  orderId: order.id,
                                  trackingCode: order.repair_tracking_code || order.order_number || order.id
                                });
                                setIsShareDialogOpen(true);
                              }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                مشاركة التتبع
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                حذف الطلبية
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
      
      {/* نافذة مشاركة رابط التتبع */}
      <ShareRepairDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        trackingCode={trackingInfo?.trackingCode || ''}
        orderId={trackingInfo?.orderId || ''}
      />

      {/* نافذة إضافة طلبية جديدة */}
      <RepairServiceDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* نافذة تعديل طلبية */}
      <RepairServiceDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={() => {
          handleEditSuccess();
          setIsEditDialogOpen(false);
        }}
        editMode={true}
        repairOrder={selectedOrder}
      />
      
      {/* نافذة عرض تفاصيل طلبية التصليح */}
      {selectedOrder && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-4xl overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Wrench className="h-5 w-5" />
                تفاصيل طلبية التصليح
              </DialogTitle>
              <DialogDescription>
                رقم الطلبية: {selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 p-1">
                {/* بطاقة معلومات الطلبية */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>معلومات الطلبية</CardTitle>
                      <Badge className={statusColors[selectedOrder.status] || 'bg-secondary'}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">تاريخ الاستلام</div>
                        <div>{formatDateTime(selectedOrder.created_at)}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">الموظف المستلم</div>
                        <div>
                          {selectedOrder.staff?.name ? (
                            <div>
                              <div className="font-medium">{selectedOrder.staff.name}</div>
                              {selectedOrder.staff.email && (
                                <div className="text-sm text-muted-foreground">{selectedOrder.staff.email}</div>
                              )}
                              {selectedOrder.staff.phone && (
                                <div className="text-sm text-muted-foreground">هاتف: {selectedOrder.staff.phone}</div>
                              )}
                            </div>
                          ) : selectedOrder.received_by_name ? (
                            <div className="font-medium">{selectedOrder.received_by_name}</div>
                          ) : (
                            <div className="text-muted-foreground">غير محدد</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">نوع الجهاز</div>
                        <div>
                          {selectedOrder.device_type ? (
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{selectedOrder.device_type}</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">غير محدد</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">مكان التصليح</div>
                        <div>
                          {selectedOrder.repair_location ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{selectedOrder.repair_location.name}</span>
                              </div>
                              {selectedOrder.repair_location.description && (
                                <div className="text-sm text-muted-foreground ml-6">{selectedOrder.repair_location.description}</div>
                              )}
                              {selectedOrder.repair_location.address && (
                                <div className="text-sm text-muted-foreground ml-6">{selectedOrder.repair_location.address}</div>
                              )}
                              {selectedOrder.repair_location.phone && (
                                <div className="text-sm text-muted-foreground ml-6">هاتف: {selectedOrder.repair_location.phone}</div>
                              )}
                            </div>
                          ) : selectedOrder.custom_location ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{selectedOrder.custom_location}</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">غير محدد</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">رمز التتبع</div>
                        <div>
                          {selectedOrder.repair_tracking_code ? (
                            <div className="font-medium">{selectedOrder.repair_tracking_code}</div>
                          ) : selectedOrder.order_number ? (
                            <div className="font-medium">{selectedOrder.order_number}</div>
                          ) : (
                            <div className="text-muted-foreground">غير متاح</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {selectedOrder.issue_description && (
                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground mb-1">وصف العطل</div>
                        <p>{selectedOrder.issue_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* بطاقة معلومات العميل */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>معلومات العميل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">اسم العميل</div>
                        <div className="font-medium">{selectedOrder.customer_name}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">رقم الهاتف</div>
                        <div className="font-medium">{selectedOrder.customer_phone}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* بطاقة معلومات الدفع */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>معلومات الدفع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.price_to_be_determined_later ? (
                      <div className="text-center py-6">
                        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <div>
                            <div className="font-medium text-amber-800">السعر يحدد لاحقاً</div>
                            <div className="text-sm text-amber-600">سيتم تحديد السعر بعد فحص الجهاز</div>
                          </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          طريقة الدفع: {selectedOrder.payment_method || 'نقدًا'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">المبلغ الكلي</div>
                            <div className="font-medium">{selectedOrder.total_price.toLocaleString()} دج</div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">المبلغ المدفوع</div>
                            <div className="font-medium">{selectedOrder.paid_amount.toLocaleString()} دج</div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">المبلغ المتبقي</div>
                            <div className="font-medium">{(selectedOrder.total_price - selectedOrder.paid_amount).toLocaleString()} دج</div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-sm text-muted-foreground">طريقة الدفع</div>
                          <div>{selectedOrder.payment_method || 'نقدًا'}</div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* صور الجهاز */}
                {selectedOrder.images && selectedOrder.images.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>صور الجهاز</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedOrder.images.map(image => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.image_url}
                              alt={image.description || 'صورة الجهاز'}
                              className="aspect-square object-cover rounded-md"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                              <div className="text-white text-center p-2">
                                <div className="text-xs">
                                  {image.image_type === 'before' ? 'قبل التصليح' : 'بعد التصليح'}
                                </div>
                                {image.description && (
                                  <div className="text-sm mt-1">{image.description}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* سجل التغييرات */}
                {selectedOrder.history && selectedOrder.history.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>سجل التغييرات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedOrder.history.map(entry => (
                          <div key={entry.id} className="border-b pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={statusColors[entry.status] || 'bg-secondary'}>
                                {entry.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(entry.created_at)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-sm">
                                <span className="text-muted-foreground">بواسطة: </span>
                                {entry.users?.name || 'غير معروف'}
                              </div>
                            </div>
                            {entry.notes && (
                              <div className="mt-2 text-sm bg-muted p-2 rounded-md">
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="gap-1" onClick={() => {
                  if (selectedOrder) {
                    calculateQueuePosition(selectedOrder);
                  }
                  setIsPrintDialogOpen(true);
                }}>
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-1"
                  onClick={() => {
                    if (selectedOrder) {
                      setTrackingInfo({
                        orderId: selectedOrder.id, 
                        trackingCode: selectedOrder.repair_tracking_code || selectedOrder.order_number || selectedOrder.id
                      });
                      setIsShareDialogOpen(true);
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </Button>
                
                {/* قائمة تغيير الحالة */}
                <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-1">
                        <RefreshCw className="h-4 w-4" />
                        تغيير الحالة
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>اختر الحالة الجديدة</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {statusOptions.map((status) => (
                        <DropdownMenuItem
                          key={status.value}
                          disabled={selectedOrder?.status === status.value}
                          onClick={() => {
                            if (selectedOrder) {
                              updateOrderStatus(selectedOrder.id, status.value);
                            }
                          }}
                        >
                          <div className={`w-2 h-2 rounded-full ${statusColors[status.value]?.split(' ')?.[0] || 'bg-gray-200'} mr-2`} />
                          {status.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  className="gap-1"
                  onClick={() => {
                    setOrderToDelete(selectedOrder);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
                <Button variant="secondary" className="gap-1" onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditOrder(selectedOrder);
                }}>
                  <Edit2 className="h-4 w-4" />
                  تعديل
                </Button>
                <Button 
                  className="gap-1" 
                  disabled={selectedOrder?.price_to_be_determined_later}
                  onClick={() => {
                    if (selectedOrder) {
                      setPaymentAmount(0);
                      setIsPaymentDialogOpen(true);
                    }
                  }}
                >
                  <DollarSign className="h-4 w-4" />
                  {selectedOrder?.price_to_be_determined_later ? 'السعر غير محدد' : 'تسجيل دفعة'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* نافذة إدخال دفعة جديدة */}
      {selectedOrder && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تسجيل دفعة جديدة
              </DialogTitle>
              <DialogDescription>
                رقم الطلبية: {selectedOrder.order_number || selectedOrder.id.slice(0, 8)} | {selectedOrder.customer_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedOrder.price_to_be_determined_later ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-medium text-amber-800">السعر يحدد لاحقاً</div>
                      <div className="text-sm text-amber-600">يجب تحديد السعر أولاً قبل تسجيل الدفعات</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    يرجى تعديل الطلبية وتحديد السعر الكلي أولاً، ثم العودة لتسجيل الدفعة.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>السعر الكلي</Label>
                      <div className="p-2 bg-muted rounded-md font-medium">
                        {selectedOrder.total_price.toLocaleString()} دج
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>المبلغ المدفوع سابقاً</Label>
                      <div className="p-2 bg-muted rounded-md font-medium">
                        {selectedOrder.paid_amount.toLocaleString()} دج
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>المبلغ المتبقي</Label>
                    <div className="p-2 bg-muted rounded-md font-medium text-primary">
                      {(selectedOrder.total_price - selectedOrder.paid_amount).toLocaleString()} دج
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">مبلغ الدفعة الجديدة</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      min="0"
                      max={selectedOrder.total_price - selectedOrder.paid_amount}
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      placeholder="أدخل مبلغ الدفعة..."
                      className="text-left ltr"
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={isProcessingPayment}
              >
                إلغاء
              </Button>
              {selectedOrder.price_to_be_determined_later ? (
                <Button
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    handleEditOrder(selectedOrder);
                  }}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  تعديل الطلبية
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    if (selectedOrder) {
                      const success = await handleAddPayment(selectedOrder.id, paymentAmount);
                      if (success) setIsPaymentDialogOpen(false);
                    }
                  }}
                  disabled={
                    isProcessingPayment || 
                    !paymentAmount || 
                    paymentAmount <= 0 || 
                    paymentAmount > (selectedOrder.total_price - selectedOrder.paid_amount)
                  }
                  className="gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ المعالجة...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      تسجيل الدفعة
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* نافذة طباعة الوصل المحسنة */}
      {selectedOrder && (
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                طباعة وصل التصليح
              </DialogTitle>
              <DialogDescription>
                رقم الطلبية: {selectedOrder.order_number || selectedOrder.id.slice(0, 8)} | {selectedOrder.customer_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* معاينة الوصل */}
                <div className="order-2 lg:order-1">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>👁️</span>
                    معاينة الوصل
                  </h3>
                  <div className="border rounded-md p-2 bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="transform scale-90 origin-top-right flex justify-center">
                      <RepairOrderPrint order={selectedOrder} queuePosition={queuePosition} />
                    </div>
                  </div>
                </div>

                {/* معلومات الطباعة */}
                <div className="order-1 lg:order-2">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>📋</span>
                    محتويات الوصل
                  </h3>
                  <div className="space-y-3">
                    {/* إيصال العميل */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
                        <span>🧾</span>
                        إيصال العميل
                      </h4>
                      <ul className="text-xs space-y-1 text-blue-700 mr-4">
                        <li>• معلومات المتجر والعميل</li>
                        <li>• تفاصيل العطل والدفع</li>
                        <li>• رمز QR للتتبع</li>
                        <li>• شروط الخدمة</li>
                      </ul>
                    </div>

                    {/* لصقة الجهاز */}
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-yellow-800 mb-2 flex items-center gap-2">
                        <span>🏷️</span>
                        لصقة الجهاز
                      </h4>
                      <ul className="text-xs space-y-1 text-yellow-700 mr-4">
                        <li>• رقم الطلبية بارز</li>
                        <li>• معلومات العميل المختصرة</li>
                        <li>• QR للتتبع والإنهاء</li>
                        <li>• مساحة لملاحظات الفني</li>
                        <li className="font-bold">• رقم الترتيب: {queuePosition || 'غير محدد'}</li>
                      </ul>
                    </div>

                    {/* نصائح الطباعة */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-green-800 mb-2 flex items-center gap-2">
                        <span>💡</span>
                        نصائح الطباعة
                      </h4>
                      <ul className="text-xs space-y-1 text-green-700 mr-4">
                        <li>• استخدم ورق حراري عرض 80mm</li>
                        <li>• تأكد من وضوح رموز QR</li>
                        <li>• اقطع عند الخط المتقطع</li>
                        <li>• الصق الجزء السفلي على الجهاز</li>
                      </ul>
                    </div>

                    {/* إحصائيات سريعة */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
                        <span>📊</span>
                        ملخص الطلبية
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">الحالة:</span>
                          <span className="font-bold mr-1">{selectedOrder.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">التاريخ:</span>
                          <span className="font-bold mr-1">{new Date(selectedOrder.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        {!selectedOrder.price_to_be_determined_later && (
                          <>
                            <div>
                              <span className="text-gray-600">المبلغ:</span>
                              <span className="font-bold mr-1">{selectedOrder.total_price.toLocaleString()} دج</span>
                            </div>
                            <div>
                              <span className="text-gray-600">المدفوع:</span>
                              <span className="font-bold mr-1 text-green-600">{selectedOrder.paid_amount.toLocaleString()} دج</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
                         <DialogFooter className="gap-2">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPrintDialogOpen(false)}
                >
                  إغلاق
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      const trackingCode = selectedOrder.repair_tracking_code || selectedOrder.order_number || selectedOrder.id;
                      setTrackingInfo({
                        orderId: selectedOrder.id, 
                        trackingCode: trackingCode
                      });
                      setIsShareDialogOpen(true);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    مشاركة رابط التتبع
                  </Button>
                  <RepairOrderPrint order={selectedOrder} queuePosition={queuePosition} />
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* نافذة تأكيد الحذف */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف طلبية التصليح
            </DialogTitle>
            <DialogDescription>
              {orderToDelete && (
                <>
                  رقم الطلبية: {orderToDelete.order_number || orderToDelete.id.slice(0, 8)} | 
                  العميل: {orderToDelete.customer_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              هل أنت متأكد من حذف هذه الطلبية؟ سيتم حذف:
            </p>
            <ul className="text-sm space-y-2 list-disc list-inside mr-4 text-red-600">
              <li>جميع بيانات الطلبية</li>
              <li>صور الجهاز المرفقة</li>
              <li>سجل التغييرات والحالات</li>
              <li>معلومات الدفعات المسجلة</li>
            </ul>
            <p className="text-sm font-medium text-red-600 mt-4">
              ⚠️ لا يمكن التراجع عن هذا الإجراء!
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setOrderToDelete(null);
              }}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  تأكيد الحذف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return renderWithLayout(pageContent);
};

// المكون الرئيسي مع POSDataProvider
const RepairServices: React.FC<RepairServicesContentProps> = (props) => {
  const perms = usePermissions();
  const unauthorizedNode = (
    <Layout>
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى خدمات التصليح.</AlertDescription>
        </Alert>
      </div>
    </Layout>
  );

  if (perms.ready && !perms.anyOf(['viewServices','manageServices'])) {
    return unauthorizedNode;
  }

  return (
    <POSDataProvider>
      <RepairServicesContent {...props} />
    </POSDataProvider>
  );
};

export default RepairServices;
