import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Clock, Check, AlertTriangle } from 'lucide-react';

// مكونات UI
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// مكونات مخصصة
import SubscriptionCard from '@/components/subscription/SubscriptionCard';
import SubscriptionDialog from '@/components/subscription/SubscriptionDialog';
import ActivateWithCode from './ActivateWithCode';
import TrialStatusCard from '@/components/subscription/TrialStatusCard';
import SubscriptionDebug from '@/components/debug/SubscriptionDebug';

// أنواع البيانات
interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[] | any; // دعم لـ Json types
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: {
    max_users?: number;
    max_products?: number;
    max_pos?: number;
  } | any; // دعم لـ Json types
  is_active: boolean;
  is_popular: boolean;
}

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_id: string | null;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  plan?: SubscriptionPlan;
  [key: string]: any; // للسماح بإضافة خصائص أخرى من قاعدة البيانات
}

const SubscriptionPage = () => {
  const { user, organization } = useAuth();
  const { refreshOrganizationData } = useTenant();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [daysLeft, setDaysLeft] = useState(0);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  // محاولة تحديث بيانات المؤسسة عند تحميل الصفحة إذا كانت قيمتها فارغة
  useEffect(() => {
    if (!organization) {
      refreshOrganizationData();
      
      // استخدام معرف المؤسسة من localStorage مباشرة
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId) {
        setOrganizationId(storedOrgId);
        
        // محاولة جلب الاشتراك مباشرة باستخدام معرف المؤسسة من localStorage
        fetchActiveSubscription(storedOrgId);
      }
    } else {
      setOrganizationId(organization.id);
    }
  }, [organization?.id]); // استخدام organization.id فقط

  // دالة لجلب الاشتراك النشط مباشرة من قاعدة البيانات
  const fetchActiveSubscription = async (orgId: string) => {
    if (!orgId) {
      return;
    }

    try {
      // استخدام نهج أبسط للاستعلام لمعالجة خطأ 406
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*');
        
      if (error) {
        setLoading(false);
        return;
      }
      
      // تصفية النتائج يدويًا
      const activeSubscriptions = data
        .filter(sub => sub.organization_id === orgId && sub.status === 'active')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const subscriptionData = activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;
        
      if (subscriptionData) {
        // تحديث بيانات المؤسسة بمعرف الاشتراك المكتشف
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_id: subscriptionData.id,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId);
          
        if (!updateError) {
          await refreshOrganizationData();
        }
        
        // استمر بجلب بيانات الاشتراك
        fetchSubscriptionDetails(subscriptionData.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  // دالة جديدة لجلب تفاصيل الاشتراك
  const fetchSubscriptionDetails = async (subscriptionId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:plan_id (
            id, name, code, description, features, 
            monthly_price, yearly_price, trial_period_days, limits,
            is_active, is_popular
          )
        `)
        .eq('id', subscriptionId)
        .single();

      if (error) {
        setLoading(false);
        return;
      }
      
      setCurrentSubscription(data);
      
      // حساب الأيام المتبقية
      if (data.end_date) {
        const endDate = new Date(data.end_date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, diffDays);
        setDaysLeft(remainingDays);
      }
      
      setLoading(false);
      
    } catch (error) {
      setLoading(false);
    }
  };

  // تحديث البيانات عند تغيير المعلمات في URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('refresh')) {
      refreshOrganizationData();
    }
  }, [window.location.search]); // إزالة refreshOrganizationData

  // جلب خطط الاشتراك
  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .not('code', 'in', '(trial,free)')
          .order('display_order', { ascending: true });

        if (error) throw error;
        setPlans((data || []) as SubscriptionPlan[]);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionPlans();
  }, []);

  // جلب الاشتراك الحالي
  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      if (!organization) {
        console.log('⚠️ لا توجد بيانات مؤسسة - تجاهل جلب الاشتراك');
        return;
      }
      
      console.log('🔍 بدء جلب الاشتراك الحالي للمؤسسة:', {
        organizationId: organization.id,
        currentSubscriptionStatus: organization.subscription_status,
        currentSubscriptionId: organization.subscription_id,
        timestamp: new Date().toLocaleTimeString()
      });
      
      try {
        setLoading(true);
        
        // جلب الاشتراك النشط مباشرة بدلاً من الاعتماد على subscription_id
        const { data, error } = await supabase
          .from('organization_subscriptions')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
          
        console.log('🔍 نتائج استعلام الاشتراك:', {
          data: data,
          error: error,
          dataLength: data?.length || 0,
          timestamp: new Date().toLocaleTimeString()
        });
          
        if (error) {
          console.error('❌ خطأ في جلب الاشتراك:', error);
          setLoading(false);
          return;
        }

        const activeSubscription = data && data.length > 0 ? data[0] : null;
        
        // إذا وُجد اشتراك نشط، جلب بيانات الخطة منفصلة
        if (activeSubscription) {
          const { data: planData, error: planError } = await supabase
            .from('subscription_plans')
            .select('id, name, code, description, features, monthly_price, yearly_price, trial_period_days, limits, is_active, is_popular')
            .eq('id', activeSubscription.plan_id)
            .single();
            
          if (!planError && planData) {
            (activeSubscription as any).plan = planData;
          }
        }
        
        if (activeSubscription) {
          console.log('✅ تم العثور على اشتراك نشط:', activeSubscription);
          
          // تأكد من اختيار الدورة الفوترية الصحيحة
          if (activeSubscription.billing_cycle) {
            setSelectedBillingCycle(activeSubscription.billing_cycle as 'monthly' | 'yearly');
          }
          
          setCurrentSubscription(activeSubscription);

          // حساب الأيام المتبقية في الاشتراك
          if (activeSubscription.end_date) {
            const endDate = new Date(activeSubscription.end_date);
            const today = new Date();
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const remainingDays = Math.max(0, diffDays);
            setDaysLeft(remainingDays);
          }
          
          // تحديث organization.subscription_id إذا كان مختلفاً (بدون إعادة تحميل)
          if (organization.subscription_id !== activeSubscription.id) {
            console.log('🔄 تحديث subscription_id في المؤسسة');
            const { error: updateError } = await supabase
              .from('organizations')
              .update({
                subscription_id: activeSubscription.id,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', organization.id);
              
            if (updateError) {
              console.error('❌ خطأ في تحديث subscription_id:', updateError);
            } else {
              console.log('✅ تم تحديث subscription_id بنجاح');
              // تجنب استدعاء refreshOrganizationData هنا لمنع الحلقة اللانهائية
              // refreshOrganizationData();
            }
          }
        } else {
          console.log('⚠️ لم يتم العثور على اشتراك نشط لهذه المؤسسة:', organization.id);
          setCurrentSubscription(null);
        }
        
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    
    // تنفيذ دالة جلب الاشتراك الحالي
    fetchCurrentSubscription();
  }, [organization?.id]); // استخدام organization.id فقط لتجنب الحلقات اللانهائية

  // التحقق من حالة الفترة التجريبية
  useEffect(() => {
    if (organization) {
      const isNewOrganization = organization.subscription_status === 'trial';
      const createdDate = new Date(organization.created_at);
      const today = new Date();
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // الفترة التجريبية 5 أيام
      const trialDays = 5;
      const remainingDays = trialDays - diffDays;
      
      setIsTrialActive(isNewOrganization && remainingDays > 0);
      if (isNewOrganization && remainingDays > 0) {
        setDaysLeft(remainingDays);
      }
    }
  }, [organization?.id, organization?.subscription_status, organization?.created_at]); // dependencies محددة

  // فتح نافذة الاشتراك
  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  // تغيير خطة الاشتراك
  const handleChangePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  // تنسيق التاريخ مع معالجة الأخطاء
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return 'غير محدد';
    }
    
    try {
      const date = new Date(dateString);
      
      // فحص صحة التاريخ
      if (isNaN(date.getTime())) {
        return 'تاريخ غير صالح';
      }
      
      return format(date, 'yyyy-MM-dd', { locale: ar });
    } catch (error) {
      return 'خطأ في التاريخ';
    }
  };

  // تنسيق السعر
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar', {
      style: 'decimal',
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(price) + ' دج';
  };

  // دالة لتحديد ما إذا كانت الخطة هي الخطة الحالية
  const isCurrentPlan = (planId: string, billingCycle: string) => {
    if (!currentSubscription) return false;
    
    // استخدام plan_id بدلاً من plan?.id لأن plan قد يكون غير معرف
    return currentSubscription.plan_id === planId && 
           currentSubscription.billing_cycle === billingCycle && 
           currentSubscription.status === 'active';
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">إدارة الاشتراك</h1>
            <p className="text-muted-foreground mt-2">
              إدارة اشتراكك وخطط الدفع
            </p>
          </div>

          {/* مكون التشخيص المؤقت */}
          <SubscriptionDebug />
          
          {/* تشخيص سريع */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4 text-sm">
            <h3 className="font-bold mb-2">تشخيص سريع:</h3>
            <p><strong>Organization ID:</strong> {organization?.id}</p>
            <p><strong>Subscription Status:</strong> {organization?.subscription_status}</p>
            <p><strong>Current Subscription:</strong> {currentSubscription ? 'موجود' : 'غير موجود'}</p>
            <p><strong>Subscription ID:</strong> {currentSubscription?.id}</p>
            <p><strong>Plan Name:</strong> {(currentSubscription as any)?.plan?.name}</p>
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 mb-6">
        <div>
          <h1 className="text-2xl font-bold">الاشتراك</h1>
          <p className="text-muted-foreground">إدارة اشتراكك واختيار الخطة المناسبة لاحتياجاتك</p>
          
          {/* تشخيص سريع */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4 text-sm">
            <h3 className="font-bold mb-2 text-blue-800">حالة الاشتراك:</h3>
            <div className="grid grid-cols-2 gap-2">
              <p><strong>Organization:</strong> {organization?.name}</p>
              <p><strong>Status:</strong> {organization?.subscription_status}</p>
              <p><strong>Current Sub:</strong> {currentSubscription ? '✅ موجود' : '❌ غير موجود'}</p>
              <p><strong>Sub Status:</strong> {currentSubscription?.status}</p>
              <p><strong>Plan:</strong> {(currentSubscription as any)?.plan?.name || 'غير محدد'}</p>
              <p><strong>Loading:</strong> {loading ? 'نعم' : 'لا'}</p>
            </div>
          </div>
        </div>

        {/* عرض معلومات عن الفترة التجريبية إذا كانت حالة الاشتراك trial */}
        {organization?.subscription_status === 'trial' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <TrialStatusCard onSelectPlan={() => setShowPlans(true)} />
            </div>
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>ما بعد الفترة التجريبية</CardTitle>
                  <CardDescription>
                    ستحتاج إلى اختيار خطة تناسب احتياجاتك
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">اختر خطة تناسب احتياجاتك</h3>
                        <p className="text-sm text-muted-foreground">
                          نقدم خططًا متنوعة لتلبية احتياجات مختلف أنواع الأعمال والمتاجر
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">استمتع بالدعم الفني المستمر</h3>
                        <p className="text-sm text-muted-foreground">
                          جميع خطط الاشتراك تتضمن الدعم الفني لضمان تجربة سلسة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">إمكانية الترقية في أي وقت</h3>
                        <p className="text-sm text-muted-foreground">
                          يمكنك ترقية خطتك في أي وقت إذا احتجت إلى المزيد من الميزات
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => setShowPlans(true)} variant="outline" className="w-full">
                    عرض خطط الاشتراك
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* عرض معلومات الاشتراك الحالي إذا كان نشطًا */}
        {(currentSubscription && currentSubscription.status === 'active') && (
          <div className="space-y-6">
            <Card className="mb-6 sm:mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">حالة الاشتراك الحالي</CardTitle>
                <CardDescription>
                  {currentSubscription 
                    ? `أنت مشترك حالياً في الخطة ${currentSubscription.plan?.name || 'غير محددة'}`
                    : isTrialActive 
                      ? 'أنت حالياً في الفترة التجريبية المجانية'
                      : 'ليس لديك اشتراك نشط حالياً'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                {currentSubscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Badge className="mr-2" variant={currentSubscription.status === 'active' ? 'default' : 'destructive'}>
                        {currentSubscription.status === 'active' ? 'نشط' : 'منتهي'}
                      </Badge>
                      <span>
                        {currentSubscription.billing_cycle === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-1">تاريخ البدء</h3>
                        <p dir="ltr">{formatDate(currentSubscription.start_date)}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-1">تاريخ الانتهاء</h3>
                        <p dir="ltr">{formatDate(currentSubscription.end_date)}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-1">الأيام المتبقية</h3>
                        <p className="font-bold">{daysLeft} يوم</p>
                      </div>
                    </div>

                    {daysLeft <= 7 && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4 ml-2" />
                        <AlertTitle>تنبيه بقرب انتهاء الاشتراك</AlertTitle>
                        <AlertDescription>
                          اشتراكك سينتهي خلال {daysLeft} يوم. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : isTrialActive ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Badge className="mr-2" variant="secondary">تجريبي</Badge>
                      <span>الفترة التجريبية المجانية</span>
                    </div>
                    
                    <Alert>
                      <Clock className="h-4 w-4 ml-2" />
                      <AlertTitle>فترة تجريبية</AlertTitle>
                      <AlertDescription>
                        لديك {daysLeft} يوم متبقي في فترتك التجريبية. بعد ذلك، ستحتاج إلى الاشتراك في إحدى خططنا للاستمرار في استخدام النظام.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 ml-2" />
                    <AlertTitle>لا يوجد اشتراك نشط</AlertTitle>
                    <AlertDescription>
                      ليس لديك اشتراك نشط حالياً. يرجى الاشتراك في إحدى خططنا للاستمرار في استخدام النظام.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              {currentSubscription && (
                <CardFooter>
                  <Button onClick={() => setDialogOpen(true)}>تجديد الاشتراك</Button>
                </CardFooter>
              )}
            </Card>
          </div>
        )}

        {/* عرض خطط الاشتراك */}
        {(showPlans || ((!currentSubscription || currentSubscription.status !== 'active') && organization?.subscription_status !== 'active' && organization?.subscription_status !== 'trial')) && !(currentSubscription && currentSubscription.status === 'active') && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">خطط الاشتراك</h2>
              <p className="text-muted-foreground">اختر الخطة المناسبة لاحتياجاتك وميزانيتك</p>
            </div>

            <Tabs defaultValue="monthly" value={selectedBillingCycle} onValueChange={(value) => setSelectedBillingCycle(value as 'monthly' | 'yearly')}>
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="monthly">شهري</TabsTrigger>
                  <TabsTrigger value="yearly">سنوي</TabsTrigger>
                </TabsList>
                <Badge variant="outline" className="bg-muted/50">
                  وفر 15% مع الاشتراك السنوي
                </Badge>
              </div>

              <div className="mt-6">
                <TabsContent value="monthly" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <SubscriptionCard
                        key={plan.id}
                        plan={plan}
                        billingCycle="monthly"
                        isCurrentPlan={isCurrentPlan(plan.id, 'monthly')}
                        onSubscribe={() => handleSubscribe(plan)}
                        onChangePlan={() => handleChangePlan(plan)}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="yearly" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <SubscriptionCard
                        key={plan.id}
                        plan={plan}
                        billingCycle="yearly"
                        isCurrentPlan={isCurrentPlan(plan.id, 'yearly')}
                        onSubscribe={() => handleSubscribe(plan)}
                        onChangePlan={() => handleChangePlan(plan)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {/* تفعيل باستخدام كود */}
        <div className="mt-8">
          <Separator className="my-8" />
          <h2 className="text-xl font-semibold mb-4">تفعيل باستخدام كود</h2>
          <ActivateWithCode onActivated={refreshOrganizationData} />
        </div>
      </div>

      {selectedPlan && (
        <SubscriptionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          plan={selectedPlan}
          billingCycle={selectedBillingCycle}
          organizationId={organization?.id ?? ''}
          onSubscriptionComplete={refreshOrganizationData}
        />
      )}
    </Layout>
  );
};

export default SubscriptionPage;
