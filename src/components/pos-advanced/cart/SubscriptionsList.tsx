import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Trash2 } from 'lucide-react';

interface Subscription {
  name?: string;
  price?: number;
  selling_price?: number;
  purchase_price?: number;
  duration?: string;
  description?: string;
}

interface SubscriptionsListProps {
  selectedSubscriptions: Subscription[];
  removeSubscription: (index: number) => void;
}

const SubscriptionsList: React.FC<SubscriptionsListProps> = ({
  selectedSubscriptions,
  removeSubscription
}) => {
  if (selectedSubscriptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-2 px-1">
        <CreditCard className="h-4 w-4" />
        <h4 className="font-semibold text-sm">
          الاشتراكات ({selectedSubscriptions.length})
        </h4>
      </div>

      <div className="space-y-2">
        {selectedSubscriptions.map((subscription, index) => (
          <Card key={`subscription-${index}`} className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-sm text-foreground">
                    {String(subscription.name || '')}
                  </h5>
                  {(subscription.duration || subscription.description) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.duration && `${String(subscription.duration)} - `}
                      {String(subscription.description || '')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="text-sm font-bold text-green-600">
                    {(subscription.price || subscription.selling_price || subscription.purchase_price || 0).toLocaleString()} دج
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubscription(index)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SubscriptionsList);
