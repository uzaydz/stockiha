import React, { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionRefreshService } from '@/lib/subscription-refresh-service';

/**
 * مكون لتحديث بيانات الاشتراك تلقائياً في الواجهة
 * يحل مشكلة الكاش بعد تفعيل الاشتراك
 */
export const SubscriptionDataRefresher: React.FC = () => {
  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();
  const isInitialized = useRef(false);

  // دالة تحديث البيانات
  const refreshData = useCallback(async () => {
    if (!organization?.id) return;

    // منع التحديث المتكرر
    const lastUpdate = localStorage.getItem(`last_subscription_update_${organization.id}`);
    const now = Date.now();
    const timeSinceLastUpdate = lastUpdate ? now - parseInt(lastUpdate) : Infinity;
    
    if (timeSinceLastUpdate < 30 * 1000) { // 30 ثانية
      return;
    }

    try {
      
      // تحديث البيانات باستخدام الخدمة
      const result = await SubscriptionRefreshService.refreshAllData(organization.id);
      
      if (result.success) {
        
        // تحديث البيانات في سياق المستأجر
        if (refreshOrganizationData) {
          await refreshOrganizationData();
        }
        
        // إرسال حدث نجاح التحديث
        window.dispatchEvent(new CustomEvent('subscriptionDataUpdated', {
          detail: result
        }));
        
        // حفظ وقت آخر تحديث
        localStorage.setItem(`last_subscription_update_${organization.id}`, now.toString());
      }
    } catch (error) {
    }
  }, [organization?.id, refreshOrganizationData]);

  // دالة إعادة تحميل قوية من قاعدة البيانات
  const forceRefresh = useCallback(async () => {
    if (!organization?.id) return;

    try {
      
      // إعادة تحميل البيانات مباشرة من قاعدة البيانات
      const result = await SubscriptionRefreshService.forceRefreshFromDatabase(organization.id);
      
      if (result.success) {
        
        // تحديث البيانات في سياق المستأجر
        if (refreshOrganizationData) {
          await refreshOrganizationData();
        }
        
        // إرسال حدث نجاح التحديث
        window.dispatchEvent(new CustomEvent('subscriptionDataForceRefreshed', {
          detail: result
        }));
        
        // حفظ وقت آخر تحديث
        localStorage.setItem(`last_subscription_update_${organization.id}`, Date.now().toString());
      }
    } catch (error) {
    }
  }, [organization?.id, refreshOrganizationData]);

  // الاستماع لأحداث تحديث البيانات
  useEffect(() => {
    const handleSubscriptionActivated = (event: CustomEvent) => {
      if (event.detail.success) {
        // تأخير قليل لضمان اكتمال العملية في قاعدة البيانات
        setTimeout(() => {
          // منع التحديث المتكرر
          const lastUpdate = localStorage.getItem(`last_subscription_update_${organization?.id}`);
          const now = Date.now();
          const timeSinceLastUpdate = lastUpdate ? now - parseInt(lastUpdate) : Infinity;
          
          if (timeSinceLastUpdate > 10 * 1000) { // 10 ثواني
            refreshData();
          } else {
          }
        }, 1000);
      }
    };

    const handleSubscriptionDataRefreshed = (event: CustomEvent) => {
      if (event.detail?.success) {
        refreshData();
      }
    };

    const handleSubscriptionDataForceRefreshed = (event: CustomEvent) => {
      if (event.detail?.success) {
        refreshData();
      }
    };

    // إضافة مستمعي الأحداث
    window.addEventListener('subscriptionActivated', handleSubscriptionActivated as EventListener);
    window.addEventListener('subscriptionDataRefreshed', handleSubscriptionDataRefreshed as EventListener);
    window.addEventListener('subscriptionDataForceRefreshed', handleSubscriptionDataForceRefreshed as EventListener);

    // تنظيف المستمعين عند unmount
    return () => {
      window.removeEventListener('subscriptionActivated', handleSubscriptionActivated as EventListener);
      window.removeEventListener('subscriptionDataRefreshed', handleSubscriptionDataRefreshed as EventListener);
      window.removeEventListener('subscriptionDataForceRefreshed', handleSubscriptionDataForceRefreshed as EventListener);
    };
  }, [refreshData]);

  // تحديث البيانات عند تغيير المؤسسة (مرة واحدة فقط)
  useEffect(() => {
    if (organization?.id && !isInitialized.current) {
      isInitialized.current = true;
      // تأخير قليل لضمان اكتمال تحميل البيانات
      const timer = setTimeout(() => {
        refreshData();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [organization?.id, refreshData]);

  // تحديث البيانات كل 10 دقائق (بدون حلقة لا منتهية)
  useEffect(() => {
    if (!organization?.id) return;

    const interval = setInterval(() => {
      // تحديث البيانات فقط إذا لم يتم تحديثها مؤخراً
      const lastUpdate = localStorage.getItem(`last_subscription_update_${organization.id}`);
      const now = Date.now();
      const timeSinceLastUpdate = lastUpdate ? now - parseInt(lastUpdate) : Infinity;
      
      if (timeSinceLastUpdate > 5 * 60 * 1000) { // 5 دقائق
        refreshData();
        localStorage.setItem(`last_subscription_update_${organization.id}`, now.toString());
      }
    }, 10 * 60 * 1000); // 10 دقائق

    return () => clearInterval(interval);
  }, [organization?.id, refreshData]);

  // لا نعرض أي شيء في الواجهة
  return null;
};

export default SubscriptionDataRefresher;
