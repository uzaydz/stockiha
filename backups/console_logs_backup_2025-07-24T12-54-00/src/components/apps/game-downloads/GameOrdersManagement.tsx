import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit, CheckCircle, XCircle, Clock, Package, Truck, Download, FileText, Printer, QrCode, CreditCard, RotateCcw, Trash2, User, Phone, Mail, GamepadIcon, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { useTenant } from '@/context/TenantContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import GameOrderReceiptPrint from './GameOrderReceiptPrint';
import { buildStoreUrl } from '@/lib/utils/store-url';

interface GameOrder {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[];
  assigned_to?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  game?: {
    name: string;
    platform: string;
  };
  assigned_user?: {
    name: string;
  };
}

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500' },
  { value: 'processing', label: 'قيد المعالجة', color: 'bg-blue-500' },
  { value: 'ready', label: 'جاهز للتسليم', color: 'bg-purple-500' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-500' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-500' },
];

const paymentStatusOptions = [
  { value: 'unpaid', label: 'غير مدفوع', color: 'text-red-600' },
  { value: 'partial', label: 'مدفوع جزئياً', color: 'text-yellow-600' },
  { value: 'paid', label: 'مدفوع', color: 'text-green-600' },
];

export default function GameOrdersManagement() {
  const { organizationId, user } = useUser();
  const { currentOrganization } = useTenant();
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<GameOrder | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  
  // حالات التعديل والحذف
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCustomerInfo, setEditingCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [editingOrderInfo, setEditingOrderInfo] = useState({
    game_id: '',
    device_type: '',
    device_specs: '',
    notes: '',
    price: 0
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  // دالة مساعدة لإدارة حالة معالجة الإجراءات
  const setActionProcessing = (actionId: string, isProcessing: boolean) => {
    setProcessingActions(prev => {
      const newSet = new Set(prev);
      if (isProcessing) {
        newSet.add(actionId);
      } else {
        newSet.delete(actionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (organizationId) {
      fetchOrders();
    }
  }, [organizationId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('game_download_orders')
        .select(`
          *,
          game:games_catalog(name, platform),
          assigned_user:users!assigned_to(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders((data as any) || []);
    } catch (error: any) {
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus || !user?.id) return;

    try {
      setUpdatingStatus(true);

      // إنشاء سجل الحالة الجديد
      const statusEntry = {
        from_status: selectedOrder.status,
        to_status: newStatus,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        notes: statusNotes || `تحديث إلى: ${statusOptions.find(opt => opt.value === newStatus)?.label}`
      };

      // تحديث الطلب مع إضافة السجل
      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          status: newStatus,
          status_history: [...(selectedOrder.status_history || []), statusEntry],
          updated_at: new Date().toISOString(),
          // تحديث الحقول الخاصة بالحالة
          processing_started_at: newStatus === 'processing' && !selectedOrder.processing_started_at 
            ? new Date().toISOString() 
            : selectedOrder.processing_started_at,
          completed_at: newStatus === 'delivered' 
            ? new Date().toISOString() 
            : selectedOrder.completed_at,
          cancelled_at: newStatus === 'cancelled' 
            ? new Date().toISOString() 
            : selectedOrder.cancelled_at,
          cancellation_reason: newStatus === 'cancelled' 
            ? statusNotes || `تحديث إلى: ${statusOptions.find(opt => opt.value === newStatus)?.label}` 
            : selectedOrder.cancellation_reason
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      const statusLabel = statusOptions.find(opt => opt.value === newStatus)?.label;
      toast.success('تم تحديث حالة الطلب بنجاح', {
        description: `تم تغيير حالة الطلب رقم ${selectedOrder.tracking_number} إلى: ${statusLabel}`,
        duration: 4000,
      });
      setShowStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNotes('');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // تحديث الحالة مباشرة من الجدول
  const handleQuickStatusUpdate = async (order: GameOrder, newStatus: string) => {
    if (!user?.id) return;

    try {
      // إنشاء سجل الحالة الجديد
      const statusEntry = {
        from_status: order.status,
        to_status: newStatus,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        notes: `تحديث سريع إلى: ${statusOptions.find(opt => opt.value === newStatus)?.label}`
      };

      // تحديث الطلب مع إضافة السجل
      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          status: newStatus,
          status_history: [...(order.status_history || []), statusEntry],
          updated_at: new Date().toISOString(),
          // تحديث الحقول الخاصة بالحالة
          processing_started_at: newStatus === 'processing' && !order.processing_started_at 
            ? new Date().toISOString() 
            : order.processing_started_at,
          completed_at: newStatus === 'delivered' 
            ? new Date().toISOString() 
            : order.completed_at,
          cancelled_at: newStatus === 'cancelled' 
            ? new Date().toISOString() 
            : order.cancelled_at,
          cancellation_reason: newStatus === 'cancelled' 
            ? `تحديث سريع إلى: ${statusOptions.find(opt => opt.value === newStatus)?.label}` 
            : order.cancellation_reason
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('تم تحديث حالة الطلب بنجاح');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث حالة الطلب: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  // دفع المبلغ كاملاً
  const handleFullPayment = async (order: GameOrder) => {
    if (!user?.id) return;

    const actionId = `payment-${order.id}`;
    setActionProcessing(actionId, true);

    try {
      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          amount_paid: order.price,
          payment_status: 'paid',
          payment_method: 'نقدي',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('تم تسجيل الدفع الكامل بنجاح', {
        description: `تم تسجيل دفع ${order.price} دج للطلب رقم ${order.tracking_number}`,
        duration: 4000,
      });
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تسجيل الدفع');
    } finally {
      setActionProcessing(actionId, false);
    }
  };

  // تحديث حالة الدفع السريع
  const handleQuickPaymentStatusUpdate = async (order: GameOrder, newPaymentStatus: string) => {
    if (!user?.id) return;

    try {
      let newAmountPaid = order.amount_paid;
      
      // تحديد المبلغ المدفوع حسب الحالة الجديدة
      if (newPaymentStatus === 'paid') {
        newAmountPaid = order.price;
      } else if (newPaymentStatus === 'unpaid') {
        newAmountPaid = 0;
      }
      // إذا كانت partial، نترك المبلغ كما هو

      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          payment_status: newPaymentStatus,
          amount_paid: newAmountPaid,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('تم تحديث حالة الدفع بنجاح');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث حالة الدفع: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  // تعديل الدفع المخصص
  const handleCustomPayment = async () => {
    if (!selectedOrder || paymentAmount <= 0) return;

    try {
      const newAmountPaid = Math.min(paymentAmount, selectedOrder.price);
      const newPaymentStatus = newAmountPaid >= selectedOrder.price ? 'paid' : 
                              newAmountPaid > 0 ? 'partial' : 'unpaid';

      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          amount_paid: newAmountPaid,
          payment_status: newPaymentStatus,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('تم تحديث معلومات الدفع بنجاح');
      setShowPaymentDialog(false);
      setSelectedOrder(null);
      setPaymentAmount(0);
      setPaymentMethod('نقدي');
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث معلومات الدفع');
    }
  };

  // تعديل معلومات العميل
  const handleEditCustomer = (order: GameOrder) => {
    setSelectedOrder(order);
    setEditingCustomerInfo({
      name: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email || ''
    });
    setShowEditCustomerDialog(true);
  };

  const handleUpdateCustomerInfo = async () => {
    if (!selectedOrder) return;

    try {
      setIsUpdating(true);

      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          customer_name: editingCustomerInfo.name,
          customer_phone: editingCustomerInfo.phone,
          customer_email: editingCustomerInfo.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('تم تحديث معلومات العميل بنجاح', {
        description: `تم تحديث معلومات ${editingCustomerInfo.name}`,
        duration: 4000,
      });
      setShowEditCustomerDialog(false);
      setSelectedOrder(null);
      setEditingCustomerInfo({ name: '', phone: '', email: '' });
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث معلومات العميل');
    } finally {
      setIsUpdating(false);
    }
  };

  // تعديل معلومات الطلبية
  const handleEditOrder = async (order: GameOrder) => {
    setSelectedOrder(order);
    
    // جلب قائمة الألعاب المتاحة
    try {
      const { data: games } = await (supabase as any)
        .from('games_catalog')
        .select('id, name, platform, price')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      setAvailableGames(games || []);
      
      setEditingOrderInfo({
        game_id: order.game_id,
        device_type: order.device_type || '',
        device_specs: order.device_specs || '',
        notes: order.notes || '',
        price: order.price
      });
      setShowEditOrderDialog(true);
    } catch (error: any) {
      toast.error('فشل في تحميل قائمة الألعاب');
    }
  };

  const handleUpdateOrderInfo = async () => {
    if (!selectedOrder) return;

    try {
      setIsUpdating(true);

      const { error } = await (supabase as any)
        .from('game_download_orders')
        .update({
          game_id: editingOrderInfo.game_id,
          device_type: editingOrderInfo.device_type || null,
          device_specs: editingOrderInfo.device_specs || null,
          notes: editingOrderInfo.notes || null,
          price: editingOrderInfo.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('تم تحديث معلومات الطلبية بنجاح', {
        description: `تم تحديث الطلب رقم ${selectedOrder.tracking_number}`,
        duration: 4000,
      });
      setShowEditOrderDialog(false);
      setSelectedOrder(null);
      setEditingOrderInfo({ game_id: '', device_type: '', device_specs: '', notes: '', price: 0 });
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في تحديث معلومات الطلبية');
    } finally {
      setIsUpdating(false);
    }
  };

  // حذف الطلبية
  const handleDeleteOrder = (order: GameOrder) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const confirmDeleteOrder = async () => {
    if (!selectedOrder) return;

    try {
      setIsUpdating(true);

      const { error } = await (supabase as any)
        .from('game_download_orders')
        .delete()
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success('تم حذف الطلبية بنجاح', {
        description: `تم حذف الطلب رقم ${selectedOrder.tracking_number}`,
        duration: 4000,
      });
      setShowDeleteDialog(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error('فشل في حذف الطلبية');
    } finally {
      setIsUpdating(false);
    }
  };

  // حساب موقع الطلب في الطابور
  const getQueuePosition = async (orderId: string) => {
    try {
          const { data: currentOrder, error: currentOrderError } = await (supabase as any)
      .from('game_download_orders')
        .select('created_at, status, organization_id')
        .eq('id', orderId)
        .single();
        
      if (currentOrderError || !currentOrder) return 0;
      
      if (currentOrder.status === 'delivered' || currentOrder.status === 'cancelled') {
        return 0;
      }
      
          const { data: ordersBeforeMe, error: beforeError } = await (supabase as any)
      .from('game_download_orders')
        .select('id')
        .eq('organization_id', currentOrder.organization_id)
        .in('status', ['pending', 'processing'])
        .lt('created_at', currentOrder.created_at);
        
          const { data: totalActiveOrders, error: totalError } = await (supabase as any)
      .from('game_download_orders')
        .select('id, created_at')
        .eq('organization_id', currentOrder.organization_id)
        .in('status', ['pending', 'processing']);
        
      if (beforeError || totalError) return 0;
      
      const totalInQueue = totalActiveOrders?.length || 0;
      const ordersAfterMe = totalActiveOrders?.filter(order => {
        return new Date(order.created_at) > new Date(currentOrder.created_at);
      }) || [];
      
      return Math.max(1, totalInQueue - ordersAfterMe.length);
    } catch (error) {
      return 0;
    }
  };

  const printAdvancedReceipt = async () => {
    if (!selectedOrder) return;

    // حساب موقع الطلب في الطابور
    const position = await getQueuePosition(selectedOrder.id);
    setQueuePosition(position);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // إنشاء مكون الطباعة
    const receiptComponent = React.createElement(GameOrderReceiptPrint, {
      order: selectedOrder as any,
      storeName: currentOrganization?.name || 'متجر الألعاب',
      storePhone: (currentOrganization as any)?.contact_phone,
      storeAddress: (currentOrganization as any)?.address,
      storeLogo: currentOrganization?.logo_url,
      queuePosition: position
    });

    // تحويل المكون إلى HTML
    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>وصل طلب تحميل الألعاب</title>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/qrcode.react@3.1.0/lib/index.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { 
          font-family: 'Tajawal', Arial, sans-serif; 
          margin: 0; 
          padding: 10px; 
          background: white;
          color: black;
          direction: rtl;
        }
        
        /* إعدادات الطباعة المحسنة */
        @media print {
          @page {
            size: auto;
            margin: 0;
            padding: 0;
          }
          
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .no-print { 
            display: none !important; 
            visibility: hidden !important;
          }
          
          .receipt-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 2mm !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
          
          /* تحسين الخطوط للطباعة */
          * {
            font-family: 'Tajawal', Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        
        /* إعدادات للطابعات الحرارية */
        @media print and (max-width: 80mm) {
          .receipt-container {
            width: 76mm !important;
            max-width: 76mm !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
          }
        }
        
        /* إعدادات للطابعات العادية */
        @media print and (min-width: 80mm) {
          .receipt-container {
            width: 210mm !important;
            max-width: 210mm !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
          }
        }
      </style>
    </head>
    <body>
      <div id="receipt-container"></div>
      <div class="no-print" style="text-align: center; margin-top: 20px; page-break-before: always;">
        <button onclick="window.print()" style="
          background: #007bff; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
          margin-left: 10px;
          font-family: 'Tajawal', Arial, sans-serif;
        ">🖨️ طباعة الوصل</button>
        <button onclick="window.close()" style="
          background: #6c757d; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
          font-family: 'Tajawal', Arial, sans-serif;
        ">❌ إغلاق</button>
      </div>
      
      <script>
        // تشغيل الطباعة تلقائياً بعد التحميل
        window.onload = function() {
          // إضافة محتوى الوصل مباشرة
          document.getElementById('receipt-container').innerHTML = \`${getReceiptHTML()}\`;
          
          // إضافة أنماط إضافية للطباعة
          const printStyles = document.createElement('style');
          printStyles.textContent = \`
            @media print {
              /* إخفاء كل شيء ما عدا الوصل */
              body * {
                visibility: hidden !important;
              }
              
              .receipt-container, .receipt-container * {
                visibility: visible !important;
              }
              
              .receipt-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: visible !important;
              }
              
              /* تحسين الصور والألوان */
              img, svg, canvas {
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          \`;
          document.head.appendChild(printStyles);
          
          // إضافة مستمع للطباعة
          window.addEventListener('beforeprint', function() {
          });
          
          window.addEventListener('afterprint', function() {
          });
        };
      </script>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // دالة لإنشاء HTML الوصل
  const getReceiptHTML = () => {
    if (!selectedOrder) return '';

    // بناء رابط المتجر
    const storeUrl = buildStoreUrl(currentOrganization);

    // استخراج تفاصيل الألعاب
    const extractGamesFromNotes = () => {
      if (!selectedOrder.notes || !selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
        return [{
          name: selectedOrder.game?.name || 'لعبة غير محددة',
          platform: selectedOrder.game?.platform || 'منصة غير محددة',
          quantity: 1,
          price: selectedOrder.price || 0
        }];
      }

      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
      if (!gamesSection) return [];

      const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
      return gameLines.map(line => {
        const gameName = line.replace('•', '').split('(')[0].trim();
        const platform = line.match(/\(([^)]+)\)/)?.[1] || 'غير محدد';
        const quantity = parseInt(line.match(/الكمية: (\d+)/)?.[1] || '1');
        const price = parseInt(line.match(/السعر: ([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
        
        return { name: gameName, platform, quantity, price };
      });
    };

    const gamesList = extractGamesFromNotes();
    const storeName = currentOrganization?.name || 'متجر الألعاب';
    const storePhone = (currentOrganization as any)?.contact_phone;
    const storeAddress = (currentOrganization as any)?.address;
    const remainingAmount = (selectedOrder.price || 0) - (selectedOrder.amount_paid || 0);

    return `
      <div class="receipt-container" style="font-family: 'Tajawal', Arial, sans-serif; width: 76mm; margin: 0 auto; text-align: center; direction: rtl; background: white; color: black; padding: 4mm; box-sizing: border-box; overflow: visible;">
        <!-- رأس الوصل -->
        <div style="border-bottom: 3px solid black; padding-bottom: 4mm; margin-bottom: 5mm;">
          <h1 style="font-size: 18px; font-weight: 900; margin: 0 0 2mm 0;">${storeName}</h1>
          ${storePhone ? `<p style="font-size: 12px; margin: 0;">📞 ${storePhone}</p>` : ''}
          ${storeAddress ? `<p style="font-size: 11px; margin: 0; opacity: 0.8;">📍 ${storeAddress}</p>` : ''}
        </div>

        <!-- عنوان الوصل -->
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid black; border-radius: 3mm; background: #f8f9fa;">
            🎮 إيصال طلب تحميل ألعاب
          </div>
        </div>

        <!-- رقم التتبع -->
        <div style="margin-bottom: 5mm;">
          <div style="background: black; color: white; padding: 4mm; border-radius: 4mm;">
            <div style="font-size: 12px; margin-bottom: 1mm;">رقم التتبع</div>
            <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px;">${selectedOrder.tracking_number}</div>
          </div>
        </div>

        <!-- التاريخ -->
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 11px; color: #666;">📅 التاريخ والوقت</div>
          <div style="font-size: 12px; font-weight: 700;">${format(new Date(selectedOrder.created_at), 'dd/MM/yyyy hh:mm', { locale: ar })}</div>
        </div>

        ${queuePosition > 0 ? `
        <!-- رقم الترتيب -->
        <div style="margin-bottom: 5mm;">
          <div style="background: #fef2f2; border: 3px solid #dc2626; padding: 4mm; border-radius: 4mm;">
            <div style="font-size: 12px; color: #7f1d1d; margin-bottom: 1mm;">رقم الترتيب في الطابور</div>
            <div style="font-size: 24px; font-weight: 900; color: #dc2626;">${queuePosition}</div>
          </div>
        </div>
        ` : ''}

        <div style="border-top: 2px dashed black; margin: 4mm 0;"></div>

        <!-- بيانات العميل -->
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid #059669; border-radius: 3mm; background: #ecfdf5; color: #059669;">
            👤 بيانات العميل
          </div>
          <div style="margin-top: 3mm;">
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; color: #666;">الاسم الكامل</div>
              <div style="font-size: 14px; font-weight: 700;">${selectedOrder.customer_name}</div>
            </div>
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; color: #666;">رقم الهاتف</div>
              <div style="font-size: 14px; font-weight: 700;">${selectedOrder.customer_phone}</div>
            </div>
          </div>
        </div>

        <!-- قائمة الألعاب -->
        <div style="border-top: 2px dashed black; margin: 4mm 0;"></div>
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid #f59e0b; border-radius: 3mm; background: #fef3c7; color: #92400e;">
            🎮 الألعاب المطلوبة (${gamesList.reduce((sum, game) => sum + game.quantity, 0)} لعبة)
          </div>
          <div style="margin-top: 3mm;">
            ${gamesList.map(game => `
              <div style="border: 1px solid #e5e7eb; border-radius: 3mm; padding: 3mm; margin-bottom: 2mm; background: #f9fafb;">
                <div style="font-size: 13px; font-weight: 700; margin-bottom: 1mm;">${game.name}</div>
                <div style="font-size: 10px; color: #666; margin-bottom: 1mm;">المنصة: ${game.platform} | الكمية: ${game.quantity}</div>
                <div style="font-size: 12px; font-weight: 600; color: #059669;">${game.price.toLocaleString()} دج</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- تفاصيل الدفع -->
        <div style="border-top: 2px dashed black; margin: 4mm 0;"></div>
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid #2563eb; border-radius: 3mm; background: #f0f9ff; color: #2563eb;">
            💰 تفاصيل الدفع
          </div>
          <div style="border: 2px solid #e5e7eb; border-radius: 3mm; padding: 4mm; background: #f9fafb; margin-top: 3mm;">
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; color: #666;">السعر الإجمالي</div>
              <div style="font-size: 16px; font-weight: 700; color: #059669;">${(selectedOrder.price || 0).toLocaleString()} دج</div>
            </div>
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; color: #666;">المبلغ المدفوع</div>
              <div style="font-size: 16px; font-weight: 700; color: #2563eb;">${(selectedOrder.amount_paid || 0).toLocaleString()} دج</div>
            </div>
            ${remainingAmount > 0 ? `
            <div style="background: #fef2f2; border: 3px solid #dc2626; padding: 3mm; border-radius: 3mm; margin-top: 3mm;">
              <div style="font-size: 11px; color: #7f1d1d;">المبلغ المتبقي المطلوب دفعه</div>
              <div style="font-size: 18px; font-weight: 900; color: #dc2626;">${remainingAmount.toLocaleString()} دج</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- QR Code للتتبع -->
        <div style="border-top: 2px dashed black; margin: 4mm 0;"></div>
        <div style="margin-bottom: 5mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid #059669; border-radius: 3mm; background: #ecfdf5; color: #059669;">
            🔗 تتبع حالة الطلب
          </div>
          <div style="border: 3px solid #059669; border-radius: 4mm; padding: 4mm; background: #ecfdf5; margin-top: 3mm;">
            <div style="margin-bottom: 3mm;">
              <div style="display: block; margin: 0 auto; border: 2px solid black; border-radius: 2mm; padding: 2mm; background: white; width: fit-content;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(storeUrl + '/game-tracking/' + selectedOrder.tracking_number)}&format=png&margin=10&color=000000&bgcolor=ffffff" 
                     alt="QR Code للتتبع" 
                     style="display: block; width: 100px; height: 100px; margin: 0 auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; background: #f9f9f9; border: 1px dashed #ccc; color: #666;\\'>QR Code<br/>للتتبع</div>';" />
              </div>
            </div>
            <div style="margin-top: 3mm;">
              <div style="font-size: 11px; color: #666;">رقم التتبع</div>
              <div style="font-size: 16px; font-weight: 900; color: #059669;">${selectedOrder.tracking_number}</div>
            </div>
            <div style="font-size: 10px; margin-top: 2mm; opacity: 0.8;">
              امسح الكود أو اكتب الرقم لمتابعة حالة الطلب
            </div>
          </div>
        </div>

        <!-- خط القطع -->
        <div style="margin: 8mm 0; border-top: 3px dashed black; position: relative;">
          <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 5mm; font-size: 12px; font-weight: 700; border: 2px solid black; border-radius: 10px;">
            ✂️ اقطع هنا
          </div>
        </div>

        <!-- الجزء الإداري -->
        <div style="margin-top: 8mm;">
          <div style="font-size: 16px; font-weight: 800; padding: 2mm; border: 2px solid #dc2626; border-radius: 3mm; background: #fef2f2; color: #dc2626; margin-bottom: 5mm;">
            🔧 إيصال المسؤول - معالجة الطلب
          </div>

          <!-- معلومات أساسية -->
          <div style="border: 2px solid #dc2626; border-radius: 3mm; padding: 3mm; background: #fef2f2; margin-bottom: 4mm;">
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; color: #666;">رقم التتبع</div>
              <div style="font-size: 16px; font-weight: 900; color: #dc2626;">${selectedOrder.tracking_number}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #666;">العميل</div>
              <div style="font-size: 14px; font-weight: 700;">${selectedOrder.customer_name} - ${selectedOrder.customer_phone}</div>
            </div>
          </div>

          <!-- أكواد QR للمسؤول -->
          <div style="margin-bottom: 5mm;">
            <div style="font-size: 14px; font-weight: 800; margin-bottom: 4mm; color: #dc2626; text-align: center;">🔧 أكواد سريعة للمسؤول</div>
            
            <!-- QR لبدء التحميل -->
            <div style="margin-bottom: 4mm;">
              <div style="border: 3px solid #059669; padding: 4mm; border-radius: 4mm; background: #ecfdf5; width: 100%;">
                <div style="font-size: 12px; margin-bottom: 3mm; font-weight: 800; color: #059669; text-align: center;">🚀 بدء التحميل</div>
                <div style="display: block; margin: 0 auto; border: 2px solid black; padding: 2mm; background: white; width: fit-content;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(storeUrl + '/game-download-start/' + selectedOrder.id)}&format=png&margin=5&color=000000&bgcolor=ffffff" 
                       alt="QR Code بدء التحميل" 
                       style="display: block; width: 80px; height: 80px; margin: 0 auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;"
                       onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; background: #f9f9f9; border: 1px dashed #ccc; color: #666;\\'>QR Code<br/>بدء التحميل</div>';" />
                </div>
                <div style="font-size: 10px; margin-top: 2mm; font-weight: 600; color: #059669; text-align: center; opacity: 0.8;">امسح لبدء تحميل الألعاب</div>
              </div>
            </div>
            
            <!-- QR لإنهاء الطلب -->
            <div style="margin-bottom: 4mm;">
              <div style="border: 3px solid #dc2626; padding: 4mm; border-radius: 4mm; background: #fef2f2; width: 100%;">
                <div style="font-size: 12px; margin-bottom: 3mm; font-weight: 800; color: #dc2626; text-align: center;">✅ إنهاء الطلب</div>
                <div style="display: block; margin: 0 auto; border: 2px solid black; padding: 2mm; background: white; width: fit-content;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(storeUrl + '/game-complete/' + selectedOrder.id)}&format=png&margin=5&color=000000&bgcolor=ffffff" 
                       alt="QR Code إنهاء الطلب" 
                       style="display: block; width: 80px; height: 80px; margin: 0 auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact;"
                       onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; background: #f9f9f9; border: 1px dashed #ccc; color: #666;\\'>QR Code<br/>إنهاء الطلب</div>';" />
                </div>
                <div style="font-size: 10px; margin-top: 2mm; font-weight: 600; color: #dc2626; text-align: center; opacity: 0.8;">امسح عند إنهاء الطلب</div>
              </div>
            </div>
          </div>

          <!-- قائمة الألعاب للمسؤول -->
          <div style="margin-bottom: 4mm;">
            <div style="font-size: 12px; font-weight: 700; margin-bottom: 3mm;">📝 قائمة الألعاب للتحميل</div>
            <div style="border: 2px solid #e5e7eb; border-radius: 3mm; padding: 3mm; background: #f9fafb;">
              ${gamesList.map((game, index) => `
                <div style="border-bottom: ${index < gamesList.length - 1 ? '1px dashed #ccc' : 'none'}; padding-bottom: 2mm; margin-bottom: ${index < gamesList.length - 1 ? '2mm' : '0'};">
                  <div style="font-size: 11px; font-weight: 700;">${index + 1}. ${game.name}</div>
                  <div style="font-size: 9px; color: #666;">${game.platform} | الكمية: ${game.quantity}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- مساحة للملاحظات -->
          <div style="margin-bottom: 4mm;">
            <div style="font-size: 12px; font-weight: 700; margin-bottom: 3mm;">📝 ملاحظات المسؤول</div>
            <div style="border: 2px dashed #ccc; border-radius: 3mm; padding: 6mm; background: white; min-height: 15mm;">
              <div style="font-size: 9px; color: #999; font-style: italic;">مساحة للملاحظات والتوقيع...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (!statusOption) return null;

    return (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const option = paymentStatusOptions.find(opt => opt.value === status);
    if (!option) return null;

    return (
      <span className={`font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.tracking_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_phone.includes(searchTerm) ||
        order.game?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">إدارة طلبات تحميل الألعاب</h2>
            <p className="text-muted-foreground">عرض وإدارة جميع طلبات تحميل الألعاب</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="ml-2 h-4 w-4" />
            )}
            {loading ? 'جاري التحديث...' : 'تحديث'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم التتبع، اسم العميل، رقم الهاتف، أو اسم اللعبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلبات</CardTitle>
            <CardDescription>عدد الطلبات: {filteredOrders.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>اللعبة/الألعاب</TableHead>
                    <TableHead>المنصة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.tracking_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                          {order.customer_email && (
                            <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // استخراج قائمة الألعاب من الملاحظات
                          if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                            const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                            if (gamesSection) {
                              const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                              if (gameLines.length > 1) {
                                return (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">طلب متعدد الألعاب:</div>
                                    {gameLines.slice(0, 3).map((line, index) => {
                                      const gameName = line.split('(')[0].replace('•', '').trim();
                                      return (
                                        <div key={index} className="text-xs text-muted-foreground">
                                          • {gameName}
                                        </div>
                                      );
                                    })}
                                    {gameLines.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        و {gameLines.length - 3} ألعاب أخرى...
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                          }
                          return order.game?.name || 'غير محدد';
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // إذا كان طلب متعدد الألعاب، أظهر "متنوع"
                          if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                            const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                            if (gamesSection) {
                              const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                              if (gameLines.length > 1) {
                                return <span className="text-muted-foreground">متنوع</span>;
                              }
                            }
                          }
                          return order.game?.platform || 'غير محدد';
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <Select 
                            value={order.status} 
                            onValueChange={(newStatus) => handleQuickStatusUpdate(order, newStatus)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusOptions.find(opt => opt.value === order.status)?.color} text-white`}>
                                  {statusOptions.find(opt => opt.value === order.status)?.label}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(option.value)}
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={order.payment_status} 
                              onValueChange={(newPaymentStatus) => handleQuickPaymentStatusUpdate(order, newPaymentStatus)}
                            >
                              <SelectTrigger className="w-[120px] h-7 text-xs">
                                <SelectValue>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusOptions.find(opt => opt.value === order.payment_status)?.color}`}>
                                    {paymentStatusOptions.find(opt => opt.value === order.payment_status)?.label}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {paymentStatusOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <span className={option.color}>{option.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.amount_paid} / {order.price} دج
                          </div>
                          {(() => {
                            // إذا كان طلب متعدد الألعاب، أظهر عدد الألعاب
                            if (order.notes && order.notes.includes('📋 تفاصيل الطلب:')) {
                              const gamesSection = order.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                              if (gamesSection) {
                                const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                                if (gameLines.length > 1) {
                                  return (
                                    <div className="text-xs text-blue-600 font-medium">
                                      {gameLines.length} ألعاب
                                    </div>
                                  );
                                }
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>{order.assigned_user?.name || 'غير محدد'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          <br />
                          {format(new Date(order.created_at), 'hh:mm a', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsDialog(true);
                            }}
                            title="تفاصيل الطلب"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPrintDialog(true);
                            }}
                            title="طباعة الوصل"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          
                          {/* أزرار الدفع - تظهر فقط إذا لم يكن مدفوع كاملاً */}
                          {order.payment_status !== 'paid' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleFullPayment(order)}
                                disabled={processingActions.has(`payment-${order.id}`)}
                                title="دفع كامل"
                              >
                                {processingActions.has(`payment-${order.id}`) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setPaymentAmount(order.price - order.amount_paid);
                                  setShowPaymentDialog(true);
                                }}
                                title="تعديل الدفع"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditCustomer(order)}
                            title="تعديل معلومات العميل"
                          >
                            <User className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => handleEditOrder(order)}
                            title="تعديل معلومات الطلبية"
                          >
                            <GamepadIcon className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteOrder(order)}
                            title="حذف الطلبية"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                              setShowStatusDialog(true);
                            }}
                            title="تحديث الحالة (مفصل)"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="text-lg font-medium text-muted-foreground">لا توجد طلبات</p>
                      <p className="text-sm text-muted-foreground/75">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'لا توجد طلبات مطابقة للبحث أو الفلتر المحدد'
                          : 'لم يتم إنشاء أي طلبات بعد'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
              <br />
              العميل: {selectedOrder?.customer_name} - {selectedOrder?.customer_phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* عرض تفاصيل الألعاب */}
            {selectedOrder && (
              <div className="space-y-2">
                <Label>تفاصيل الطلب</Label>
                <div className="border rounded-lg p-3 bg-muted/30">
                  {(() => {
                    // استخراج تفاصيل الألعاب من الملاحظات
                    if (selectedOrder.notes && selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                      const summarySection = selectedOrder.notes.split('📊 الملخص:')[1];
                      
                      if (gamesSection) {
                        const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                        
                        return (
                          <div className="space-y-2">
                            <div className="font-medium text-sm">الألعاب المطلوبة:</div>
                            {gameLines.map((line, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                {line.trim()}
                              </div>
                            ))}
                            {summarySection && (
                              <div className="mt-3 pt-2 border-t">
                                <div className="font-medium text-sm mb-1">الملخص:</div>
                                {summarySection.split('\n').filter(line => line.trim().startsWith('•')).map((line, index) => (
                                  <div key={index} className="text-sm text-muted-foreground">
                                    {line.trim()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    
                    // إذا لم تكن هناك تفاصيل متعددة، أظهر اللعبة الواحدة
                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">اللعبة:</span> {selectedOrder.game?.name || 'غير محدد'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">المنصة:</span> {selectedOrder.game?.platform || 'غير محدد'}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">السعر:</span> {selectedOrder.price} دج
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* عرض ملاحظات العميل المخصصة */}
            {selectedOrder && selectedOrder.notes && (
              <div className="space-y-2">
                <Label>ملاحظات العميل</Label>
                <div className="border rounded-lg p-3 bg-muted/30">
                  {(() => {
                    // استخراج ملاحظات العميل (النص قبل تفاصيل الطلب)
                    if (selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const customerNotes = selectedOrder.notes.split('📋 تفاصيل الطلب:')[0].trim();
                      if (customerNotes) {
                        return (
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {customerNotes}
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-muted-foreground italic">
                            لا توجد ملاحظات من العميل
                          </div>
                        );
                      }
                    } else {
                      // إذا لم تكن هناك تفاصيل منظمة، أظهر الملاحظات كما هي
                      return (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedOrder.notes}
                        </div>
                      );
                    }
                  })()}
                </div>
                             </div>
             )}
             
             {/* عرض معلومات الجهاز */}
             {selectedOrder && (selectedOrder.device_type || selectedOrder.device_specs) && (
               <div className="space-y-2">
                 <Label>معلومات الجهاز</Label>
                 <div className="border rounded-lg p-3 bg-muted/30">
                   <div className="space-y-2">
                     {selectedOrder.device_type && (
                       <div className="text-sm">
                         <span className="font-medium">نوع الجهاز:</span> {selectedOrder.device_type}
                       </div>
                     )}
                     {selectedOrder.device_specs && (
                       <div className="text-sm">
                         <span className="font-medium">مواصفات الجهاز:</span>
                         <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
                           {selectedOrder.device_specs}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
              
             <div className="space-y-2">
               <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="أضف ملاحظات حول تحديث الحالة..."
                rows={3}
              />
            </div>

            {selectedOrder && selectedOrder.status_history.length > 0 && (
              <div className="space-y-2">
                <Label>سجل الحالات</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {selectedOrder.status_history.map((history: any, index: number) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span>
                          {statusOptions.find(opt => opt.value === history.from_status)?.label} → 
                          {' '}{statusOptions.find(opt => opt.value === history.to_status)?.label}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(history.changed_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                        </span>
                      </div>
                      {history.notes && (
                        <div className="text-muted-foreground mt-1">{history.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setSelectedOrder(null);
                setNewStatus('');
                setStatusNotes('');
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus || !newStatus}>
              {updatingStatus ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* معلومات العميل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات العميل</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="font-medium">الاسم</Label>
                      <p className="text-muted-foreground">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <Label className="font-medium">رقم الهاتف</Label>
                      <p className="text-muted-foreground">{selectedOrder.customer_phone}</p>
                    </div>
                    {selectedOrder.customer_email && (
                      <div>
                        <Label className="font-medium">البريد الإلكتروني</Label>
                        <p className="text-muted-foreground">{selectedOrder.customer_email}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="font-medium">حالة الطلب</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="font-medium">حالة الدفع</Label>
                      <p className="text-muted-foreground">
                        {getPaymentStatusBadge(selectedOrder.payment_status)}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">تاريخ الإنشاء</Label>
                      <p className="text-muted-foreground">
                        {format(new Date(selectedOrder.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">المسؤول</Label>
                      <p className="text-muted-foreground">{selectedOrder.assigned_user?.name || 'غير محدد'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* تفاصيل الألعاب */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الألعاب</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    if (selectedOrder.notes && selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                      const gamesSection = selectedOrder.notes.split('📋 تفاصيل الطلب:')[1]?.split('📊 الملخص:')[0];
                      const summarySection = selectedOrder.notes.split('📊 الملخص:')[1];
                      
                      if (gamesSection) {
                        const gameLines = gamesSection.split('\n').filter(line => line.trim().startsWith('•'));
                        
                        return (
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>اسم اللعبة</TableHead>
                                  <TableHead>الكمية</TableHead>
                                  <TableHead>السعر</TableHead>
                                  <TableHead>المجموع</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {gameLines.map((line, index) => {
                                  const gameName = line.replace('•', '').split('(')[0].trim();
                                  const quantity = line.match(/الكمية: (\d+)/)?.[1] || '1';
                                  const price = line.match(/السعر: ([\d,]+)/)?.[1] || '0';
                                  const total = line.match(/المجموع: ([\d,]+)/)?.[1] || '0';
                                  
                                  return (
                                    <TableRow key={index}>
                                      <TableCell>{index + 1}</TableCell>
                                      <TableCell className="font-medium">{gameName}</TableCell>
                                      <TableCell>{quantity}</TableCell>
                                      <TableCell>{price} دج</TableCell>
                                      <TableCell className="font-medium">{total} دج</TableCell>
                                    </TableRow>
                                  );
                                })}
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={4} className="font-bold text-center">الإجمالي</TableCell>
                                  <TableCell className="font-bold text-lg">{selectedOrder.price} دج</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                            
                            {summarySection && (
                              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                                <h4 className="font-medium mb-2">ملخص الطلب:</h4>
                                {summarySection.split('\n').filter(line => line.trim().startsWith('•')).map((line, index) => (
                                  <p key={index} className="text-sm text-muted-foreground">
                                    {line.trim()}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    
                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>اسم اللعبة</TableHead>
                            <TableHead>المنصة</TableHead>
                            <TableHead>السعر</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell className="font-medium">{selectedOrder.game?.name || 'غير محدد'}</TableCell>
                            <TableCell>{selectedOrder.game?.platform || 'غير محدد'}</TableCell>
                            <TableCell className="font-medium">{selectedOrder.price} دج</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* معلومات الجهاز */}
              {(selectedOrder.device_type || selectedOrder.device_specs) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات الجهاز</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedOrder.device_type && (
                      <div>
                        <Label className="font-medium">نوع الجهاز</Label>
                        <p className="text-muted-foreground">{selectedOrder.device_type}</p>
                      </div>
                    )}
                    {selectedOrder.device_specs && (
                      <div>
                        <Label className="font-medium">مواصفات الجهاز</Label>
                        <p className="text-muted-foreground whitespace-pre-wrap">{selectedOrder.device_specs}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ملاحظات العميل */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملاحظات العميل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      if (selectedOrder.notes.includes('📋 تفاصيل الطلب:')) {
                        const customerNotes = selectedOrder.notes.split('📋 تفاصيل الطلب:')[0].trim();
                        if (customerNotes) {
                          return (
                            <p className="text-muted-foreground whitespace-pre-wrap">{customerNotes}</p>
                          );
                        } else {
                          return (
                            <p className="text-muted-foreground italic">لا توجد ملاحظات من العميل</p>
                          );
                        }
                      } else {
                        return (
                          <p className="text-muted-foreground whitespace-pre-wrap">{selectedOrder.notes}</p>
                        );
                      }
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* سجل الحالات */}
              {selectedOrder.status_history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">سجل تحديثات الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.status_history.map((history: any, index: number) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium">
                              {statusOptions.find(opt => opt.value === history.from_status)?.label} → 
                              {' '}{statusOptions.find(opt => opt.value === history.to_status)?.label}
                            </div>
                            {history.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(history.changed_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false);
                setSelectedOrder(null);
              }}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة خيارات الطباعة */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طباعة الوصل</DialogTitle>
            <DialogDescription>
              اختر نوع الوصل المراد طباعته لطلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => printAdvancedReceipt()}>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <QrCode className="h-12 w-12 text-primary" />
                    <Printer className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">🎮 وصل طلب الألعاب المطور</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    وصل شامل مع QR codes ونظام طابور متقدم
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600">🧾 جزء العميل:</h4>
                      <ul className="space-y-1 text-left">
                        <li>• رقم التتبع مع QR code</li>
                        <li>• موقع في الطابور</li>
                        <li>• تفاصيل الألعاب المطلوبة</li>
                        <li>• معلومات الدفع والمتبقي</li>
                        <li>• شروط الخدمة</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-600">🔧 جزء المسؤول:</h4>
                      <ul className="space-y-1 text-left">
                        <li>• QR code لبدء التحميل</li>
                        <li>• QR code لإنهاء الطلب</li>
                        <li>• قائمة الألعاب للتحميل</li>
                        <li>• مساحة للملاحظات</li>
                        <li>• معلومات إدارية</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      ✂️ يحتوي على خط قطع لفصل الجزأين
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintDialog(false);
                setSelectedOrder(null);
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل الدفع */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل معلومات الدفع</DialogTitle>
            <DialogDescription>
              طلب رقم: {selectedOrder?.tracking_number}
              <br />
              العميل: {selectedOrder?.customer_name} - {selectedOrder?.customer_phone}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* معلومات الدفع الحالية */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">إجمالي المبلغ</Label>
                  <p className="text-lg font-bold text-blue-600">{selectedOrder.price} دج</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">المدفوع حالياً</Label>
                  <p className="text-lg font-bold text-green-600">{selectedOrder.amount_paid} دج</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">المتبقي</Label>
                  <p className="text-lg font-bold text-red-600">{selectedOrder.price - selectedOrder.amount_paid} دج</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">حالة الدفع</Label>
                  <div className="mt-1">
                    {getPaymentStatusBadge(selectedOrder.payment_status)}
                  </div>
                </div>
              </div>

              {/* إدخال المبلغ الجديد */}
              <div className="space-y-2">
                <Label>المبلغ المراد إضافته</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="أدخل المبلغ..."
                  min="0"
                  max={selectedOrder.price - selectedOrder.amount_paid}
                />
                <p className="text-sm text-muted-foreground">
                  الحد الأقصى: {selectedOrder.price - selectedOrder.amount_paid} دج
                </p>
              </div>

              {/* طريقة الدفع */}
              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="بطاقة ائتمان">بطاقة ائتمان</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="محفظة إلكترونية">محفظة إلكترونية</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* أزرار سريعة */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(selectedOrder.price - selectedOrder.amount_paid)}
                  className="text-green-600"
                >
                  دفع المتبقي كاملاً
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(Math.floor((selectedOrder.price - selectedOrder.amount_paid) / 2))}
                  className="text-blue-600"
                >
                  نصف المتبقي
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(0)}
                  className="text-red-600"
                >
                  مسح
                </Button>
              </div>

              {/* معاينة النتيجة */}
              {paymentAmount > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">معاينة بعد الدفع:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">إجمالي المدفوع:</span>
                      <span className="font-bold text-green-700 mr-2">
                        {selectedOrder.amount_paid + paymentAmount} دج
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المتبقي:</span>
                      <span className="font-bold text-red-700 mr-2">
                        {selectedOrder.price - (selectedOrder.amount_paid + paymentAmount)} دج
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">حالة الدفع الجديدة:</span>
                      <span className="mr-2">
                        {(() => {
                          const newTotal = selectedOrder.amount_paid + paymentAmount;
                          const newStatus = newTotal >= selectedOrder.price ? 'paid' : 
                                          newTotal > 0 ? 'partial' : 'unpaid';
                          return getPaymentStatusBadge(newStatus);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                setSelectedOrder(null);
                setPaymentAmount(0);
                setPaymentMethod('نقدي');
              }}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleCustomPayment} 
              disabled={paymentAmount <= 0 || paymentAmount > (selectedOrder?.price || 0) - (selectedOrder?.amount_paid || 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              تسجيل الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل معلومات العميل */}
      <Dialog open={showEditCustomerDialog} onOpenChange={setShowEditCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              تعديل معلومات العميل
            </DialogTitle>
            <DialogDescription>
              قم بتعديل معلومات العميل للطلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">اسم العميل</Label>
              <Input
                id="customer-name"
                value={editingCustomerInfo.name}
                onChange={(e) => setEditingCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم العميل"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">رقم الهاتف</Label>
              <Input
                id="customer-phone"
                value={editingCustomerInfo.phone}
                onChange={(e) => setEditingCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div>
              <Label htmlFor="customer-email">البريد الإلكتروني (اختياري)</Label>
              <Input
                id="customer-email"
                type="email"
                value={editingCustomerInfo.email}
                onChange={(e) => setEditingCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCustomerDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateCustomerInfo}
              disabled={isUpdating || !editingCustomerInfo.name || !editingCustomerInfo.phone}
            >
              {isUpdating ? 'جاري التحديث...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل معلومات الطلبية */}
      <Dialog open={showEditOrderDialog} onOpenChange={setShowEditOrderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GamepadIcon className="h-5 w-5" />
              تعديل معلومات الطلبية
            </DialogTitle>
            <DialogDescription>
              قم بتعديل تفاصيل الطلب رقم: {selectedOrder?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="game-select">اللعبة</Label>
              <Select
                value={editingOrderInfo.game_id}
                onValueChange={(value) => {
                  setEditingOrderInfo(prev => ({ ...prev, game_id: value }));
                  const selectedGame = availableGames.find(g => g.id === value);
                  if (selectedGame) {
                    setEditingOrderInfo(prev => ({ ...prev, price: selectedGame.price }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر اللعبة" />
                </SelectTrigger>
                <SelectContent>
                  {availableGames.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name} - {game.platform} ({game.price} دج)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="device-type">نوع الجهاز</Label>
              <Input
                id="device-type"
                value={editingOrderInfo.device_type}
                onChange={(e) => setEditingOrderInfo(prev => ({ ...prev, device_type: e.target.value }))}
                placeholder="مثال: PlayStation 5, Xbox Series X, PC"
              />
            </div>
            <div>
              <Label htmlFor="device-specs">مواصفات الجهاز</Label>
              <Textarea
                id="device-specs"
                value={editingOrderInfo.device_specs}
                onChange={(e) => setEditingOrderInfo(prev => ({ ...prev, device_specs: e.target.value }))}
                placeholder="أدخل مواصفات الجهاز التفصيلية..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="order-notes">ملاحظات إضافية</Label>
              <Textarea
                id="order-notes"
                value={editingOrderInfo.notes}
                onChange={(e) => setEditingOrderInfo(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات أو تعليمات خاصة..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="order-price">السعر (دج)</Label>
              <Input
                id="order-price"
                type="number"
                value={editingOrderInfo.price}
                onChange={(e) => setEditingOrderInfo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="أدخل السعر"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOrderDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateOrderInfo}
              disabled={isUpdating || !editingOrderInfo.game_id || editingOrderInfo.price <= 0}
            >
              {isUpdating ? 'جاري التحديث...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف الطلبية
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذه الطلبية؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <p><strong>رقم التتبع:</strong> {selectedOrder.tracking_number}</p>
              <p><strong>العميل:</strong> {selectedOrder.customer_name}</p>
              <p><strong>الهاتف:</strong> {selectedOrder.customer_phone}</p>
              <p><strong>اللعبة:</strong> {selectedOrder.game?.name} - {selectedOrder.game?.platform}</p>
              <p><strong>الحالة:</strong> {getStatusBadge(selectedOrder.status)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={isUpdating}
            >
              {isUpdating ? 'جاري الحذف...' : 'حذف الطلبية'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
