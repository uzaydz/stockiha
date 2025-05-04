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
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md border border-border">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-3">
            <div className="flex items-center">
              {numberLabel && (
                <span className="inline-flex items-center justify-center h-5 w-5 bg-primary/10 text-primary rounded-full text-xs font-semibold mr-2">
                  {numberLabel}
                </span>
              )}
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {(trend || description) && (
              <p className="text-xs text-muted-foreground">
                {trend && (
                  <span className={`inline-flex items-center ${
                    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''
                  }`}>
                    {trend === 'up' ? <TrendingUp className="ml-1 h-3 w-3" /> : 
                     trend === 'down' ? <TrendingDown className="ml-1 h-3 w-3" /> : null}
                    {trendValue}
                  </span>
                )}
                {description && <span> {description}</span>}
              </p>
            )}
          </div>
          <div className={`flex items-center justify-center h-10 w-10 rounded-md ${
            trend === 'up' ? 'bg-green-100 text-green-600' : 
            trend === 'down' ? 'bg-red-100 text-red-600' : 
            'bg-primary/10 text-primary'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
