/**
 * ============================================
 * STOCKIHA ANALYTICS PAGE
 * صفحة التحليلات والتقارير الشاملة
 * ============================================
 *
 * تستخدم نظام التقارير الجديد مع:
 * - 100% Offline مع PowerSync
 * - Nivo Charts للرسوم البيانية
 * - Framer Motion للحركات
 * ============================================
 */

import React from 'react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
// Direct import to avoid barrel file issues
import AnalyticsDashboard from '@/components/analytics-new/AnalyticsDashboard';

const Analytics: React.FC = () => {
  return (
    <POSPureLayout connectionStatus="connected">
      <AnalyticsDashboard />
    </POSPureLayout>
  );
};

export default Analytics;
