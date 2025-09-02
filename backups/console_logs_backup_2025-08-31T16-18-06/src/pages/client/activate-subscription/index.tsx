import React, { useEffect, useState } from 'react';
import { ClientLayout } from '@/components/layouts/ClientLayout';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AlarmClockCheck, BadgeCheck, Key, ShieldAlert } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ActivationService } from '@/lib/activation-service';
import { SubscriptionPlan } from '@/types/subscription';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

// مخطط التحقق من صحة النموذج
const formSchema = z.object({
  activation_code: z
    .string()
    .min(1, { message: 'يرجى إدخال كود التفعيل' })
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
      message: 'كود التفعيل غير صالح. يجب أن يكون بتنسيق: XXXX-XXXX-XXXX-XXXX',
    }),
});

type FormValues = z.infer<typeof formSchema>;

const getOrganizationIdFromMultipleSources = async (user: any, organization: any) => {
  // 1. Intenta obtener de la propiedad organization del contexto de autenticación
  if (organization?.id) {
    
    return organization.id;
  }

  // 2. Intenta obtener del localStorage
  const storedOrgId = localStorage.getItem('bazaar_organization_id');
  if (storedOrgId) {
    
    return storedOrgId;
  }

  // 3. Intenta obtener de la tabla de usuarios si el usuario está autenticado
  if (user?.id) {
    try {
      // محاولة أولى: البحث بـ auth_user_id
      let { data: userData, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single();

      // إذا فشل، جرب البحث بـ id
      if (error || !userData?.organization_id) {
        const { data: idData, error: idError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!idError && idData?.organization_id) {
          userData = idData;
          error = null;
        }
      }

      if (!error && userData?.organization_id) {
        
        // Guarda para futuras referencias
        localStorage.setItem('bazaar_organization_id', userData.organization_id);
        return userData.organization_id;
      }
    } catch (err) {
    }
  }

  return null;
};

export default function ActivateSubscriptionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, organization } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
    plan?: SubscriptionPlan;
  } | null>(null);
  
  const [activationResult, setActivationResult] = useState<{
    success: boolean;
    message: string;
    subscriptionId?: string;
    subscriptionEndDate?: string;
  } | null>(null);
  
  // إنشاء نموذج مع التحقق من صحة البيانات
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activation_code: '',
    },
  });
  
  // استقبال كود التفعيل من عنوان URL
  useEffect(() => {
    const { code } = router.query;
    if (code && typeof code === 'string') {
      form.setValue('activation_code', code.toUpperCase());
      
      // التحقق من الكود تلقائيًا إذا تم تمريره في عنوان URL
      handleVerifyCode(code);
    }
  }, [router.query]);
  
  // التحقق من صحة كود التفعيل
  const handleVerifyCode = async (code?: string) => {
    try {
      setIsVerifying(true);
      setVerificationResult(null);
      setActivationResult(null);
      
      const activationCode = code || form.getValues('activation_code');
      
      if (!activationCode || !formSchema.shape.activation_code.safeParse(activationCode).success) {
        form.setError('activation_code', {
          message: 'كود التفعيل غير صالح. يجب أن يكون بتنسيق: XXXX-XXXX-XXXX-XXXX'
        });
        return;
      }
      
      const result = await ActivationService.verifyActivationCode(activationCode);
      setVerificationResult(result);
      
      if (!result.isValid) {
        form.setError('activation_code', { message: result.message });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في التحقق من الكود",
        description: error.message || "حدث خطأ أثناء التحقق من كود التفعيل",
        variant: "destructive"
      });
      setVerificationResult({
        isValid: false,
        message: "حدث خطأ أثناء التحقق من كود التفعيل"
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // تفعيل الاشتراك باستخدام كود التفعيل
  const handleActivateSubscription = async () => {
    try {
      // Obtener el ID de organización de múltiples fuentes
      const organizationId = await getOrganizationIdFromMultipleSources(user, organization);
      
      if (!organizationId) {
        toast({
          title: "No se encontró información de la organización",
          description: "Por favor inicia sesión nuevamente o verifica que hayas creado una organización",
          variant: "destructive"
        });
        
        setActivationResult({
          success: false,
          message: "No se pudo encontrar la información de la organización"
        });
        return;
      }
      
      setIsActivating(true);
      
      const activationCode = form.getValues('activation_code');
      
      const result = await ActivationService.activateSubscription({
        activation_code: activationCode,
        organization_id: organizationId
      });
      
      setActivationResult(result);
      
      if (result.success) {
        toast({
          title: "تم تفعيل الاشتراك بنجاح",
          description: "تم تفعيل اشتراك المؤسسة بنجاح"
        });
        
        // إعادة توجيه المستخدم إلى صفحة الاشتراكات بعد ثواني
        setTimeout(() => {
          router.push('/client/subscriptions');
        }, 3000);
      } else {
        toast({
          title: "فشل تفعيل الاشتراك",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في تفعيل الاشتراك",
        description: error.message || "حدث خطأ أثناء تفعيل الاشتراك",
        variant: "destructive"
      });
      setActivationResult({
        success: false,
        message: "حدث خطأ أثناء تفعيل الاشتراك"
      });
    } finally {
      setIsActivating(false);
    }
  };
  
  // تنسيق كود التفعيل أثناء الكتابة
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // إضافة الشرطات تلقائياً
    if (value.length > 0) {
      // حذف أي شرطات موجودة
      value = value.replace(/-/g, '');
      
      // إعادة إضافة الشرطات بعد كل 4 أحرف
      if (value.length > 4) {
        value = value.slice(0, 4) + '-' + value.slice(4);
      }
      if (value.length > 9) {
        value = value.slice(0, 9) + '-' + value.slice(9);
      }
      if (value.length > 14) {
        value = value.slice(0, 14) + '-' + value.slice(14);
      }
      
      // تحديد عدد الأحرف المسموح بها
      value = value.slice(0, 19);
    }
    
    form.setValue('activation_code', value);
  };
  
  return (
    <ClientLayout>
      <PageHeader
        title="تفعيل الاشتراك"
        description="استخدم كود التفعيل لتفعيل اشتراك المؤسسة"
        icon={<Key className="h-6 w-6" />}
      />
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>تفعيل اشتراك جديد</CardTitle>
            <CardDescription>
              أدخل كود التفعيل الذي حصلت عليه لتفعيل اشتراك مؤسستك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(handleVerifyCode)}>
                <FormField
                  control={form.control}
                  name="activation_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كود التفعيل</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: ABCD-1234-EFGH-5678"
                          className="font-mono text-lg tracking-wider uppercase text-center"
                          {...field}
                          onChange={handleCodeChange}
                          disabled={isVerifying || isActivating || !!activationResult?.success}
                        />
                      </FormControl>
                      <FormDescription>
                        أدخل كود التفعيل بالتنسيق الصحيح (XXXX-XXXX-XXXX-XXXX)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* عرض نتيجة التحقق */}
                {verificationResult && (
                  <Alert variant={verificationResult.isValid ? "default" : "destructive"}>
                    {verificationResult.isValid ? (
                      <>
                        <BadgeCheck className="h-4 w-4" />
                        <AlertTitle>كود التفعيل صالح</AlertTitle>
                        <AlertDescription>
                          <p>تم التحقق من صحة كود التفعيل. يمكنك الآن تفعيل اشتراكك للخطة التالية:</p>
                          {verificationResult.plan && (
                            <div className="mt-2 p-3 bg-muted rounded">
                              <p className="font-semibold">{verificationResult.plan.name}</p>
                              <p className="text-sm">{verificationResult.plan.description}</p>
                              <div className="flex justify-between mt-2 text-sm">
                                <span>المدة: {
                                  verificationResult.plan.billing_period === 'monthly' ? 'شهري' : 
                                  verificationResult.plan.billing_period === 'quarterly' ? 'ربع سنوي' : 
                                  verificationResult.plan.billing_period === 'semi_annual' ? 'نصف سنوي' : 
                                  'سنوي'
                                }</span>
                                <span>السعر: {verificationResult.plan.price} دج</span>
                              </div>
                            </div>
                          )}
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>كود التفعيل غير صالح</AlertTitle>
                        <AlertDescription>
                          {verificationResult.message}
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
                
                {/* عرض نتيجة التفعيل */}
                {activationResult && (
                  <Alert variant={activationResult.success ? "default" : "destructive"}>
                    {activationResult.success ? (
                      <>
                        <BadgeCheck className="h-4 w-4" />
                        <AlertTitle>تم تفعيل الاشتراك بنجاح</AlertTitle>
                        <AlertDescription>
                          <p>{activationResult.message}</p>
                          {activationResult.subscriptionEndDate && (
                            <p className="mt-2">
                              <AlarmClockCheck className="inline-block mr-1 h-4 w-4" />
                              تاريخ انتهاء الاشتراك: {format(new Date(activationResult.subscriptionEndDate), 'yyyy/MM/dd')}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-muted-foreground">
                            جاري تحويلك إلى صفحة الاشتراكات...
                          </p>
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>فشل تفعيل الاشتراك</AlertTitle>
                        <AlertDescription>
                          {activationResult.message}
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
                
                <div className="flex space-x-4 space-x-reverse">
                  <Button 
                    type="submit" 
                    disabled={isVerifying || !form.formState.isValid || isActivating || !!activationResult?.success}
                  >
                    {isVerifying ? (
                      <>
                        <span className="animate-spin ml-2">&#9696;</span>
                        جاري التحقق...
                      </>
                    ) : (
                      'التحقق من الكود'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleActivateSubscription}
                    disabled={
                      !verificationResult?.isValid || 
                      isActivating || 
                      isVerifying || 
                      !!activationResult?.success
                    }
                  >
                    {isActivating ? (
                      <>
                        <span className="animate-spin ml-2">&#9696;</span>
                        جاري تفعيل الاشتراك...
                      </>
                    ) : (
                      'تفعيل الاشتراك'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>تعليمات</CardTitle>
            <CardDescription>
              معلومات حول كيفية الحصول على كود التفعيل واستخدامه
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">ما هو كود التفعيل؟</h3>
              <p className="text-sm text-muted-foreground">
                كود التفعيل هو مفتاح يتكون من 16 حرف يسمح لك بتفعيل اشتراك في النظام لمؤسستك.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">كيفية الحصول على كود التفعيل</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>شراء الاشتراك من خلال موقعنا الإلكتروني</li>
                <li>الحصول على الكود من أحد موزعينا المعتمدين</li>
                <li>استلام الكود عبر البريد الإلكتروني بعد إتمام عملية الشراء</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">ملاحظات هامة</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>يمكن استخدام كود التفعيل مرة واحدة فقط</li>
                <li>يجب إدخال الكود بالتنسيق الصحيح (XXXX-XXXX-XXXX-XXXX)</li>
                <li>بعض أكواد التفعيل قد يكون لها تاريخ انتهاء صلاحية</li>
                <li>في حالة وجود مشكلة في تفعيل الكود، يرجى التواصل مع الدعم الفني</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => router.push('/client/subscriptions')}>
              العودة إلى صفحة الاشتراكات
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientLayout>
  );
}
