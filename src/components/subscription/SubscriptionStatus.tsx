import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SubscriptionService } from '@/lib/subscription-service';

interface SubscriptionStatusProps {
  organization: {
    id: string;
    subscription_tier: string;
    subscription_status: string;
    subscription_id: string | null;
    created_at: string;
  };
  subscription?: {
    id: string;
    status: string;
    billing_cycle: string;
    start_date: string;
    end_date: string;
    plan?: {
      name: string;
      code: string;
    };
  } | null;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ organization, subscription }) => {
  const navigate = useNavigate();
  
  // حساب الأيام المتبقية في الاشتراك
  let daysLeft = 0;
  let isTrialActive = false;
  const isPending = subscription?.status === 'pending' || organization.subscription_status === 'pending';
  
  if (subscription?.end_date) {
    daysLeft = SubscriptionService.calculateDaysLeft(subscription.end_date);
  } else if (organization.subscription_status === 'trial') {
    // التحقق من حالة الفترة التجريبية
    const trialStatus = SubscriptionService.checkTrialStatus(organization.created_at);
    isTrialActive = trialStatus.isTrialActive;
    daysLeft = trialStatus.daysLeft;
  }
  
  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd', { locale: ar });
  };
  
  const handleManageSubscription = () => {
    navigate('/dashboard/subscription');
  };

  if (isPending) {
    return (
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="outline" className="ml-2">
            في انتظار التفعيل
          </Badge>
          <span className="text-sm text-muted-foreground">
            جارٍ مراجعة عملية الدفع الخاصة بك
          </span>
        </div>

        <Alert className="mb-4">
          <Clock className="h-4 w-4 ml-2" />
          <AlertTitle>طلب الاشتراك قيد المراجعة</AlertTitle>
          <AlertDescription>
            تم استلام طلب الاشتراك. خلال وقت قصير سيتم تفعيل الخطة وإعلامك فوراً.
          </AlertDescription>
        </Alert>

        <Button onClick={handleManageSubscription} variant="outline" size="sm">
          متابعة حالة الاشتراك
        </Button>
      </div>
    );
  }

  // إذا كان هناك اشتراك نشط
  if (subscription && subscription.status === 'active') {
    return (
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="outline" className="ml-2">
            {subscription.plan?.name || organization.subscription_tier}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {subscription.billing_cycle === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي'}
          </span>
        </div>
        
        {daysLeft <= 7 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4 ml-2" />
            <AlertTitle>ينتهي قريباً</AlertTitle>
            <AlertDescription>
              اشتراكك سينتهي خلال {daysLeft} يوم. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.
            </AlertDescription>
          </Alert>
        )}
        
        <Button onClick={handleManageSubscription} variant="outline" size="sm">
          إدارة الاشتراك
        </Button>
      </div>
    );
  }
  
  // إذا كان في فترة تجريبية
  if (isTrialActive) {
    return (
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="secondary" className="ml-2">
            فترة تجريبية
          </Badge>
          <span className="text-sm text-muted-foreground">
            متبقي {daysLeft} يوم
          </span>
        </div>
        
        <Alert className="mb-4">
          <Clock className="h-4 w-4 ml-2" />
          <AlertTitle>فترة تجريبية</AlertTitle>
          <AlertDescription>
            أنت حالياً في الفترة التجريبية المجانية. يرجى الاشتراك قبل انتهاء الفترة التجريبية للاستمرار في استخدام النظام.
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleManageSubscription}>
          اشترك الآن
        </Button>
      </div>
    );
  }
  
  // إذا كان الاشتراك منتهي أو معلق
  if (subscription) {
    return (
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="destructive" className="ml-2">
            {subscription.status === 'expired' ? 'منتهي' : 'معلق'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {subscription.plan?.name || organization.subscription_tier}
          </span>
        </div>
        
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 ml-2" />
          <AlertTitle>الاشتراك غير نشط</AlertTitle>
          <AlertDescription>
            {subscription.status === 'expired' 
              ? 'لقد انتهى اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام النظام.'
              : 'اشتراكك في انتظار الموافقة. سيتم تفعيله قريباً.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleManageSubscription}>
          {subscription.status === 'expired' ? 'تجديد الاشتراك' : 'إدارة الاشتراك'}
        </Button>
      </div>
    );
  }
  
  // إذا لم يكن هناك اشتراك
  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Badge variant="destructive" className="ml-2">
          غير مشترك
        </Badge>
      </div>
      
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4 ml-2" />
        <AlertTitle>لا يوجد اشتراك نشط</AlertTitle>
        <AlertDescription>
          ليس لديك اشتراك نشط حالياً. يرجى الاشتراك للاستمرار في استخدام النظام.
        </AlertDescription>
      </Alert>
      
      <Button onClick={handleManageSubscription}>
        اشترك الآن
      </Button>
    </div>
  );
};

export default SubscriptionStatus;
