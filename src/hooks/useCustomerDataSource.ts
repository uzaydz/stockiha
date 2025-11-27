import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Customer } from '@/types/customer';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useCustomersData } from '@/context/SuperUnifiedDataContext';
import { fastSearchLocalCustomers, getLocalCustomersPage, getLocalCustomers } from '@/api/localCustomerService';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * دالة مساعدة لتحويل بيانات العملاء المحلية إلى نوع Customer
 */
const mapLocalCustomers = (customers: any[]): Customer[] => {
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || null,
    organization_id: c.organization_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    nif: c.nif ?? null,
    rc: c.rc ?? null,
    nis: c.nis ?? null,
    rib: c.rib ?? null,
    address: c.address ?? null,
    _synced: c.synced,
    _syncStatus: c.syncStatus,
    _pendingOperation: c.pendingOperation,
  } as Customer));
};

/**
 * Hook محسّن لمصدر بيانات العملاء - يعمل offline-first مثل POS
 * يحمّل البيانات المحلية فوراً دون انتظار الـ Context
 */
export function useCustomerDataSource(searchQuery: string) {
  const { isOnline } = useNetworkStatus();
  const { customers: contextCustomers } = useCustomersData();
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const pageSize = 100;
  const debouncedQuery = useDebounce(searchQuery, 300);
  const initialLoadDone = useRef(false);

  // ✅ تحميل البيانات المحلية فوراً عند بدء التشغيل (offline-first)
  useEffect(() => {
    const loadLocalImmediately = async () => {
      if (initialLoadDone.current) return;

      try {
        setIsLocalLoading(true);

        const orgId = localStorage.getItem('bazaar_organization_id') ||
                      localStorage.getItem('currentOrganizationId') || '';

        if (!orgId) {
          console.warn('[useCustomerDataSource] لا يوجد معرف منظمة');
          setIsLocalLoading(false);
          return;
        }

        // ⚡ Delta Sync - لا حاجة لتهيئة يدوية

        // تحميل العملاء من SQLite مباشرة
        const res = await getLocalCustomersPage(orgId, { offset: 0, limit: pageSize });

        const mapped = mapLocalCustomers(res.customers);
        setLocalCustomers(mapped);
        setTotal(res.total);
        setOffset(mapped.length);
        initialLoadDone.current = true;

        console.log('[useCustomerDataSource] ✅ تم تحميل العملاء المحليين:', {
          count: mapped.length,
          total: res.total
        });
      } catch (err) {
        console.error('[useCustomerDataSource] ❌ فشل تحميل العملاء المحليين:', err);
      } finally {
        setIsLocalLoading(false);
      }
    };

    void loadLocalImmediately();
  }, []);

  // ✅ إعادة تحميل البيانات عند البحث أو تغير الحالة
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const orgId = localStorage.getItem('bazaar_organization_id') ||
                      localStorage.getItem('currentOrganizationId') || '';
        const q = (debouncedQuery || '').trim();

        if (q) {
          // البحث في البيانات المحلية
          let matches: any[] = [];
          if (orgId) {
            matches = await fastSearchLocalCustomers(orgId, q, { limit: 200 }) as any[];
          } else {
            const all = await getLocalCustomers();
            const qLower = q.toLowerCase();
            matches = (all as any[]).filter((c) => {
              const name = (c.name || '').toLowerCase();
              const email = (c.email || '').toLowerCase();
              const phone = (c.phone || '').toString();
              return name.includes(qLower) || email.includes(qLower) || (phone && phone.includes(q));
            });
          }
          const mapped = mapLocalCustomers(matches);
          setLocalCustomers(mapped);
          setTotal(mapped.length);
          setOffset(mapped.length);
        } else if (!initialLoadDone.current || !isOnline) {
          // إعادة تحميل البيانات المحلية إذا لم يكن هناك بحث
          let list: any[] = [];
          if (orgId) {
            const res = await getLocalCustomersPage(orgId, { offset: 0, limit: pageSize });
            list = res.customers as any[];
            setTotal(res.total);
            setOffset(list.length);
          } else {
            list = await getLocalCustomers();
            setTotal(list.length);
            setOffset(list.length);
          }
          const mapped = mapLocalCustomers(list);
          setLocalCustomers(mapped);
        }
      } catch {
        // في حالة الخطأ، نحتفظ بالبيانات الموجودة
        console.warn('[useCustomerDataSource] تحذير: فشل تحديث البيانات المحلية');
      }
    };

    // فقط قم بالتحميل إذا كان هناك بحث أو إذا كنت أوفلاين
    if (debouncedQuery || !isOnline) {
      void loadLocal();
    }
  }, [isOnline, debouncedQuery]);

  // ✅ منطق اختيار مصدر البيانات المحسّن (offline-first)
  const dataSource: Customer[] = useMemo(() => {
    // إذا كان أوفلاين، استخدم البيانات المحلية دائماً
    if (!isOnline) {
      return localCustomers;
    }

    // إذا كان هناك بحث، استخدم البيانات المحلية (البحث يكون محلياً)
    if (debouncedQuery) {
      return localCustomers;
    }

    // إذا كان أونلاين وتوجد بيانات من Context، استخدمها
    if (contextCustomers && contextCustomers.length > 0) {
      return contextCustomers;
    }

    // fallback للبيانات المحلية إذا كان Context فارغاً
    return localCustomers;
  }, [isOnline, contextCustomers, localCustomers, debouncedQuery]);

  // ✅ تحديد إذا كان هناك المزيد للتحميل
  const hasMore = useMemo(() => {
    // إذا كان أونلاين وتوجد بيانات من Context، لا يوجد المزيد
    if (isOnline && contextCustomers && contextCustomers.length > 0 && !debouncedQuery) {
      return false;
    }
    if (typeof total !== 'number') return false;
    return offset < total;
  }, [isOnline, contextCustomers, offset, total, debouncedQuery]);

  // ✅ دالة تحميل المزيد من البيانات
  const loadMore = useCallback(async () => {
    const orgId = localStorage.getItem('bazaar_organization_id') ||
                  localStorage.getItem('currentOrganizationId') || '';
    if (!orgId) return;
    if (debouncedQuery) return; // لا تدعم المزيد أثناء البحث
    if (!hasMore) return;

    try {
      const res = await getLocalCustomersPage(orgId, { offset, limit: pageSize });
      const mapped = mapLocalCustomers(res.customers);
      setLocalCustomers(prev => [...prev, ...mapped]);
      setOffset(prev => prev + mapped.length);
      setTotal(res.total);
    } catch {
      // ignore
    }
  }, [debouncedQuery, hasMore, offset]);

  return {
    dataSource,
    total,
    hasMore,
    loadMore,
    isLocalLoading
  };
}
