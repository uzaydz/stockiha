import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Building, Check, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// مخطط التحقق من صحة النموذج
const formSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون اسم المؤسسة 3 أحرف على الأقل' }),
  description: z.string().optional(),
  domain: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const OrganizationSetup = () => {
  const { createOrganization, currentOrganization, isLoading } = useTenant();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إعداد نموذج React Hook Form مع Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      domain: '',
    },
  });

  // التحقق من وجود مؤسسة مسبقاً
  useEffect(() => {
    if (currentOrganization && !isLoading) {
      toast({
        title: 'لديك مؤسسة بالفعل',
        description: `ستتم إعادة توجيهك إلى مؤسسة "${currentOrganization.name}"`,
        variant: 'default',
      });
      navigate('/dashboard');
    }
  }, [currentOrganization, isLoading, navigate, toast]);

  // معالجة إرسال النموذج
  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: 'خطأ في المصادقة',
        description: 'يرجى تسجيل الدخول أولاً',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrganization(
        values.name,
        values.description,
        values.domain
      );

      if (result.success) {
        toast({
          title: '🎉 تم إنشاء المؤسسة بنجاح!',
          description: 'مرحباً بك في مؤسستك الجديدة. يمكنك الآن البدء في إدارة أعمالك.',
          variant: 'default',
        });
        
        // تأخير قصير لإظهار الرسالة ثم التوجه للوحة التحكم
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        const errorMessage = result.error?.message || 'حدث خطأ غير متوقع أثناء إنشاء المؤسسة';
        
        toast({
          title: 'فشل في إنشاء المؤسسة',
          description: errorMessage,
          variant: 'destructive',
        });

        // إذا كان الخطأ متعلق بالصلاحيات، اقتراح تسجيل الدخول مرة أخرى
        if (errorMessage.includes('صلاحية') || errorMessage.includes('مصادقة')) {
          toast({
            title: 'مشكلة في المصادقة',
            description: 'يرجى تسجيل الدخول مرة أخرى والمحاولة',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'حدث خطأ غير متوقع',
        description: 'يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // عرض مؤشر التحميل أثناء فحص البيانات
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-muted-foreground">جاري التحقق من بيانات المؤسسة...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">إنشاء مؤسستك</CardTitle>
          <CardDescription>
            مرحباً {userProfile?.name || user?.email}! 
            <br />
            قم بإعداد مؤسسة جديدة للبدء في استخدام النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ستصبح مسؤولاً عن هذه المؤسسة ويمكنك دعوة موظفين آخرين للانضمام إليها لاحقاً.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المؤسسة*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="مثال: متجر الألعاب الإلكترونية" 
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      سيظهر هذا الاسم في الفواتير والتقارير
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وصف المؤسسة</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="وصف قصير لنشاط المؤسسة (اختياري)" 
                        {...field}
                        disabled={isSubmitting}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نطاق الويب (اختياري)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="example.com" 
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      يمكنك إضافة النطاق الخاص بموقعك لاحقاً
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري إنشاء المؤسسة...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    إنشاء المؤسسة والبدء
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm text-muted-foreground">
          <div className="text-center">
            المستخدم: {user?.email}
          </div>
          <div className="text-center">
            <Link to="/login" className="text-primary hover:underline">
              تسجيل الدخول بحساب آخر
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrganizationSetup;
