import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { PlanCard } from '@/components/super-admin/subscriptions/PlanCard';
import { EditPlanDialog } from '@/components/super-admin/subscriptions/EditPlanDialog';
import { CreatePlanDialog } from '@/components/super-admin/subscriptions/CreatePlanDialog';
import { SubscriptionAnalytics } from '@/components/super-admin/subscriptions/SubscriptionAnalytics';
import { SubscriptionPlan, SubscriptionAnalytics as SubscriptionAnalyticsType } from '@/types/subscription';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// بيانات تحليلية مؤقتة للعرض
const mockAnalytics: SubscriptionAnalyticsType = {
  total_subscriptions: 98,
  active_subscriptions: 95,
  monthly_revenue: 582575,
  yearly_revenue: 2395050,
  plan_distribution: [
    { plan: 'أساسي', count: 45, percentage: 45.9 },
    { plan: 'متميز', count: 35, percentage: 35.7 },
    { plan: 'مؤسسات', count: 18, percentage: 18.4 }
  ],
  recent_subscriptions: [
    { organization: 'شركة التقنية المتطورة', plan: 'مؤسسات', date: '2023-08-25T14:30:00', amount: 199990 },
    { organization: 'متجر الإلكترونيات الحديثة', plan: 'أساسي', date: '2023-08-22T11:45:00', amount: 3999 },
    { organization: 'شركة التسويق الرقمي', plan: 'متميز', date: '2023-08-20T16:20:00', amount: 9999 },
    { organization: 'مؤسسة الحلول الذكية', plan: 'متميز', date: '2023-08-15T14:30:00', amount: 99990 },
    { organization: 'مركز الخدمات المالية', plan: 'أساسي', date: '2023-08-12T08:15:00', amount: 3999 }
  ]
};

export default function SuperAdminSubscriptions() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب خطط الاشتراك عند تحميل الصفحة
  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);
  
  // جلب خطط الاشتراك من قاعدة البيانات
  const fetchSubscriptionPlans = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        setPlans(data);
      } else {
        // إذا لم تكن هناك خطط، استخدم البيانات المؤقتة
        setPlans([
          {
            id: '1',
            name: 'تجريبي',
            code: 'trial',
            description: 'تجربة مجانية كاملة الميزات لمدة 5 أيام',
            features: [
              'نقطة بيع واحدة',
              'حتى 3 مستخدمين',
              'حتى 100 منتج',
              'ميزات أساسية',
              'الدعم عبر البريد الإلكتروني'
            ],
            monthly_price: 0,
            yearly_price: 0,
            trial_period_days: 5,
            limits: {
              max_users: 3,
              max_products: 100,
              max_pos: 1
            },
            is_active: true,
            is_popular: false,
            display_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'أساسي',
            code: 'basic',
            description: 'للشركات الصغيرة والمتاجر الفردية',
            features: [
              'نقطة بيع واحدة',
              'حتى 3 مستخدمين',
              'حتى 100 منتج',
              'التقارير الأساسية',
              'الدعم الفني عبر البريد الإلكتروني'
            ],
            monthly_price: 3999,
            yearly_price: 39990,
            trial_period_days: 5,
            limits: {
              max_users: 3,
              max_products: 100,
              max_pos: 1
            },
            is_active: true,
            is_popular: false,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            name: 'متميز',
            code: 'premium',
            description: 'للشركات المتوسطة والمتاجر المتعددة',
            features: [
              'حتى 3 نقاط بيع',
              'حتى 10 مستخدمين',
              'حتى 500 منتج',
              'التقارير المتقدمة',
              'إدارة المخزون المتقدمة',
              'الدعم الفني على مدار الساعة',
              'تكامل مع منصات البيع الإلكتروني'
            ],
            monthly_price: 9999,
            yearly_price: 99990,
            trial_period_days: 5,
            limits: {
              max_users: 10,
              max_products: 500,
              max_pos: 3
            },
            is_active: true,
            is_popular: true,
            display_order: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '4',
            name: 'مؤسسات',
            code: 'enterprise',
            description: 'للشركات الكبيرة والسلاسل التجارية',
            features: [
              'عدد غير محدود من نقاط البيع',
              'عدد غير محدود من المستخدمين',
              'عدد غير محدود من المنتجات',
              'جميع الميزات المتقدمة',
              'دعم فني ومدير حساب مخصص',
              'تخصيص كامل للنظام',
              'API للتكامل مع الأنظمة الأخرى',
              'تدريب فريق العمل'
            ],
            monthly_price: 19999,
            yearly_price: 199990,
            trial_period_days: 5,
            limits: {
              max_users: null,
              max_products: null,
              max_pos: null
            },
            is_active: true,
            is_popular: false,
            display_order: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // معالجة تحرير خطة
  const handleEditPlan = (plan: SubscriptionPlan) => {
    setCurrentPlan(plan);
    setEditDialogOpen(true);
  };
  
  // معالجة تحديث خطة
  const handleUpdatePlan = async (updatedPlan: SubscriptionPlan) => {
    try {
      // في بيئة الإنتاج، سيتم تحديث الخطة في قاعدة البيانات
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: updatedPlan.name,
          code: updatedPlan.code,
          description: updatedPlan.description,
          features: updatedPlan.features,
          monthly_price: updatedPlan.monthly_price,
          yearly_price: updatedPlan.yearly_price,
          trial_period_days: updatedPlan.trial_period_days,
          limits: updatedPlan.limits,
          is_active: updatedPlan.is_active,
          is_popular: updatedPlan.is_popular,
          display_order: updatedPlan.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedPlan.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPlans(plans.map(plan => 
        plan.id === updatedPlan.id ? updatedPlan : plan
      ));
      
      // إغلاق مربع الحوار
      setEditDialogOpen(false);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم تحديث الخطة",
        description: `تم تحديث خطة "${updatedPlan.name}" بنجاح.`,
      });
    } catch (err: any) {
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الخطة",
        description: err.message,
      });
    }
  };
  
  // معالجة إنشاء خطة جديدة
  const handleCreatePlan = async (newPlan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // في بيئة الإنتاج، سيتم إضافة الخطة في قاعدة البيانات
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          ...newPlan,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      const createdPlan = data[0] as SubscriptionPlan;
      setPlans([...plans, createdPlan]);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم إنشاء الخطة",
        description: `تم إنشاء خطة "${newPlan.name}" بنجاح.`,
      });
    } catch (err: any) {
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الخطة",
        description: err.message,
      });
    }
  };
  
  // معالجة تغيير حالة التفعيل
  const handleToggleActive = async (plan: SubscriptionPlan, isActive: boolean) => {
    try {
      // في بيئة الإنتاج، سيتم تحديث الحالة في قاعدة البيانات
      const { error } = await supabase
        .from('subscription_plans')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPlans(plans.map(p => 
        p.id === plan.id ? { ...p, is_active: isActive } : p
      ));
      
      // إظهار رسالة نجاح
      toast({
        title: isActive ? "تم تفعيل الخطة" : "تم إلغاء تفعيل الخطة",
        description: `تم ${isActive ? 'تفعيل' : 'إلغاء تفعيل'} خطة "${plan.name}" بنجاح.`,
      });
    } catch (err: any) {
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في تغيير حالة الخطة",
        description: err.message,
      });
    }
  };
  
  // معالجة حذف خطة
  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    // لا يمكن حذف الخطط النشطة
    if (plan.is_active) return;
    
    if (!window.confirm(`هل أنت متأكد من حذف خطة "${plan.name}"؟`)) return;
    
    try {
      // في بيئة الإنتاج، سيتم حذف الخطة من قاعدة البيانات
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', plan.id);
      
      if (error) throw error;
      
      // تحديث الحالة المحلية
      setPlans(plans.filter(p => p.id !== plan.id));
      
      // إظهار رسالة نجاح
      toast({
        title: "تم حذف الخطة",
        description: `تم حذف خطة "${plan.name}" بنجاح.`,
      });
    } catch (err: any) {
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "خطأ في حذف الخطة",
        description: err.message,
      });
    }
  };
  
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة الاشتراكات</h1>
            <p className="text-muted-foreground mt-1">تعريف وإدارة خطط الاشتراك والتسعير</p>
          </div>
          <CreatePlanDialog onCreatePlan={handleCreatePlan} />
        </div>
        
        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">الخطط والتسعير</TabsTrigger>
            <TabsTrigger value="analytics">تحليلات الاشتراكات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plans" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-2">حدث خطأ أثناء تحميل البيانات</p>
                <p className="text-gray-500">{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PlanCard 
                    key={plan.id} 
                    plan={plan} 
                    onEdit={handleEditPlan} 
                    onDelete={handleDeletePlan}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics">
            <SubscriptionAnalytics analytics={mockAnalytics} />
          </TabsContent>
        </Tabs>
        
        {/* مربع حوار تعديل الخطة */}
        <EditPlanDialog 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen} 
          plan={currentPlan}
          onSave={handleUpdatePlan}
        />
      </div>
    </SuperAdminLayout>
  );
}
