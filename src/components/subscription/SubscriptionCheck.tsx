import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionService } from '@/lib/subscription-service';
import { supabase } from '@/lib/supabase';
import { useOrganizationSubscriptions } from '@/contexts/OrganizationDataContext';
import { 
  cacheSubscriptionStatus,
  getCachedSubscriptionStatus,
  refreshCache,
  clearPermissionsCache,
  validateCachedSubscription
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
  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();
  const navigate = useNavigate();
  const [hasChecked, setHasChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // استخدام البيانات من السياق المركزي
  const { subscriptions: cachedSubscriptions, isLoading: subscriptionsLoading, error: subscriptionsError } = useOrganizationSubscriptions();

  useEffect(() => {
    // تجاهل التحقق إذا كان المستخدم في صفحة الاشتراك بالفعل
    if (window.location.pathname.includes('/dashboard/subscription')) {
      return;
    }

    // عدم التحقق إذا تم التحقق بالفعل أو إذا كان التحقق جارياً
    if (hasChecked || isChecking) {
      return;
    }

    // انتظار تحميل البيانات من السياق
    if (subscriptionsLoading) {
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

        // أولاً: التحقق من الاشتراكات النشطة من قاعدة البيانات مباشرة
        let hasValidSubscription = false;
        
        // جلب الاشتراكات النشطة مباشرة من قاعدة البيانات
        const { data: activeSubscriptions, error: dbError } = await supabase
          .from('organization_subscriptions')
          .select(`
            *,
            plan:plan_id(id, name, code)
          `)
          .eq('organization_id', org.id)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (!dbError && activeSubscriptions && activeSubscriptions.length > 0) {
          const subscription = activeSubscriptions[0];
          const endDate = new Date(subscription.end_date);
          const now = new Date();

          if (endDate > now) {
            hasValidSubscription = true;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: subscription.status,
              message: `اشتراك نشط في الخطة ${subscription.plan?.name || 'المتميزة'}`,
              endDate: subscription.end_date,
              daysLeft
            };
            
            // تخزين النتيجة في التخزين المؤقت
            cacheSubscriptionStatus(subscriptionInfo);

            // تحديث بيانات المؤسسة إذا لزم الأمر
            if (org.subscription_id !== subscription.id || org.subscription_status !== subscription.status) {
              try {
                await supabase
                  .from('organizations')
                  .update({
                    subscription_id: subscription.id,
                    subscription_status: subscription.status,
                    subscription_tier: subscription.plan?.code || 'premium'
                  })
                  .eq('id', org.id);
                
                refreshOrganizationData();
              } catch (updateError) {
                console.error('خطأ في تحديث بيانات المؤسسة:', updateError);
              }
            }
            
            console.log('✅ تم العثور على اشتراك نشط صالح');
            return; // إنهاء التحقق - الاشتراك صالح
          }
        }

        // ثانياً: التحقق من الاشتراكات التجريبية
        if (!hasValidSubscription) {
          const { data: trialSubscriptions } = await supabase
            .from('organization_subscriptions')
            .select(`
              *,
              plan:plan_id(id, name, code)
            `)
            .eq('organization_id', org.id)
            .eq('status', 'trial')
            .gte('end_date', new Date().toISOString())
            .order('created_at', { ascending: false });

          if (trialSubscriptions && trialSubscriptions.length > 0) {
            const subscription = trialSubscriptions[0];
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
              console.log('✅ تم العثور على فترة تجريبية نشطة');
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
            if (org.subscription_status !== 'trial') {
              try {
                await supabase
                  .from('organizations')
                  .update({
                    subscription_status: 'trial',
                    subscription_tier: 'trial',
                    subscription_id: null
                  })
                  .eq('id', org.id);
                
                refreshOrganizationData();
              } catch (updateError) {
                console.error('خطأ في تحديث حالة التجربة:', updateError);
              }
            }
            
            console.log('✅ الفترة التجريبية التقليدية نشطة');
            return;
          }
        }

        // إذا وصلنا لهنا، فلا يوجد اشتراك صالح
        console.log('❌ لا يوجد اشتراك صالح - سيتم التوجيه لصفحة الاشتراكات');
        
        // حذف التخزين المؤقت
        clearPermissionsCache();
        
        const subscriptionInfo: SubscriptionInfo = {
          isActive: false,
          status: 'expired',
          message: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية'
        };

        cacheSubscriptionStatus(subscriptionInfo);

        // تحديث حالة المؤسسة إلى expired
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          try {
            await supabase
              .from('organizations')
              .update({
                subscription_status: 'expired',
                subscription_tier: 'free',
                subscription_id: null
              })
              .eq('id', org.id);
            
            refreshOrganizationData();
          } catch (updateError) {
            console.error('خطأ في تحديث حالة المؤسسة:', updateError);
          }
        }

        // إعادة التوجيه إلى صفحة الاشتراك
        navigate('/dashboard/subscription');

      } catch (error) {
        console.error('خطأ في التحقق من الاشتراك:', error);
        
        // في حالة الخطأ، السماح بالوصول بناءً على بيانات المؤسسة
        const org = organization as unknown as OrganizationWithSettings;
        
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          const errorInfo: SubscriptionInfo = {
            isActive: true,
            status: org.subscription_status,
            message: 'تم السماح بالوصول بناءً على بيانات المؤسسة (وضع الطوارئ)'
          };
          cacheSubscriptionStatus(errorInfo);
          console.log('⚠️ تم السماح بالوصول في وضع الطوارئ');
        } else {
          navigate('/dashboard/subscription');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [organization?.id, navigate, refreshOrganizationData, subscriptionsLoading, hasChecked, isChecking]);

  // إعادة تعيين hasChecked عند تغيير المؤسسة
  useEffect(() => {
    setHasChecked(false);
    setIsChecking(false);
  }, [organization?.id]);

  return <>{children}</>;
};

export default SubscriptionCheck;
