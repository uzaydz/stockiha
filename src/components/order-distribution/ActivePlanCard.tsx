import React from 'react';
import { CheckCircle2, RefreshCw, Calendar, Activity, Clock, Settings2, Users2 } from 'lucide-react';
import { DistributionPlan } from '@/types/orderDistribution';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ActivePlanCardProps {
  activePlan: DistributionPlan | null;
  onChangePlan: () => void;
}

export const ActivePlanCard: React.FC<ActivePlanCardProps> = ({ activePlan, onChangePlan }) => {
  if (!activePlan) {
    return (
      <Card className="border-dashed border-2 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20 overflow-hidden">
        <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-bl-2xl" />
        <div className="absolute left-0 bottom-0 h-16 w-16 bg-gradient-to-tr from-primary/10 to-primary/5 rounded-tr-2xl" />
        
        <CardContent className="pt-6 relative">
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full mb-4 shadow-inner">
              <Activity className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-6 text-lg">لا توجد خطة نشطة حالياً</p>
            <Button 
              onClick={onChangePlan} 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-6 shadow-md"
              size="lg"
            >
              <Settings2 className="w-4 h-4 ml-2" />
              اختر خطة توزيع
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-2 border-green-200/50 dark:border-green-800/30 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-green-200/20 to-transparent dark:from-green-500/5 rounded-bl-full" />
      
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-full shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold">الخطة النشطة</h3>
                <Badge variant="success" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm">
                  <span className="animate-pulse mr-1">●</span> مفعّلة
                </Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg shadow-sm border border-green-200/50 dark:border-green-800/30">
                  <span className="text-3xl">{activePlan.icon}</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  {activePlan.name}
                </span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-2xl">
                {activePlan.description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span>
                    آخر تعديل: {format(activePlan.lastModified, 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span>
                    الوقت: {format(activePlan.lastModified, 'hh:mm a', { locale: ar })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 min-w-[140px]">
            <Button
              variant="outline"
              onClick={onChangePlan}
              className="w-full bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/70 border-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              تغيير الخطة
            </Button>
            <Button
              variant="outline"
              onClick={onChangePlan}
              className="w-full bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 border-2 border-green-200/50 dark:border-green-800/30 text-green-800 dark:text-green-300 shadow-sm"
            >
              <Settings2 className="w-4 h-4 ml-2" />
              إدارة الإعدادات
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};