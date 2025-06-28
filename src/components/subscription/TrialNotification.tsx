import React, { useEffect, useState } from 'react';
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

export const TrialNotification: React.FC = () => {
  const { organization } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number>(0);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('expired');
  const [message, setMessage] = useState<string>('');
  const [showNotification, setShowNotification] = useState<boolean>(false);

  useEffect(() => {
    if (!organization) return;

    const calculateDays = async () => {
      try {
        const result = await SubscriptionService.calculateTotalDaysLeft(
          organization as unknown as OrganizationWithSettings,
          null
        );

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
        setShowNotification(false);
      }
    };

    calculateDays();
  }, [organization]);

  if (!showNotification || daysLeft === null) {
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
