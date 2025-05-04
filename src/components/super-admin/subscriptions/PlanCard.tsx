import { CheckCircle, Edit, Trash } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SubscriptionPlan } from '@/types/subscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete?: (plan: SubscriptionPlan) => void;
  onToggleActive?: (plan: SubscriptionPlan, isActive: boolean) => void;
}

export function PlanCard({ plan, onEdit, onDelete, onToggleActive }: PlanCardProps) {
  const [isActive, setIsActive] = useState(plan.is_active);
  
  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // معالجة تغيير حالة التفعيل
  const handleToggleActive = () => {
    const newState = !isActive;
    setIsActive(newState);
    if (onToggleActive) {
      onToggleActive(plan, newState);
    }
  };
  
  return (
    <Card className={plan.is_popular ? "border-primary" : ""}>
      {plan.is_popular && (
        <div className="absolute top-0 left-0 right-0 bg-primary py-1 text-xs text-center text-primary-foreground rounded-t-lg">
          الأكثر شيوعاً
        </div>
      )}
      
      <CardHeader className={plan.is_popular ? "pt-8" : ""}>
        <div className="flex justify-between items-center">
          <CardTitle>{plan.name}</CardTitle>
          <Switch checked={isActive} onCheckedChange={handleToggleActive} />
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold">{formatCurrency(plan.monthly_price)}</span>
            <span className="text-muted-foreground text-sm">/ شهريا</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-semibold">{formatCurrency(plan.yearly_price)}</span>
            <span className="text-muted-foreground text-sm">/ سنويا</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">المميزات:</h4>
          <ul className="space-y-2">
            {Array.isArray(plan.features) && plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">الحدود:</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">المستخدمين</span>
              <span className="font-bold">{plan.limits?.max_users === null ? 'غير محدود' : plan.limits?.max_users}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">المنتجات</span>
              <span className="font-bold">{plan.limits?.max_products === null ? 'غير محدود' : plan.limits?.max_products}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">نقاط البيع</span>
              <span className="font-bold">{plan.limits?.max_pos === null ? 'غير محدود' : plan.limits?.max_pos}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-center gap-2">
        <Button variant="outline" size="sm" className="w-1/2" onClick={() => onEdit(plan)}>
          <Edit className="h-4 w-4 ml-1" />
          تعديل
        </Button>
        
        {onDelete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-1/2" 
                  disabled={isActive}
                  onClick={() => onDelete(plan)}
                >
                  <Trash className="h-4 w-4 ml-1" />
                  حذف
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">لا يمكن حذف الخطط النشطة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardFooter>
    </Card>
  );
} 