import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionService } from '@/lib/subscription-service';
import { supabase } from '@/lib/supabase';
import { useOrganizationSubscriptions } from '@/contexts/OrganizationDataContext';
import { 
  cacheSubscriptionStatus,
  clearPermissionsCache
} from '@/lib/PermissionsCache';

interface SubscriptionCheckProps {
  children: React.ReactNode;
}

// واجهة المؤسسة بالإعدادات الإضافية
interface OrganizationWithSettings {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_id: string | null;
  created_at: string;
  settings?: {
    theme?: string;
    logo_url?: string | null;
    primary_color?: string;
    trial_end_date?: string;
  };
}

interface SubscriptionInfo {
  isActive: boolean;
  status: string;
  message: string;
  endDate?: string;
  daysLeft?: number;
}

const SubscriptionCheck: React.FC<SubscriptionCheckProps> = ({ children }) => {
  const { organization, refreshOrganizationData } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasChecked, setHasChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // جلب الاشتراكات من السياق في المستوى الأعلى
  const { subscriptions: contextSubscriptions } = useOrganizationSubscriptions();

  // دالة مساعدة لتحديث بيانات المؤسسة مع معالجة أفضل للأخطاء
  const updateOrganizationSafely = async (orgId: string, updateData: any) => {
    try {
      // التأكد من وجود orgId صالح
      if (!orgId || typeof orgId !== 'string') {
        return false;
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', orgId)
        .select('id') // إضافة select للتأكد من نجاح العملية
        .single(); // التأكد من تحديث صف واحد فقط
      
      if (updateError) {
        // إذا فشل التحديث بسبب الصلاحيات، تجاهل الخطأ
        if (updateError.code === '42501' || 
            updateError.code === 'PGRST301' ||
            updateError.message?.includes('permission') || 
            updateError.message?.includes('policy')) {
          return true; // اعتبار العملية ناجحة
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    // تجاهل التحقق إذا كان المستخدم في صفحة الاشتراك بالفعل
    if (window.location.pathname.includes('/dashboard/subscription')) {
      return;
    }

    // عدم التحقق إذا تم التحقق بالفعل أو إذا كان التحقق جارياً
    if (hasChecked || isChecking) {
      return;
    }

    // التحقق من حالة الاشتراك
    const checkSubscription = async () => {
      if (!organization) {
        return;
      }

      try {
        setIsChecking(true);
        setHasChecked(true);

        const org = organization as unknown as OrganizationWithSettings;

        // أولاً: استخدام البيانات من OrganizationDataContext بدلاً من استدعاء جديد
        let hasValidSubscription = false;
        
        // استخدام البيانات الموجودة من OrganizationDataContext
        const activeSubscriptions = contextSubscriptions || [];

        // فلترة الاشتراكات يدوياً للتأكد من عدم انتهاء الصلاحية  
        const validActiveSubscriptions = (Array.isArray(activeSubscriptions) ? activeSubscriptions : []).filter((sub: any) => {
          if (!sub.end_date) return false;
          return new Date(sub.end_date) > new Date();
        });

        if (validActiveSubscriptions.length > 0) {
          const subscription = validActiveSubscriptions[0] as any;
          const endDate = new Date(subscription.end_date);
          const now = new Date();

          if (endDate > now) {
            hasValidSubscription = true;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: subscription.status,
              message: `اشتراك نشط في الخطة ${subscription.plan_name || 'المتميزة'}`,
              endDate: subscription.end_date,
              daysLeft
            };
            
            // تخزين النتيجة في التخزين المؤقت
            cacheSubscriptionStatus(subscriptionInfo);

            // تحديث بيانات المؤسسة إذا لزم الأمر
            if (org.subscription_id !== subscription.id || 
                org.subscription_status !== subscription.status || 
                org.subscription_tier !== (subscription.plan_code || 'premium')) {
              try {
                const updateData = {
                  subscription_id: subscription.id,
                  subscription_status: subscription.status,
                  subscription_tier: subscription.plan_code || 'premium'
                };
                
                const updateResult = await updateOrganizationSafely(org.id, updateData);
                
                if (updateResult) {
                  return; // إنهاء التحقق - الاشتراك صالح
                }
              } catch (updateError) {
              }
            }
            
            return; // إنهاء التحقق - الاشتراك صالح
          }
        }

        // ثانياً: التحقق من الاشتراكات التجريبية
        if (!hasValidSubscription) {
          const { data: trialSubscriptions } = await supabase
            .from('organization_subscriptions')
            .select('*')
            .eq('organization_id', org.id)
            .eq('status', 'trial')
            .order('created_at', { ascending: false });

          // فلترة الاشتراكات التجريبية يدوياً
          const validTrialSubscriptions = (Array.isArray(trialSubscriptions) ? trialSubscriptions : []).filter(sub => {
            if (!sub.end_date) return false;
            return new Date(sub.end_date) > new Date();
          });

          if (validTrialSubscriptions.length > 0) {
            const subscription = validTrialSubscriptions[0];
            const endDate = new Date(subscription.end_date);
            const now = new Date();

            if (endDate > now) {
              hasValidSubscription = true;
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              const subscriptionInfo: SubscriptionInfo = {
                isActive: true,
                status: 'trial',
                message: `فترة تجريبية نشطة (${daysLeft} يوم متبقية)`,
                endDate: subscription.end_date,
                daysLeft
              };
              
              cacheSubscriptionStatus(subscriptionInfo);
              return;
            }
          }
        }

        // ثالثاً: التحقق من الفترة التجريبية التقليدية (5 أيام)
        if (!hasValidSubscription) {
          let isTrialActive = false;
          let daysLeft = 0;
          
          if (org.settings?.trial_end_date) {
            const trialEndDate = new Date(org.settings.trial_end_date);
            const now = new Date();
            
            const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
            const nowDateOnly = new Date(now.setHours(0, 0, 0));
            
            isTrialActive = trialEndDateOnly >= nowDateOnly;
            daysLeft = Math.ceil((trialEndDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            // استخدام الطريقة القديمة (5 أيام من تاريخ الإنشاء)
            const trialResult = SubscriptionService.checkTrialStatus(org.created_at);
            isTrialActive = trialResult.isTrialActive;
            daysLeft = trialResult.daysLeft;
          }
          
          if (isTrialActive && daysLeft > 0) {
            hasValidSubscription = true;
            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`,
              daysLeft
            };
            
            cacheSubscriptionStatus(subscriptionInfo);
            
            // تحديث حالة المؤسسة
            if (org.subscription_status !== 'trial' || 
                org.subscription_tier !== 'trial' || 
                org.subscription_id !== null) {
              try {
                const updateData = {
                  subscription_status: 'trial',
                  subscription_tier: 'trial',
                  subscription_id: null
                };
                
                const updateResult = await updateOrganizationSafely(org.id, updateData);
                
                if (updateResult) {
                  return;
                }
              } catch (updateError) {
              }
            }
            
            return;
          }
        }

        // إذا وصلنا لهنا، فلا يوجد اشتراك صالح
        
        // حذف التخزين المؤقت
        clearPermissionsCache();
        
        const subscriptionInfo: SubscriptionInfo = {
          isActive: false,
          status: 'expired',
          message: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية'
        };

        cacheSubscriptionStatus(subscriptionInfo);

        // تحديث حالة المؤسسة إلى expired
        if (org.subscription_status !== 'expired' || 
            org.subscription_tier !== 'free' || 
            org.subscription_id !== null) {
          try {
            const updateData = {
              subscription_status: 'expired',
              subscription_tier: 'free',
              subscription_id: null
            };
            
            const updateResult = await updateOrganizationSafely(org.id, updateData);
            
            if (updateResult) {
            }
          } catch (updateError) {
          }
        }

        // إعادة التوجيه إلى صفحة الاشتراك
        navigate('/dashboard/subscription');

      } catch (error) {
        
        // في حالة الخطأ، السماح بالوصول بناءً على بيانات المؤسسة
        const org = organization as unknown as OrganizationWithSettings;
        
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          const errorInfo: SubscriptionInfo = {
            isActive: true,
            status: org.subscription_status,
            message: 'تم السماح بالوصول بناءً على بيانات المؤسسة (وضع الطوارئ)'
          };
          cacheSubscriptionStatus(errorInfo);
        } else {
          navigate('/dashboard/subscription');
        }
      } finally {
        setIsChecking(false);
      }
    };

    // إضافة debouncing لتجنب الطلبات المتكررة في React Strict Mode
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    checkTimeoutRef.current = setTimeout(() => {
      checkSubscription();
    }, 100); // انتظار 100ms قبل تنفيذ الفحص

    // تنظيف timeout عند إلغاء المكون
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [organization?.id, navigate, refreshOrganizationData, hasChecked, isChecking]);

  // إعادة تعيين hasChecked عند تغيير المؤسسة
  useEffect(() => {
    setHasChecked(false);
    setIsChecking(false);
  }, [organization?.id]);

  return <>{children}</>;
};

export default SubscriptionCheck;
