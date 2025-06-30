import React from 'react';
import { Check, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: {
    max_users?: number;
    max_products?: number;
    max_pos?: number;
  };
  is_active: boolean;
  is_popular?: boolean;
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan: boolean;
  onSubscribe: () => void;
  onChangePlan: () => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  billingCycle,
  isCurrentPlan,
  onSubscribe,
  onChangePlan,
}) => {
  const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
  const formattedPrice = new Intl.NumberFormat('ar', {
    style: 'decimal',
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(price);

  const yearlyDiscount = ((plan.monthly_price * 12 - plan.yearly_price) / (plan.monthly_price * 12)) * 100;
  const yearlyDiscountFormatted = Math.round(yearlyDiscount);

  return (
    <Card className={`relative h-full flex flex-col ${plan.is_popular ? 'border-primary shadow-md' : ''} ${isCurrentPlan ? 'border-green-500 shadow-md' : ''}`}>
      {plan.is_popular && (
        <div className="absolute top-0 left-0 w-full bg-primary py-1 text-white text-center text-xs font-medium">
          <div className="flex items-center justify-center">
            <Crown className="w-3 h-3 ml-1" />
            <span>الأكثر شعبية</span>
          </div>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute top-0 left-0 w-full bg-green-500 py-1 text-white text-center text-xs font-medium">
          <div className="flex items-center justify-center">
            <Check className="w-3 h-3 ml-1" />
            <span>الخطة المفعلة حالياً</span>
          </div>
        </div>
      )}

      <CardHeader className={`${plan.is_popular || isCurrentPlan ? 'pt-8' : 'pt-6'} pb-4`}>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 flex-grow">
        <div className="flex flex-wrap items-baseline">
          <span className="text-3xl font-bold ml-1">{formattedPrice}</span>
          <span className="text-xl mr-1">دج</span>
          <span className="text-muted-foreground mr-2">
            {billingCycle === 'monthly' ? '/شهرياً' : '/سنوياً'}
          </span>
          {billingCycle === 'yearly' && yearlyDiscountFormatted > 0 && (
            <Badge variant="outline" className="font-normal mt-2">
              وفر {yearlyDiscountFormatted}٪
            </Badge>
          )}
        </div>

        {plan.trial_period_days > 0 && (
          <p className="text-sm text-muted-foreground">
            يتضمن فترة تجريبية مجانية لمدة {plan.trial_period_days} أيام
          </p>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-base">المميزات</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center ml-2">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {plan.limits && (
          <div className="space-y-2">
            <h4 className="font-medium text-base">الحدود</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {plan.limits.max_users && (
                <li>عدد المستخدمين: حتى {plan.limits.max_users} مستخدم</li>
              )}
              {plan.limits.max_products && (
                <li>عدد المنتجات: حتى {plan.limits.max_products} منتج</li>
              )}
              {plan.limits.max_pos && (
                <li>عدد نقاط البيع: حتى {plan.limits.max_pos} نقطة بيع</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 pb-6">
        {isCurrentPlan ? (
          <Button variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white" disabled>
            <Check className="mr-2 h-4 w-4" /> الخطة الحالية المفعلة
          </Button>
        ) : (
          <Button
            variant={plan.is_popular ? 'default' : 'outline'}
            className="w-full"
            onClick={onSubscribe}
          >
            اشترك الآن
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SubscriptionCard;
