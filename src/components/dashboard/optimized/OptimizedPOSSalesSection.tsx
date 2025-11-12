import { useAuth } from '@/context/AuthContext';
import POSSalesPerformance from '@/components/dashboard/POSSalesPerformance';
import { BarChart3, Sparkles } from 'lucide-react';

const OptimizedPOSSalesSection = () => {
  const { organization } = useAuth();

  if (!organization?.id) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/40 dark:border-border/20 bg-background/80 dark:bg-background/60 backdrop-blur-sm p-6 shadow-sm">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">أداء مبيعات نقطة البيع</h2>
            <p className="text-sm text-muted-foreground">تحليل شامل للمبيعات والطلبات اليومية</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent dark:via-border/30"></div>

        {/* Component */}
        <POSSalesPerformance
          organizationId={organization.id}
          days={7}
        />
      </div>
    </div>
  );
};

export default OptimizedPOSSalesSection;
