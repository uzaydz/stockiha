import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// مكونات UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { UploadButton } from '@/components/upload-button';

// أنواع البيانات
interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: {
    max_users?: number;
    max_products?: number;
    max_pos?: number;
  };
}

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string;
  instructions: string;
  icon: string;
  fields: {
    name: string;
    type: string;
    label: string;
    required: boolean;
    placeholder: string;
  }[];
}

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  organizationId: string;
  isRenewal?: boolean;
  onSubscriptionComplete: () => void;
}

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({
  open,
  onOpenChange,
  plan,
  billingCycle,
  organizationId,
  isRenewal = false,
  onSubscriptionComplete,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'plan' | 'payment' | 'complete'>('plan');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
  const formattedPrice = new Intl.NumberFormat('ar', {
    style: 'decimal',
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(price);

  // جلب طرق الدفع المتاحة
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setPaymentMethods(data || []);
        
        // اختيار طريقة الدفع الأولى افتراضياً
        if (data && data.length > 0) {
          setSelectedPaymentMethod(data[0]);
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء جلب طرق الدفع');
      }
    };

    if (open) {
      fetchPaymentMethods();
      setStep('plan');
      
      // حساب تواريخ الاشتراك
      const today = new Date();
      setStartDate(format(today, 'yyyy-MM-dd'));
      
      const endDateValue = new Date(today);
      if (billingCycle === 'monthly') {
        endDateValue.setMonth(endDateValue.getMonth() + 1);
      } else {
        endDateValue.setFullYear(endDateValue.getFullYear() + 1);
      }
      setEndDate(format(endDateValue, 'yyyy-MM-dd'));
    }
  }, [open, billingCycle]);

  // معالجة تغيير طريقة الدفع
  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    setSelectedPaymentMethod(method || null);
    setFormFields({});
  };

  // معالجة تغيير حقول النموذج
  const handleFormFieldChange = (name: string, value: string) => {
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // التحقق من اكتمال النموذج
  const isFormComplete = () => {
    if (!selectedPaymentMethod) return false;
    
    // التحقق من جميع الحقول المطلوبة
    const requiredFields = selectedPaymentMethod.fields.filter(field => field.required);
    return requiredFields.every(field => formFields[field.name] && formFields[field.name].trim() !== '');
  };

  // معالجة عملية الاشتراك
  const handleSubscribe = async () => {
    if (!organizationId) {
      toast.error('لم يتم العثور على معلومات المؤسسة');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('الرجاء اختيار طريقة دفع');
      return;
    }

    if (!isFormComplete()) {
      toast.error('الرجاء إكمال جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      // إنشاء اشتراك جديد
      const { data: subscription, error: subscriptionError } = await supabase
        .from('organization_subscriptions')
        .insert([
          {
            organization_id: organizationId,
            plan_id: plan.id,
            billing_cycle: billingCycle,
            status: 'pending',
            start_date: startDate,
            end_date: endDate,
            payment_method: selectedPaymentMethod.id,
            payment_details: {
              ...formFields,
              ...(uploadUrl && { payment_proof_url: uploadUrl })
            },
            amount_paid: price
          }
        ])
        .select('id')
        .single();

      if (subscriptionError) throw subscriptionError;

      // تحديث حالة الاشتراك للمؤسسة
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          subscription_id: subscription.id,
          subscription_tier: plan.code,
          subscription_status: 'pending'
        })
        .eq('id', organizationId);

      if (orgError) throw orgError;

      // إضافة سجل في سجل الاشتراكات
      await supabase
        .from('subscription_history')
        .insert([
          {
            organization_id: organizationId,
            plan_id: plan.id,
            action: isRenewal ? 'renewed' : 'created',
            to_status: 'pending',
            amount: price,
            notes: JSON.stringify({
              plan_name: plan.name,
              plan_code: plan.code,
              billing_cycle: billingCycle,
              payment_method: selectedPaymentMethod.name
            })
          }
        ]);

      toast.success(isRenewal ? 'تم تجديد الاشتراك بنجاح' : 'تم الاشتراك بنجاح');
      setStep('complete');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء عملية الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  // معالجة رفع ملف إثبات الدفع
  const handleUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `payment_proofs/${organizationId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('subscriptions')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('subscriptions')
        .getPublicUrl(filePath);
        
      setUploadUrl(data.publicUrl);
      toast.success('تم رفع إثبات الدفع بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع إثبات الدفع');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'yyyy-MM-dd', { locale: ar });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {step === 'plan' && (
          <>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">تأكيد الاشتراك</DialogTitle>
              <DialogDescription>
                أنت على وشك الاشتراك في خطة {plan.name} ({billingCycle === 'monthly' ? 'شهري' : 'سنوي'})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-3">ملخص الطلب</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">اسم الخطة:</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">نوع الاشتراك:</span>
                    <span>{billingCycle === 'monthly' ? 'شهري' : 'سنوي'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-bold text-lg">{formattedPrice} دج</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">تاريخ البدء:</span>
                    <span dir="ltr">{formatDate(startDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                    <span dir="ltr">{formatDate(endDate)}</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-3">المميزات</h3>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full ml-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button onClick={() => setStep('payment')}>
                متابعة للدفع
              </Button>
            </DialogFooter>
          </>
        )}
        
        {step === 'payment' && (
          <>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">اختر طريقة الدفع</DialogTitle>
              <DialogDescription>
                الرجاء اختيار طريقة الدفع وإكمال المعلومات المطلوبة
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 my-4">
              <RadioGroup 
                value={selectedPaymentMethod?.id || ''} 
                onValueChange={handlePaymentMethodChange}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <Card key={method.id} className="relative overflow-hidden">
                      <label 
                        htmlFor={method.id} 
                        className="absolute inset-0 cursor-pointer z-10" 
                      />
                      <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border ${selectedPaymentMethod?.id === method.id ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                      <CardContent className="pt-6 px-4">
                        <RadioGroupItem
                          value={method.id}
                          id={method.id}
                          className="sr-only"
                        />
                        <div className="space-y-2">
                          <h3 className="font-medium">{method.name}</h3>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </RadioGroup>
              
              {selectedPaymentMethod && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div>
                    <h3 className="font-medium mb-2">{selectedPaymentMethod.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPaymentMethod.instructions}</p>
                  </div>
                  
                  <div className="space-y-4">
                    {selectedPaymentMethod.fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name} className="flex items-center">
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </Label>
                        
                        {field.type === 'text' && (
                          <Input
                            id={field.name}
                            placeholder={field.placeholder}
                            value={formFields[field.name] || ''}
                            onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                            required={field.required}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <Textarea
                            id={field.name}
                            placeholder={field.placeholder}
                            value={formFields[field.name] || ''}
                            onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                            required={field.required}
                            className="min-h-[100px]"
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* إذا كانت طريقة الدفع تتطلب إثبات دفع */}
                    {selectedPaymentMethod.code !== 'cash_on_delivery' && (
                      <div className="space-y-2">
                        <Label>إثبات الدفع</Label>
                        {uploadUrl ? (
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <div className="text-sm bg-muted rounded p-2 flex-1 overflow-hidden text-ellipsis">
                              تم رفع الملف بنجاح
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadUrl(null)}
                            >
                              تغيير
                            </Button>
                          </div>
                        ) : (
                          <UploadButton
                            onUpload={handleUpload}
                            uploading={uploading}
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="w-full"
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          يمكنك رفع إيصال الدفع أو لقطة شاشة للتحويل البنكي (بصيغة JPG, PNG, أو PDF)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep('plan')}>
                رجوع
              </Button>
              <Button 
                onClick={handleSubscribe} 
                disabled={loading || !isFormComplete() || (selectedPaymentMethod?.code !== 'cash_on_delivery' && !uploadUrl)}
              >
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تأكيد الاشتراك
              </Button>
            </DialogFooter>
          </>
        )}
        
        {step === 'complete' && (
          <>
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-xl">تم الاشتراك بنجاح</DialogTitle>
              <DialogDescription>
                شكراً لاشتراكك في منصتنا. سيتم مراجعة طلبك والرد عليك قريباً.
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-6 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-8 h-8 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h3 className="text-xl font-medium mb-3">تمت عملية الاشتراك بنجاح</h3>
              <p className="text-muted-foreground mb-4">
                سيقوم فريقنا بمراجعة طلبك وتفعيل اشتراكك في أقرب وقت ممكن.
                يمكنك متابعة حالة اشتراكك من صفحة إدارة الاشتراكات.
              </p>
              
              <div className="rounded-lg border p-4 text-right mb-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">اسم الخطة:</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">نوع الاشتراك:</span>
                    <span>{billingCycle === 'monthly' ? 'شهري' : 'سنوي'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-bold text-lg">{formattedPrice} دج</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">طريقة الدفع:</span>
                    <span>{selectedPaymentMethod?.name}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => {
                  onOpenChange(false);
                  onSubscriptionComplete();
                }}
              >
                إغلاق
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;
