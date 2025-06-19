import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SubscriptionService } from '@/lib/subscription-service';
import { supabase } from '@/lib/supabase';
import { useOrganizationSubscriptions } from '@/contexts/OrganizationDataContext';
import { 
  cacheSubscriptionStatus,
  getCachedSubscriptionStatus,
  refreshCache,
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
  const { organization, refreshOrganizationData } = useAuth();
  const navigate = useNavigate();
  
  // استخدام البيانات من السياق المركزي بدلاً من جلبها مباشرة
  const { subscriptions: cachedSubscriptions, isLoading: subscriptionsLoading } = useOrganizationSubscriptions();

  useEffect(() => {
    // تجاهل التحقق إذا كان المستخدم في صفحة الاشتراك بالفعل
    if (window.location.pathname.includes('/dashboard/subscription')) {
      return;
    }

    // انتظار تحميل البيانات من السياق
    if (subscriptionsLoading) {
      return;
    }

    // التحقق من حالة الاشتراك
    const checkSubscription = async () => {
      if (!organization) return;

      try {

        // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
        const org = organization as unknown as OrganizationWithSettings;
        
        // تحديد ما إذا كان يجب التحقق من cache أم لا
        const skipCache = true; // تجاهل cache مؤقتاً لضمان الحصول على أحدث البيانات
        
        // أولاً، تحقق من التخزين المؤقت (إلا إذا تم تجاهله)
        if (!skipCache) {
          const cachedSubscription = getCachedSubscriptionStatus();
          if (cachedSubscription) {
            
            // التحقق من صحة البيانات المخزنة مؤقتاً
            if (cachedSubscription.isActive && cachedSubscription.endDate) {
              const endDate = new Date(cachedSubscription.endDate);
              const now = new Date();
              
              if (endDate > now) {
                refreshCache();
                return;
              } else {
                clearPermissionsCache();
              }
            } else if (cachedSubscription.isActive && !cachedSubscription.endDate) {
              refreshCache();
              return;
            } else {
              navigate('/dashboard/subscription');
              return;
            }
          }
        }

        let subscriptionInfo: SubscriptionInfo = {
          isActive: false,
          status: 'inactive',
          message: 'لا يوجد اشتراك نشط'
        };

        // استخدام البيانات المحملة مسبقاً من السياق بدلاً من جلبها مرة أخرى
        const activeSubscriptions = cachedSubscriptions || [];

        let hasValidSubscription = false;
        
        // إذا وُجد اشتراك نشط صالح
        if (activeSubscriptions && activeSubscriptions.length > 0) {
          const subscription = activeSubscriptions[0];
          const endDate = new Date(subscription.end_date);
          const now = new Date();
          
          if (endDate > now) {
            hasValidSubscription = true;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            subscriptionInfo = {
              isActive: true,
              status: 'active',
              message: `اشتراك نشط في الخطة ${subscription.plan?.name}`,
              endDate: subscription.end_date,
              daysLeft
            };
            
            // تحديث بيانات المؤسسة إذا كانت غير متطابقة
            if (org.subscription_id !== subscription.id || org.subscription_status !== 'active') {
              try {
                await supabase
                  .from('organizations')
                  .update({
                    subscription_id: subscription.id,
                    subscription_status: 'active',
                    subscription_tier: subscription.plan?.code || 'premium'
                  })
                  .eq('id', org.id);
                
                // تحديث البيانات المحلية
                refreshOrganizationData();
              } catch (updateError) {
              }
            }
          }
        }

        // إذا لم يتم العثور على اشتراك صالح، تحقق من الفترة التجريبية
        if (!hasValidSubscription) {
          
          let isTrialActive = false;
          let daysLeft = 0;
          
          // التحقق من تاريخ انتهاء الفترة التجريبية المخزن في settings، إذا كان موجودًا
          if (org.settings?.trial_end_date) {
            const trialEndDate = new Date(org.settings.trial_end_date);
            const now = new Date();
            
            // إضافة مقارنة بالتاريخ الحقيقي (وليس بالوقت أيضًا)
            const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
            const nowDateOnly = new Date(now.setHours(0, 0, 0));
            
            isTrialActive = trialEndDateOnly >= nowDateOnly;
            daysLeft = Math.ceil((trialEndDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            // استخدام الطريقة القديمة كاحتياط (5 أيام من تاريخ الإنشاء)
            const trialResult = SubscriptionService.checkTrialStatus(org.created_at);
            isTrialActive = trialResult.isTrialActive;
            daysLeft = trialResult.daysLeft;
          }
          
          if (isTrialActive) {
            subscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`,
              daysLeft
            };
            
            // تحديث حالة المؤسسة إذا لم تكن trial
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
              }
            }
          } else {
            subscriptionInfo = {
              isActive: false,
              status: 'trial_expired',
              message: 'انتهت الفترة التجريبية'
            };
            
            // تحديث حالة المؤسسة إلى inactive
            if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
              try {
                await supabase
                  .from('organizations')
                  .update({
                    subscription_status: 'inactive',
                    subscription_tier: 'free',
                    subscription_id: null
                  })
                  .eq('id', org.id);
                
                refreshOrganizationData();
              } catch (updateError) {
              }
            }
          }
        }

        // تخزين نتيجة التحقق في التخزين المؤقت
        cacheSubscriptionStatus(subscriptionInfo);

        // إذا كان الاشتراك غير نشط، إعادة التوجيه إلى صفحة الاشتراك
        if (!subscriptionInfo.isActive) {
          navigate('/dashboard/subscription');
        } else {
        }

      } catch (error) {
        
        // في حالة الخطأ، اسمح بالوصول ولكن سجل الخطأ
        const errorInfo: SubscriptionInfo = {
          isActive: true,
          status: 'error',
          message: 'خطأ في فحص الاشتراك - تم السماح بالوصول مؤقتاً'
        };
        cacheSubscriptionStatus(errorInfo);
      }
    };

    checkSubscription();
  }, [organization, navigate, refreshOrganizationData, cachedSubscriptions, subscriptionsLoading]);

  return <>{children}</>;
};

export default SubscriptionCheck;
