import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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

interface TrialStatusCardProps {
  onSelectPlan: () => void;
}

const TrialStatusCard: React.FC<TrialStatusCardProps> = ({ onSelectPlan }) => {
  const { organization } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!organization) return;

    // التعامل مع كائن المؤسسة باستخدام الواجهة المحسنة
    const org = organization as unknown as OrganizationWithSettings;
    
    // التحقق مما إذا كانت المؤسسة في فترة تجريبية
    if (org.subscription_status !== 'trial') {
      setIsExpired(true);
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
      // أو حساب الفترة التجريبية من تاريخ الإنشاء
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
    
    
    
    
    
    // حساب النسبة المئوية المتبقية من الفترة التجريبية
    const progressPercentage = Math.max(0, Math.min(100, ((trialDays - daysRemaining) / trialDays) * 100));
    setProgress(progressPercentage);
    
    // تحديد ما إذا كانت الفترة التجريبية قد انتهت
    setIsExpired(daysRemaining <= 0);

  }, [organization]);

  if (isExpired) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-xl">انتهت الفترة التجريبية</CardTitle>
          </div>
          <CardDescription>
            لقد انتهت فترة التجربة المجانية الخاصة بك. قم بالاشتراك للاستمرار في استخدام كافة ميزات المنصة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4">
            <h3 className="text-2xl font-bold text-destructive">تم انتهاء الفترة المجانية</h3>
            <p className="mt-2 text-muted-foreground text-center">
              لم تعد قادراً على الوصول إلى ميزات المنصة. اشترك الآن للحصول على وصول كامل.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSelectPlan} className="w-full" size="lg">
            اشترك الآن
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={daysLeft <= 1 ? "border-destructive" : "border-primary"}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${daysLeft <= 1 ? 'text-destructive' : 'text-primary'}`} />
          <CardTitle className="text-xl">الفترة التجريبية المجانية</CardTitle>
        </div>
        <CardDescription>
          استمتع بتجربة المنصة بكامل ميزاتها لمدة 5 أيام مجاناً
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الفترة المتبقية</span>
            <span className="font-semibold">
              {daysLeft === 1 ? "يوم واحد" : `${daysLeft} أيام`}
            </span>
          </div>
          
          <Progress value={progress} />
          
          <div className="text-center py-4">
            {daysLeft <= 1 ? (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-destructive">الفترة التجريبية على وشك الانتهاء!</h3>
                <p className="text-sm text-muted-foreground">
                  يرجى الاشتراك الآن لتفادي انقطاع الخدمة
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                اشترك قبل انتهاء الفترة التجريبية للاستمرار في استخدام جميع الميزات
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSelectPlan} 
          className="w-full" 
          size="lg"
          variant={daysLeft <= 1 ? "destructive" : "default"}
        >
          اختر خطة الاشتراك
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TrialStatusCard; 