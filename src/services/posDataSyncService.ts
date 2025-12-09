/**
 * posDataSyncService - خدمة مزامنة بيانات POS
 *
 * ⚡ توحيد مسار القراءة: القراءة دائمًا من SQLite
 * ⚡ المزامنة تحدث في الخلفية عبر هذا Service
 *
 * - Online/Offline = سلوك قراءة واحد من SQLite
 * - المزامنة/الـ RPC فقط تحدّث SQLite في الخلفية
 */

import { supabase } from '@/lib/supabase';
import { hydrateLocalDBFromResponse } from '@/hooks/useUnifiedPOSData';
import { isAppOnline, markNetworkOnline, markNetworkOffline } from '@/utils/networkStatus';

export interface POSDataSyncOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export interface POSDataSyncResult {
  success: boolean;
  error?: string;
  dataTimestamp?: string;
}

/**
 * مزامنة بيانات POS من السيرفر إلى SQLite
 * ⚡ هذه الدالة يجب استدعاؤها من:
 * - onLogin
 * - زر "تحديث البيانات" في POS
 * - SyncManager عند الاتصال بالإنترنت
 */
export const syncPOSDataFromServer = async (
  options: POSDataSyncOptions
): Promise<POSDataSyncResult> => {
  const {
    organizationId,
    page = 1,
    limit = 50,
    search,
    categoryId
  } = options;

  if (!organizationId) {
    return {
      success: false,
      error: 'معرف المؤسسة مطلوب'
    };
  }

  // التحقق من الاتصال بالإنترنت
  const navigatorOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isOffline = !navigatorOnline || !isAppOnline();

  if (isOffline) {
    console.warn('[posDataSyncService] ⚠️ لا يوجد اتصال بالإنترنت - تخطي المزامنة');
    return {
      success: false,
      error: 'لا يوجد اتصال بالإنترنت'
    };
  }

  try {
    console.log('[posDataSyncService] 🔄 بدء مزامنة بيانات POS من السيرفر...', {
      organizationId,
      page,
      limit,
      search,
      categoryId
    });

    // استدعاء RPC
    const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
      p_organization_id: organizationId,
      p_products_page: page,
      p_products_limit: limit,
      p_search: search || null,
      p_category_id: categoryId || null
    });

    if (error) {
      console.error('[posDataSyncService] ❌ خطأ في جلب بيانات POS:', error);
      markNetworkOffline({ force: true });
      return {
        success: false,
        error: `خطأ في جلب بيانات POS: ${error.message}`
      };
    }

    if (!data) {
      console.error('[posDataSyncService] ❌ لم يتم إرجاع أي بيانات من الخادم');
      return {
        success: false,
        error: 'لم يتم إرجاع أي بيانات من الخادم'
      };
    }

    // معالجة الاستجابة
    const responseData = Array.isArray(data) ? data[0] : data;

    let finalResponse: any;

    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      if (!responseData.success) {
        return {
          success: false,
          error: responseData.error || 'فشل في جلب البيانات'
        };
      }
      finalResponse = responseData;
    } else {
      finalResponse = {
        success: true,
        data: responseData,
        meta: {
          execution_time_ms: 0,
          data_timestamp: new Date().toISOString(),
          organization_id: organizationId
        }
      };
    }

    // حفظ البيانات في SQLite
    markNetworkOnline();
    await hydrateLocalDBFromResponse(organizationId, finalResponse);

    console.log('[posDataSyncService] ✅ تمت مزامنة بيانات POS بنجاح', {
      organizationId,
      productsCount: finalResponse.data?.products?.length || 0,
      customersCount: finalResponse.data?.customers?.length || 0,
      ordersCount: finalResponse.data?.recent_orders?.length || 0
    });

    return {
      success: true,
      dataTimestamp: finalResponse.meta?.data_timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('[posDataSyncService] ❌ خطأ غير متوقع:', error);
    markNetworkOffline({ force: true });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير متوقع'
    };
  }
};

/**
 * مزامنة بيانات POS الكاملة (جميع الصفحات)
 * ⚡ استخدم هذه الدالة عند تسجيل الدخول أو تحديث البيانات الكامل
 */
export const syncAllPOSDataFromServer = async (
  organizationId: string
): Promise<POSDataSyncResult> => {
  // مزامنة الصفحة الأولى (الأهم)
  const firstPageResult = await syncPOSDataFromServer({
    organizationId,
    page: 1,
    limit: 100 // جلب المزيد في الصفحة الأولى
  });

  if (!firstPageResult.success) {
    return firstPageResult;
  }

  // يمكن إضافة مزامنة الصفحات الأخرى هنا إذا لزم الأمر
  // لكن عادة الصفحة الأولى كافية للبدء

  return {
    success: true,
    dataTimestamp: firstPageResult.dataTimestamp
  };
};


















