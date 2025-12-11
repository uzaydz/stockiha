import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { POSSharedLayoutControls, POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import InvoicesHeader from '@/components/invoices/InvoicesHeader';
import InvoicesList from '@/components/invoices/InvoicesList';
import InvoicePrintViewUpdated from '@/components/invoices/InvoicePrintViewUpdated';
import CreateInvoiceDialogAdvanced from '@/components/invoices/CreateInvoiceDialogAdvanced';
import type { Invoice } from '@/lib/api/invoices';
import { syncPendingInvoices } from '@/api/syncInvoices';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
// ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
import { useReactiveInvoices, type ReactiveInvoice } from '@/hooks/powersync';

interface InvoicesProps extends POSSharedLayoutControls {
  useStandaloneLayout?: boolean;
  onRegisterRefresh?: (handler: RefreshHandler) => void;
  onLayoutStateChange?: (state: POSLayoutState) => void;
}

const Invoices: React.FC<InvoicesProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { currentOrganization } = useTenant();
  const perms = usePermissions();
  const { isOnline } = useNetworkStatus();

  // ⚡ PowerSync Reactive Hooks - تحديث تلقائي فوري!
  const {
    invoices: rawInvoices,
    isLoading,
    isFetching
  } = useReactiveInvoices({
    limit: 200
  });

  // ⚡ تحويل الفواتير من ReactiveInvoice إلى Invoice
  const invoices = useMemo(() => {
    return rawInvoices.map((inv: ReactiveInvoice) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name || '',
      customerId: inv.customer_id || undefined,
      totalAmount: inv.total_amount,
      invoiceDate: inv.invoice_date || inv.created_at,
      dueDate: inv.due_date,
      status: inv.status,
      items: inv.items ? JSON.parse(inv.items) : [],
      organizationId: inv.organization_id,
      sourceType: inv.source_type || 'pos',
      sourceId: inv.order_id || undefined,
      paymentMethod: inv.payment_method || undefined,
      paymentStatus: inv.payment_status || 'pending',
      notes: inv.notes,
      customFields: null,
      taxAmount: inv.tax_amount || 0,
      discountAmount: inv.discount_amount || 0,
      subtotalAmount: inv.subtotal_amount || 0,
      shippingAmount: null,
      customerInfo: inv.customer_id ? {
        id: inv.customer_id,
        name: inv.customer_name || '',
        email: inv.customer_email || '',
        phone: inv.customer_phone || '',
        address: inv.customer_address || '',
      } : undefined,
      organizationInfo: undefined,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      _synced: true,
      _syncStatus: 'synced',
      _pendingOperation: undefined
    } as Invoice));
  }, [rawInvoices]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isViewingInvoice, setIsViewingInvoice] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'new' | 'order' | 'online' | 'service' | 'combined' | 'proforma' | 'bon_commande'>('new');
  const [selectOrderDialogOpen, setSelectOrderDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // السماح لمن يملك مفاتيح عرض الفواتير الحديثة أو بدائل قديمة
  // الجديد: canViewInvoices
  // دعم بدائل سابقة: viewFinancialReports / processPayments / manageOrders
  const canViewInvoices = perms.ready ? perms.anyOf(['canViewInvoices', 'viewFinancialReports', 'processPayments', 'manageOrders']) : false;
  // إدارة/إنشاء الفواتير للمستخدمين المصرح لهم فقط
  const canManageInvoices = perms.ready ? perms.anyOf(['canManageInvoices', 'processPayments', 'manageOrders']) : false;
  const isUnauthorized = perms.ready && !canViewInvoices;

  // ⚡ PowerSync يدير التحديثات تلقائياً - handleRefresh للمزامنة اليدوية فقط
  const handleRefresh = useCallback(async () => {
    if (!isOnline || !currentOrganization?.id) return;

    setIsSyncing(true);
    try {
      // مزامنة الفواتير المعلقة
      const syncResult = await syncPendingInvoices();

      if (syncResult.success > 0) {
        console.log(`✅ تمت مزامنة ${syncResult.success} فاتورة`);
        toast.success(`تمت مزامنة ${syncResult.success} فاتورة`);
      }

      if (syncResult.failed > 0) {
        console.warn(`⚠️ فشلت مزامنة ${syncResult.failed} فاتورة`);
        toast.warning(`لم تتم مزامنة ${syncResult.failed} فاتورة`);
      }
      // ⚡ PowerSync سيحدث البيانات تلقائياً - لا حاجة لجلب البيانات يدوياً!
    } catch (error) {
      console.error('خطأ في المزامنة:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, currentOrganization?.id]);

  // ⚡ PowerSync Reactive - لا حاجة لـ useEffect لجلب البيانات!
  // البيانات تأتي تلقائياً من useReactiveInvoices

  // عرض الفاتورة
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewingInvoice(true);
  };

  // العودة إلى قائمة الفواتير
  const handleBackToList = () => {
    setIsViewingInvoice(false);
    setSelectedInvoice(null);
  };

  // طباعة الفاتورة
  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewingInvoice(true);
    // سيتم استخدام وظيفة الطباعة داخل مكون InvoicePrintView
  };

  // تنزيل الفاتورة
  const handleDownloadInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewingInvoice(true);
    // سيتم استخدام وظيفة التنزيل داخل مكون InvoicePrintView
  };

  // فتح مربع حوار إنشاء فاتورة جديدة
  const handleCreateInvoice = () => {
    setCreateDialogType('new');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء فاتورة من طلب نقاط البيع
  const handleCreateFromOrder = () => {
    setCreateDialogType('order');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء فاتورة من طلب متجر إلكتروني
  const handleCreateFromOnlineOrder = () => {
    setCreateDialogType('online');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء فاتورة من خدمة
  const handleCreateFromService = () => {
    setCreateDialogType('service');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء فاتورة مجمعة
  const handleCreateCombined = () => {
    setCreateDialogType('combined');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء فاتورة شكلية
  const handleCreateProforma = () => {
    setCreateDialogType('proforma');
    setCreateDialogOpen(true);
  };

  // فتح مربع حوار إنشاء أمر شراء
  const handleCreateBonCommande = () => {
    setCreateDialogType('bon_commande');
    setCreateDialogOpen(true);
  };

  // معالجة إنشاء فاتورة جديدة
  const handleInvoiceCreated = async (invoice: Invoice) => {
    if (editingInvoice) {
      // تحديث الفاتورة الموجودة
      setEditingInvoice(null);
      toast.success('تم تحديث الفاتورة بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
    } else {
      // إضافة فاتورة جديدة
      toast.success('تم إنشاء الفاتورة بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
    }

    // ⚡ PowerSync سيحدث البيانات تلقائياً!
    // مزامنة فورية إذا كان متصل
    if (isOnline) {
      setTimeout(() => handleRefresh(), 1000);
    }
  };

  // تعديل الفاتورة
  const handleEditInvoice = (invoice: Invoice) => {
    if (!canManageInvoices) return; // عرض فقط
    setEditingInvoice(invoice);
    setCreateDialogType('new');
    setCreateDialogOpen(true);
  };

  // إغلاق نافذة التعديل
  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditingInvoice(null);
  };

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  if (isUnauthorized) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى الفواتير.</AlertDescription>
        </Alert>
      </div>
    );
    return renderWithLayout(node);
  }

  const pageContent = (
    <>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل الفواتير...</p>
          </div>
        </div>
      ) : isViewingInvoice && selectedInvoice ? (
        <InvoicePrintViewUpdated
          invoice={selectedInvoice}
          onBack={handleBackToList}
        />
      ) : (
        <div className="space-y-6 w-full h-full min-h-screen p-6">
          {/* رأس صفحة الفواتير */}
          <InvoicesHeader
            invoiceCount={invoices.length}
            onCreateInvoice={handleCreateInvoice}
            onCreateFromOrder={handleCreateFromOrder}
            onCreateFromOnlineOrder={handleCreateFromOnlineOrder}
            onCreateFromService={handleCreateFromService}
            onCreateCombined={handleCreateCombined}
            onCreateProforma={handleCreateProforma}
            onCreateBonCommande={handleCreateBonCommande}
            canCreate={canManageInvoices}
          />

          {/* قائمة الفواتير */}
          <InvoicesList
            invoices={invoices}
            onViewInvoice={handleViewInvoice}
            onPrintInvoice={handlePrintInvoice}
            onDownloadInvoice={handleDownloadInvoice}
            onEditInvoice={handleEditInvoice}
            canManage={canManageInvoices}
          />
        </div>
      )}

      {/* مربع حوار إنشاء/تعديل فاتورة */}
      {canManageInvoices && (
        <CreateInvoiceDialogAdvanced
          open={createDialogOpen}
          onOpenChange={handleCloseDialog}
          onInvoiceCreated={handleInvoiceCreated}
          type={createDialogType}
          editingInvoice={editingInvoice}
        />
      )}
    </>
  );

  // تسجيل دالة التحديث مع الـ Layout
  useEffect(() => {
    if (isUnauthorized || !onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [onRegisterRefresh, isUnauthorized, handleRefresh]);

  // تحديث حالة الـ Layout - مؤجل لتجنب setState أثناء render
  useEffect(() => {
    if (isUnauthorized || !onLayoutStateChange) return;

    // تأخير التحديث لتجنب خطأ React
    const timeoutId = setTimeout(() => {
      const state: POSLayoutState = {
        isRefreshing: Boolean(isLoading || isSyncing),
        connectionStatus: isOnline ? 'connected' : 'disconnected',
        executionTime: undefined
      };
      onLayoutStateChange(state);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [onLayoutStateChange, isLoading, isSyncing, isOnline, isUnauthorized]);

  return renderWithLayout(pageContent);
};

export default Invoices;
