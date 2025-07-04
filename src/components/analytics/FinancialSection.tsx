import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  AlertTriangle, 
  TrendingDown, 
  CreditCard, 
  DollarSign,
  Wallet
} from 'lucide-react';
import { formatCurrency, getColorByType } from './utils';
import type { FinancialData } from './types';

interface FinancialSectionProps {
  data: FinancialData | undefined;
  isLoading?: boolean;
}

const FinancialSection = React.memo<FinancialSectionProps>(({ data, isLoading = false }) => {
  // حساب النسب المالية
  const debtPaymentRatio = data?.total_debt_amount ? 
    ((data.paid_debt_amount / data.total_debt_amount) * 100) : 0;
  
  const totalExpenses = (data?.one_time_expenses || 0) + (data?.recurring_expenses_annual || 0);
  const totalLosses = (data?.total_losses_cost || 0) + (data?.total_returns_amount || 0);

  // بيانات الحالة المالية
  const financialCards = [
    {
      title: 'تحليل المديونية',
      icon: Calculator,
      items: [
        { label: 'إجمالي المديونية', value: data?.total_debt_amount || 0, type: 'debt' as const },
        { label: 'المبلغ المدفوع', value: data?.paid_debt_amount || 0, type: 'success' as const },
        { label: 'المتبقي', value: (data?.total_debt_amount || 0) - (data?.paid_debt_amount || 0), type: 'warning' as const },
        { label: 'تأثير على رأس المال', value: data?.debt_impact_on_capital || 0, type: 'danger' as const }
      ],
      progress: debtPaymentRatio,
      progressLabel: 'نسبة السداد',
      color: 'from-orange-500 to-red-600',
      bgColor: 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20'
    },
    {
      title: 'الخسائر والإرجاعات',
      icon: TrendingDown,
      items: [
        { label: 'قيمة الخسائر (التكلفة)', value: data?.total_losses_cost || 0, type: 'danger' as const },
        { label: 'قيمة الخسائر (البيع)', value: data?.total_losses_selling_value || 0, type: 'danger' as const },
        { label: 'الإرجاعات', value: data?.total_returns_amount || 0, type: 'warning' as const },
        { label: 'إجمالي الخسائر', value: totalLosses, type: 'danger' as const }
      ],
      progress: data?.total_revenue ? (totalLosses / data.total_revenue * 100) : 0,
      progressLabel: 'نسبة الخسائر من الإيرادات',
      color: 'from-red-500 to-pink-600',
      bgColor: 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20'
    },
    {
      title: 'المصروفات والنفقات',
      icon: Wallet,
      items: [
        { label: 'المصروفات العادية', value: data?.one_time_expenses || 0, type: 'cost' as const },
        { label: 'المصروفات المتكررة', value: data?.recurring_expenses_annual || 0, type: 'cost' as const },
        { label: 'إجمالي المصروفات', value: totalExpenses, type: 'danger' as const },
        { label: 'صافي المصروفات', value: data?.total_expenses || 0, type: 'danger' as const }
      ],
      progress: data?.total_revenue ? (totalExpenses / data.total_revenue * 100) : 0,
      progressLabel: 'نسبة المصروفات من الإيرادات',
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20'
    }
  ];

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted animate-pulse rounded-lg"></div>
              <div className="h-5 bg-muted animate-pulse rounded w-32"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex justify-between">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-12"></div>
              </div>
              <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {financialCards.map((card, index) => {
        const IconComponent = card.icon;
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
              <CardHeader className={`bg-gradient-to-r ${card.bgColor} relative`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
                
                {/* مؤشر الحالة */}
                <div className="absolute top-4 left-4">
                  {card.progress > 80 ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 ml-1" />
                      مرتفع
                    </Badge>
                  ) : card.progress > 50 ? (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      متوسط
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      جيد
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {card.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{item.label}:</span>
                      <span 
                        className="font-semibold"
                        style={{ color: getColorByType(item.type) }}
                      >
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* شريط التقدم */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{card.progressLabel}</span>
                    <span className="font-medium">{card.progress.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(card.progress, 100)} 
                    className="h-2"
                  />
                </div>
                
                {/* ملاحظة تحذيرية */}
                {card.progress > 70 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {card.title === 'تحليل المديونية' ? 
                          'نسبة دين مرتفعة - يُنصح بالمتابعة' :
                          card.title === 'الخسائر والإرجاعات' ?
                          'نسبة خسائر مرتفعة - يجب المراجعة' :
                          'نسبة مصروفات مرتفعة - يُنصح بالتحكم'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
});

FinancialSection.displayName = 'FinancialSection';

export default FinancialSection;
