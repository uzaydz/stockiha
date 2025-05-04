import { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { PaymentMethodCard } from '@/components/super-admin/payment-methods/PaymentMethodCard';
import { EditPaymentMethodDialog } from '@/components/super-admin/payment-methods/EditPaymentMethodDialog';
import { CreatePaymentMethodDialog } from '@/components/super-admin/payment-methods/CreatePaymentMethodDialog';
import { PaymentMethod, PaymentMethodFormData } from '@/types/payment';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SuperAdminPaymentMethods() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب طرق الدفع عند تحميل الصفحة
  useEffect(() => {
    fetchPaymentMethods();
  }, []);
  
  // جلب طرق الدفع من قاعدة البيانات
  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        setPaymentMethods(data);
      } else {
        // إذا لم تكن هناك طرق دفع، استخدم بيانات مؤقتة للعرض
        setPaymentMethods([
          {
            id: '1',
            name: 'الدفع عند الاستلام',
            code: 'cash_on_delivery',
            description: 'دفع قيمة الاشتراك نقداً عند الاستلام',
            instructions: 'سيتم التواصل معك لتحديد موعد وعنوان الاستلام.',
            icon: 'cash',
            fields: [
              { name: 'address', label: 'العنوان', type: 'textarea', placeholder: 'أدخل عنوان الاستلام بالتفصيل', required: true },
              { name: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: 'أدخل رقم هاتف للتواصل', required: true }
            ],
            is_active: true,
            display_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'CCP حساب بريدي',
            code: 'ccp',
            description: 'الدفع عبر الحساب البريدي الجاري',
            instructions: 'يرجى تحويل المبلغ إلى الحساب البريدي الجاري رقم: 0012345678 واسم صاحب الحساب: شركة بازار للتجارة الإلكترونية.',
            icon: 'mail',
            fields: [
              { name: 'sender_ccp', label: 'رقم CCP المرسل', type: 'text', placeholder: '00000000000', required: true },
              { name: 'receipt_number', label: 'رقم الوصل', type: 'text', placeholder: 'أدخل رقم الوصل', required: true },
              { name: 'transaction_date', label: 'تاريخ التحويل', type: 'text', placeholder: 'DD/MM/YYYY', required: true }
            ],
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // معالجة تحرير طريقة دفع
  const handleEditMethod = (method: PaymentMethod) => {
    setCurrentMethod(method);
    setEditDialogOpen(true);
  };
  
  // معالجة تحديث طريقة دفع
  const handleUpdateMethod = async (updatedMethod: PaymentMethod) => {
    try {
      // في بيئة الإنتاج، سيتم تحديث طريقة الدفع في قاعدة البيانات
      const { error } = await supabase
        .from('payment_methods')
        .update({
          name: updatedMethod.name,
          code: updatedMethod.code,
          description: updatedMethod.description,
          instructions: updatedMethod.instructions,
          icon: updatedMethod.icon,
          fields: updatedMethod.fields,
          is_active: updatedMethod.is_active,
          display_order: updatedMethod.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMethod.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPaymentMethods(paymentMethods.map(method => 
        method.id === updatedMethod.id ? updatedMethod : method
      ));
      
      // إغلاق مربع الحوار
      setEditDialogOpen(false);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم تحديث طريقة الدفع",
        description: `تم تحديث طريقة "${updatedMethod.name}" بنجاح.`,
      });
    } catch (err: any) {
      console.error('Error updating payment method:', err);
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في تحديث طريقة الدفع",
        description: err.message,
      });
    }
  };
  
  // معالجة إنشاء طريقة دفع جديدة
  const handleCreateMethod = async (newMethod: PaymentMethodFormData) => {
    try {
      // في بيئة الإنتاج، سيتم إضافة طريقة الدفع في قاعدة البيانات
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          ...newMethod,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      const createdMethod = data[0] as PaymentMethod;
      setPaymentMethods([...paymentMethods, createdMethod]);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم إنشاء طريقة الدفع",
        description: `تم إنشاء طريقة "${newMethod.name}" بنجاح.`,
      });
    } catch (err: any) {
      console.error('Error creating payment method:', err);
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء طريقة الدفع",
        description: err.message,
      });
    }
  };
  
  // معالجة تغيير حالة التفعيل
  const handleToggleActive = async (method: PaymentMethod, isActive: boolean) => {
    try {
      // في بيئة الإنتاج، سيتم تحديث الحالة في قاعدة البيانات
      const { error } = await supabase
        .from('payment_methods')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', method.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPaymentMethods(paymentMethods.map(m => 
        m.id === method.id ? { ...m, is_active: isActive } : m
      ));
      
      // إظهار رسالة نجاح
      toast({
        title: isActive ? "تم تفعيل طريقة الدفع" : "تم إلغاء تفعيل طريقة الدفع",
        description: `تم ${isActive ? 'تفعيل' : 'إلغاء تفعيل'} طريقة "${method.name}" بنجاح.`,
      });
    } catch (err: any) {
      console.error('Error toggling payment method active state:', err);
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في تغيير حالة طريقة الدفع",
        description: err.message,
      });
    }
  };
  
  // معالجة حذف طريقة دفع
  const handleDeleteMethod = async (method: PaymentMethod) => {
    // لا يمكن حذف طرق الدفع النشطة
    if (method.is_active) return;
    
    if (!window.confirm(`هل أنت متأكد من حذف طريقة "${method.name}"؟`)) return;
    
    try {
      // في بيئة الإنتاج، سيتم حذف طريقة الدفع من قاعدة البيانات
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', method.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPaymentMethods(paymentMethods.filter(m => m.id !== method.id));
      
      // إظهار رسالة نجاح
      toast({
        title: "تم حذف طريقة الدفع",
        description: `تم حذف طريقة "${method.name}" بنجاح.`,
      });
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في حذف طريقة الدفع",
        description: err.message,
      });
    }
  };
  
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة طرق الدفع</h1>
            <p className="text-muted-foreground mt-1">تعريف وإدارة طرق الدفع المتاحة للمستخدمين</p>
          </div>
          <CreatePaymentMethodDialog onCreateMethod={handleCreateMethod} />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <PaymentMethodCard 
                  key={method.id} 
                  method={method} 
                  onEdit={handleEditMethod} 
                  onDelete={handleDeleteMethod}
                  onToggleActive={handleToggleActive}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-muted rounded-md">
                <p className="text-lg font-medium mb-2">لا توجد طرق دفع متاحة</p>
                <p className="text-muted-foreground mb-4">قم بإضافة طرق الدفع التي سيستخدمها عملاؤك</p>
                <CreatePaymentMethodDialog onCreateMethod={handleCreateMethod} />
              </div>
            )}
          </div>
        )}
        
        {/* مربع حوار تعديل طريقة الدفع */}
        <EditPaymentMethodDialog 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen} 
          method={currentMethod}
          onSave={handleUpdateMethod}
        />
      </div>
    </SuperAdminLayout>
  );
} 