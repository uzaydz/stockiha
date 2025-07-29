import { 
  OnlineOrderAnalytics, 
  StatusBreakdownItem 
} from './types';
import {
  statusColors,
  statusLabels,
  paymentStatusColors,
  paymentStatusLabels,
  paymentMethodColors,
  paymentMethodLabels
} from './utils';

export const processOrderAnalytics = (rawData: any): OnlineOrderAnalytics => {
  if (!rawData) {
    return {
      overview: { 
        totalOrders: 0, 
        totalRevenue: 0, 
        averageOrderValue: 0, 
        completionRate: 0 
      },
      statusBreakdown: [],
      paymentStatusBreakdown: [],
      callConfirmationBreakdown: [],
      paymentMethodBreakdown: []
    };
  }

  // معالجة حالات الطلب
  const statusBreakdown: StatusBreakdownItem[] = Object.entries(rawData.status_breakdown || {})
    .map(([status, data]: [string, any]) => ({
      label: statusLabels[status] || status,
      count: data?.count || 0,
      percentage: data?.percentage || 0,
      color: statusColors[status] || '#6b7280'
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // معالجة حالات الدفع
  const paymentStatusBreakdown: StatusBreakdownItem[] = Object.entries(rawData.payment_status_breakdown || {})
    .map(([status, data]: [string, any]) => ({
      label: paymentStatusLabels[status] || status,
      count: data?.count || 0,
      percentage: data?.percentage || 0,
      color: paymentStatusColors[status] || '#6b7280',
      amount: data?.total_amount || 0
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // معالجة حالات تأكيد المكالمة
  const callConfirmationBreakdown: StatusBreakdownItem[] = Object.entries(rawData.call_confirmation_breakdown || {})
    .map(([status, data]: [string, any]) => ({
      label: status,
      count: data?.count || 0,
      percentage: data?.percentage || 0,
      color: data?.color || '#6b7280'
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // معالجة طرق الدفع
  const paymentMethodBreakdown: StatusBreakdownItem[] = Object.entries(rawData.payment_method_breakdown || {})
    .map(([method, data]: [string, any]) => ({
      label: paymentMethodLabels[method] || method,
      count: data?.count || 0,
      percentage: data?.percentage || 0,
      color: paymentMethodColors[method] || '#6b7280',
      amount: data?.total_amount || 0
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    overview: {
      totalOrders: rawData.overview?.total_orders || 0,
      totalRevenue: rawData.overview?.total_revenue || 0,
      averageOrderValue: rawData.overview?.average_order_value || 0,
      completionRate: rawData.overview?.completion_rate || 0
    },
    statusBreakdown,
    paymentStatusBreakdown,
    callConfirmationBreakdown,
    paymentMethodBreakdown
  };
};
