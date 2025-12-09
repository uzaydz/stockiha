import type { OrderItem } from '@/types';

export type POSOrderSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface POSOrderPayload {
  organizationId: string;
  employeeId: string;
  createdByStaffId?: string | null;
  createdByStaffName?: string | null;
  items: OrderItem[];
  total: number;
  customerId?: string | null;
  customerName?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  amountPaid?: number;
  discount?: number;
  tax?: number;
  subtotal?: number;
  shippingCost?: number;
  remainingAmount?: number;
  considerRemainingAsPartial?: boolean;
  // ⚡ حقول البيع بالجملة
  saleType?: 'retail' | 'wholesale' | 'partial_wholesale';
  metadata?: Record<string, unknown>;
}

export interface POSOrderResultPayload {
  success: boolean;
  orderId: string;
  slug: string;
  customerOrderNumber: number;
  status: string;
  paymentStatus: string;
  total: number;
  processingTime: number;
  databaseProcessingTime: number;
  fifoResults: any[];
  totalFifoCost: number;
  message: string;
  isOffline?: boolean;
  syncStatus?: POSOrderSyncStatus;
  localOrderNumber?: number;
  remoteOrderId?: string;
  metadata?: Record<string, unknown>;
}
