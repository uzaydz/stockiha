import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart3, PieChart, DollarSign } from 'lucide-react';
import { FinancialBarChart, SalesDistributionChart } from './ChartComponents';
import { formatCurrency } from './utils';
import type { FinancialData, ChartDataItem } from './types';

interface AnalyticsChartsProps {
  salesData: ChartDataItem[];
  profitData: ChartDataItem[];
  isLoading?: boolean;
}

const AnalyticsCharts = React.memo<AnalyticsChartsProps>(({
  salesData,
  profitData,
  isLoading = false
}) => {
  // معالجة بيانات الأرباح لضمان التوافق مع Chart.js
  const enhancedProfitData = useMemo(() => {
    return profitData.map((item) => ({
      ...item,
      amount: item.amount || item.value || 0,
      value: item.value || item.amount || 0
    }));
  }, [profitData]);

  // معالجة بيانات المبيعات
  const enhancedSalesData = useMemo(() => {
    return salesData.filter(item => (item.value || item.amount || 0) > 0);
  }, [salesData]);

  // حالة التحميل
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[500px]">
          <FinancialBarChart 
            data={[]}
            title="تحليل الأرباح والتكاليف"
            subtitle="مقارنة شاملة للأداء المالي"
            isLoading={true}
          />
        </div>
        <div className="min-h-[500px]">
          <SalesDistributionChart 
            data={[]}
            title="توزيع المبيعات حسب المصدر"
            subtitle="نسب المساهمة في إجمالي المبيعات"
            isLoading={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* رسم بياني للأرباح والتكاليف */}
      <div className="min-h-[500px]">
        <FinancialBarChart 
          data={enhancedProfitData}
          title="تحليل الأرباح والتكاليف"
          subtitle="مقارنة شاملة للأداء المالي"
          isLoading={false}
        />
      </div>

      {/* رسم دائري لتوزيع المبيعات */}
      <div className="min-h-[500px]">
        <SalesDistributionChart 
          data={enhancedSalesData}
          title="توزيع المبيعات حسب المصدر"
          subtitle="نسب المساهمة في إجمالي المبيعات"
          isLoading={false}
        />
      </div>
    </div>
  );
});

AnalyticsCharts.displayName = 'AnalyticsCharts';

export default AnalyticsCharts;
