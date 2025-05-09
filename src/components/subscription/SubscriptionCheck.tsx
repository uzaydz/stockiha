import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SubscriptionService } from '@/lib/subscription-service';
import { 
  cacheSubscriptionStatus,
  getCachedSubscriptionStatus,
  refreshCache
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

      // أولاً، تحقق من التخزين المؤقت
      const cachedSubscription = getCachedSubscriptionStatus();
      if (cachedSubscription) {
        console.log('[SubscriptionCheck] استخدام معلومات الاشتراك من التخزين المؤقت');
        
        // إذا كان الاشتراك نشطًا أو الفترة التجريبية سارية
        if (cachedSubscription.isActive) {
          console.log('[SubscriptionCheck] اشتراك نشط موجود (من التخزين المؤقت)');
          // تحديث وقت انتهاء الصلاحية
          refreshCache();
          return;
        } else {
          console.log('[SubscriptionCheck] الاشتراك غير نشط أو منتهي (من التخزين المؤقت)');
          navigate('/dashboard/subscription');
          return;
        }
      }

      // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
      const org = organization as unknown as OrganizationWithSettings;
      let isSubscriptionActive = false;
      let subscriptionInfo = { isActive: false, status: '', message: '' };

      // التحقق من وجود اشتراك نشط
      if (org.subscription_status === 'active' && org.subscription_id) {
        console.log('[SubscriptionCheck] اشتراك نشط موجود');
        isSubscriptionActive = true;
        subscriptionInfo = {
          isActive: true,
          status: 'active',
          message: 'اشتراك نشط'
        };
      }
      // التحقق من الفترة التجريبية
      else if (org.subscription_status === 'trial') {
        let isTrialActive = false;
        let logMessage = '';
        
        // التحقق من تاريخ انتهاء الفترة التجريبية المخزن في settings، إذا كان موجودًا
        if (org.settings?.trial_end_date) {
          const trialEndDate = new Date(org.settings.trial_end_date);
          const now = new Date();
          
          // إضافة مقارنة بالتاريخ الحقيقي (وليس بالوقت أيضًا)
          const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
          const nowDateOnly = new Date(now.setHours(0, 0, 0));
          
          isTrialActive = trialEndDateOnly >= nowDateOnly;
          logMessage = `[SubscriptionCheck] الفترة التجريبية ${isTrialActive ? 'نشطة' : 'منتهية'} حسب trial_end_date: ${org.settings.trial_end_date}`;
          console.log(logMessage);
          
          if (isTrialActive) {
            isSubscriptionActive = true;
            subscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: 'الفترة التجريبية سارية'
            };
          }
        } else {
          // استخدام الطريقة القديمة كاحتياط (5 أيام من تاريخ الإنشاء)
          const { isTrialActive: trialActive, daysLeft } = SubscriptionService.checkTrialStatus(org.created_at);
          isTrialActive = trialActive;
          
          logMessage = `[SubscriptionCheck] الفترة التجريبية ${isTrialActive ? 'نشطة' : 'منتهية'} حسب تاريخ الإنشاء. الأيام المتبقية: ${daysLeft}`;
          console.log(logMessage);
          
          if (isTrialActive) {
            isSubscriptionActive = true;
            subscriptionInfo = {
              isActive: true,
              status: 'trial',
              message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`
            };
          }
        }
      }

      // تخزين نتيجة التحقق في التخزين المؤقت
      console.log('[SubscriptionCheck] تخزين معلومات الاشتراك في التخزين المؤقت:', subscriptionInfo);
      cacheSubscriptionStatus(subscriptionInfo);

      // إذا كان الاشتراك غير نشط، إعادة التوجيه إلى صفحة الاشتراك
      if (!isSubscriptionActive) {
        console.log('[SubscriptionCheck] إعادة التوجيه إلى صفحة الاشتراك');
        navigate('/dashboard/subscription');
      }
    };

    checkSubscription();
  }, [organization, navigate]);

  return <>{children}</>;
};

export default SubscriptionCheck; 