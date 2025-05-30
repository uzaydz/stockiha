import React from 'react';
import { DistributionPlan } from '@/types/orderDistribution';
import { Check, Circle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlansListProps {
  plans: DistributionPlan[];
  activePlanId: string | null;
  onSelectPlan: (plan: DistributionPlan) => void;
}

export const PlansList: React.FC<PlansListProps> = ({ plans, activePlanId, onSelectPlan }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isActive = plan.id === activePlanId;
        
        return (
          <div
            key={plan.id}
            className={cn(
              "group relative transition-all duration-300",
              !isActive && "hover:scale-105"
            )}
          >
            <div className={cn(
              "absolute inset-0 rounded-2xl bg-gradient-to-br transition-all duration-300",
              isActive 
                ? "from-green-400/20 to-emerald-400/20 blur-xl" 
                : "from-blue-400/0 to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 group-hover:blur-xl"
            )} />
            
            <Card
              className={cn(
                "relative h-full cursor-pointer transition-all duration-300 border-2",
                isActive 
                  ? "border-green-500/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg" 
                  : "border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-muted/30"
              )}
              onClick={() => onSelectPlan(plan)}
            >
              <CardContent className="pt-8 pb-6 px-6">
                {isActive && (
                  <div className="absolute top-4 left-4">
                    <Badge 
                      variant="default" 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md"
                    >
                      <Check className="w-3 h-3 ml-1" />
                      نشطة
                    </Badge>
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "text-5xl p-4 rounded-2xl transition-all duration-300",
                    isActive 
                      ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 shadow-inner" 
                      : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group-hover:from-blue-100 group-hover:to-purple-100 dark:group-hover:from-blue-900/30 dark:group-hover:to-purple-900/30"
                  )}>
                    {plan.icon}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
                      {plan.description}
                    </p>
                  </div>
                  
                  <Button
                    className={cn(
                      "w-full transition-all duration-300",
                      isActive 
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md" 
                        : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    )}
                    variant={isActive ? "default" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlan(plan);
                    }}
                  >
                    {isActive ? (
                      <>
                        <Settings className="w-4 h-4 ml-2 animate-pulse" />
                        إدارة الإعدادات
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 ml-2" />
                        اختيار هذه الخطة
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};