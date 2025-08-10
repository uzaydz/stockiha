import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import InvoicesHeader from '@/components/invoices/InvoicesHeader';
import InvoicesList from '@/components/invoices/InvoicesList';
import InvoicePrintView from '@/components/invoices/InvoicePrintView';
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog';
import type { Invoice } from '@/lib/api/invoices';
import { getInvoices } from '@/lib/api/invoices';

const Invoices = () => {
  const { currentOrganization } = useTenant();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewingInvoice, setIsViewingInvoice] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<'new' | 'order' | 'online' | 'service' | 'combined'>('new');
  const [selectOrderDialogOpen, setSelectOrderDialogOpen] = useState(false);

  // جلب قائمة الفواتير
  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        if (!currentOrganization) {
          
          setInvoices([]);
          return;
        }
          
        // استخدام API لجلب الفواتير
        // فقط للاختبار، نستخدم بيانات وهمية مؤقتة
        try {
          const invoicesData = await getInvoices(currentOrganization.id);
          setInvoices(invoicesData);
        } catch (error) {
          // إذا فشل API، استخدم بيانات وهمية مؤقتة
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
        
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل الفواتير');
      } finally {
        setIsLoading(false);
      }
    };

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

  // معالجة إنشاء فاتورة جديدة
  const handleInvoiceCreated = (invoice: Invoice) => {
    setInvoices(prevInvoices => [invoice, ...prevInvoices]);
  };
  
  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل الفواتير...</p>
          </div>
        </div>
      ) : isViewingInvoice && selectedInvoice ? (
        <InvoicePrintView 
          invoice={selectedInvoice} 
          onBack={handleBackToList} 
        />
      ) : (
        <div className="space-y-6 w-full">
          {/* رأس صفحة الفواتير */}
          <InvoicesHeader 
            invoiceCount={invoices.length}
            onCreateInvoice={handleCreateInvoice}
            onCreateFromOrder={handleCreateFromOrder}
            onCreateFromOnlineOrder={handleCreateFromOnlineOrder}
            onCreateFromService={handleCreateFromService}
            onCreateCombined={handleCreateCombined}
          />
          
          {/* قائمة الفواتير */}
          <InvoicesList 
            invoices={invoices}
            onViewInvoice={handleViewInvoice}
            onPrintInvoice={handlePrintInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
        </div>
      )}
      
      {/* مربع حوار إنشاء فاتورة جديدة */}
      <CreateInvoiceDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onInvoiceCreated={handleInvoiceCreated}
        type={createDialogType}
      />
    </Layout>
  );
};

export default Invoices;
