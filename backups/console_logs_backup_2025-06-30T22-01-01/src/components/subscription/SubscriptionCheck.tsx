/**
 * مكون فحص الاشتراك المحسن والمثالي
 * يستخدم دالة قاعدة البيانات المحسنة والكاش الذكي
 * لا يسبب ضغط على قاعدة البيانات ويعمل بأقصى كفاءة
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';

interface SubscriptionCheckProps {
  children: React.ReactNode;
}

const SubscriptionCheck: React.FC<SubscriptionCheckProps> = ({ children }) => {
  const { organization } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedRef = useRef(false);

  // تجاهل التحقق في صفحة الاشتراك
  const isSubscriptionPage = location.pathname.includes('/dashboard/subscription');

  useEffect(() => {
    // تجاهل التحقق إذا:
    // 1. المستخدم في صفحة الاشتراك
    // 2. لا توجد مؤسسة
    // 3. تم التحقق بالفعل
    // 4. جاري التحقق حالياً
    if (isSubscriptionPage || !organization || hasCheckedRef.current || isChecking) {
      return;
    }

    const checkSubscription = async () => {
      try {
        setIsChecking(true);
        hasCheckedRef.current = true;

        console.log('🔍 فحص حالة الاشتراك للمؤسسة:', organization.name);

        // استخدام الخدمة المحسنة للحصول على حالة الاشتراك
        const subscription = await subscriptionCache.getSubscriptionStatus(organization.id);
        
        setSubscriptionData(subscription);

        console.log('📊 نتيجة فحص الاشتراك:', {
          status: subscription.status,
          planName: subscription.plan_name,
          daysLeft: subscription.days_left,
          subscriptionType: subscription.subscription_type
        });

        // التحقق من صحة الاشتراك
        if (!subscription.success) {
          console.error('❌ خطأ في فحص الاشتراك:', subscription.error);
          // في حالة الخطأ، لا نعيد التوجيه - نسمح بالوصول
          return;
        }

        // إذا كان الاشتراك منتهي الصلاحية
        if (subscription.status === 'expired' || subscription.days_left <= 0) {
          console.warn('⚠️ الاشتراك منتهي الصلاحية، إعادة التوجيه لصفحة الاشتراك');
          
          // إذا كان المستخدم في صفحة نقطة البيع والمستخدم موظف، أبقه هناك مع تحذير
          if (location.pathname === '/pos' && user?.role === 'employee') {
            console.log('🔄 موظف في نقطة البيع - عدم إعادة التوجيه مع إظهار تحذير');
            setShowExpiredWarning(true);
            return;
          }
          
          navigate('/dashboard/subscription', { replace: true });
          return;
        }

        // إذا كان الاشتراك صالح
        if (subscription.status === 'active' || subscription.status === 'trial') {
          console.log('✅ الاشتراك صالح ونشط');
          
          // إظهار تنبيه إذا كان الاشتراك سينتهي قريباً (أقل من 7 أيام)
          if (subscription.days_left <= 7 && subscription.status !== 'trial') {
            console.warn(`⏰ تنبيه: الاشتراك سينتهي خلال ${subscription.days_left} أيام`);
          }
        }

      } catch (error) {
        console.error('❌ خطأ غير متوقع في فحص الاشتراك:', error);
        // في حالة الخطأ، نسمح بالوصول ولا نعيد التوجيه
      } finally {
        setIsChecking(false);
      }
    };

    // إضافة تأخير قصير لتجنب الطلبات المتكررة
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkSubscription();
    }, 100);

    // تنظيف التايمر عند إلغاء المكون
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [organization?.id, navigate, isSubscriptionPage, isChecking]);

  // إعادة تعيين حالة التحقق عند تغيير المؤسسة
  useEffect(() => {
    hasCheckedRef.current = false;
    setSubscriptionData(null);
  }, [organization?.id]);

  // إذا كنا في صفحة الاشتراك، اعرض المحتوى مباشرة
  if (isSubscriptionPage) {
    return <>{children}</>;
  }

  // إذا لم توجد مؤسسة، اعرض المحتوى مباشرة
  if (!organization) {
    return <>{children}</>;
  }

  // إذا كان جاري التحقق، اعرض المحتوى مباشرة (لا نحجب المستخدم)
  if (isChecking) {
    return <>{children}</>;
  }

  // إذا تم فحص الاشتراك وكان صالح، اعرض المحتوى
  if (subscriptionData && subscriptionData.success && 
      (subscriptionData.status === 'active' || subscriptionData.status === 'trial') &&
      subscriptionData.days_left > 0) {
    return <>{children}</>;
  }

  // في جميع الحالات الأخرى، اعرض المحتوى (لا نحجب المستخدم)
  // الإعادة إلى صفحة الاشتراك تتم عبر navigate في useEffect
  return (
    <>
      {/* تحذير للموظفين عند انتهاء الاشتراك */}
      {showExpiredWarning && location.pathname === '/pos' && user?.role === 'employee' && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span className="font-medium">تنبيه: اشتراك المؤسسة منتهي الصلاحية - يرجى التواصل مع المدير</span>
            <button 
              onClick={() => setShowExpiredWarning(false)}
              className="mr-4 px-2 py-1 bg-red-700 hover:bg-red-800 rounded text-sm"
            >
              إخفاء
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default SubscriptionCheck; 