import React, { useEffect, useState } from 'react';
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
  const [hasChecked, setHasChecked] = useState(false);
  
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
      console.warn('خطأ في تحميل بيانات الاشتراك، سيتم استخدام البيانات المحفوظة:', subscriptionsError);
    }

    // التحقق من حالة الاشتراك
    const checkSubscription = async () => {
      if (!organization) {
        console.log('🔍 SubscriptionCheck: لا توجد بيانات منظمة');
        return;
      }

      console.log('🔍 SubscriptionCheck: بدء التحقق من الاشتراك');
      console.log('📊 بيانات المنظمة:', {
        id: organization.id,
        name: organization.name,
        subscription_status: organization.subscription_status,
        subscription_tier: organization.subscription_tier,
        subscription_id: organization.subscription_id,
        created_at: organization.created_at
      });

      try {
        setHasChecked(true);

        // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
        const org = organization as unknown as OrganizationWithSettings;
        
        console.log('📦 بيانات الاشتراكات المحملة:', {
          cachedSubscriptions: cachedSubscriptions,
          subscriptionsLoading: subscriptionsLoading,
          subscriptionsError: subscriptionsError,
          subscriptionsCount: cachedSubscriptions?.length || 0
        });

        // أولاً، تحقق من البيانات المحملة الحقيقية (الأولوية العليا)
        const activeSubscriptions = cachedSubscriptions || [];
        console.log('🔍 الاشتراكات النشطة:', activeSubscriptions);

        let hasValidSubscription = false;
        
        // إذا وُجد اشتراك نشط صالح من البيانات المحملة - فحص هذا أولاً!
        if (activeSubscriptions && activeSubscriptions.length > 0) {
          console.log('📋 تم العثور على اشتراكات، التحقق من صحتها...');
          const subscription = activeSubscriptions[0];
          const endDate = new Date(subscription.end_date);
          const now = new Date();
          
          console.log('📅 تفاصيل الاشتراك:', {
            id: subscription.id,
            status: subscription.status,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            plan: subscription.plan,
            endDate: endDate.toISOString(),
            now: now.toISOString(),
            isValid: endDate > now
          });
          
          if (endDate > now) {
            hasValidSubscription = true;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            console.log('✅ الاشتراك صالح من البيانات الحقيقية، الأيام المتبقية:', daysLeft);
            
            const subscriptionInfo: SubscriptionInfo = {
              isActive: true,
              status: 'active',
              message: `اشتراك نشط في الخطة ${subscription.plan?.name}`,
              endDate: subscription.end_date,
              daysLeft
            };
            
            // تخزين النتيجة الصحيحة في التخزين المؤقت (تحديث الكاش)
            cacheSubscriptionStatus(subscriptionInfo);
            console.log('💾 تم تحديث التخزين المؤقت بالبيانات الصحيحة');
            
            // تحديث بيانات المؤسسة إذا كانت غير متطابقة
            if (org.subscription_id !== subscription.id || org.subscription_status !== 'active') {
              console.log('🔄 تحديث بيانات المؤسسة...');
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
                console.log('✅ تم تحديث بيانات المؤسسة');
              } catch (updateError) {
                console.error('❌ خطأ في تحديث بيانات المؤسسة:', updateError);
              }
            }
            
            console.log('✅ الاشتراك نشط من البيانات الحقيقية - السماح بالوصول');
            return; // إنهاء التحقق هنا - الاشتراك صالح
          } else {
            console.log('❌ الاشتراك منتهي الصلاحية');
          }
        }

        // ثانياً، إذا لم نجد اشتراكات محملة، تحقق من بيانات المؤسسة 
        if (!hasValidSubscription && !subscriptionsError && org.subscription_status === 'active' && org.subscription_id) {
          console.log('✅ الاعتماد على بيانات المؤسسة - اشتراك نشط');
          const subscriptionInfo: SubscriptionInfo = {
            isActive: true,
            status: 'active',
            message: 'اشتراك نشط'
          };
          cacheSubscriptionStatus(subscriptionInfo);
          console.log('✅ اشتراك نشط من بيانات المؤسسة - السماح بالوصول');
          return; // إنهاء التحقق هنا
        }

        // ثالثاً، فقط الآن تحقق من التخزين المؤقت (كآخر حل)
        const cachedSubscription = getCachedSubscriptionStatus();
        console.log('💾 بيانات التخزين المؤقت (فحص ثانوي):', cachedSubscription);

        if (!hasValidSubscription && cachedSubscription && !subscriptionsError) {
          console.log('🔍 فحص التخزين المؤقت كحل أخير...');
          // التحقق من صحة البيانات المخزنة مؤقتاً
          if (cachedSubscription.isActive && cachedSubscription.endDate) {
            const endDate = new Date(cachedSubscription.endDate);
            const now = new Date();
            
            console.log('📅 مقارنة التواريخ من الكاش:', {
              endDate: endDate.toISOString(),
              now: now.toISOString(),
              isValid: endDate > now
            });
            
            if (endDate > now) {
              console.log('✅ الاشتراك المحفوظ صالح، تجديد الكاش');
              refreshCache();
              return;
            } else {
              console.log('❌ الاشتراك المحفوظ منتهي، مسح الكاش');
              clearPermissionsCache();
            }
          } else if (cachedSubscription.isActive && !cachedSubscription.endDate) {
            console.log('✅ الاشتراك المحفوظ نشط بدون تاريخ انتهاء');
            refreshCache();
            return;
          }
        }

        // رابعاً، التحقق من الفترة التجريبية فقط إذا لم نجد اشتراك صالح
        if (!hasValidSubscription) {
          console.log('🔍 التحقق من الفترة التجريبية...');
          
          let isTrialActive = false;
          let daysLeft = 0;
          
          // التحقق من تاريخ انتهاء الفترة التجريبية المخزن في settings، إذا كان موجودًا
          if (org.settings?.trial_end_date) {
            console.log('📅 تاريخ انتهاء التجربة من الإعدادات:', org.settings.trial_end_date);
            const trialEndDate = new Date(org.settings.trial_end_date);
            const now = new Date();
            
            // إضافة مقارنة بالتاريخ الحقيقي (وليس بالوقت أيضًا)
            const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
            const nowDateOnly = new Date(now.setHours(0, 0, 0));
            
            isTrialActive = trialEndDateOnly >= nowDateOnly;
            daysLeft = Math.ceil((trialEndDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
            
            console.log('📊 حالة الفترة التجريبية:', {
              trialEndDate: trialEndDateOnly.toISOString(),
              now: nowDateOnly.toISOString(),
              isTrialActive,
              daysLeft
            });
          } else {
            console.log('📅 استخدام الحساب التلقائي للفترة التجريبية');
            // استخدام الطريقة القديمة كاحتياط (5 أيام من تاريخ الإنشاء)
            const trialResult = SubscriptionService.checkTrialStatus(org.created_at);
            isTrialActive = trialResult.isTrialActive;
            daysLeft = trialResult.daysLeft;
            
            console.log('📊 نتيجة الحساب التلقائي:', {
              isTrialActive,
              daysLeft,
              createdAt: org.created_at
            });
          }
          
          if (isTrialActive) {
            console.log('✅ الفترة التجريبية نشطة');
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
              console.log('🔄 تحديث حالة المؤسسة إلى trial');
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
                console.log('✅ تم تحديث حالة المؤسسة إلى trial');
              } catch (updateError) {
                console.error('❌ خطأ في تحديث حالة التجربة:', updateError);
              }
            }
            
            console.log('✅ الفترة التجريبية نشطة - السماح بالوصول');
            return; // إنهاء التحقق هنا
          }
        }

        // إذا وصلنا لهنا، فلا يوجد اشتراك صالح
        console.log('❌ لا يوجد اشتراك صالح - ستتم إعادة التوجيه');
        const subscriptionInfo: SubscriptionInfo = {
          isActive: false,
          status: 'expired',
          message: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية'
        };

        console.log('📊 النتيجة النهائية للتحقق:', subscriptionInfo);

        // تخزين نتيجة التحقق في التخزين المؤقت
        cacheSubscriptionStatus(subscriptionInfo);

        // تحديث حالة المؤسسة إلى inactive
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          console.log('🔄 تحديث حالة المؤسسة إلى inactive');
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
            console.log('✅ تم تحديث حالة المؤسسة إلى inactive');
          } catch (updateError) {
            console.error('❌ خطأ في تحديث حالة الاشتراك:', updateError);
          }
        }

        // إذا كان الاشتراك غير نشط، إعادة التوجيه إلى صفحة الاشتراك
        console.log('🔄 إعادة التوجيه إلى صفحة الاشتراك - الاشتراك غير نشط');
        navigate('/dashboard/subscription');

      } catch (error) {
        console.error('❌ خطأ في فحص الاشتراك:', error);
        
        // في حالة الخطأ، تحقق من البيانات الموجودة في المؤسسة كـ fallback
        const org = organization as unknown as OrganizationWithSettings;
        console.log('🔍 التحقق من بيانات المؤسسة كـ fallback:', {
          subscription_status: org.subscription_status,
          subscription_id: org.subscription_id
        });
        
        if (org.subscription_status === 'active' || org.subscription_status === 'trial') {
          console.log('✅ السماح بالوصول بناءً على بيانات المؤسسة');
          // السماح بالوصول بناءً على بيانات المؤسسة
          const errorInfo: SubscriptionInfo = {
            isActive: true,
            status: org.subscription_status,
            message: 'تم السماح بالوصول بناءً على بيانات المؤسسة'
          };
          cacheSubscriptionStatus(errorInfo);
        } else {
          console.log('❌ إعادة التوجيه - لا توجد بيانات صحيحة');
          // إعادة توجيه في حالة عدم وجود بيانات صحيحة
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
