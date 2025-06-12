import React, { useState } from 'react';
import { DistributionPlan } from '@/types/orderDistribution';
import { Check, Circle, Settings, ShieldCheck, AlertCircle, ChevronRight, BarChart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface PlansListProps {
  plans: DistributionPlan[];
  activePlanId: string | null;
  onSelectPlan: (plan: DistributionPlan) => void;
}

export const PlansList: React.FC<PlansListProps> = ({ plans, activePlanId, onSelectPlan }) => {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const getPlanIconElement = (plan: DistributionPlan) => {
    const iconMap: Record<string, React.ReactNode> = {
      round_robin: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      smart: <BarChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      availability: <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      priority: <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-400" />,
      expert: <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    };

    return iconMap[plan.type] || null;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isActive = plan.id === activePlanId;
        const isHovered = plan.id === hoveredPlan;
        
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="relative"
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <motion.div 
              className={cn(
                "absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-70",
                isActive 
                  ? "from-green-400/20 to-emerald-400/20" 
                  : isHovered
                    ? "from-blue-400/20 to-purple-400/20"
                    : "from-blue-400/0 to-purple-400/0"
              )}
              animate={{
                opacity: isActive ? 0.7 : isHovered ? 0.5 : 0
              }}
              transition={{ duration: 0.2 }}
            />
            
            <Card
              className={cn(
                "relative h-full cursor-pointer transition-all duration-300 border-2 overflow-hidden",
                isActive 
                  ? "border-green-500/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg" 
                  : isHovered
                    ? "border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 shadow-md"
                    : "border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-muted/30"
              )}
              onClick={() => onSelectPlan(plan)}
            >
              {/* زخرفة الخلفية */}
              <div className={cn(
                "absolute top-0 right-0 h-32 w-32 rounded-bl-full",
                isActive 
                  ? "bg-gradient-to-bl from-green-200/20 to-transparent dark:from-green-500/5"
                  : "bg-gradient-to-bl from-primary/10 to-transparent dark:from-primary/5"
              )}/>
              
              <CardContent className="pt-8 pb-6 px-6 relative">
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 left-4"
                  >
                    <Badge 
                      variant="default" 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md"
                    >
                      <Check className="w-3 h-3 ml-1" />
                      نشطة
                    </Badge>
                  </motion.div>
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "flex items-center gap-3 text-5xl p-4 rounded-2xl transition-all duration-300",
                    isActive 
                      ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 shadow-inner" 
                      : isHovered
                        ? "bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/10"
                        : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
                  )}>
                    <span>{plan.icon}</span>
                    {getPlanIconElement(plan)}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className={cn(
                      "text-xl font-bold bg-clip-text text-transparent",
                      isActive 
                        ? "bg-gradient-to-r from-green-700 to-emerald-700 dark:from-green-300 dark:to-emerald-300"
                        : "bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300"
                    )}>
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
                      {plan.description}
                    </p>
                  </div>
                  
                  <Button
                    className={cn(
                      "w-full mt-4 transition-all duration-300",
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
                        <ChevronRight className="w-4 h-4 ml-2" />
                        اختيار هذه الخطة
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};