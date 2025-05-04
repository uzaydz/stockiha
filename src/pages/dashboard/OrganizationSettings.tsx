import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTenant } from '@/context/TenantContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';
import { 
  Building, 
  Check, 
  Loader2, 
  Settings, 
  Users, 
  Mail, 
  CreditCard 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// مخطط التحقق من صحة نموذج المؤسسة
const organizationFormSchema = z.object({
  name: z.string().min(3, { message: 'يجب أن يكون اسم المؤسسة 3 أحرف على الأقل' }),
  description: z.string().optional(),
  domain: z.string().optional(),
  logo_url: z.string().optional(),
});

// مخطط التحقق من صحة نموذج دعوة المستخدمين
const inviteFormSchema = z.object({
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  role: z.enum(['admin', 'employee'], {
    required_error: 'يرجى اختيار دور المستخدم',
  }),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
type InviteFormValues = z.infer<typeof inviteFormSchema>;

const OrganizationSettings = () => {
  const { currentOrganization, isOrgAdmin, refreshOrganizationData, inviteUserToOrganization } = useTenant();
  const { toast } = useToast();
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // إعداد نموذج تحديث المؤسسة
  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: currentOrganization?.name || '',
      description: currentOrganization?.description || '',
      domain: currentOrganization?.domain || '',
      logo_url: currentOrganization?.logo_url || '',
    },
  });

  // إعداد نموذج دعوة المستخدمين
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'employee',
    },
  });

  // تحميل بيانات المستخدمين المرتبطين بالمؤسسة
  const loadOrganizationUsers = async () => {
    if (!currentOrganization) return;

    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, is_org_admin, is_active, created_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading organization users:', error);
      toast({
        title: 'خطأ في تحميل المستخدمين',
        description: 'فشل في تحميل بيانات المستخدمين. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // تحديث بيانات المؤسسة
  const onOrganizationSubmit = async (values: OrganizationFormValues) => {
    if (!currentOrganization || !isOrgAdmin) return;

    setIsSubmittingOrg(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: values.name,
          description: values.description,
          domain: values.domain,
          logo_url: values.logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentOrganization.id);

      if (error) {
        throw error;
      }

      await refreshOrganizationData();

      toast({
        title: 'تم تحديث المؤسسة بنجاح',
        description: 'تم حفظ التغييرات التي أجريتها على بيانات المؤسسة.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: 'خطأ في تحديث المؤسسة',
        description: 'فشل في حفظ التغييرات. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  // دعوة مستخدم جديد
  const onInviteSubmit = async (values: InviteFormValues) => {
    if (!currentOrganization || !isOrgAdmin) return;

    setIsSubmittingInvite(true);
    try {
      const result = await inviteUserToOrganization(values.email, values.role);

      if (result.success) {
        toast({
          title: 'تمت الدعوة بنجاح',
          description: `تم إرسال دعوة إلى ${values.email} للانضمام إلى مؤسستك.`,
          variant: 'default',
        });
        
        // إعادة تعيين النموذج
        inviteForm.reset();
        
        // إعادة تحميل قائمة المستخدمين
        await loadOrganizationUsers();
      } else {
        toast({
          title: 'خطأ في الدعوة',
          description: result.error?.message || 'فشل في إرسال الدعوة. يرجى المحاولة مرة أخرى.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'خطأ غير متوقع',
        description: 'حدث خطأ أثناء محاولة دعوة المستخدم. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // عرض بطاقة ورسالة عندما لا توجد مؤسسة
  if (!currentOrganization) {
    return (
      <div className="container py-10">
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">لم يتم العثور على مؤسسة</CardTitle>
            <CardDescription>
              يبدو أنك لست جزءًا من أي مؤسسة. قم بإنشاء مؤسسة للبدء.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <a href="/organization/setup">إنشاء مؤسسة</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إعدادات المؤسسة</h1>
            <p className="text-muted-foreground">
              إدارة إعدادات وخصائص مؤسستك
            </p>
          </div>
          <Badge variant={isOrgAdmin ? "default" : "outline"}>
            {isOrgAdmin ? 'مسؤول المؤسسة' : 'عضو'}
          </Badge>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>المعلومات العامة</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>المستخدمون</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>الاشتراك</span>
            </TabsTrigger>
          </TabsList>

          {/* علامة تبويب المعلومات العامة */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>معلومات المؤسسة</CardTitle>
                <CardDescription>
                  قم بتحديث معلومات وبيانات مؤسستك
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...organizationForm}>
                  <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-4">
                    <FormField
                      control={organizationForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المؤسسة*</FormLabel>
                          <FormControl>
                            <Input placeholder="اسم المؤسسة" {...field} disabled={!isOrgAdmin} />
                          </FormControl>
                          <FormDescription>
                            اسم مؤسستك الذي سيظهر في الفواتير والتقارير
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={organizationForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وصف المؤسسة</FormLabel>
                          <FormControl>
                            <Textarea placeholder="وصف مختصر للمؤسسة" {...field} disabled={!isOrgAdmin} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={organizationForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نطاق الويب</FormLabel>
                            <FormControl>
                              <Input placeholder="example.com" {...field} disabled={!isOrgAdmin} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={organizationForm.control}
                        name="logo_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رابط الشعار</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} disabled={!isOrgAdmin} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {isOrgAdmin && (
                      <Button type="submit" disabled={isSubmittingOrg}>
                        {isSubmittingOrg ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            حفظ التغييرات
                          </>
                        )}
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* علامة تبويب المستخدمين */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
                <CardDescription>
                  إدارة المستخدمين في مؤسستك ودعوة أعضاء جدد
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOrgAdmin && (
                  <>
                    <h3 className="text-lg font-medium mb-4">دعوة مستخدم جديد</h3>
                    <Form {...inviteForm}>
                      <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={inviteForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>البريد الإلكتروني*</FormLabel>
                                <FormControl>
                                  <Input placeholder="user@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={inviteForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الدور*</FormLabel>
                                <FormControl>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...field}
                                  >
                                    <option value="admin">مسؤول</option>
                                    <option value="employee">موظف</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button type="submit" disabled={isSubmittingInvite}>
                          {isSubmittingInvite ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              جاري إرسال الدعوة...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              دعوة مستخدم
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>

                    <Separator className="my-6" />
                  </>
                )}
                
                <h3 className="text-lg font-medium mb-4">المستخدمون في المؤسسة</h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 p-4 font-medium border-b">
                    <div>المستخدم</div>
                    <div>البريد الإلكتروني</div>
                    <div>الدور</div>
                    <div>الحالة</div>
                  </div>
                  
                  <div className="divide-y">
                    {isLoadingUsers ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        جاري تحميل المستخدمين...
                      </div>
                    ) : users.length > 0 ? (
                      users.map((user) => (
                        <div key={user.id} className="grid grid-cols-4 p-4">
                          <div>{user.name || 'مستخدم مجهول'}</div>
                          <div>{user.email}</div>
                          <div>
                            <Badge variant={user.is_org_admin ? 'default' : 'outline'}>
                              {user.is_org_admin ? 'مسؤول' : 'موظف'}
                            </Badge>
                          </div>
                          <div>
                            <Badge variant={user.is_active ? 'default' : 'destructive'} className={user.is_active ? 'bg-green-100 text-green-800' : ''}>
                              {user.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        لا يوجد مستخدمون في هذه المؤسسة حتى الآن.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* علامة تبويب الاشتراك */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الاشتراك</CardTitle>
                <CardDescription>
                  إدارة اشتراك مؤسستك وخطة الدفع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">الخطة الحالية</h4>
                      <p className="text-lg font-semibold">
                        {currentOrganization.subscription_tier === 'free' ? 'الخطة المجانية' : 'الخطة المدفوعة'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">حالة الاشتراك</h4>
                      <Badge variant={currentOrganization.subscription_status === 'active' ? 'default' : 'destructive'}>
                        {currentOrganization.subscription_status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>

                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">ترقية الاشتراك</h3>
                    <p className="text-muted-foreground mb-4">
                      قم بترقية اشتراكك للحصول على ميزات إضافية وزيادة الحد الأقصى للمستخدمين
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-muted/50">
                        <CardHeader>
                          <CardTitle>الخطة المجانية</CardTitle>
                          <CardDescription>للشركات الصغيرة والناشئة</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">0 د.ج</p>
                          <ul className="mt-4 space-y-2 text-sm">
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>حتى 5 مستخدمين</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>إدارة المنتجات الأساسية</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>نقطة بيع أساسية</span>
                            </li>
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full" disabled>الخطة الحالية</Button>
                        </CardFooter>
                      </Card>
                      
                      <Card className="border-primary">
                        <CardHeader>
                          <CardTitle>الخطة المتقدمة</CardTitle>
                          <CardDescription>للشركات المتوسطة</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">4,999 د.ج / شهريًا</p>
                          <ul className="mt-4 space-y-2 text-sm">
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>حتى 15 مستخدمًا</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>تقارير متقدمة</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>إدارة المخزون المتقدمة</span>
                            </li>
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button className="w-full">ترقية</Button>
                        </CardFooter>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>الخطة الاحترافية</CardTitle>
                          <CardDescription>للشركات الكبيرة</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">9,999 د.ج / شهريًا</p>
                          <ul className="mt-4 space-y-2 text-sm">
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>مستخدمون غير محدودين</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>تكامل API مخصص</span>
                            </li>
                            <li className="flex items-center">
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              <span>دعم على مدار الساعة</span>
                            </li>
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full">ترقية</Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default OrganizationSettings; 