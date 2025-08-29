/**
 * مكون فحص الاشتراك المحسن والمثالي
 * يستخدم دالة قاعدة البيانات المحسنة والكاش الذكي
 * لا يسبب ضغط على قاعدة البيانات ويعمل بأقصى كفاءة
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';

interface SubscriptionCheckProps {
  children: React.ReactNode;
}

// 🔥 Cache مركزي لمنع التكرار المفرط
const GLOBAL_SUBSCRIPTION_CACHE = new Map<string, {
  data: SubscriptionData;
  timestamp: number;
  isChecking: boolean;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const CHECK_DEBOUNCE_TIME = 1000; // ثانية واحدة

// 🔥 Default subscription data للحالات الافتراضية
const createDefaultSubscriptionData = (): SubscriptionData => ({
  success: false,
  status: 'expired',
  subscription_type: 'none',
  subscription_id: null,
  plan_name: 'غير محدد',
  plan_code: 'none',
  start_date: null,
  end_date: null,
  days_left: 0,
  features: [],
  limits: {
    max_pos: null,
    max_users: null,
    max_products: null,
  },
  message: 'لا توجد بيانات اشتراك'
});

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
  const lastCheckTimeRef = useRef<number>(0);

  // تجاهل التحقق في صفحة الاشتراك
  const isSubscriptionPage = useMemo(() => 
    location.pathname.includes('/dashboard/subscription'),
    [location.pathname]
  );

  // 🔥 دالة محسنة للحصول على بيانات الاشتراك من الكاش أو الخادم
  const getSubscriptionData = async (orgId: string): Promise<SubscriptionData | null> => {
    const cacheKey = `subscription_${orgId}`;
    const now = Date.now();
    
    // التحقق من الكاش المركزي أولاً
    const cached = GLOBAL_SUBSCRIPTION_CACHE.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // إذا كان هناك فحص جاري، انتظر
      if (cached.isChecking) {
        return null;
      }
      return cached.data;
    }

    // إذا كان هناك فحص جاري بالفعل، لا نكرر
    if (cached?.isChecking) {
      return null;
    }

    // تسجيل أن الفحص جاري
    GLOBAL_SUBSCRIPTION_CACHE.set(cacheKey, {
      data: cached?.data || createDefaultSubscriptionData(),
      timestamp: cached?.timestamp || 0,
      isChecking: true
    });

    try {
      const subscription = await subscriptionCache.getSubscriptionStatus(orgId);
      
      // حفظ النتيجة في الكاش
      GLOBAL_SUBSCRIPTION_CACHE.set(cacheKey, {
        data: subscription,
        timestamp: now,
        isChecking: false
      });
      
      return subscription;
    } catch (error) {
      // في حالة الخطأ، نزيل علامة الفحص الجاري
      GLOBAL_SUBSCRIPTION_CACHE.set(cacheKey, {
        data: createDefaultSubscriptionData(),
        timestamp: cached?.timestamp || 0,
        isChecking: false
      });
      return null;
    }
  };

  useEffect(() => {
    // تجاهل التحقق إذا:
    // 1. المستخدم في صفحة الاشتراك
    // 2. لا توجد مؤسسة
    // 3. تم التحقق مؤخراً (أقل من دقيقة)
    // 4. جاري التحقق حالياً
    if (isSubscriptionPage || !organization || isChecking) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimeRef.current;
    
    // منع التحقق المفرط - لا نتحقق أكثر من مرة كل دقيقة
    if (timeSinceLastCheck < CHECK_DEBOUNCE_TIME && hasCheckedRef.current) {
      return;
    }

    const checkSubscription = async () => {
      try {
        setIsChecking(true);
        hasCheckedRef.current = true;
        lastCheckTimeRef.current = now;

        const subscription = await getSubscriptionData(organization.id);
        
        if (!subscription) {
          // لا توجد بيانات أو جاري الفحص، لا نفعل شيئاً
          return;
        }
        
        setSubscriptionData(subscription);

        // التحقق من صحة الاشتراك
        if (!subscription.success) {
          // في حالة الخطأ، لا نعيد التوجيه - نسمح بالوصول
          return;
        }

        // إذا كان الاشتراك منتهي الصلاحية
        if (subscription.status === 'expired' || subscription.days_left <= 0) {
          
          // إذا كان المستخدم في صفحة نقطة البيع والمستخدم موظف، أبقه هناك مع تحذير
          if (location.pathname === '/pos' && user?.role === 'employee') {
            setShowExpiredWarning(true);
            return;
          }
          
          navigate('/dashboard/subscription', { replace: true });
          return;
        }

        // إذا كان الاشتراك صالح
        if (subscription.status === 'active' || subscription.status === 'trial') {
          
          // إظهار تنبيه إذا كان الاشتراك سينتهي قريباً (أقل من 7 أيام)
          if (subscription.days_left <= 7 && subscription.status !== 'trial') {
            // يمكن إضافة تنبيه هنا إذا لزم الأمر
          }
        }

      } catch (error) {
        // في حالة الخطأ، نسمح بالوصول ولا نعيد التوجيه
        console.warn('Subscription check failed:', error);
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
  }, [organization?.id, navigate, isSubscriptionPage, isChecking, location.pathname, user?.role]);

  // إعادة تعيين حالة التحقق عند تغيير المؤسسة
  useEffect(() => {
    hasCheckedRef.current = false;
    lastCheckTimeRef.current = 0;
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
