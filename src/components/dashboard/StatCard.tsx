
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard = ({ title, value, icon, description, trend, trendValue }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={`inline-flex items-center ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''
              }`}>
                {trend === 'up' ? <TrendingUp className="mr-1 h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="mr-1 h-3 w-3" /> : null}
                {trendValue}
              </span>
            )}
            {description && <span> {description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
