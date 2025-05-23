import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  numberLabel?: string;
}

const StatCard = ({ title, value, icon, description, trend, trendValue, numberLabel }: StatCardProps) => {
  return (
    <Card className="rounded-lg bg-card text-card-foreground relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-md border border-border/20 shadow-lg hover:shadow-xl before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:pointer-events-none">
      <CardContent className="p-8 relative z-10">
        <div className="flex flex-col space-y-6">
          {/* الرأس مع العنوان والأيقونة */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {numberLabel && (
                <span className="inline-flex items-center justify-center h-7 w-7 bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20">
                  {numberLabel}
                </span>
              )}
              <p className="text-base font-semibold text-muted-foreground">{title}</p>
            </div>
            <div className={`flex items-center justify-center h-14 w-14 rounded-xl border transition-all duration-300 ${
              trend === 'up' ? 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-700/30' : 
              trend === 'down' ? 'bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-700/30' : 
              'bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-primary/20'
            } hover:scale-110 shadow-md hover:shadow-lg`}>
              {icon}
            </div>
          </div>
          
          {/* القيمة الرئيسية */}
          <div className="space-y-2">
            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent leading-tight">
              {value}
            </div>
            
            {/* معلومات إضافية */}
            {(trend || description) && (
              <div className="space-y-1">
                {trend && (
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 
                    trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                     trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                    <span>{trendValue}</span>
                  </div>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
