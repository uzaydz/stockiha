import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionService } from '@/lib/subscription-service';
import { globalCache, CacheKeys } from '@/lib/globalCache';

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

// ثوابت محسنة للأداء
const CALCULATION_DEBOUNCE_TIME = 10000; // 10 ثواني بدلاً من 5 لتقليل التكرار

export const TrialNotification: React.FC = () => {
  const { organization } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number>(0);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('expired');
  const [message, setMessage] = useState<string>('');
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  // مراجع محسّنة للتحكم في debouncing ومنع التكرار
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrganizationIdRef = useRef<string | null>(null);
  const lastCalculationTimeRef = useRef<number>(0);
  const hasCalculatedRef = useRef(false);
  const calculationDebounceTime = 10000; // 10 ثواني بدلاً من 5

  // refs إضافية لمنع الاستدعاءات المتكررة
  const trialDataLoadingRef = useRef(false);
  const lastTrialDataCallRef = useRef<number>(0);

  // متغيرات إضافية لمنع الاستدعاءات المتكررة في نفس الجلسة
  const lastSuccessfulCallRef = useRef<number>(0);
  const MIN_TIME_BETWEEN_CALLS = 30000; // 30 ثانية على الأقل بين الاستدعاءات

    // 🔥 دالة محسنة للحصول على بيانات التجربة من global cache
  const getTrialData = async (org: OrganizationWithSettings): Promise<any> => {
    const cacheKey = CacheKeys.TRIAL_DATA(org.id);

    // منع الاستدعاءات المتكررة
    const now = Date.now();
    if (trialDataLoadingRef.current || (now - lastTrialDataCallRef.current) < 10000) {
      return null; // استدعاء حديث جداً
    }

    trialDataLoadingRef.current = true;
    lastTrialDataCallRef.current = now;

    try {
      // التحقق من global cache أولاً
      const cached = globalCache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // استدعاء خدمة البيانات
      const result = await SubscriptionService.calculateTotalDaysLeft(org, null);

      // حفظ النتيجة في global cache
      globalCache.set(cacheKey, result);

      return result;
    } catch (error) {
      return null;
    } finally {
      trialDataLoadingRef.current = false;
    }
  };

  // تحسين useMemo لتثبيت organization.id ومنع re-renders غير ضرورية
  const organizationId = useMemo(() => organization?.id, [organization?.id]);

  useEffect(() => {
    if (!organization || isCalculating) return;

    const now = Date.now();
    const timeSinceLastCalculation = now - lastCalculationTimeRef.current;
    const timeSinceLastCall = now - lastSuccessfulCallRef.current;

    // فحص إضافي: منع الاستدعاءات المتكررة جداً في نفس الجلسة
    if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS && hasCalculatedRef.current) {
      return;
    }

    // تحقق من عدم تغيير المؤسسة أو وجود حساب حديث - محسّن
    if (organization.id === lastOrganizationIdRef.current &&
        hasCalculatedRef.current &&
        timeSinceLastCalculation < calculationDebounceTime) {
      return;
    }

    // تحقق من الكاش المحلي أولاً - محسّن
    const cacheKey = `trial_notification_${organization.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && organization.id === lastOrganizationIdRef.current) {
      try {
        const parsed = JSON.parse(cached);
        const cacheTime = parsed.timestamp || 0;
        // الكاش صالح لمدة 30 دقيقة بدلاً من 15 لتقليل الاستدعاءات
        if ((now - cacheTime) < 30 * 60 * 1000) {
          // فحص إضافي: إذا كان الكاش حديث جداً (أقل من 5 دقائق)، لا نحتاج لإعادة التحقق
          if ((now - cacheTime) < 5 * 60 * 1000) {
            setDaysLeft(parsed.daysLeft);
            setTrialDaysLeft(parsed.trialDaysLeft);
            setSubscriptionDaysLeft(parsed.subscriptionDaysLeft);
            setStatus(parsed.status);
            setMessage(parsed.message);
            setShowNotification(parsed.showNotification);
            setIsCalculating(false);
            return;
          }

          setDaysLeft(parsed.daysLeft);
          setTrialDaysLeft(parsed.trialDaysLeft);
          setSubscriptionDaysLeft(parsed.subscriptionDaysLeft);
          setStatus(parsed.status);
          setMessage(parsed.message);
          setShowNotification(parsed.showNotification);
          setIsCalculating(false);
          return;
        }
      } catch (error) {
        // تجاهل أخطاء الكاش
      }
    }

    lastOrganizationIdRef.current = organization.id;

    const calculateDays = async () => {
      // منع الاستدعاءات المتعددة
      if (isCalculating) return;

      setIsCalculating(true);
      lastCalculationTimeRef.current = now;
      hasCalculatedRef.current = true;
      lastSuccessfulCallRef.current = now; // تحديث وقت آخر استدعاء ناجح

      try {
        const result = await getTrialData(organization as unknown as OrganizationWithSettings);

        if (!result) {
          // لا توجد بيانات أو جاري الحساب، لا نفعل شيئاً
          return;
        }

        setDaysLeft(result.totalDaysLeft);
        setTrialDaysLeft(result.trialDaysLeft);
        setSubscriptionDaysLeft(result.subscriptionDaysLeft);
        setStatus(result.status);
        setMessage(result.message);

        // عرض الإشعار في الحالات التالية:
        // 1. الفترة التجريبية: إذا كان متبقي 3 أيام أو أقل
        // 2. الاشتراك المدفوع: إذا كان متبقي 7 أيام أو أقل
        const showNotificationValue = (result.status === 'trial' && result.trialDaysLeft <= 3 && result.trialDaysLeft > 0) ||
                                    (result.status === 'active' && result.subscriptionDaysLeft <= 7 && result.subscriptionDaysLeft > 0);

        setShowNotification(showNotificationValue);

        // حفظ في الكاش
        const cacheData = {
          daysLeft: result.totalDaysLeft,
          trialDaysLeft: result.trialDaysLeft,
          subscriptionDaysLeft: result.subscriptionDaysLeft,
          status: result.status,
          message: result.message,
          showNotification: showNotificationValue,
          timestamp: now
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      } catch (error) {
        setShowNotification(false);
      } finally {
        setIsCalculating(false);
      }
    };

    // تأخير أكبر لتجنب الاستدعاءات المتكررة
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    calculationTimeoutRef.current = setTimeout(() => {
      calculateDays();
    }, 1000); // زيادة التأخير إلى 1000ms

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [organizationId]); // اعتماد على organizationId المُحسّن بدلاً من organization كامل

  // تنظيف المراجع عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, []);

  if (!showNotification || daysLeft === null || isCalculating) {
    return null;
  }

  // إشعار للفترة التجريبية
  if (status === 'trial') {
    const isUrgent = trialDaysLeft <= 1;

    return (
      <Alert variant={isUrgent ? "destructive" : "default"} className="mb-4">
        <div className="flex items-start gap-4">
          {isUrgent ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
          <div className="flex-1">
            <AlertTitle>
              {isUrgent
                ? "انتبه! فترة التجربة المجانية على وشك الانتهاء"
                : "تذكير: فترة التجربة المجانية ستنتهي قريبًا"}
            </AlertTitle>
            <AlertDescription className="mt-1">
              {trialDaysLeft === 1
                ? "متبقي يوم واحد فقط في فترة التجربة المجانية. قم بترقية حسابك الآن للاستمرار في استخدام المنصة."
                : `متبقي ${trialDaysLeft} أيام في فترة التجربة المجانية. قم بالاشتراك لتفادي انقطاع الخدمة.`}
            </AlertDescription>
            <div className="mt-3">
              <Button asChild size="sm" variant={isUrgent ? "destructive" : "default"}>
                <Link to="/dashboard/subscription">الاشتراك الآن</Link>
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  // إشعار للاشتراك المدفوع قارب على الانتهاء
  if (status === 'active') {
    const isUrgent = subscriptionDaysLeft <= 3;

    return (
      <Alert variant={isUrgent ? "destructive" : "default"} className="mb-4">
        <div className="flex items-start gap-4">
          {isUrgent ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <div className="flex-1">
            <AlertTitle>
              {isUrgent
                ? "انتبه! اشتراكك على وشك الانتهاء"
                : "تذكير: اشتراكك سينتهي قريبًا"}
            </AlertTitle>
            <AlertDescription className="mt-1">
              {subscriptionDaysLeft === 1
                ? "متبقي يوم واحد فقط في اشتراكك. قم بتجديد الاشتراك الآن لتفادي انقطاع الخدمة."
                : `متبقي ${subscriptionDaysLeft} أيام في اشتراكك الحالي. قم بالتجديد لضمان استمرارية الخدمة.`}
            </AlertDescription>
            <div className="mt-3">
              <Button asChild size="sm" variant={isUrgent ? "destructive" : "default"}>
                <Link to="/dashboard/subscription">تجديد الاشتراك</Link>
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};

export default TrialNotification;
