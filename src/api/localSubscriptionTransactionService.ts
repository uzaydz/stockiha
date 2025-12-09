/**
 * localSubscriptionTransactionService - خدمة معاملات الاشتراكات المحلية
 *
 * ⚡ Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة تحدث تلقائياً
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ⚡ واجهة معاملة الاشتراك المحلية
export interface LocalSubscriptionTransaction {
  id: string;
  organization_id: string;
  service_id?: string | null;
  service_name: string;
  provider?: string | null;
  logo_url?: string | null;
  transaction_type: 'sale' | 'refund' | 'exchange';
  amount: number;
  cost?: number | null;
  profit?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  quantity?: number | null;
  description?: string | null;
  notes?: string | null;
  tracking_code?: string | null;
  public_tracking_code?: string | null;
  account_username?: string | null;
  account_email?: string | null;
  account_password?: string | null;
  account_notes?: string | null;
  processed_by?: string | null;
  approved_by?: string | null;
  transaction_date?: string | null;
  order_id?: string | null; // ⚡ ربط بالطلب إذا كان موجوداً
  created_at: string;
  updated_at: string;
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لحقول المزامنة
}

const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    ''
  );
};

/**
 * إنشاء معاملة اشتراك محلياً
 */
export const createLocalSubscriptionTransaction = async (
  transactionData: {
    organizationId: string;
    serviceId?: string;
    serviceName: string;
    provider?: string;
    logoUrl?: string;
    amount: number;
    cost?: number;
    profit?: number;
    customerId?: string;
    customerName?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    description?: string;
    notes?: string;
    trackingCode?: string;
    publicTrackingCode?: string;
    accountUsername?: string;
    accountEmail?: string;
    accountPassword?: string;
    accountNotes?: string;
    processedBy?: string;
    orderId?: string;
  }
): Promise<LocalSubscriptionTransaction> => {
  const now = new Date().toISOString();
  const transactionId = uuidv4();

  const transaction: LocalSubscriptionTransaction = {
    id: transactionId,
    organization_id: transactionData.organizationId,
    service_id: transactionData.serviceId || null,
    service_name: transactionData.serviceName,
    provider: transactionData.provider || null,
    logo_url: transactionData.logoUrl || null,
    transaction_type: 'sale',
    amount: transactionData.amount,
    cost: transactionData.cost || null,
    profit: transactionData.profit || null,
    customer_id: transactionData.customerId || null,
    customer_name: transactionData.customerName || null,
    payment_method: transactionData.paymentMethod || null,
    payment_status: (transactionData.paymentStatus as any) || 'pending',
    quantity: 1,
    description: transactionData.description || null,
    notes: transactionData.notes || null,
    tracking_code: transactionData.trackingCode || null,
    public_tracking_code: transactionData.publicTrackingCode || null,
    account_username: transactionData.accountUsername || null,
    account_email: transactionData.accountEmail || null,
    account_password: transactionData.accountPassword || null,
    account_notes: transactionData.accountNotes || null,
    processed_by: transactionData.processedBy || null,
    transaction_date: now,
    order_id: transactionData.orderId || null,
    created_at: now,
    updated_at: now,
  };

  // ⚡ حفظ محلياً عبر PowerSync
  await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(transaction).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => (transaction as any)[k]);
    
    await tx.execute(
      `INSERT INTO subscription_transactions (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [transactionId, ...values, now, now]
    );
  });

  console.log(`[LocalSubscriptionTransaction] ⚡ Created transaction ${transactionId} via PowerSync`);

  return transaction;
};

/**
 * تحديث معاملة اشتراك محلياً
 */
export const updateLocalSubscriptionTransaction = async (
  transactionId: string,
  updates: Partial<LocalSubscriptionTransaction>
): Promise<void> => {
  const now = new Date().toISOString();

  await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    
    await tx.execute(
      `UPDATE subscription_transactions SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, transactionId]
    );
  });

  console.log(`[LocalSubscriptionTransaction] ⚡ Updated transaction ${transactionId} via PowerSync`);
};

/**
 * جلب معاملات الاشتراكات المعلقة للمزامنة
 * ⚡ PowerSync يتعامل مع المزامنة تلقائياً - هذه الدالة للتوافق فقط
 */
export const getPendingSubscriptionTransactions = async (organizationId: string): Promise<LocalSubscriptionTransaction[]> => {
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
  if (!powerSyncService.db) {
    console.warn('[localSubscriptionTransactionService] PowerSync DB not initialized');
    return [];
  }
  return powerSyncService.query<LocalSubscriptionTransaction>({
    sql: 'SELECT * FROM subscription_transactions WHERE organization_id = ?',
    params: [organizationId]
  });
};


