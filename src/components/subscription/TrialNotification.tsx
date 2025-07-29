import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionService } from '@/lib/subscription-service';

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

// 🔥 Cache مركزي لمنع التكرار المفرط في TrialNotification
const TRIAL_NOTIFICATION_CACHE = new Map<string, {
  data: any;
  timestamp: number;
  isCalculating: boolean;
}>();

const TRIAL_CACHE_DURATION = 2 * 60 * 1000; // دقيقتان
const CALCULATION_DEBOUNCE_TIME = 2000; // ثانيتان

export const TrialNotification: React.FC = () => {
  const { organization } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number>(0);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('expired');
  const [message, setMessage] = useState<string>('');
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  // مرجع للتحكم في debouncing
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrganizationIdRef = useRef<string | null>(null);
  const lastCalculationTimeRef = useRef<number>(0);

  // 🔥 دالة محسنة للحصول على بيانات التجربة من الكاش أو الخادم
  const getTrialData = async (org: OrganizationWithSettings): Promise<any> => {
    const cacheKey = `trial_${org.id}`;
    const now = Date.now();
    
    // التحقق من الكاش المركزي أولاً
    const cached = TRIAL_NOTIFICATION_CACHE.get(cacheKey);
    if (cached && (now - cached.timestamp) < TRIAL_CACHE_DURATION) {
      // إذا كان هناك حساب جاري، انتظر
      if (cached.isCalculating) {
        return null;
      }
      return cached.data;
    }

    // إذا كان هناك حساب جاري بالفعل، لا نكرر
    if (cached?.isCalculating) {
      return null;
    }

    // تسجيل أن الحساب جاري
    TRIAL_NOTIFICATION_CACHE.set(cacheKey, {
      data: cached?.data || null,
      timestamp: cached?.timestamp || 0,
      isCalculating: true
    });

    try {
      const result = await SubscriptionService.calculateTotalDaysLeft(org, null);
      
      // حفظ النتيجة في الكاش
      TRIAL_NOTIFICATION_CACHE.set(cacheKey, {
        data: result,
        timestamp: now,
        isCalculating: false
      });
      
      return result;
    } catch (error) {
      // في حالة الخطأ، نزيل علامة الحساب الجاري
      TRIAL_NOTIFICATION_CACHE.set(cacheKey, {
        data: cached?.data || null,
        timestamp: cached?.timestamp || 0,
        isCalculating: false
      });
      return null;
    }
  };

  // تحسين useMemo للتحقق من تغيير المؤسسة
  const organizationChanged = useMemo(() => {
    return organization?.id !== lastOrganizationIdRef.current;
  }, [organization?.id]);

  useEffect(() => {
    if (!organization || isCalculating) return;
    
    const now = Date.now();
    const timeSinceLastCalculation = now - lastCalculationTimeRef.current;
    
    // منع إعادة الحساب للمؤسسة نفسها في وقت قصير
    if (!organizationChanged && timeSinceLastCalculation < CALCULATION_DEBOUNCE_TIME) {
      return;
    }
    
    lastOrganizationIdRef.current = organization.id;

    const calculateDays = async () => {
      // منع الاستدعاءات المتعددة
      if (isCalculating) return;
      
      setIsCalculating(true);
      lastCalculationTimeRef.current = now;
      
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
        if (result.status === 'trial' && result.trialDaysLeft <= 3 && result.trialDaysLeft > 0) {
          setShowNotification(true);
        } else if (result.status === 'active' && result.subscriptionDaysLeft <= 7 && result.subscriptionDaysLeft > 0) {
          setShowNotification(true);
        } else {
          setShowNotification(false);
        }

      } catch (error) {
        console.warn('Trial notification calculation failed:', error);
        setShowNotification(false);
      } finally {
        setIsCalculating(false);
      }
    };

    // تأخير الحساب لتجنب الاستدعاءات المتكررة
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
    
    calculationTimeoutRef.current = setTimeout(calculateDays, 500);

    // تنظيف timeout عند إلغاء تحميل المكون
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [organization?.id, isCalculating, organizationChanged]);

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
