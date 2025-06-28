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
  
  console.log('🔒 [SubscriptionCheck] تصيير SubscriptionCheck:', {
    hasOrganization: !!organization,
    organizationId: organization?.id,
    organizationName: organization?.name,
    subscriptionStatus: organization?.subscription_status,
    hasChecked: hasChecked,
    currentPath: window.location.pathname,
    timestamp: new Date().toLocaleTimeString('ar-DZ')
  });
  
  // استخدام البيانات من السياق المركزي بدلاً من جلبها مباشرة
  const { subscriptions: cachedSubscriptions, isLoading: subscriptionsLoading, error: subscriptionsError } = useOrganizationSubscriptions();

  useEffect(() => {
    // تجاهل التحقق إذا كان المستخدم في صفحة الاشتراك بالفعل
    if (window.location.pathname.includes('/dashboard/subscription')) {
      return;
    }

    // عدم التحقق إذا تم التحقق بالفعل لتجنب infinite loops
    if (hasChecked) {
      return;
    }

    // انتظار تحميل البيانات من السياق - مع التعامل مع الأخطاء
    if (subscriptionsLoading) {
      return;
    }

    // إذا كان هناك خطأ في تحميل البيانات، استخدم الـ cache أو البيانات الموجودة في المؤسسة
    if (subscriptionsError) {
    }

    // التحقق من حالة الاشتراك
    const checkSubscription = async () => {
      if (!organization) {
        console.log('⚠️ [DEBUG] لا توجد بيانات مؤسسة في SubscriptionCheck');
        return;
      }

      try {
        setHasChecked(true);

        // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
        const org = organization as unknown as OrganizationWithSettings;
        
        console.log('🔍 [DEBUG] بدء التحقق من الاشتراك في SubscriptionCheck:', {
          organization_id: org.id,
          organization_name: org.name,
          org_subscription_status: org.subscription_status,
          org_subscription_id: org.subscription_id,
          org_subscription_tier: org.subscription_tier,
          cached_subscriptions_count: cachedSubscriptions?.length || 0,
          cached_subscriptions: cachedSubscriptions?.map(sub => ({
            id: sub.id.substring(0, 8) + '...',
            status: sub.status,
            end_date: sub.end_date,
            is_expired: new Date(sub.end_date) < new Date()
          })) || [],
          current_path: window.location.pathname,
          timestamp: new Date().toLocaleTimeString('ar-DZ')
        });

        // أولاً، تحقق من البيانات المحملة الحقيقية (الأولوية العليا)
        const activeSubscriptions = cachedSubscriptions || [];

        let hasValidSubscription = false;
        
        // إذا وُجد اشتراك نشط صالح من البيانات المحملة - فحص هذا أولاً!
        if (activeSubscriptions && activeSubscriptions.length > 0) {
          const subscription = activeSubscriptions[0];
          const endDate = new Date(subscription.end_date);
          const now = new Date();

          // التحقق من صحة التاريخ أولاً
          if (endDate > now) {
            hasValidSubscription = true;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: subscription.status, // استخدام الحالة الفعلية (active أو trial)
              message: `${subscription.status === 'trial' ? 'فترة تجريبية' : 'اشتراك نشط'} في الخطة ${subscription.plan?.name}`,
              endDate: subscription.end_date,
              daysLeft
            };
            
            // تخزين النتيجة الصحيحة في التخزين المؤقت (تحديث الكاش)
            cacheSubscriptionStatus(subscriptionInfo);
            
            console.log('✅ [DEBUG] اشتراك صالح تم العثور عليه - السماح بالوصول:', {
              subscription_id: subscription.id.substring(0, 8) + '...',
              subscription_status: subscription.status,
              subscription_end_date: subscription.end_date,
              days_left: daysLeft,
              plan_name: subscription.plan?.name,
              final_decision: 'السماح بالوصول',
              timestamp: new Date().toLocaleTimeString('ar-DZ')
            });
            
            // تحديث بيانات المؤسسة إذا كانت غير متطابقة
            if (org.subscription_id !== subscription.id || org.subscription_status !== subscription.status) {
              try {
                await supabase
                  .from('organizations')
                  .update({
                    subscription_id: subscription.id,
                    subscription_status: subscription.status,
                    subscription_tier: subscription.plan?.code || (subscription.status === 'trial' ? 'trial' : 'premium')
                  })
                  .eq('id', org.id);
                
                // تحديث البيانات المحلية
                refreshOrganizationData();
              } catch (updateError) {
                console.error('خطأ في تحديث بيانات المؤسسة:', updateError);
              }
            }
            
            return; // إنهاء التحقق هنا - الاشتراك صالح
          } else {
            // الاشتراك منتهي الصلاحية - تحديث الحالة في قاعدة البيانات
            try {
              await supabase
                .from('organization_subscriptions')
                .update({ status: 'expired' })
                .eq('id', subscription.id);
                
              // تحديث حالة المنظمة أيضاً
              await supabase
                .from('organizations')
                .update({
                  subscription_status: 'expired',
                  subscription_tier: 'free',
                  subscription_id: null
                })
                .eq('id', org.id);
            } catch (updateError) {
              console.error('خطأ في تحديث حالة الاشتراك المنتهي:', updateError);
            }
          }
        }

        // ثانياً، إذا لم نجد اشتراكات محملة، تحقق من بيانات المؤسسة 
        if (!hasValidSubscription && !subscriptionsError && (org.subscription_status === 'active' || org.subscription_status === 'trial') && org.subscription_id) {
          // تحقق إضافي من قاعدة البيانات للتأكد من صحة الاشتراك
          try {
            const { data: orgSubscription } = await supabase
              .from('organization_subscriptions')
              .select('id, status, end_date, plan_id')
              .eq('id', org.subscription_id)
              .single();
            
            if (orgSubscription && new Date(orgSubscription.end_date) > new Date()) {
              // الاشتراك صالح
              const subscriptionInfo: SubscriptionInfo = {
                isActive: true,
                status: orgSubscription.status,
                message: `${orgSubscription.status === 'trial' ? 'فترة تجريبية' : 'اشتراك نشط'} صالح`,
                endDate: orgSubscription.end_date
              };
              cacheSubscriptionStatus(subscriptionInfo);
              return; // إنهاء التحقق هنا
            } else {
              // الاشتراك منتهي أو غير موجود - تحديث بيانات المنظمة
              await supabase
                .from('organizations')
                .update({
                  subscription_status: 'expired',
                  subscription_tier: 'free',
                  subscription_id: null
                })
                .eq('id', org.id);
              
              if (orgSubscription) {
                await supabase
                  .from('organization_subscriptions')
                  .update({ status: 'expired' })
                  .eq('id', org.subscription_id);
              }
            }
          } catch (dbError) {
            console.error('خطأ في التحقق من الاشتراك من قاعدة البيانات:', dbError);
            // في حالة خطأ قاعدة البيانات، لا تسمح بالوصول
          }
        }

        // ثالثاً، فقط الآن تحقق من التخزين المؤقت (كآخر حل)
        if (!hasValidSubscription && !subscriptionsError) {
          const cacheValidation = validateCachedSubscription();
          
          if (cacheValidation.isValid && cacheValidation.subscription) {
            // الكاش صالح ومحدث
            refreshCache();
            return;
          } else {
            // الكاش غير صالح أو منتهي الصلاحية
            clearPermissionsCache();
          }
        }

        // رابعاً، التحقق من الفترة التجريبية فقط إذا لم نجد اشتراك صالح
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
            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`,
              daysLeft
            };
            
            // تخزين نتيجة التحقق في التخزين المؤقت
            cacheSubscriptionStatus(subscriptionInfo);
            
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
            
            return; // إنهاء التحقق هنا
          }
        }

        // إذا وصلنا لهنا، فلا يوجد اشتراك صالح
        // حذف أي بيانات مخزنة مؤقتاً
        clearPermissionsCache();
        
        const subscriptionInfo: SubscriptionInfo = {
          isActive: false,
          status: 'expired',
          message: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية'
        };

        // تخزين نتيجة التحقق في التخزين المؤقت
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

        // إذا كان الاشتراك غير نشط، إعادة التوجيه إلى صفحة الاشتراك
        console.log('🚨 [DEBUG] إعادة توجيه إلى صفحة الاشتراكات - لا يوجد اشتراك صالح:', {
          organization_id: org.id,
          organization_name: org.name,
          final_decision: 'إعادة توجيه للاشتراكات',
          reason: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية',
          timestamp: new Date().toLocaleTimeString('ar-DZ')
        });
        navigate('/dashboard/subscription');

      } catch (error) {
        
        // في حالة الخطأ، تحقق من البيانات الموجودة في المؤسسة كـ fallback
        const org = organization as unknown as OrganizationWithSettings;
        
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          // السماح بالوصول بناءً على بيانات المؤسسة
          const errorInfo: SubscriptionInfo = {
            isActive: true,
            status: org.subscription_status,
            message: 'تم السماح بالوصول بناءً على بيانات المؤسسة'
          };
          cacheSubscriptionStatus(errorInfo);
        } else {
          // إعادة توجيه في حالة عدم وجود بيانات صحيحة
          console.log('🚨 [DEBUG] إعادة توجيه إلى صفحة الاشتراكات - خطأ في التحقق:', {
            organization_id: org.id,
            organization_name: org.name,
            org_subscription_status: org.subscription_status,
            final_decision: 'إعادة توجيه للاشتراكات',
            reason: 'خطأ في التحقق من الاشتراك',
            timestamp: new Date().toLocaleTimeString('ar-DZ')
          });
          navigate('/dashboard/subscription');
        }
      }
    };

    checkSubscription();
  }, [organization, navigate, refreshOrganizationData, cachedSubscriptions, subscriptionsLoading, subscriptionsError, hasChecked]);

  // إعادة تعيين hasChecked عند تغيير المؤسسة
  useEffect(() => {
    setHasChecked(false);
  }, [organization?.id]);

  return <>{children}</>;
};

export default SubscriptionCheck;
