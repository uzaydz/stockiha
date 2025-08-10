import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  PageHeader, 
  ActivePlanCard, 
  PlansList, 
  DistributionSettingsModal,
  SimulationCard
} from '@/components/order-distribution';
import { DistributionPlan, DistributionSettings, SimulationResult } from '@/types/orderDistribution';
import { Save, CheckCircle, Loader2, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const DISTRIBUTION_PLANS: DistributionPlan[] = [
  {
    id: 'round_robin',
    name: 'الطابور العادل',
    icon: '🌀',
    description: 'توزيع الطلبات بالتناوب بين جميع الموظفين بشكل متساوي',
    type: 'round_robin',
    isActive: false,
    lastModified: new Date()
  },
  {
    id: 'smart',
    name: 'الذكي Smart',
    icon: '🧠',
    description: 'توزيع يعتمد على مستوى الأداء والنشاط لكل موظف',
    type: 'smart',
    isActive: false,
    lastModified: new Date()
  },
  {
    id: 'availability',
    name: 'حسب الجاهزية',
    icon: '⚡',
    description: 'توزيع الطلبات على الموظفين المتصلين والمتاحين فقط',
    type: 'availability',
    isActive: false,
    lastModified: new Date()
  },
  {
    id: 'priority',
    name: 'الأولوية القصوى',
    icon: '🚀',
    description: 'توزيع للموظف المتفرغ بنسبة 100% وليس لديه مهام',
    type: 'priority',
    isActive: false,
    lastModified: new Date()
  },
  {
    id: 'expert',
    name: 'الخبير حسب المنتج',
    icon: '💼',
    description: 'توزيع الطلبات للموظف المختص بنوع المنتج المطلوب',
    type: 'expert',
    isActive: false,
    lastModified: new Date()
  }
];

export default function OrderDistributionSettings() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [plans, setPlans] = useState<DistributionPlan[]>(DISTRIBUTION_PLANS);
  const [activePlan, setActivePlan] = useState<DistributionPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DistributionPlan | null>(null);
  const [settings, setSettings] = useState<DistributionSettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // حالات الصلاحيات
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  
  // بيانات الموظفين والمنتجات
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // التحقق من الصلاحيات
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      setPermissionLoading(true);
      
      try {
        // التحقق من صلاحية عرض الموظفين
        const canView = await checkUserPermissions(user, 'viewEmployees' as any);
        setHasViewPermission(canView);
        
        // التحقق من صلاحية إدارة الموظفين
        const canManage = await checkUserPermissions(user, 'manageEmployees' as any);
        setHasManagePermission(canManage);
      } catch (error) {
        toast.error('حدث خطأ في التحقق من الصلاحيات');
      } finally {
        setPermissionLoading(false);
      }
    };
    
    checkPermissions();
  }, [user]);

  useEffect(() => {
    if (organization && hasViewPermission && !permissionLoading) {
      loadDistributionSettings();
      loadEmployees();
      loadProducts();
    }
  }, [organization, hasViewPermission, permissionLoading]);
  
  const loadEmployees = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, is_active')
        .eq('organization_id', organization.id)
        .in('role', ['employee', 'admin'])
        .order('name');
        
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
    }
  };
  
  const loadProducts = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, thumbnail_image, price, category')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      
      const formattedProducts = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        image_url: product.thumbnail_image,
        price: product.price,
        category: product.category
      }));
      
      setProducts(formattedProducts);
    } catch (error) {
    }
  };

  const loadDistributionSettings = async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_distribution_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (data && !error) {
        const activePlanId = data.active_plan_id;
        const updatedPlans = plans.map(plan => ({
          ...plan,
          isActive: plan.id === activePlanId,
          lastModified: plan.id === activePlanId ? new Date(data.updated_at) : plan.lastModified
        }));
        setPlans(updatedPlans);
        
        const active = updatedPlans.find(p => p.isActive);
        setActivePlan(active || null);
        setSelectedPlan(active || null);
        setSettings(data.settings || {});
        
        // تحديث الخطوة الحالية
        setCurrentStep(active ? 3 : 1);
      }
    } catch (error) {
      toast.error('حدث خطأ في تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: DistributionPlan) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (newSettings: DistributionSettings) => {
    if (!organization?.id || !selectedPlan || !hasManagePermission) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('order_distribution_settings')
        .upsert({
          organization_id: organization.id,
          active_plan_id: selectedPlan.id,
          active_plan_type: selectedPlan.type,
          settings: newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id'
        });

      if (error) throw error;

      const updatedPlans = plans.map(plan => ({
        ...plan,
        isActive: plan.id === selectedPlan.id,
        lastModified: plan.id === selectedPlan.id ? new Date() : plan.lastModified
      }));
      setPlans(updatedPlans);
      setActivePlan(selectedPlan);
      setSettings(newSettings);
      setShowSettingsModal(false);
      setCurrentStep(3);

      toast.success('تم حفظ الإعدادات بنجاح', {
        description: `تم تفعيل خطة ${selectedPlan.name}`,
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      });
    } catch (error) {
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const simulateDistribution = async (): Promise<SimulationResult> => {
    if (!selectedPlan) {
      return {
        employeeId: '',
        employeeName: 'غير محدد',
        reason: 'لا توجد خطة مختارة'
      };
    }

    // This is a mock simulation - in real implementation, this would call an API
    const mockEmployees = [
      { id: '1', name: 'أحمد محمد', performance: 0.95, activeOrders: 3, lastResponseTime: 15 },
      { id: '2', name: 'فاطمة علي', performance: 0.88, activeOrders: 5, lastResponseTime: 22 },
      { id: '3', name: 'محمد خالد', performance: 0.92, activeOrders: 2, lastResponseTime: 18 },
      { id: '4', name: 'نورا أحمد', performance: 0.85, activeOrders: 4, lastResponseTime: 25 }
    ];

    let selectedEmployee;
    let reason = '';

    switch (selectedPlan.type) {
      case 'round_robin':
        selectedEmployee = mockEmployees[Math.floor(Math.random() * mockEmployees.length)];
        reason = 'الدور التالي في الطابور';
        break;
        
      case 'smart':
        selectedEmployee = mockEmployees.reduce((prev, current) => 
          current.performance > prev.performance ? current : prev
        );
        reason = `أعلى معدل أداء (${(selectedEmployee.performance * 100).toFixed(0)}%)`;
        break;
        
      case 'priority':
        selectedEmployee = mockEmployees.reduce((prev, current) => 
          current.activeOrders < prev.activeOrders ? current : prev
        );
        reason = `أقل عدد طلبات نشطة (${selectedEmployee.activeOrders} طلبات)`;
        break;
        
      case 'availability':
        selectedEmployee = mockEmployees[Math.floor(Math.random() * 2)]; // فقط أول اثنين نشطين
        reason = 'متصل ومتاح للعمل';
        break;
        
      case 'expert':
        selectedEmployee = mockEmployees[Math.floor(Math.random() * mockEmployees.length)];
        reason = 'مختص بهذا النوع من المنتجات';
        break;
        
      default:
        selectedEmployee = mockEmployees[0];
        reason = 'التوزيع الافتراضي';
    }

    return {
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      reason
    };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0 pb-12">
        {/* عرض رسالة التحميل أثناء التحقق من الصلاحيات */}
        {permissionLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-3 text-base sm:text-lg">جاري التحميل...</span>
          </div>
        )}
        
        {/* عرض رسالة الخطأ إذا لم يكن لديه صلاحية */}
        {!hasViewPermission && !permissionLoading && (
          <Alert variant="destructive" className="mx-auto max-w-2xl shadow-lg">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold mb-2">غير مصرح</AlertTitle>
            <AlertDescription className="text-base">
              ليس لديك صلاحية لعرض صفحة إعدادات تقسيم الطلبيات. يرجى التواصل مع مدير النظام.
            </AlertDescription>
          </Alert>
        )}
        
        {/* عرض المحتوى إذا كان لديه صلاحية */}
        {hasViewPermission && !permissionLoading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            <motion.div variants={itemVariants}>
              <PageHeader currentStep={currentStep} />
            </motion.div>
            
            {/* عرض رسالة التحميل للبيانات */}
            {isLoading && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="mr-2 text-sm sm:text-base">جاري تحميل الإعدادات...</span>
              </div>
            )}
            
            {!isLoading && (
              <div className="space-y-8">
                <motion.div variants={itemVariants}>
                  <ActivePlanCard 
                    activePlan={activePlan} 
                    onChangePlan={() => {
                      if (hasManagePermission && activePlan) {
                        setSelectedPlan(activePlan);
                        setShowSettingsModal(true);
                      }
                    }} 
                  />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <motion.div 
                    variants={itemVariants}
                    className="lg:col-span-3"
                  >
                    <Card className="bg-gradient-to-br from-background to-muted/30 border-2 shadow-lg overflow-hidden relative">
                      <div className="absolute top-0 right-0 h-64 w-64 bg-gradient-to-bl from-primary/5 to-transparent dark:from-primary/2 rounded-bl-full" />
                      <CardContent className="pt-6 relative">
                        <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
                          خطط التوزيع المتاحة
                        </h2>
                        <PlansList 
                          plans={plans}
                          activePlanId={activePlan?.id || null}
                          onSelectPlan={hasManagePermission ? handleSelectPlan : () => {
                            toast.error('ليس لديك صلاحية تغيير خطة التوزيع');
                          }}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    {selectedPlan && (
                      <SimulationCard
                        plan={selectedPlan}
                        onSimulate={simulateDistribution}
                      />
                    )}
                  </motion.div>
                </div>
                
                {!hasManagePermission && (
                  <motion.div variants={itemVariants}>
                    <Alert className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 text-blue-800 dark:text-blue-300">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        يمكنك عرض تفاصيل الخطط فقط. لتغيير الإعدادات، يرجى التواصل مع مدير النظام.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
      
      {/* النافذة المنبثقة للإعدادات */}
      {selectedPlan && (
        <DistributionSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            if (!activePlan) setCurrentStep(1);
          }}
          plan={selectedPlan}
          settings={settings}
          onSave={handleSaveSettings}
          employees={employees}
          products={products}
        />
      )}
    </Layout>
  );
}
