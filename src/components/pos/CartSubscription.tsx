import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Calendar, CreditCard, Tag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionItem {
  id: string;
  cart_id: string;
  name: string;
  provider: string;
  final_price: number;
  original_price: number;
  discount_percentage: number;
  logo_url?: string;
  duration_months: number;
  duration_label: string;
  promo_text?: string;
  tracking_code: string;
  category?: {
    name: string;
  };
  selectedPricing?: {
    selling_price: number;
    duration_months: number;
    duration_label: string;
    discount_percentage: number;
    promo_text: string;
  };
}

interface CartSubscriptionProps {
  subscription: SubscriptionItem;
  onRemove: (subscriptionId: string) => void;
  onUpdatePrice: (subscriptionId: string, price: number) => void;
  canEdit?: boolean;
}

const CartSubscription: React.FC<CartSubscriptionProps> = ({
  subscription,
  onRemove,
  onUpdatePrice,
  canEdit = true
}) => {
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    onUpdatePrice(subscription.cart_id, newPrice);
  };

  return (
    <Card className="border border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/30">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          {/* معلومات الاشتراك */}
          <div className="flex items-start gap-3 flex-1">
            {/* لوغو الخدمة */}
            <div className="flex-shrink-0">
              {subscription.logo_url ? (
                <img 
                  src={subscription.logo_url} 
                  alt={subscription.name}
                  className="w-10 h-10 rounded border border-border dark:border-border/50"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded border border-border dark:border-border/50 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>

            {/* تفاصيل الاشتراك */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm leading-tight mb-1 text-foreground">
                    {subscription.name}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs bg-background dark:bg-background/50">
                      {subscription.provider}
                    </Badge>
                    
                    {subscription.category && (
                      <Badge variant="secondary" className="text-xs">
                        {subscription.category.name}
                      </Badge>
                    )}
                  </div>

                  {/* مدة الاشتراك */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    <span>{subscription.duration_label}</span>
                    {subscription.promo_text && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {subscription.promo_text}
                      </Badge>
                    )}
                  </div>

                  {/* كود التتبع */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    <span className="font-mono">{subscription.tracking_code}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* السعر والإجراءات */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* السعر */}
            <div className="text-right">
              {canEdit ? (
                <Input
                  type="number"
                  value={subscription.final_price}
                  onChange={handlePriceChange}
                  className="w-20 h-8 text-sm text-right bg-background dark:bg-background/50"
                  step="0.01"
                  min="0"
                />
              ) : (
                <div className="text-sm font-medium text-foreground">
                  {subscription.final_price.toFixed(2)} دج
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {(subscription.final_price / subscription.duration_months).toFixed(2)} دج/شهر
              </div>
              {subscription.discount_percentage > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  وفر {subscription.discount_percentage}%
                </div>
              )}
            </div>

            {/* زر الحذف */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(subscription.cart_id)}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:border-red-800/50 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نوع: خدمة اشتراك رقمية</span>
            <span>تسليم فوري</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartSubscription;