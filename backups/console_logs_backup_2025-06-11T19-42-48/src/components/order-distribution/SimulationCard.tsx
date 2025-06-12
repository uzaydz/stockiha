import React, { useState } from 'react';
import { TestTube2, User, RefreshCw, ArrowRight, Award, TrendingUp, CheckCheck } from 'lucide-react';
import { DistributionPlan, SimulationResult } from '@/types/orderDistribution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SimulationCardProps {
  plan: DistributionPlan;
  onSimulate: () => Promise<SimulationResult>;
}

export const SimulationCard: React.FC<SimulationCardProps> = ({ plan, onSimulate }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simulationCount, setSimulationCount] = useState(0);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const simulationResult = await onSimulate();
      setResult(simulationResult);
      setSimulationCount(prev => prev + 1);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('أداء')) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (reason.includes('أقل عدد طلبات')) return <CheckCheck className="w-4 h-4 text-blue-500" />;
    if (reason.includes('الدور')) return <RefreshCw className="w-4 h-4 text-purple-500" />;
    if (reason.includes('أسرع')) return <ArrowRight className="w-4 h-4 text-amber-500" />;
    return <Award className="w-4 h-4 text-pink-500" />;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border-2 border-purple-200/50 dark:border-purple-800/30 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-purple-200/20 to-transparent dark:from-purple-500/5 rounded-bl-full" />
      
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
          <TestTube2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          محاكاة التوزيع
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <p className="text-sm text-muted-foreground mb-5">
          جرّب كيف سيتم توزيع الطلبات باستخدام خطة <strong>{plan.name}</strong>
        </p>
        
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={simulationCount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-5"
            >
              <div className="p-4 sm:p-5 bg-gradient-to-br from-background to-muted/30 rounded-lg border-2 border-purple-200/30 dark:border-purple-800/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-purple-500 to-pink-500" />
                
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                        سيتم إرسال الطلب إلى
                      </Badge>
                      <p className="font-bold text-lg bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
                        {result.employeeName}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="bg-purple-200/50 dark:bg-purple-800/30" />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
                    <div className="flex items-center gap-1.5">
                      {getReasonIcon(result.reason)}
                      <span>السبب:</span>
                    </div>
                    <span className={cn(
                      "font-medium px-2 py-1 rounded-md",
                      result.reason.includes('أداء') ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" :
                      result.reason.includes('أقل عدد طلبات') ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" :
                      result.reason.includes('الدور') ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" :
                      result.reason.includes('أسرع') ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" :
                      "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300"
                    )}>
                      {result.reason}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
          variant="default"
          size="lg"
        >
          {isSimulating ? (
            <motion.div 
              className="flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              جاري المحاكاة...
            </motion.div>
          ) : (
            <motion.div 
              className="flex items-center justify-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <TestTube2 className="w-4 h-4 ml-2" />
              {result ? 'إعادة المحاكاة' : 'تجربة المحاكاة'}
            </motion.div>
          )}
        </Button>
        
        {result && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            هذه محاكاة فقط. النتائج الفعلية قد تختلف بناءً على العوامل المتغيرة.
          </p>
        )}
      </CardContent>
    </Card>
  );
};