import React, { useState, useEffect } from 'react';
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
import { getInvoices } from '@/lib/api/invoices';
import { getAllLocalInvoices } from '@/api/localInvoiceService';
import { syncPendingInvoices, fetchInvoicesFromServer } from '@/api/syncInvoices';
import type { LocalInvoiceItem } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  if (perms.ready && !canViewInvoices) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى الفواتير.</AlertDescription>
        </Alert>
      </div>
    );
    return useStandaloneLayout ? <Layout>{node}</Layout> : node;
  }

  // دالة جلب الفواتير من المخزن المحلي
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      if (!currentOrganization) {
        setInvoices([]);
        return;
      }

      // جلب الفواتير من المخزن المحلي
      const localInvoices = await getAllLocalInvoices(currentOrganization.id);

      // ⚡ جلب جميع عناصر الفواتير عبر Delta Sync
      const allInvoiceItems = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items' as any, currentOrganization.id);

      // تحويل LocalInvoice إلى Invoice
      const convertedInvoices: Invoice[] = localInvoices.map((localInv) => {
        // ⚡ فلترة عناصر الفاتورة
        const items = allInvoiceItems.filter(item => item.invoice_id === localInv.id);

        return {
            id: localInv.id,
            invoiceNumber: localInv.invoice_number,
            customerName: localInv.customer_name,
            customerId: localInv.customer_id || undefined,
            totalAmount: localInv.total_amount,
            invoiceDate: localInv.invoice_date,
            dueDate: localInv.due_date,
            status: localInv.status,
            items: items.map(item => ({
              id: item.id,
              invoiceId: item.invoice_id,
              name: item.name,
              description: item.description || '',
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price,
              productId: item.product_id || undefined,
              type: item.type || 'product'
            })),
            organizationId: localInv.organization_id,
            sourceType: localInv.source_type || 'pos',
            sourceId: undefined,
            paymentMethod: localInv.payment_method || undefined,
            paymentStatus: localInv.payment_status || 'pending',
            notes: localInv.notes,
            customFields: null,
            taxAmount: localInv.tax_amount || 0,
            discountAmount: localInv.discount_amount || 0,
            subtotalAmount: localInv.subtotal_amount || 0,
            shippingAmount: localInv.shipping_amount,
            customerInfo: undefined,
            organizationInfo: undefined,
            createdAt: localInv.created_at,
            updatedAt: localInv.updated_at,
            // إضافة حقول المزامنة
            _synced: localInv.synced,
            _syncStatus: localInv.syncStatus,
            _pendingOperation: localInv.pendingOperation
          } as Invoice;
        });

      setInvoices(convertedInvoices);

      // مزامنة مع السيرفر في الخلفية إذا كان متصل
      if (isOnline) {
        syncInBackground();
      }
    } catch (error) {
      console.error('خطأ في جلب الفواتير:', error);
      // في حالة الخطأ، نحاول جلب بيانات وهمية
      try {
        const invoicesData = await getInvoices(currentOrganization.id);
        setInvoices(invoicesData);
      } catch (apiError) {
        // إذا فشل كل شيء، استخدم بيانات وهمية مؤقتة
        const mockInvoices: Invoice[] = Array.from({ length: 10 }, (_, index) => ({
          id: `invoice-${index + 1}`,
          invoiceNumber: `INV-${Date.now().toString().substring(8)}${index + 1}`,
          customerName: index % 3 === 0 ? "أحمد محمد" : index % 2 === 0 ? "سارة عبدالله" : "محمد علي",
          totalAmount: Math.floor(Math.random() * 10000) + 100,
          invoiceDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: index % 2 === 0 ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() : null,
          status: index % 4 === 0 ? 'paid' : index % 3 === 0 ? 'pending' : index % 2 === 0 ? 'overdue' : 'canceled',
          items: [
            {
              id: `item-${index}-1`,
              invoiceId: `invoice-${index + 1}`,
              name: "منتج تجريبي",
              description: "وصف المنتج التجريبي",
              quantity: Math.floor(Math.random() * 5) + 1,
              unitPrice: Math.floor(Math.random() * 1000) + 50,
              totalPrice: 0, // سيتم حسابها
              type: 'product'
            },
            {
              id: `item-${index}-2`,
              invoiceId: `invoice-${index + 1}`,
              name: "خدمة تجريبية",
              description: "وصف الخدمة التجريبية",
              quantity: 1,
              unitPrice: Math.floor(Math.random() * 500) + 100,
              totalPrice: 0, // سيتم حسابها
              type: 'service'
            }
          ],
          organizationId: currentOrganization.id,
          sourceType: index % 3 === 0 ? 'pos' : index % 2 === 0 ? 'online' : 'service',
          sourceId: `source-${index + 1}`,
          paymentMethod: index % 2 === 0 ? 'cash' : 'card',
          paymentStatus: index % 4 === 0 ? 'paid' : 'pending',
          notes: index % 2 === 0 ? "ملاحظات تجريبية للفاتورة" : null,
          customFields: null,
          taxAmount: Math.floor(Math.random() * 100),
          discountAmount: index % 2 === 0 ? Math.floor(Math.random() * 50) : 0,
          subtotalAmount: 0, // سيتم حسابها
          shippingAmount: index % 3 === 0 ? Math.floor(Math.random() * 50) + 10 : null,
          customerInfo: {
            id: `customer-${index % 3 + 1}`,
            name: index % 3 === 0 ? "أحمد محمد" : index % 2 === 0 ? "سارة عبدالله" : "محمد علي",
            email: index % 3 === 0 ? "ahmed@example.com" : index % 2 === 0 ? "sara@example.com" : "mohammed@example.com",
            phone: `+966 50 ${Math.floor(1000000 + Math.random() * 9000000)}`,
            address: "الرياض، المملكة العربية السعودية",
          },
          organizationInfo: {
            name: currentOrganization.name,
            logo: null,
            address: "شارع الملك فهد، الرياض، المملكة العربية السعودية",
            phone: "+966 11 1234567",
            email: "info@example.com",
            website: "www.example.com",
            taxNumber: "1234567890",
            registrationNumber: "5678901234",
            additionalInfo: null,
          },
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        // حساب المبالغ الفرعية والإجمالية
        mockInvoices.forEach(invoice => {
          invoice.items.forEach(item => {
            item.totalPrice = item.quantity * item.unitPrice;
          });

          invoice.subtotalAmount = invoice.items.reduce((sum, item) => sum + item.totalPrice, 0);
          invoice.totalAmount = invoice.subtotalAmount + invoice.taxAmount - invoice.discountAmount + (invoice.shippingAmount || 0);
        });

        setInvoices(mockInvoices);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // مزامنة في الخلفية
  const syncInBackground = async () => {
    if (!isOnline || !currentOrganization) return;

    try {
      setIsSyncing(true);

      // مزامنة الفواتير المعلقة
      const syncResult = await syncPendingInvoices();

      if (syncResult.success > 0) {
        console.log(`✅ تمت مزامنة ${syncResult.success} فاتورة`);
      }

      if (syncResult.failed > 0) {
        console.warn(`⚠️ فشلت مزامنة ${syncResult.failed} فاتورة`);
      }

      // جلب الفواتير الجديدة من السيرفر وتحديث الحالة مباشرة
      await fetchInvoicesFromServer(currentOrganization.id);

      // ⚡ تحديث البيانات محلياً عبر Delta Sync
      const localInvoices = await getAllLocalInvoices(currentOrganization.id);
      const allItemsSync = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items' as any, currentOrganization.id);
      const convertedInvoices: Invoice[] = localInvoices.map((localInv) => {
        const items = allItemsSync.filter(item => item.invoice_id === localInv.id);

        return {
          id: localInv.id,
          invoiceNumber: localInv.invoice_number,
          customerName: localInv.customer_name,
          customerId: localInv.customer_id || undefined,
          totalAmount: localInv.total_amount,
          invoiceDate: localInv.invoice_date,
          dueDate: localInv.due_date,
          status: localInv.status,
          items: items.map(item => ({
            id: item.id,
            invoiceId: item.invoice_id,
            name: item.name,
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            productId: item.product_id || undefined,
            type: item.type || 'product'
          })),
          organizationId: localInv.organization_id,
          sourceType: localInv.source_type || 'pos',
          sourceId: undefined,
          paymentMethod: localInv.payment_method || undefined,
          paymentStatus: localInv.payment_status || 'pending',
          notes: localInv.notes,
          customFields: null,
          taxAmount: localInv.tax_amount || 0,
          discountAmount: localInv.discount_amount || 0,
          subtotalAmount: localInv.subtotal_amount || 0,
          shippingAmount: localInv.shipping_amount,
          customerInfo: undefined,
          organizationInfo: undefined,
          createdAt: localInv.created_at,
          updatedAt: localInv.updated_at,
          _synced: localInv.synced,
          _syncStatus: localInv.syncStatus,
          _pendingOperation: localInv.pendingOperation
        } as Invoice;
      });

      setInvoices(convertedInvoices);
    } catch (error) {
      console.error('خطأ في المزامنة:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // جلب الفواتير عند تحميل الصفحة
  useEffect(() => {
    fetchInvoices();
  }, [currentOrganization]);

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
      setInvoices(prevInvoices =>
        prevInvoices.map(inv => inv.id === invoice.id ? invoice : inv)
      );
      setEditingInvoice(null);
      toast.success('تم تحديث الفاتورة بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
    } else {
      // إضافة فاتورة جديدة
      setInvoices(prevInvoices => [invoice, ...prevInvoices]);
      toast.success('تم إنشاء الفاتورة بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
    }

    // مزامنة فورية إذا كان متصل
    if (isOnline) {
      setTimeout(() => syncInBackground(), 1000);
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
    if (onRegisterRefresh) {
      onRegisterRefresh(() => {
        fetchInvoices();
      });
      return () => onRegisterRefresh(null);
    }
  }, [onRegisterRefresh]);

  // تحديث حالة الـ Layout
  useEffect(() => {
    const state: POSLayoutState = {
      isRefreshing: Boolean(isLoading || isSyncing),
      connectionStatus: isOnline ? 'connected' : 'disconnected',
      executionTime: undefined
    };
    if (onLayoutStateChange) onLayoutStateChange(state);
  }, [onLayoutStateChange, isLoading, isSyncing, isOnline]);

  return renderWithLayout(pageContent);
};

export default Invoices;
