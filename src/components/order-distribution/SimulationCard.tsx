import React, { useState } from 'react';
import { TestTube2, User, RefreshCw, ArrowRight } from 'lucide-react';
import { DistributionPlan, SimulationResult } from '@/types/orderDistribution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SimulationCardProps {
  plan: DistributionPlan;
  onSimulate: () => Promise<SimulationResult>;
}

export const SimulationCard: React.FC<SimulationCardProps> = ({ plan, onSimulate }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const simulationResult = await onSimulate();
      setResult(simulationResult);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border-2 border-purple-200/50 dark:border-purple-800/30 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TestTube2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          محاكاة التوزيع
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          جرّب كيف سيتم توزيع الطلبات باستخدام خطة <strong>{plan.name}</strong>
        </p>
        
        {result && (
          <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-background to-muted/30 rounded-lg border-2 border-purple-200/30 dark:border-purple-800/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سيتم إرسال الطلب إلى:</p>
                <p className="font-semibold">{result.employeeName}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.reason}</p>
              </div>
            </div>
          </div>
        )}
        
        <Button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          variant="default"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              جاري المحاكاة...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 ml-2" />
              {result ? 'إعادة المحاكاة' : 'تجربة المحاكاة'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};