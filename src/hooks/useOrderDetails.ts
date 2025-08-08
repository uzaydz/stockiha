import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/components/orders/table/OrderTableTypes';

type OrderDetailsStatus = 'idle' | 'loading' | 'success' | 'error';

type OrderDetailsRecord = {
  data: Partial<Order> | null;
  status: OrderDetailsStatus;
  error: string | null;
  fetchedAt: number;
};

// بسيط: LRU cache بحد أقصى من العناصر
const MAX_CACHE_ENTRIES = 50;
const detailsCache: Map<string, OrderDetailsRecord> = new Map();

function setCache(orderId: string, record: OrderDetailsRecord) {
  if (detailsCache.has(orderId)) {
    detailsCache.delete(orderId);
  }
  detailsCache.set(orderId, record);
  // LRU prune
  if (detailsCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = detailsCache.keys().next().value as string | undefined;
    if (firstKey) detailsCache.delete(firstKey);
  }
}

function getCache(orderId: string): OrderDetailsRecord | undefined {
  const record = detailsCache.get(orderId);
  if (!record) return undefined;
  // تحديث LRU: نقل العنصر للنهاية
  detailsCache.delete(orderId);
  detailsCache.set(orderId, record);
  return record;
}

export interface UseOrderDetailsOptions {
  organizationId?: string | null;
  useRpc?: boolean; // إعداد مستقبلي لاستخدام RPC مخصص
}

async function fetchItemsFromSupabase(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('online_order_items')
    .select(
      [
        'id',
        'order_id',
        'product_id',
        'product_name',
        'quantity',
        'unit_price',
        'total_price',
        'color_id',
        'color_name',
        'size_id',
        'size_name',
        'selected_price',
      ].join(', ')
    )
    .eq('order_id', orderId);

  if (error) throw error;
  return (data || []) as unknown as OrderItem[];
}

// مكان لاستخدام RPC مستقبلاً
async function fetchWithRPC(_organizationId: string, _orderId: string): Promise<Partial<Order>> {
  // TODO: استخدم get_online_order_details لاحقاً
  // مؤقتاً نعود إلى Supabase fallback
  throw new Error('RPC not implemented');
}

export function useOrderDetails(orderId: string | undefined, options: UseOrderDetailsOptions = {}) {
  const { organizationId = null, useRpc = false } = options;
  const [state, setState] = useState<OrderDetailsRecord>({ data: null, status: 'idle', error: null, fetchedAt: 0 });
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;

    // عودة فورية من الكاش إن أمكن
    const cached = getCache(orderId);
    if (cached && cached.status === 'success') {
      setState(cached);
      return;
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      let data: Partial<Order> = {};
      if (useRpc && organizationId) {
        try {
          data = await fetchWithRPC(organizationId, orderId);
        } catch (_) {
          // فولباك
          const items = await fetchItemsFromSupabase(orderId);
          data = { order_items: items } as Partial<Order>;
        }
      } else {
        const items = await fetchItemsFromSupabase(orderId);
        data = { order_items: items } as Partial<Order>;
      }

      const record: OrderDetailsRecord = { data, status: 'success', error: null, fetchedAt: Date.now() };
      setCache(orderId, record);
      setState(record);
    } catch (err: any) {
      const record: OrderDetailsRecord = { data: null, status: 'error', error: err?.message || 'failed', fetchedAt: Date.now() };
      setCache(orderId, record);
      setState(record);
    }
  }, [orderId, organizationId, useRpc]);

  const prefetch = useCallback(() => {
    if (!orderId) return;
    const cached = getCache(orderId);
    if (cached && (cached.status === 'success' || cached.status === 'loading')) return;
    if (!inFlightRef.current) {
      inFlightRef.current = load().finally(() => {
        inFlightRef.current = null;
      });
    }
  }, [orderId, load]);

  const refetch = useCallback(() => {
    if (!orderId) return;
    return load();
  }, [orderId, load]);

  const invalidate = useCallback(() => {
    if (!orderId) return;
    detailsCache.delete(orderId);
    setState({ data: null, status: 'idle', error: null, fetchedAt: 0 });
  }, [orderId]);

  // تحميل عند الطلب فقط (لا تحميل تلقائي لتقليل الضغط)
  const result = useMemo(() => ({
    data: state.data,
    status: state.status,
    error: state.error,
    fetchedAt: state.fetchedAt,
    prefetch,
    refetch,
    invalidate,
  }), [state, prefetch, refetch, invalidate]);

  return result;
}

// فائدة: تحديث عناصر الطلب في الكاش عند التحديث المحلي
export function updateOrderDetailsCache(orderId: string, updater: (prev: Partial<Order> | null) => Partial<Order> | null) {
  const current = getCache(orderId);
  const nextData = updater(current?.data || null);
  if (nextData) {
    setCache(orderId, { data: nextData, status: 'success', error: null, fetchedAt: Date.now() });
  }
}

// دالة Prefetch لا تعتمد على الـ Hooks (لاستخدامها في أحداث مثل hover)
export async function prefetchOrderDetails(orderId: string, options: UseOrderDetailsOptions = {}) {
  if (!orderId) return;
  const cached = getCache(orderId);
  if (cached && (cached.status === 'success' || cached.status === 'loading')) return;
  // علّم كتحميل
  setCache(orderId, { data: null, status: 'loading', error: null, fetchedAt: Date.now() });
  try {
    let data: Partial<Order> = {};
    if (options.useRpc && options.organizationId) {
      try {
        data = await fetchWithRPC(options.organizationId, orderId);
      } catch (_) {
        const items = await fetchItemsFromSupabase(orderId);
        data = { order_items: items } as Partial<Order>;
      }
    } else {
      const items = await fetchItemsFromSupabase(orderId);
      data = { order_items: items } as Partial<Order>;
    }
    setCache(orderId, { data, status: 'success', error: null, fetchedAt: Date.now() });
  } catch (err: any) {
    setCache(orderId, { data: null, status: 'error', error: err?.message || 'failed', fetchedAt: Date.now() });
  }
}


