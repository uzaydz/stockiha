import React from 'react';
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
    <Card className="rounded-xl bg-background/80 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* الرأس مع العنوان والأيقونة */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {numberLabel && (
                <span className="inline-flex items-center justify-center h-5 w-5 bg-primary/10 text-primary rounded-md text-xs font-medium border border-primary/20">
                  {numberLabel}
                </span>
              )}
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
              trend === 'up' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 
              trend === 'down' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 
              'bg-primary/10 text-primary'
            }`}>
              {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })}
            </div>
          </div>
          
          {/* القيمة الرئيسية */}
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
            
            {/* معلومات إضافية */}
            {(trend || description) && (
              <div className="space-y-1">
                {trend && trendValue && (
                  <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${
                    trend === 'up' ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 
                    trend === 'down' ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400' : 
                    'bg-muted/50 text-muted-foreground'
                  }`}>
                    {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                     trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                    <span>{trendValue}</span>
                  </div>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
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
