import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createSubscriptionRequest } from '@/lib/subscription-requests-service';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Check, CreditCard, Wallet, Building2, ChevronRight, Share2, Sparkles, Receipt, Gift, Tag, X, CheckCircle2 } from 'lucide-react';
import { UploadButton } from '@/components/upload-button';
import { Badge } from '@/components/ui/badge';

// Data Types
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
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState<'plan' | 'payment' | 'complete'>('plan');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // حالة كود الإحالة
  const [referralCode, setReferralCode] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralInfo, setReferralInfo] = useState<{
    referrer_org_id: string;
    referrer_name: string;
    discount_percentage: number;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  const basePrice = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
  const discountAmount = referralValid && referralInfo ? Math.round(basePrice * (referralInfo.discount_percentage / 100)) : 0;
  const price = basePrice - discountAmount;
  const formattedPrice = new Intl.NumberFormat('ar-DZ').format(price);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name');

        if (error) throw error;
        setPaymentMethods((data as any) || []);

        if (data && data.length > 0) {
          setSelectedPaymentMethod(data[0] as any);
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء جلب طرق الدفع');
      }
    };

    if (open) {
      fetchPaymentMethods();
      setStep('plan');

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

  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    setSelectedPaymentMethod(method || null);
    setFormFields({});
  };

  // التحقق من كود الإحالة
  const validateReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralError('الرجاء إدخال كود الإحالة');
      return;
    }

    setReferralLoading(true);
    setReferralError(null);
    setReferralValid(null);

    try {
      const { data, error } = await supabase.rpc('validate_referral_code' as any, {
        p_code: referralCode.trim().toUpperCase(),
        p_org_id: organizationId
      });

      if (error) throw error;

      const result = data as any;

      if (result.valid) {
        setReferralValid(true);
        setReferralInfo({
          referrer_org_id: result.referrer_org_id,
          referrer_name: result.referrer_name,
          discount_percentage: result.discount_percentage
        });
        toast.success(result.message, { icon: <Gift className="w-5 h-5 text-emerald-500" /> });
      } else {
        setReferralValid(false);
        setReferralError(result.error);
      }
    } catch (error: any) {
      console.error('Error validating referral code:', error);
      setReferralValid(false);
      setReferralError('حدث خطأ أثناء التحقق من الكود');
    } finally {
      setReferralLoading(false);
    }
  };

  // إزالة كود الإحالة
  const clearReferralCode = () => {
    setReferralCode('');
    setReferralValid(null);
    setReferralInfo(null);
    setReferralError(null);
  };

  const handleFormFieldChange = (name: string, value: string) => {
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFormComplete = () => {
    if (!selectedPaymentMethod) return false;
    const requiredFields = selectedPaymentMethod.fields.filter(field => field.required);
    return requiredFields.every(field => formFields[field.name] && formFields[field.name].trim() !== '');
  };

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
      const result = await createSubscriptionRequest({
        organizationId,
        planId: plan.id,
        billingCycle,
        amount: price,
        currency: 'DZD',
        paymentMethod: selectedPaymentMethod.name,
        paymentProofUrl: uploadUrl || undefined,
        paymentReference: formFields.reference || formFields.transaction_id || undefined,
        paymentNotes: JSON.stringify({
          ...formFields,
          payment_method_code: selectedPaymentMethod.code,
          // معلومات كود الإحالة
          referral_code: referralValid ? referralCode.toUpperCase() : null,
          referrer_org_id: referralInfo?.referrer_org_id || null,
          original_amount: basePrice,
          discount_amount: discountAmount,
          discount_percentage: referralInfo?.discount_percentage || 0
        }),
        contactName: userProfile?.name || formFields.contact_name || undefined,
        contactEmail: user?.email || formFields.contact_email || undefined,
        contactPhone: formFields.contact_phone || undefined,
        customerNotes: formFields.notes || undefined
      });

      if (!result.success) {
        throw new Error(result.error || 'فشل في إرسال طلب الاشتراك');
      }

      toast.success('تم إرسال الطب! سيتم مراجعته وتفعيل حسابك قريباً.', {
        duration: 4000,
        icon: <Sparkles className="w-5 h-5 text-emerald-500" />
      });
      setStep('complete');

      setTimeout(() => {
        onSubscriptionComplete();
        onOpenChange(false);
      }, 5000);
    } catch (error: any) {
      console.error('Error submitting subscription request:', error);
      toast.error(error.message || 'حدث خطأ أثناء إرسال طلب الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `payment_proofs/${organizationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('subscriptions')
        .upload(filePath, file, { cacheControl: '31536000', upsert: false });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          toast.warning('يرجى تخطي رفع الملف حالياً.', { description: 'الرفع غير متاح الآن.' });
          setUploadUrl(null);
          return;
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('subscriptions')
        .getPublicUrl(filePath);

      setUploadUrl(data.publicUrl);
      toast.success('تم رفع الملف بنجاح');
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      toast.error('تعذر رفع الملف');
      setUploadUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'd MMMM yyyy', { locale: ar });
  };

  // Helper icons for payment methods
  const getMethodIcon = (code: string) => {
    if (code.includes('bank') || code.includes('transfer')) return <Building2 className="w-5 h-5" />;
    if (code.includes('card')) return <CreditCard className="w-5 h-5" />;
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background dark:bg-[#0f172a] border-border dark:border-slate-800 p-0 gap-0 shadow-2xl">

        {/* Decorative Header */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-amber-500" />

        <div className="p-6 pb-2">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              {step === 'plan' ? 'تأكيد الباقة' : step === 'payment' ? 'الدفع والتفعيل' : 'تم بنجاح'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400">
              {step === 'plan' && `مراجعة تفاصيل اشتراكك في باقة ${plan.name}`}
              {step === 'payment' && 'اختر وسيلة الدفع المناسبة لك لإتمام العملية'}
              {step === 'complete' && 'شكراً لانضمامك إلينا'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2">
          <AnimatePresence mode="wait">

            {/* Step 1: Plan Summary */}
            {step === 'plan' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-muted dark:bg-[#050b15] rounded-xl p-5 border border-border dark:border-slate-800/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -translate-x-10 -translate-y-10" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground dark:text-white mb-1">{plan.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-400">
                        <span>{billingCycle === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي'}</span>
                        {billingCycle === 'yearly' && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px]">خصم 17%</Badge>}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-3xl font-black text-foreground dark:text-white tracking-tight">{formattedPrice} <span className="text-sm font-medium text-muted-foreground dark:text-slate-500">دج</span></div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border dark:border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">تاريخ البدء</p>
                      <p className="font-medium text-foreground dark:text-slate-200">{formatDate(startDate)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">تاريخ التجديد</p>
                      <p className="font-medium text-foreground dark:text-slate-200">{formatDate(endDate)}</p>
                    </div>
                  </div>

                  {/* عرض الخصم إذا كان هناك كود إحالة صحيح */}
                  {referralValid && referralInfo && (
                    <div className="mt-4 pt-4 border-t border-dashed border-emerald-500/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground dark:text-slate-400">السعر الأصلي</span>
                        <span className="text-muted-foreground dark:text-slate-400 line-through">
                          {new Intl.NumberFormat('ar-DZ').format(basePrice)} دج
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          خصم الإحالة ({referralInfo.discount_percentage}%)
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          -{new Intl.NumberFormat('ar-DZ').format(discountAmount)} دج
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground dark:text-slate-400">مميزات الباقة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plan.features.slice(0, 6).map((feature, index) => (
                      <div key={index} className="flex items-start gap-2 bg-card dark:bg-slate-900/50 p-3 rounded-lg border border-border dark:border-slate-800">
                        <div className="min-w-[18px] mt-0.5">
                          <Check className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-sm text-foreground dark:text-slate-300 leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* قسم كود الإحالة */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20 dark:border-orange-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-orange-500" />
                    <h4 className="text-sm font-bold text-foreground dark:text-white">هل لديك كود إحالة؟</h4>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 text-[10px]">
                      خصم 20%
                    </Badge>
                  </div>

                  {referralValid && referralInfo ? (
                    // كود صحيح - عرض معلومات الخصم
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            كود الإحالة: {referralCode.toUpperCase()}
                          </p>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                            بواسطة: {referralInfo.referrer_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearReferralCode}
                        className="h-8 px-2 text-emerald-600 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    // إدخال الكود
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="أدخل كود الإحالة (مثال: STOK1234)"
                            value={referralCode}
                            onChange={(e) => {
                              setReferralCode(e.target.value.toUpperCase());
                              setReferralError(null);
                              setReferralValid(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && validateReferralCode()}
                            className={cn(
                              "bg-background dark:bg-[#0a101f] border-border dark:border-slate-800 h-10 text-center font-mono tracking-widest uppercase",
                              referralValid === false && "border-red-500 focus-visible:ring-red-500"
                            )}
                            maxLength={10}
                            disabled={referralLoading}
                          />
                          {referralCode && !referralLoading && (
                            <button
                              onClick={() => setReferralCode('')}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          onClick={validateReferralCode}
                          disabled={!referralCode.trim() || referralLoading}
                          className="bg-orange-600 hover:bg-orange-500 text-white min-w-[100px]"
                        >
                          {referralLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'تحقق'
                          )}
                        </Button>
                      </div>
                      {referralError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {referralError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground dark:text-slate-500">
                        إذا حصلت على كود إحالة من صديق، أدخله هنا للحصول على خصم 20% على اشتراكك الأول
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {step === 'payment' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <RadioGroup
                  value={selectedPaymentMethod?.id || ''}
                  onValueChange={handlePaymentMethodChange}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={method.id}
                        className="flex flex-col gap-2 p-4 rounded-xl border-2 border-muted dark:border-slate-800 bg-card dark:bg-[#0f172a] hover:bg-muted/50 dark:hover:bg-slate-800/50 cursor-pointer transition-all peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-500/5 dark:peer-data-[state=checked]:bg-orange-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            selectedPaymentMethod?.id === method.id ? "bg-orange-500 text-white" : "bg-muted dark:bg-slate-800 text-slate-500"
                          )}>
                            {getMethodIcon(method.code)}
                          </div>
                          <span className="font-bold text-foreground dark:text-slate-200">{method.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-slate-500 pr-12 line-clamp-2">{method.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {selectedPaymentMethod && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4 bg-muted/50 dark:bg-[#050b15]/50 p-5 rounded-xl border border-border dark:border-slate-800/50">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-1.5 bg-blue-500/10 rounded text-blue-500 mt-1">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <p className="text-sm text-foreground dark:text-slate-300 leading-relaxed font-medium">{selectedPaymentMethod.instructions}</p>
                    </div>

                    <div className="grid gap-4">
                      {selectedPaymentMethod.fields.map((field) => (
                        <div key={field.name} className="space-y-1.5">
                          <Label htmlFor={field.name} className="flex items-center text-xs font-semibold text-muted-foreground dark:text-slate-400">
                            {field.label}
                            {field.required && <span className="text-red-500 mr-1">*</span>}
                          </Label>

                          {field.type === 'textarea' ? (
                            <Textarea
                              id={field.name}
                              placeholder={field.placeholder}
                              value={formFields[field.name] || ''}
                              onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                              className="bg-background dark:bg-[#0a101f] border-border dark:border-slate-800 min-h-[80px]"
                            />
                          ) : (
                            <Input
                              id={field.name}
                              type={field.type}
                              placeholder={field.placeholder}
                              value={formFields[field.name] || ''}
                              onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                              className="bg-background dark:bg-[#0a101f] border-border dark:border-slate-800 h-10"
                            />
                          )}
                        </div>
                      ))}

                      {selectedPaymentMethod.code !== 'cash_on_delivery' && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-xs font-semibold text-muted-foreground dark:text-slate-400">إثبات الدفع (صورة أو PDF)</Label>
                          {uploadUrl ? (
                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                <Check className="w-4 h-4" />
                                تم رفع الملف
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => setUploadUrl(null)} className="h-7 text-xs hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">تغيير</Button>
                            </div>
                          ) : (
                            <UploadButton
                              onUpload={handleUpload}
                              uploading={uploading}
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="w-full bg-background dark:bg-[#0a101f] border-dashed border-2 border-border dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-8 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
                  <Check className="w-12 h-12 text-emerald-500" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground dark:text-white">تم استلام طلبك بنجاح!</h3>
                  <p className="text-muted-foreground dark:text-slate-400 max-w-sm mx-auto">
                    سيقوم فريقنا بمراجعة طلبك وتفعيل اشتراكك في أقرب وقت. يمكنك متابعة الحالة من صفحة الاشتراكات.
                  </p>
                </div>

                <div className="bg-muted dark:bg-[#050b15] rounded-xl p-4 w-full border border-border dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background dark:bg-[#0f172a] rounded-lg border border-border dark:border-slate-800">
                      <Receipt className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground dark:text-slate-500">خطة {plan.name}</p>
                      <p className="font-bold text-foreground dark:text-white">{formattedPrice} دج</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-0">قيد المراجعة</Badge>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <DialogFooter className="p-6 pt-2 flex flex-row items-center justify-between border-t border-border dark:border-slate-800/50 bg-muted/20 dark:bg-slate-900/20 gap-3">
          {step !== 'complete' ? (
            <>
              <Button
                variant="ghost"
                onClick={() => step === 'payment' ? setStep('plan') : onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
              >
                {step === 'payment' ? 'رجوع' : 'إلغاء'}
              </Button>

              <Button
                onClick={step === 'plan' ? () => setStep('payment') : handleSubscribe}
                disabled={loading || (step === 'payment' && !isFormComplete())}
                className="bg-orange-600 hover:bg-orange-500 text-white min-w-[140px]"
              >
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {step === 'plan' ? 'متابعة للدفع' : 'تأكيد الطلب'}
                {!loading && step === 'plan' && <ChevronRight className="mr-2 w-4 h-4 rotate-180" />}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                onOpenChange(false);
                onSubscriptionComplete();
              }}
              className="w-full bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              إغلاق
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;
