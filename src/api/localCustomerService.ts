/**
 * ⚡ localCustomerService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedCustomerService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedCustomerService للعمل Offline-First
 */

import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import type { Customer } from '@/services/UnifiedCustomerService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// إعادة تصدير جميع الصادرات من الخدمة الموحدة
export * from '@/services/UnifiedCustomerService';

// إعادة تصدير كـ default للتوافق
export { unifiedCustomerService as default } from '@/services/UnifiedCustomerService';

// إعادة تصدير الأنواع للتوافق
export type {
  Customer,
  CustomerWithStats,
  CustomerFilters,
  CustomerStats,
  PaginatedCustomers
} from '@/services/UnifiedCustomerService';

// إعادة تصدير الأنواع القديمة للتوافق
export type { Customer as LocalCustomer } from '@/services/UnifiedCustomerService';

// ⚡ دوال التوافق القديمة
/**
 * إنشاء عميل محلي جديد (PowerSync Offline-First)
 */
export const createLocalCustomer = async (
  customer: {
    name: string;
    email?: string;
    phone?: string;
    organization_id: string;
    address?: string;
    city?: string;
    country?: string;
    notes?: string;
    [key: string]: any;
  }
): Promise<Customer> => {
  const orgId = customer.organization_id || 
                localStorage.getItem('currentOrganizationId') || 
                localStorage.getItem('bazaar_organization_id');
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedCustomerService.setOrganizationId(orgId);
  
  const customerData: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address
  };
  
  return unifiedCustomerService.createCustomer(customerData);
};

/**
 * ⚡ جلب جميع العملاء المحليين
 */
export const getLocalCustomers = async (organizationId?: string): Promise<Customer[]> => {
  try {
    const start = performance.now();
    const orgId = organizationId ||
                  localStorage.getItem('currentOrganizationId') ||
                  localStorage.getItem('bazaar_organization_id');

    if (!orgId) {
      console.warn('[localCustomerService] No organization ID found');
      return [];
    }

    console.log('[localCustomerService] 🔄 getLocalCustomers start', { orgId });

    // استخدام استعلام خفيف دون حساب stats لكل عميل (أسرع بكثير)
    const ready = await powerSyncService.waitForInitialization(10000);
    if (!ready || !powerSyncService.db) {
      console.warn('[localCustomerService] PowerSync DB not ready');
      return [];
    }

    // ⚡ إضافة phone و email للعرض في القوائم المنسدلة
    const queryPromise = powerSyncService.query<{ id: string; name: string; phone: string | null; email: string | null }>({
      sql: 'SELECT id, name, phone, email FROM customers WHERE organization_id = ? ORDER BY name ASC',
      params: [orgId]
    });

    const timeoutMs = 7000;
    const rows = await Promise.race([
      queryPromise,
      new Promise<{ id: string; name: string; phone: string | null; email: string | null }[]>((_, reject) =>
        setTimeout(() => reject(new Error('customers query timeout')), timeoutMs)
      )
    ]);

    const elapsed = Math.round(performance.now() - start);
    console.log('[localCustomerService] ✅ fetched customers (lightweight)', {
      count: rows.length,
      elapsedMs: elapsed
    });

    // نحافظ على نوع Customer بإرجاع الاسم فقط (المستخدم هنا للكاش فقط)
    return rows as unknown as Customer[];
  } catch (error) {
    console.error('[localCustomerService] Error getting customers:', error);
    return [];
  }
};
