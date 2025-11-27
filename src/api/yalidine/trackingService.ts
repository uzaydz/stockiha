/**
 * ============================================
 * Yalidine Tracking Service
 * ============================================
 * خدمة ذكية لتتبع شحنات ياليدين مع:
 * - Smart Caching لتجنب Rate Limit
 * - Batch Processing للطلبات المتعددة
 * - Auto TTL حسب الحالة
 * - Database optimization
 */

import { supabase } from '@/lib/supabase';
import { getYalidineApiClient } from './api';
import { yalidineRateLimiter } from './rate-limiter';
import type {
  YalidineHistoryEvent,
  YalidineDeliveryHistory,
  YalidineTrackingCache,
  TrackingStatus,
} from '@/types/yalidineTracking';
import {
  normalizeYalidineStatus,
  translateYalidineStatus,
  getCacheTTL,
  isFinalStatus,
  isYalidineHistoryArray,
} from '@/types/yalidineTracking';

// ============================================
// Constants
// ============================================

const DEFAULT_CACHE_TTL_MINUTES = 30;
const MAX_BATCH_SIZE = 5; // عدد الطلبات في الدفعة الواحدة
const BATCH_DELAY_MS = 2000; // تأخير بين الدفعات

// ============================================
// Helper Functions
// ============================================

/**
 * تحليل استجابة API لاستخراج أحداث التتبع
 */
function parseHistoryResponse(response: any): YalidineHistoryEvent[] {
  try {
    // الحالة 1: البيانات داخل data wrapper
    if (response?.data?.data && isYalidineHistoryArray(response.data.data)) {
      return response.data.data;
    }

    // الحالة 2: البيانات داخل data مباشرة
    if (response?.data && isYalidineHistoryArray(response.data)) {
      return response.data;
    }

    // الحالة 3: البيانات على المستوى الأعلى
    if (isYalidineHistoryArray(response)) {
      return response;
    }

    // الحالة 4: object بأرقام keys (مثل: {0: {...}, 1: {...}})
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const values = Object.values(response);
      if (isYalidineHistoryArray(values)) {
        return values;
      }
    }

    console.warn('[Tracking] تنسيق استجابة غير معروف:', response);
    return [];
  } catch (error) {
    console.error('[Tracking] خطأ في تحليل الاستجابة:', error);
    return [];
  }
}

/**
 * التحقق من حاجة التحديث من الكاش
 */
async function shouldRefreshFromCache(
  trackingNumber: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .rpc('should_refresh_tracking', { p_tracking_number: trackingNumber });

    return data === true;
  } catch (error) {
    console.error('[Tracking] خطأ في التحقق من الكاش:', error);
    // في حالة الخطأ، افترض أنه يحتاج تحديث
    return true;
  }
}

// ============================================
// Main API Functions
// ============================================

/**
 * جلب سجل التتبع من Yalidine API
 */
export async function fetchTrackingHistory(
  organizationId: string,
  trackingNumber: string
): Promise<YalidineHistoryEvent[]> {
  const apiClient = await getYalidineApiClient(organizationId);

  if (!apiClient) {
    throw new Error('فشل الحصول على عميل Yalidine API');
  }

  try {
    console.log(`[Tracking] جلب تاريخ التتبع: ${trackingNumber}`);

    // استخدام rate limiter لتجنب تجاوز الحدود
    const response = await yalidineRateLimiter.schedule(() =>
      apiClient.get(`histories/${trackingNumber}`)
    );

    const events = parseHistoryResponse(response);

    console.log(`[Tracking] تم جلب ${events.length} حدث للتتبع ${trackingNumber}`);

    return events;
  } catch (error: any) {
    console.error('[Tracking] خطأ في جلب سجل التتبع:', error);

    // التعامل مع أنواع الأخطاء المختلفة
    if (error.response?.status === 404) {
      throw new Error('رقم التتبع غير موجود');
    }

    if (error.response?.status === 429) {
      throw new Error('تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً');
    }

    throw new Error(error.message || 'فشل جلب سجل التتبع');
  }
}

/**
 * حفظ سجل التتبع في قاعدة البيانات
 */
export async function saveTrackingHistory(
  organizationId: string,
  orderId: string,
  trackingNumber: string,
  events: YalidineHistoryEvent[]
): Promise<void> {
  if (!events || events.length === 0) {
    console.log('[Tracking] لا توجد أحداث للحفظ');
    return;
  }

  try {
    // تحضير السجلات
    const historyRecords = events.map((event) => ({
      organization_id: organizationId,
      order_id: orderId,
      tracking_number: trackingNumber,
      date_status: event.date_status,
      status: event.status,
      status_ar: translateYalidineStatus(event.status),
      status_normalized: normalizeYalidineStatus(event.status),
      reason: event.reason || null,
      center_id: event.center_id,
      center_name: event.center_name,
      wilaya_id: event.wilaya_id,
      wilaya_name: event.wilaya_name,
      commune_id: event.commune_id,
      commune_name: event.commune_name,
      raw_data: event as any,
    }));

    // استخدام upsert لتجنب التكرار
    const { error } = await supabase
      .from('yalidine_delivery_history')
      .upsert(historyRecords, {
        onConflict: 'order_id,tracking_number,date_status,status',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('[Tracking] خطأ في حفظ سجل التتبع:', error);
      throw error;
    }

    console.log(`[Tracking] تم حفظ ${historyRecords.length} سجل تتبع`);

    // تحديث الكاش
    await updateTrackingCache(organizationId, orderId, trackingNumber, events);
  } catch (error) {
    console.error('[Tracking] خطأ في حفظ سجل التتبع:', error);
    throw error;
  }
}

/**
 * تحديث سجل الكاش
 */
async function updateTrackingCache(
  organizationId: string,
  orderId: string,
  trackingNumber: string,
  events: YalidineHistoryEvent[]
): Promise<void> {
  if (!events || events.length === 0) return;

  const latestEvent = events[0]; // أحدث حالة
  const statusNormalized = normalizeYalidineStatus(latestEvent.status);
  const cacheTTL = getCacheTTL(statusNormalized);

  try {
    await supabase.from('yalidine_tracking_cache').upsert(
      {
        organization_id: organizationId,
        tracking_number: trackingNumber,
        order_id: orderId,
        last_fetched_at: new Date().toISOString(),
        last_status: latestEvent.status,
        last_status_normalized: statusNormalized,
        cache_ttl_minutes: cacheTTL,
        fetch_count: 1, // سيتم زيادته تلقائياً في الـ upsert
      },
      {
        onConflict: 'tracking_number,order_id',
      }
    );
  } catch (error) {
    console.error('[Tracking] خطأ في تحديث الكاش:', error);
    // لا نريد أن يؤثر هذا الخطأ على العملية الرئيسية
  }
}

/**
 * جلب سجل التتبع من قاعدة البيانات
 */
export async function getStoredTrackingHistory(
  orderId: string
): Promise<YalidineDeliveryHistory[]> {
  try {
    const { data, error } = await supabase
      .from('yalidine_delivery_history')
      .select('*')
      .eq('order_id', orderId)
      .order('date_status', { ascending: false });

    if (error) {
      console.error('[Tracking] خطأ في جلب سجل التتبع المحفوظ:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Tracking] خطأ في جلب سجل التتبع:', error);
    return [];
  }
}

/**
 * تحديث سجل التتبع (جلب من API + حفظ في قاعدة البيانات)
 * مع التحقق الذكي من الكاش
 */
export async function refreshTrackingHistory(
  organizationId: string,
  orderId: string,
  trackingNumber: string,
  forceRefresh: boolean = false
): Promise<YalidineDeliveryHistory[]> {
  try {
    // التحقق من حاجة التحديث (إلا إذا كان force)
    if (!forceRefresh) {
      const shouldRefresh = await shouldRefreshFromCache(trackingNumber);
      if (!shouldRefresh) {
        console.log(`[Tracking] الكاش لا يزال صالحاً: ${trackingNumber}`);
        return await getStoredTrackingHistory(orderId);
      }
    }

    // جلب من API
    const events = await fetchTrackingHistory(organizationId, trackingNumber);

    // حفظ في قاعدة البيانات
    if (events.length > 0) {
      await saveTrackingHistory(organizationId, orderId, trackingNumber, events);
    }

    // إرجاع البيانات المحفوظة
    return await getStoredTrackingHistory(orderId);
  } catch (error: any) {
    console.error('[Tracking] خطأ في تحديث سجل التتبع:', error);

    // في حالة الخطأ، حاول إرجاع البيانات المحفوظة
    try {
      const stored = await getStoredTrackingHistory(orderId);
      if (stored.length > 0) {
        console.log('[Tracking] إرجاع البيانات المحفوظة بعد فشل التحديث');
        return stored;
      }
    } catch (fallbackError) {
      console.error('[Tracking] فشل الرجوع للبيانات المحفوظة:', fallbackError);
    }

    throw error;
  }
}

/**
 * الحصول على آخر حالة للطلب
 */
export async function getLatestTrackingStatus(
  orderId: string
): Promise<YalidineDeliveryHistory | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_latest_tracking_status', { p_order_id: orderId })
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Tracking] خطأ في جلب آخر حالة:', error);
    return null;
  }
}

// ============================================
// Batch Processing للطلبات المتعددة
// ============================================

/**
 * معالجة دفعة من الطلبات (Batch Processing)
 * لتجنب تجاوز حدود API
 */
export async function refreshMultipleTrackings(
  organizationId: string,
  orders: Array<{ id: string; trackingNumber: string }>
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ orderId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ orderId: string; error: string }>,
  };

  // تقسيم إلى دفعات
  const batches: typeof orders[] = [];
  for (let i = 0; i < orders.length; i += MAX_BATCH_SIZE) {
    batches.push(orders.slice(i, i + MAX_BATCH_SIZE));
  }

  console.log(`[Tracking Batch] معالجة ${orders.length} طلب في ${batches.length} دفعة`);

  // معالجة كل دفعة
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[Tracking Batch] معالجة الدفعة ${i + 1}/${batches.length}`);

    // معالجة طلبات الدفعة بالتوازي
    const batchPromises = batch.map(async (order) => {
      try {
        // التحقق من حاجة التحديث أولاً
        const shouldRefresh = await shouldRefreshFromCache(order.trackingNumber);

        if (!shouldRefresh) {
          console.log(`[Tracking Batch] تخطي ${order.trackingNumber} (كاش صالح)`);
          results.success++;
          return;
        }

        await refreshTrackingHistory(
          organizationId,
          order.id,
          order.trackingNumber,
          false
        );

        results.success++;
      } catch (error: any) {
        console.error(`[Tracking Batch] خطأ في ${order.id}:`, error);
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: error.message || 'خطأ غير معروف',
        });
      }
    });

    // انتظار انتهاء الدفعة الحالية
    await Promise.all(batchPromises);

    // تأخير بين الدفعات (إلا إذا كانت آخر دفعة)
    if (i < batches.length - 1) {
      console.log(`[Tracking Batch] انتظار ${BATCH_DELAY_MS}ms قبل الدفعة التالية...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(
    `[Tracking Batch] اكتمل. النجاح: ${results.success}, الفشل: ${results.failed}`
  );

  return results;
}

/**
 * تحديث تلقائي للطلبات النشطة فقط (المُرسلة لياليدين)
 */
export async function autoRefreshActiveYalidineOrders(
  organizationId: string,
  limit: number = 50
): Promise<void> {
  try {
    console.log('[Tracking Auto] بدء التحديث التلقائي للطلبات النشطة...');

    // جلب الطلبات النشطة التي لها tracking number ياليدين
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, yalidine_tracking_id')
      .eq('organization_id', organizationId)
      .not('yalidine_tracking_id', 'is', null)
      // فقط الطلبات غير المكتملة
      .not('status', 'in', '(delivered,cancelled,returned)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Tracking Auto] خطأ في جلب الطلبات:', error);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('[Tracking Auto] لا توجد طلبات نشطة للتحديث');
      return;
    }

    console.log(`[Tracking Auto] تحديث ${orders.length} طلب نشط`);

    // تحضير قائمة الطلبات
    const ordersToUpdate = orders
      .filter((o) => o.yalidine_tracking_id)
      .map((o) => ({
        id: o.id,
        trackingNumber: o.yalidine_tracking_id!,
      }));

    // معالجة دفعية
    const results = await refreshMultipleTrackings(organizationId, ordersToUpdate);

    console.log('[Tracking Auto] اكتمل التحديث التلقائي:', results);
  } catch (error) {
    console.error('[Tracking Auto] خطأ في التحديث التلقائي:', error);
  }
}

// ============================================
// Cleanup Functions
// ============================================

/**
 * تنظيف البيانات القديمة (يمكن تشغيله كـ Cron)
 */
export async function cleanupOldTrackingData(): Promise<void> {
  try {
    console.log('[Tracking Cleanup] بدء تنظيف البيانات القديمة...');

    const { error } = await supabase.rpc('cleanup_old_tracking_cache');

    if (error) {
      console.error('[Tracking Cleanup] خطأ في التنظيف:', error);
      return;
    }

    console.log('[Tracking Cleanup] تم تنظيف البيانات القديمة بنجاح');
  } catch (error) {
    console.error('[Tracking Cleanup] خطأ في التنظيف:', error);
  }
}
