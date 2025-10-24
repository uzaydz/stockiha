import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface DebtsSummaryProps {
  data: {
    totalDebts: number;
    totalPartialPayments: number;
    customerDebts?: Array<{ customerId: string; totalDebt: number }>;
  };
}

const DebtsSummary: React.FC<DebtsSummaryProps> = ({ data }) => {
  const customersWithDebts = data.customerDebts?.length || 0;
  const averageDebt = customersWithDebts > 0 ? data.totalDebts / customersWithDebts : 0;
  
  const stats = [
    {
      title: 'إجمالي الديون',
      value: formatPrice(data.totalDebts),
      description: 'المبالغ المستحقة الكلية',
      icon: DollarSign,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'عدد الطلبات',
      value: data.totalPartialPayments.toString(),
      description: 'طلبات بدفع جزئي',
      icon: FileText,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'عدد العملاء',
      value: customersWithDebts.toString(),
      description: 'عملاء لديهم ديون',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'متوسط الدين',
      value: formatPrice(averageDebt),
      description: 'لكل عميل',
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DebtsSummary;
