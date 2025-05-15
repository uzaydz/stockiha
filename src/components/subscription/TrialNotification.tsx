import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarClock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!organization) return;

    // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
    const org = organization as unknown as OrganizationWithSettings;

    // عرض الإشعار فقط للمستخدمين في فترة التجربة المجانية
    if (org.subscription_status !== 'trial') {
      return;
    }

    let trialEndDate: Date | null = null;
    const trialDays = 5; // الفترة التجريبية 5 أيام

    // استخدام تاريخ انتهاء الفترة التجريبية من الإعدادات إن وجد
    if (org.settings?.trial_end_date) {
      trialEndDate = new Date(org.settings.trial_end_date);
      // تعيين ساعات التاريخ للمقارنة بدون اعتبار الوقت
      trialEndDate.setHours(23, 59, 59, 999);
    } else {
      // أو حساب الفترة التجريبية من تاريخ الإنشاء (5 أيام)
      const createdDate = new Date(org.created_at);
      // تعيين الوقت إلى 00:00:00 للتأكد من حساب الأيام بشكل صحيح
      createdDate.setHours(0, 0, 0, 0);
      
      trialEndDate = new Date(createdDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      // تعيين وقت نهاية اليوم لتاريخ انتهاء الفترة التجريبية
      trialEndDate.setHours(23, 59, 59, 999);
    }

    // حساب الأيام المتبقية
    const now = new Date();
    // تعيين الوقت إلى 00:00:00 للمقارنة بالتاريخ فقط
    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);
    
    // حساب الفرق بالأيام (نستخدم نهاية اليوم لتاريخ الانتهاء لحساب اليوم الحالي بالكامل)
    const diffTime = trialEndDate.getTime() - nowDateOnly.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const daysRemaining = Math.max(0, diffDays);
    setDaysLeft(daysRemaining);
    
    // سجل للتشخيص
    
    
    
    
    
    // عرض الإشعار إذا كان متبقي 3 أيام أو أقل
    setShowNotification(diffDays <= 3 && diffDays > 0);

  }, [organization]);

  if (!showNotification || daysLeft === null) {
    return null;
  }

  const isUrgent = daysLeft <= 1;

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
            {daysLeft === 1
              ? "متبقي يوم واحد فقط في فترة التجربة المجانية. قم بترقية حسابك الآن للاستمرار في استخدام المنصة."
              : `متبقي ${daysLeft} أيام في فترة التجربة المجانية. قم بالاشتراك لتفادي انقطاع الخدمة.`}
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
};

export default TrialNotification; 