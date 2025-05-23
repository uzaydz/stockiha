import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SubscriptionService } from '@/lib/subscription-service';
import { supabase } from '@/lib/supabase';
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
  const { organization } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // تجاهل التحقق إذا كان المستخدم في صفحة الاشتراك بالفعل
    if (window.location.pathname.includes('/dashboard/subscription')) {
      return;
    }

    // التحقق من حالة الاشتراك
    const checkSubscription = async () => {
      if (!organization) return;

      try {
        console.log('[SubscriptionCheck] بدء فحص الاشتراك للمؤسسة:', organization.id);

        // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
        const org = organization as unknown as OrganizationWithSettings;
        
        // تحديد ما إذا كان يجب التحقق من cache أم لا
        const skipCache = false; // يمكن تعديلها للتطوير
        
        // أولاً، تحقق من التخزين المؤقت (إلا إذا تم تجاهله)
        if (!skipCache) {
          const cachedSubscription = getCachedSubscriptionStatus();
          if (cachedSubscription) {
            console.log('[SubscriptionCheck] تم العثور على بيانات مخزنة مؤقتاً:', cachedSubscription);
            
            // التحقق من صحة البيانات المخزنة مؤقتاً
            if (cachedSubscription.isActive && cachedSubscription.endDate) {
              const endDate = new Date(cachedSubscription.endDate);
              const now = new Date();
              
              if (endDate > now) {
                console.log('[SubscriptionCheck] الاشتراك المخزن مؤقتاً لا يزال صالحاً');
                refreshCache();
                return;
              } else {
                console.log('[SubscriptionCheck] انتهت صلاحية الاشتراك المخزن مؤقتاً');
                clearPermissionsCache();
              }
            } else if (cachedSubscription.isActive && !cachedSubscription.endDate) {
              console.log('[SubscriptionCheck] بيانات مخزنة مؤقتاً نشطة بدون تاريخ انتهاء');
              refreshCache();
              return;
            } else {
              console.log('[SubscriptionCheck] الاشتراك المخزن مؤقتاً غير نشط');
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

        // التحقق من وجود اشتراك نشط
        if (org.subscription_status === 'active' && org.subscription_id) {
          console.log('[SubscriptionCheck] فحص الاشتراك النشط:', org.subscription_id);
          
          // جلب تفاصيل الاشتراك الفعلية من قاعدة البيانات للتأكد من تاريخ الانتهاء
          const { data: subscriptionData, error } = await supabase
            .from('organization_subscriptions')
            .select(`
              *,
              plan:plan_id (name, code)
            `)
            .eq('id', org.subscription_id)
            .eq('status', 'active')
            .single();

          if (error) {
            console.error('[SubscriptionCheck] خطأ في جلب بيانات الاشتراك:', error);
            // في حالة الخطأ، اعتمد على البيانات المحلية
            subscriptionInfo = {
              isActive: true,
              status: 'active',
              message: 'اشتراك نشط'
            };
          } else if (subscriptionData) {
            // التحقق من تاريخ انتهاء الاشتراك
            const endDate = new Date(subscriptionData.end_date);
            const now = new Date();
            
            if (endDate > now) {
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              subscriptionInfo = {
                isActive: true,
                status: 'active',
                message: `اشتراك نشط في الخطة ${subscriptionData.plan?.name}`,
                endDate: subscriptionData.end_date,
                daysLeft
              };
              
              console.log('[SubscriptionCheck] الاشتراك نشط وصالح حتى:', subscriptionData.end_date);
            } else {
              console.log('[SubscriptionCheck] الاشتراك منتهي الصلاحية');
              subscriptionInfo = {
                isActive: false,
                status: 'expired',
                message: 'الاشتراك منتهي الصلاحية'
              };
            }
          } else {
            console.log('[SubscriptionCheck] لم يتم العثور على اشتراك نشط');
            subscriptionInfo = {
              isActive: false,
              status: 'not_found',
              message: 'لم يتم العثور على اشتراك نشط'
            };
          }
        }
        // التحقق من الفترة التجريبية
        else if (org.subscription_status === 'trial') {
          console.log('[SubscriptionCheck] فحص الفترة التجريبية');
          
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
            
            console.log(`[SubscriptionCheck] الفترة التجريبية ${isTrialActive ? 'نشطة' : 'منتهية'} حسب trial_end_date:`, org.settings.trial_end_date);
          } else {
            // استخدام الطريقة القديمة كاحتياط (5 أيام من تاريخ الإنشاء)
            const trialResult = SubscriptionService.checkTrialStatus(org.created_at);
            isTrialActive = trialResult.isTrialActive;
            daysLeft = trialResult.daysLeft;
            
            console.log(`[SubscriptionCheck] الفترة التجريبية ${isTrialActive ? 'نشطة' : 'منتهية'} حسب تاريخ الإنشاء. الأيام المتبقية:`, daysLeft);
          }
          
          if (isTrialActive) {
            subscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`,
              daysLeft
            };
          } else {
            subscriptionInfo = {
              isActive: false,
              status: 'trial_expired',
              message: 'انتهت الفترة التجريبية'
            };
          }
        }

        // تخزين نتيجة التحقق في التخزين المؤقت
        console.log('[SubscriptionCheck] نتيجة فحص الاشتراك:', subscriptionInfo);
        cacheSubscriptionStatus(subscriptionInfo);

        // إذا كان الاشتراك غير نشط، إعادة التوجيه إلى صفحة الاشتراك
        if (!subscriptionInfo.isActive) {
          console.log('[SubscriptionCheck] إعادة توجيه إلى صفحة الاشتراك');
          navigate('/dashboard/subscription');
        } else {
          console.log('[SubscriptionCheck] الاشتراك نشط، السماح بالوصول');
        }

      } catch (error) {
        console.error('[SubscriptionCheck] خطأ أثناء فحص الاشتراك:', error);
        
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
  }, [organization, navigate]);

  return <>{children}</>;
};

export default SubscriptionCheck; 