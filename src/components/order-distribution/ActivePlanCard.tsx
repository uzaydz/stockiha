import React from 'react';
import { CheckCircle2, RefreshCw, Calendar, Activity } from 'lucide-react';
import { DistributionPlan } from '@/types/orderDistribution';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActivePlanCardProps {
  activePlan: DistributionPlan | null;
  onChangePlan: () => void;
}

export const ActivePlanCard: React.FC<ActivePlanCardProps> = ({ activePlan, onChangePlan }) => {
  if (!activePlan) {
    return (
      <Card className="border-dashed border-2 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl mb-4">
              <Activity className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4 text-lg">لا توجد خطة نشطة حالياً</p>
            <Button onClick={onChangePlan} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              اختر خطة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-2 border-green-200/50 dark:border-green-800/30 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">الخطة النشطة</h3>
                <Badge variant="success" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">مفعّلة</Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{activePlan.icon}</span>
                <span className="text-xl font-bold">
                  {activePlan.name}
                </span>
              </div>
              <p className="text-muted-foreground mb-3">
                {activePlan.description}
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="truncate">
                  آخر تعديل: {format(activePlan.lastModified, 'dd MMMM yyyy - hh:mm a', { locale: ar })}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={onChangePlan}
            size="sm"
            className="bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/70 border-2"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تغيير الخطة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};