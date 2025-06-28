import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { registerTenant } from '@/lib/api/tenant';
import { checkSubdomainAvailability } from '@/lib/api/subdomain';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

// مخطط التحقق من صحة النموذج
const formSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون الاسم 3 أحرف على الأقل' }),
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  phone: z.string().optional(),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
  organizationName: z.string().min(3, { message: 'يجب أن يكون اسم المؤسسة 3 أحرف على الأقل' }),
  subdomain: z.string()
    .min(3, { message: 'يجب أن يكون النطاق الفرعي 3 أحرف على الأقل' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { 
      message: 'النطاق الفرعي يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط' 
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const TenantRegistrationForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ''
  });

  // إعداد نموذج React Hook Form مع Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      subdomain: '',
    },
  });

  // التحقق من توفر النطاق الفرعي مع تأخير
  const checkSubdomain = useCallback(async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainStatus({ checking: false, available: null, message: '' });
      return;
    }

    setSubdomainStatus({ checking: true, available: null, message: 'جاري التحقق...' });

    try {
      const result = await checkSubdomainAvailability(subdomain);
      
      if (result.error) {
        setSubdomainStatus({ 
          checking: false, 
          available: false, 
          message: result.error.message 
        });
      } else if (result.available) {
        setSubdomainStatus({ 
          checking: false, 
          available: true, 
          message: 'النطاق الفرعي متاح! ✓' 
        });
      } else {
        setSubdomainStatus({ 
          checking: false, 
          available: false, 
          message: 'النطاق الفرعي مستخدم بالفعل' 
        });
      }
    } catch (error) {
      setSubdomainStatus({ 
        checking: false, 
        available: false, 
        message: 'حدث خطأ أثناء التحقق' 
      });
    }
  }, []);

  // تأخير التحقق من النطاق الفرعي
  useEffect(() => {
    const subdomain = form.watch('subdomain');
    
    if (!subdomain) {
      setSubdomainStatus({ checking: false, available: null, message: '' });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkSubdomain(subdomain);
    }, 1000); // تأخير ثانية واحدة

    return () => clearTimeout(timeoutId);
  }, [form.watch('subdomain'), checkSubdomain]);

  // معالجة إرسال النموذج
  const onSubmit = async (values: FormValues) => {
    // التحقق الأخير من توفر النطاق الفرعي
    if (subdomainStatus.available === false) {
      toast.error('يرجى اختيار نطاق فرعي متاح');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 بدء عملية التسجيل:', values);
      
      const { success, error } = await registerTenant({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        organizationName: values.organizationName,
        subdomain: values.subdomain,
      });
      
      if (success) {
        toast.success('🎉 تم إنشاء حساب المسؤول بنجاح! مرحباً بك في ستوكيها');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        console.error('❌ فشل التسجيل:', error);
        toast.error(`فشل التسجيل: ${error?.message || 'حدث خطأ غير متوقع'}`);
      }
    } catch (error) {
      console.error('❌ استثناء أثناء التسجيل:', error);
      toast.error('حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSubdomainIcon = () => {
    if (subdomainStatus.checking) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (subdomainStatus.available === true) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (subdomainStatus.available === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getSubdomainMessageColor = () => {
    if (subdomainStatus.available === true) return 'text-green-600';
    if (subdomainStatus.available === false) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">إنشاء حساب مسؤول ونطاق فرعي</CardTitle>
        <CardDescription className="text-center">
          قم بإدخال بياناتك لإنشاء حساب مسؤول جديد ونطاق فرعي خاص بك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">معلومات المسؤول</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسمك الكامل" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="أدخل بريدك الإلكتروني" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="أدخل رقم هاتفك" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="أدخل كلمة المرور" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="أعد إدخال كلمة المرور" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">معلومات المؤسسة والنطاق</h3>
              
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المؤسسة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم المؤسسة" className="text-right" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النطاق الفرعي</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <Input 
                            {...field} 
                            placeholder="mystore" 
                            className="rounded-r-none border-l-0 pr-8" 
                            onChange={(e) => {
                              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                              field.onChange(value);
                            }}
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            {getSubdomainIcon()}
                          </div>
                        </div>
                        <div className="bg-muted px-3 h-10 flex items-center border border-input border-l-0 rounded-l-md">
                          .yourdomain.com
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      سيكون هذا عنوان الموقع الخاص بك للوصول إلى النظام.
                    </FormDescription>
                    {subdomainStatus.message && (
                      <p className={`text-sm ${getSubdomainMessageColor()}`}>
                        {subdomainStatus.message}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isLoading || subdomainStatus.available === false || subdomainStatus.checking}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء حساب المسؤول والنطاق'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <a href="/login" className="underline underline-offset-4 text-primary">
            تسجيل الدخول
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TenantRegistrationForm;
