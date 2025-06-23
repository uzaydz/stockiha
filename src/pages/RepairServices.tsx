import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

// إضافة POSDataProvider
import { POSDataProvider } from '@/context/POSDataContext';

// مكونات واجهة المستخدم
import Layout from '@/components/Layout';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  AlertTriangle
} from 'lucide-react';

import RepairServiceDialog from '@/components/repair/RepairServiceDialog';
import { ShareRepairDialog } from '@/components/repair/ShareRepairDialog';
import RepairOrderPrint from '@/components/repair/RepairOrderPrint';

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
const RepairServicesContent = () => {
  const { user, organizationId } = useUser();
  
  // حالة الصفحة
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<RepairOrder[]>([]);
  
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
  
  // جلب طلبيات التصليح
  useEffect(() => {
    const fetchRepairOrders = async () => {
      if (!organizationId) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('repair_orders')
          .select(`
            *,
            images:repair_images(*),
            history:repair_status_history(*, users(name)),
            repair_location:repair_locations(id, name, description, address, phone),
            staff:users(id, name, email, phone)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data) {
          // تحويل البيانات إلى نوع RepairOrder
          const typedData = data as unknown as RepairOrder[];
          setRepairOrders(typedData);
          
          // حساب الإحصائيات
          const statusCounts = {
            total: typedData.length,
            pending: typedData.filter(order => order.status === 'قيد الانتظار').length,
            inProgress: typedData.filter(order => order.status === 'جاري التصليح').length,
            completed: typedData.filter(order => order.status === 'مكتمل').length,
            cancelled: typedData.filter(order => order.status === 'ملغي').length,
          };
          
          setStats(statusCounts);
        } else {
          setRepairOrders([]);
        }
      } catch (error) {
        toast.error('فشل في جلب طلبيات التصليح');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRepairOrders();
  }, [supabase, organizationId]);
  
  // تصفية الطلبيات حسب التبويب والبحث
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
    
    // تصفية حسب البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone.includes(query) ||
        (order.order_number && order.order_number.toLowerCase().includes(query)) ||
        (order.repair_tracking_code && order.repair_tracking_code.toLowerCase().includes(query))
      );
    }
    
    setFilteredOrders(filtered);
  }, [repairOrders, activeTab, searchQuery]);
  
  // التعامل مع إضافة طلبية جديدة
  const handleAddSuccess = async (orderId: string, trackingCode: string) => {
    try {
      // تخزين معلومات التتبع للمشاركة
      setTrackingInfo({ orderId, trackingCode });
      setIsShareDialogOpen(true);
      
      // جلب الطلبية الجديدة
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          images:repair_images(*),
          history:repair_status_history(*, users(name)),
          repair_location:repair_locations(id, name, description, address, phone),
          staff:users(id, name, email, phone)
        `)
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      
      // إضافة الطلبية إلى القائمة
      if (data) {
        const typedData = data as unknown as RepairOrder;
        setRepairOrders([typedData, ...repairOrders]);
        
        // تحديث الإحصائيات أيضًا
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pending: typedData.status === 'قيد الانتظار' ? prev.pending + 1 : prev.pending,
        }));
      }
      
      toast.success('تم إضافة طلبية التصليح بنجاح');
    } catch (error) {
    }
  };
  
  // التعامل مع نجاح التعديل
  const handleEditSuccess = async () => {
    try {
      if (!organizationId) return;
      
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          images:repair_images(*),
          history:repair_status_history(*, users(name)),
          repair_location:repair_locations(id, name, description, address, phone),
          staff:users(id, name, email, phone)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const typedData = data as unknown as RepairOrder[];
        setRepairOrders(typedData);
        
        // إعادة حساب الإحصائيات
        const statusCounts = {
          total: typedData.length,
          pending: typedData.filter(order => order.status === 'قيد الانتظار').length,
          inProgress: typedData.filter(order => order.status === 'جاري التصليح').length,
          completed: typedData.filter(order => order.status === 'مكتمل').length,
          cancelled: typedData.filter(order => order.status === 'ملغي').length,
        };
        
        setStats(statusCounts);
      }
      
      toast.success('تم تحديث طلبية التصليح بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  };
  
  // مشاركة رابط التتبع
  const shareTrackingLink = () => {
    if (!trackingInfo) return;
    
    const trackingUrl = `${window.location.origin}/repair-tracking/${trackingInfo.trackingCode}`;
    
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
  };
  
  // التعامل مع تعديل طلبية
  const handleEditOrder = (order: RepairOrder) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };
  
  // تحديث حالة طلبية التصليح
  const updateOrderStatus = async (orderId: string, newStatus: string, notes: string = '') => {
    try {
      // 1. تحديث حالة الطلبية
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'مكتمل' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
      // 2. إضافة سجل جديد في تاريخ الحالة
      const historyEntry = {
        repair_order_id: orderId,
        status: newStatus,
        notes: notes,
        created_by: user?.id, // تم التحديث بواسطة المستخدم الحالي
      };
      
      const { error: historyError } = await supabase
        .from('repair_status_history')
        .insert(historyEntry);
        
      if (historyError) throw historyError;
      
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
      
      // الحصول على الطلبية الحالية
      const { data: orderData, error: orderError } = await supabase
        .from('repair_orders')
        .select('paid_amount, total_price')
        .eq('id', orderId)
        .single();
        
      if (orderError) throw orderError;
      
      // التحقق من أن المبلغ المدفوع لا يتجاوز السعر الكلي
      const currentPaid = orderData.paid_amount || 0;
      const newPaidAmount = currentPaid + amount;
      
      if (newPaidAmount > orderData.total_price) {
        toast.error('مبلغ الدفعة يتجاوز المبلغ المتبقي');
        return false;
      }
      
      // تحديث الطلبية بالمبلغ المدفوع الجديد
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update({ 
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
      // إضافة سجل للدفعة
      const historyEntry = {
        repair_order_id: orderId,
        status: 'دفعة جديدة',
        notes: `تم استلام دفعة بمبلغ ${amount.toLocaleString()} دج. المبلغ الإجمالي المدفوع: ${newPaidAmount.toLocaleString()} دج`,
        created_by: user?.id,
      };
      
      const { error: historyError } = await supabase
        .from('repair_status_history')
        .insert(historyEntry);
        
      if (historyError) throw historyError;
      
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
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };
  
  // حذف طلبية التصليح
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // 1. حذف صور الطلبية من التخزين
      if (orderToDelete.images && orderToDelete.images.length > 0) {
        const imagePromises = orderToDelete.images.map(async (image) => {
          // استخراج مسار الملف من URL
          const urlParts = image.image_url.split('/');
          const filePath = `repair_images/${orderToDelete.id}/${urlParts[urlParts.length - 1]}`;
          
          // حذف الصورة من التخزين
          const { error } = await supabase.storage
            .from('repair_images')
            .remove([filePath]);
            
          if (error) {
            console.error('خطأ في حذف الصورة:', error);
          }
        });
        
        await Promise.all(imagePromises);
      }
      
      // 2. حذف الطلبية من قاعدة البيانات (سيتم حذف البيانات المرتبطة تلقائياً)
      const { error } = await supabase
        .from('repair_orders')
        .delete()
        .eq('id', orderToDelete.id);
        
      if (error) {
        throw error;
      }
      
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


  
  return (
    <Layout>
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
        <div className="bg-card rounded-md shadow-sm border p-2">
          <div className="flex flex-col md:flex-row justify-between gap-4 p-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                <TabsTrigger value="inProgress">جاري التصليح</TabsTrigger>
                <TabsTrigger value="completed">مكتمل</TabsTrigger>
                <TabsTrigger value="cancelled">ملغي</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 w-full md:w-[250px]"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    الأحدث أولاً
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    الأقدم أولاً
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    السعر (تصاعدي)
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    السعر (تنازلي)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                        {order.order_number || order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        <div>
                          <div>{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                        </div>
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
                        {order.repair_location ? order.repair_location.name : order.custom_location || 'غير محدد'}
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        {order.price_to_be_determined_later ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                            يحدد لاحقاً
                          </Badge>
                        ) : (
                          `${order.total_price.toLocaleString()} دج`
                        )}
                      </TableCell>
                      <TableCell onClick={() => handleViewOrder(order)}>
                        {order.price_to_be_determined_later ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          `${order.paid_amount.toLocaleString()} دج`
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
                        <div className="text-sm text-muted-foreground">مكان التصليح</div>
                        <div>
                          {selectedOrder.repair_location ? (
                            <div>
                              <div className="font-medium">{selectedOrder.repair_location.name}</div>
                              {selectedOrder.repair_location.description && (
                                <div className="text-sm text-muted-foreground">{selectedOrder.repair_location.description}</div>
                              )}
                              {selectedOrder.repair_location.address && (
                                <div className="text-sm text-muted-foreground">{selectedOrder.repair_location.address}</div>
                              )}
                              {selectedOrder.repair_location.phone && (
                                <div className="text-sm text-muted-foreground">هاتف: {selectedOrder.repair_location.phone}</div>
                              )}
                            </div>
                          ) : selectedOrder.custom_location ? (
                            <div className="font-medium">{selectedOrder.custom_location}</div>
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
                <Button variant="outline" className="gap-1" onClick={() => setIsPrintDialogOpen(true)}>
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

      {/* نافذة طباعة الوصل */}
      {selectedOrder && (
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="sm:max-w-md">
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
              <p className="text-sm text-muted-foreground mb-4">
                ستتم طباعة وصل بالمعلومات التالية:
              </p>
              <ul className="text-sm space-y-2 list-disc list-inside mr-4 mb-4">
                <li>معلومات العميل والمتجر</li>
                <li>تفاصيل الجهاز والعطل</li>
                <li>المبلغ المدفوع والمتبقي</li>
                <li>رمز QR لتتبع الطلبية</li>
                <li>شروط الخدمة</li>
              </ul>

              <div className="border rounded-md p-3 bg-muted/30">
                <RepairOrderPrint order={selectedOrder} />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsPrintDialogOpen(false)}
              >
                إغلاق
              </Button>
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
    </Layout>
  );
};

// المكون الرئيسي مع POSDataProvider
const RepairServices = () => {
  return (
    <POSDataProvider>
      <RepairServicesContent />
    </POSDataProvider>
  );
};

export default RepairServices;
