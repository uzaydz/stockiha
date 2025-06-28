import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { clearPermissionsCache } from '@/lib/PermissionsCache';

/**
 * Hook للمراقبة الدورية لحالة الاشتراك
 * يتحقق كل 10 دقائق من صحة الاشتراك ويحدث البيانات عند الحاجة
 */
export const useSubscriptionMonitor = () => {
  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();

  const checkSubscriptionStatus = useCallback(async () => {
    if (!organization?.id) return;

    try {
      // استخدام الدالة المحسنة لمراقبة وإصلاح الاشتراكات
      const { data: monitorResult, error: monitorError } = await (supabase.rpc as any)('monitor_and_fix_subscriptions');
      
      if (monitorError) {
        // التراجع للطريقة القديمة
        await fallbackSubscriptionCheck();
        return;
      }

      // إذا تم إصلاح أي اشتراكات
      if (monitorResult && monitorResult[0]?.total_fixed > 0) {
        
        // حذف الكاش المحلي
        clearPermissionsCache();
        
        // تحديث البيانات المحلية
        await refreshOrganizationData();
      }

      // استخدام دالة تزامن البيانات
      const { data: syncResult, error: syncError } = await (supabase.rpc as any)('sync_organization_subscription_data');
      
      if (!syncError && syncResult && syncResult.length > 0) {
        // البحث عن تحديثات خاصة بهذه المؤسسة
        const orgUpdate = syncResult.find((item: any) => item.organization_id === organization.id);
        
        if (orgUpdate) {
          
          // حذف الكاش المحلي
          clearPermissionsCache();
          
          // تحديث البيانات المحلية
          await refreshOrganizationData();
          
          // إذا تغيرت الحالة لمنتهية، أعد تحميل الصفحة
          if (orgUpdate.new_status === 'expired' && 
              (organization.subscription_status === 'active' || organization.subscription_status === 'trial')) {
            window.location.reload();
          }
        }
      }

    } catch (error) {
      // التراجع للطريقة القديمة
      await fallbackSubscriptionCheck();
    }
  }, [organization, refreshOrganizationData]);

  // دالة احتياطية للتحقق من الاشتراك (الطريقة القديمة)
  const fallbackSubscriptionCheck = useCallback(async () => {
    if (!organization?.id) return;

    try {
      // جلب الاشتراكات النشطة والتجريبية
      const { data: subscriptions } = await supabase
        .from('organization_subscriptions')
        .select('id, status, end_date, plan_id')
        .eq('organization_id', organization.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false });

      const now = new Date();
      let hasValidSubscription = false;

      // التحقق من صحة الاشتراكات
      if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          const endDate = new Date(subscription.end_date);
          
          if (endDate > now) {
            hasValidSubscription = true;
            break;
          } else {
            // تحديث الاشتراك المنتهي
            await supabase
              .from('organization_subscriptions')
              .update({ status: 'expired' })
              .eq('id', subscription.id);
          }
        }
      }

      // إذا لم يكن هناك اشتراك صالح، تحديث حالة المنظمة
      if (!hasValidSubscription && 
          (organization.subscription_status === 'active' || organization.subscription_status === 'trial')) {
        
        await supabase
          .from('organizations')
          .update({
            subscription_status: 'expired',
            subscription_tier: 'free',
            subscription_id: null
          })
          .eq('id', organization.id);

        // حذف الكاش المحلي
        clearPermissionsCache();
        
        // تحديث البيانات المحلية
        await refreshOrganizationData();
        
        // إعادة تحميل الصفحة لتطبيق التغييرات
        window.location.reload();
      }

    } catch (error) {
    }
  }, [organization, refreshOrganizationData]);

  useEffect(() => {
    if (!organization?.id) return;

    // تشغيل التحقق فوراً
    checkSubscriptionStatus();

    // تشغيل التحقق كل 5 دقائق (مدة أقصر لاكتشاف التغييرات بسرعة)
    const interval = setInterval(checkSubscriptionStatus, 5 * 60 * 1000);

    // تنظيف الـ interval عند إلغاء التحميل
    return () => clearInterval(interval);
  }, [checkSubscriptionStatus, organization?.id]);

  // إضافة تحقق عند تغيير الصفحة
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && organization?.id) {
        // عندما يعود المستخدم للصفحة، تحقق من الاشتراك
        checkSubscriptionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkSubscriptionStatus, organization?.id]);

  return { checkSubscriptionStatus };
};
