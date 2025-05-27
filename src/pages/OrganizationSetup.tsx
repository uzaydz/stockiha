import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Building, Check, Loader2 } from 'lucide-react';

// مخطط التحقق من صحة النموذج
const formSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون اسم المؤسسة 3 أحرف على الأقل' }),
  description: z.string().optional(),
  domain: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const OrganizationSetup = () => {
  const { createOrganization } = useTenant();
  const { user } = useAuth();
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

  // معالجة إرسال النموذج
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createOrganization(
        values.name,
        values.description,
        values.domain
      );

      if (result.success) {
        toast({
          title: 'تم إنشاء المؤسسة بنجاح',
          description: 'تم إعداد مؤسستك وأنت الآن المسؤول عنها.',
          variant: 'default',
        });
        
        // توجيه المستخدم إلى لوحة التحكم
        navigate('/dashboard');
      } else {
        toast({
          title: 'حدث خطأ',
          description: result.error?.message || 'فشل في إنشاء المؤسسة. يرجى المحاولة مرة أخرى.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'حدث خطأ غير متوقع',
        description: 'يرجى المحاولة مرة أخرى لاحقًا.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">إنشاء مؤسستك</CardTitle>
          <CardDescription>
            قم بإعداد مؤسسة جديدة للبدء في استخدام النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المؤسسة*</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: متجر الألعاب الإلكترونية" {...field} />
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
                        placeholder="وصف قصير لنشاط المؤسسة" 
                        {...field} 
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
                      <Input placeholder="example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    إنشاء المؤسسة
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          المستخدم: {user?.email}
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrganizationSetup;
