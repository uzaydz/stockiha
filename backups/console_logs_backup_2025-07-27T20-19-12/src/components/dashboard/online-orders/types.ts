export interface OrderOverview {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
}

export interface StatusBreakdownItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
  amount?: number;
}

export interface ChartData {
  value: number;
  color: string;
  label: string;
}

export interface OnlineOrderAnalytics {
  overview: OrderOverview;
  statusBreakdown: StatusBreakdownItem[];
  paymentStatusBreakdown: StatusBreakdownItem[];
  callConfirmationBreakdown: StatusBreakdownItem[];
  paymentMethodBreakdown: StatusBreakdownItem[];
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "blue" | "green" | "purple" | "orange" | "red";
  className?: string;
}

export interface ChartProps {
  title: string;
  data: StatusBreakdownItem[];
  icon: React.ReactNode;
  showAmounts?: boolean;
  className?: string;
} 