/**
 * صفحة اختبار بسيطة لتحديد مصدر الخطأ
 * الخطوة 4أ: اختبار استيراد KPISection مباشرة
 */

import React from 'react';

// ✅ POSPureLayout يعمل
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

// ✅ useReportData يعمل
import { useReportData } from './hooks/useReportData';
import { getDateRangeFromPreset } from './utils';

// ✅ الخطوة 4ب: استيراد جميع المكونات مباشرة
import { KPISection } from './components/KPISection';
import { RevenueSection } from './components/RevenueSection';
import { CostsSection } from './components/CostsSection';
import { ProfitSection } from './components/ProfitSection';
import { ZakatSection } from './components/ZakatSection';
import { DateRangePicker } from './components/DateRangePicker';

const TestPage: React.FC = () => {
  const dateRange = getDateRangeFromPreset('month');
  const { data, isLoading, error } = useReportData({ dateRange, enabled: true });

  return (
    <POSPureLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          الخطوة 4ب: جميع المكونات مباشرة
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          إذا ظهرت هذه الصفحة، جميع المكونات تستورد بشكل صحيح
        </p>

        {/* اختبار عرض KPISection */}
        <div className="mt-6">
          <KPISection data={data?.kpi || null} isLoading={isLoading} />
        </div>
      </div>
    </POSPureLayout>
  );
};

export default TestPage;
