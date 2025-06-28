import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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

interface TrialStatusCardProps {
  onSelectPlan: () => void;
}

const TrialStatusCard: React.FC<TrialStatusCardProps> = ({ onSelectPlan }) => {
  const { organization } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired'>('expired');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!organization) return;

    const calculateDays = async () => {
      setIsLoading(true);
      console.log('[TrialStatusCard] بدء حساب الأيام المتبقية...');
      console.log('[TrialStatusCard] بيانات المؤسسة:', organization);
      
      try {
        const result = await SubscriptionService.calculateTotalDaysLeft(
          organization as unknown as OrganizationWithSettings,
          null // سنجلب الاشتراك من داخل الدالة
        );

        console.log('[TrialStatusCard] نتيجة حساب الأيام:', result);

        setDaysLeft(result.totalDaysLeft);
        setTrialDaysLeft(result.trialDaysLeft);
        setSubscriptionDaysLeft(result.subscriptionDaysLeft);
        setStatus(result.status);
        setMessage(result.message);

        // حساب النسبة المئوية
        if (result.status === 'trial') {
          const trialDays = 5;
          const progressPercentage = Math.max(0, Math.min(100, ((trialDays - result.trialDaysLeft) / trialDays) * 100));
          setProgress(progressPercentage);
        } else if (result.status === 'active') {
          // للاشتراك المدفوع، نفترض فترة 30 يوم للتقدم
          const subscriptionDays = 30;
          const progressPercentage = Math.max(0, Math.min(100, ((subscriptionDays - result.subscriptionDaysLeft) / subscriptionDays) * 100));
          setProgress(progressPercentage);
        } else {
          setProgress(100);
        }

        console.log('[TrialStatusCard] تم تحديث الحالة:', {
          status: result.status,
          totalDaysLeft: result.totalDaysLeft,
          trialDaysLeft: result.trialDaysLeft,
          subscriptionDaysLeft: result.subscriptionDaysLeft,
          message: result.message
        });

      } catch (error) {
        console.error('[TrialStatusCard] خطأ في حساب الأيام المتبقية:', error);
        setStatus('expired');
        setMessage('خطأ في حساب الأيام المتبقية');
      } finally {
        setIsLoading(false);
      }
    };

    calculateDays();
  }, [organization]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'expired') {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-xl">انتهت الفترة التجريبية والاشتراك</CardTitle>
          </div>
          <CardDescription>
            لقد انتهت فترة التجربة المجانية والاشتراك الخاص بك. قم بالاشتراك للاستمرار في استخدام كافة ميزات المنصة.
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

  if (status === 'active') {
    return (
      <Card className="border-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-xl">اشتراك نشط</CardTitle>
          </div>
          <CardDescription>
            لديك اشتراك نشط ومدفوع في المنصة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الأيام المتبقية</span>
              <span className="font-semibold text-green-600">
                {subscriptionDaysLeft === 1 ? "يوم واحد" : `${subscriptionDaysLeft} يوم`}
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold text-green-600">اشتراك مدفوع نشط</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {message}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSelectPlan} variant="outline" className="w-full" size="lg">
            إدارة الاشتراك
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // status === 'trial'
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
              {trialDaysLeft === 1 ? "يوم واحد" : `${trialDaysLeft} أيام`}
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  اشترك قبل انتهاء الفترة التجريبية للاستمرار في استخدام جميع الميزات
                </p>
                <p className="text-xs text-muted-foreground">
                  {message}
                </p>
              </div>
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
