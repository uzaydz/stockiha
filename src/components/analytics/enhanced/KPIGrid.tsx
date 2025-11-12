/**
 * مكون KPI Grid
 * شبكة متجاوبة لعرض مجموعة من مؤشرات الأداء
 */

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Wallet,
  CreditCard,
  AlertCircle,
  PackageCheck,
  BarChart3,
  Percent
} from 'lucide-react';
import KPICard from './KPICard';
import { FinancialMetrics } from '@/lib/analytics/metrics';

// ============================================================================
// Types
// ============================================================================

export interface KPIGridProps {
  financial: FinancialMetrics;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

const KPIGrid: React.FC<KPIGridProps> = ({
  financial,
  isLoading = false,
  className
}) => {

  return (
    <div className={className}>
      {/* الصف الأول - المؤشرات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* إجمالي الإيرادات */}
        <KPICard
          title="إجمالي الإيرادات"
          value={financial.grossRevenue}
          subtitle={`${financial.totalOrders} طلب`}
          icon={DollarSign}
          color="primary"
          format="currency"
          isLoading={isLoading}
          trend={financial.revenueGrowth !== undefined ? {
            value: financial.revenueGrowth,
            isPositive: financial.revenueGrowth >= 0,
            label: 'مقارنة بالفترة السابقة'
          } : undefined}
        />

        {/* صافي الربح */}
        <KPICard
          title="صافي الربح"
          value={financial.netProfit}
          subtitle={`${financial.netMargin.toFixed(1)}% هامش الربح`}
          icon={TrendingUp}
          color={financial.netProfit >= 0 ? 'success' : 'danger'}
          format="currency"
          isLoading={isLoading}
          trend={financial.profitGrowth !== undefined ? {
            value: financial.profitGrowth,
            isPositive: financial.profitGrowth >= 0,
            label: 'مقارنة بالفترة السابقة'
          } : undefined}
        />

        {/* متوسط قيمة الطلب */}
        <KPICard
          title="متوسط قيمة الطلب"
          value={financial.averageOrderValue}
          subtitle="AOV"
          icon={ShoppingCart}
          color="info"
          format="currency"
          isLoading={isLoading}
        />

        {/* التدفق النقدي */}
        <KPICard
          title="التدفق النقدي"
          value={financial.cashFlow}
          subtitle={`${financial.actualRevenue.toLocaleString('ar-DZ')} دج مدفوع`}
          icon={Wallet}
          color={financial.cashFlow >= 0 ? 'success' : 'warning'}
          format="currency"
          isLoading={isLoading}
        />
      </div>

      {/* الصف الثاني - مؤشرات ثانوية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* الربح الإجمالي */}
        <KPICard
          title="الربح الإجمالي"
          value={financial.grossProfit}
          subtitle={`${financial.grossMargin.toFixed(1)}% هامش إجمالي`}
          icon={BarChart3}
          color="success"
          format="currency"
          isLoading={isLoading}
        />

        {/* تكلفة البضاعة المباعة */}
        <KPICard
          title="تكلفة البضاعة المباعة"
          value={financial.cogs}
          subtitle="COGS"
          icon={PackageCheck}
          color="warning"
          format="currency"
          isLoading={isLoading}
        />

        {/* المصروفات التشغيلية */}
        <KPICard
          title="المصروفات التشغيلية"
          value={financial.operatingExpenses}
          subtitle="Operating Expenses"
          icon={CreditCard}
          color="danger"
          format="currency"
          isLoading={isLoading}
        />

        {/* الديون المعلقة */}
        <KPICard
          title="الديون المعلقة"
          value={financial.totalDebts}
          subtitle={`${financial.debtCount} طلب مدين`}
          icon={AlertCircle}
          color={financial.totalDebts > 0 ? 'warning' : 'success'}
          format="currency"
          isLoading={isLoading}
        />

        {/* العائد على الاستثمار */}
        <KPICard
          title="العائد على الاستثمار"
          value={financial.roi}
          subtitle="ROI"
          icon={Percent}
          color={financial.roi >= 0 ? 'success' : 'danger'}
          format="percentage"
          isLoading={isLoading}
        />

        {/* إجمالي الخصومات */}
        <KPICard
          title="إجمالي الخصومات"
          value={financial.totalDiscounts}
          subtitle={`${financial.discountRate.toFixed(1)}% من الإيرادات`}
          icon={Percent}
          color="info"
          format="currency"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default KPIGrid;
