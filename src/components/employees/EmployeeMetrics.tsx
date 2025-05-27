import React from 'react';
import { EmployeeStats } from '@/types/employee';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardTitle 
} from '@/components/ui/card';
import { UsersRound, UserCheck, UserMinus } from 'lucide-react';

interface EmployeeMetricsProps {
  stats: EmployeeStats;
}

const EmployeeMetrics = ({ stats }: EmployeeMetricsProps) => {
  const calculatePercentage = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">إجمالي الموظفين</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.total}</CardTitle>
            </div>
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <UsersRound className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">موظفون نشطون</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.active}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {calculatePercentage(stats.active, stats.total)}% من إجمالي الموظفين
              </div>
            </div>
            <div className="p-4 bg-green-100 text-green-600 rounded-full">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-md">موظفون غير نشطين</CardDescription>
              <CardTitle className="text-3xl mt-2">{stats.inactive}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {calculatePercentage(stats.inactive, stats.total)}% من إجمالي الموظفين
              </div>
            </div>
            <div className="p-4 bg-red-100 text-red-600 rounded-full">
              <UserMinus className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeMetrics;
