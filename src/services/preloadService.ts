/**
 * خدمة preloading لجلب بيانات المتجر مباشرة عند فتح الموقع
 * يتم تشغيلها قبل ظهور أي مكون لضمان توفر البيانات فوراً
 */

import { getStoreInitData, clearStoreCache } from '@/lib/api/deduplicatedApi';
import { getEarlyPreloadedData } from '@/utils/earlyPreload';

interface PreloadOptions {
  storeIdentifier: string;
  forceRefresh?: boolean;
}

interface PreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

class PreloadService {
  private static instance: PreloadService;
  private preloadPromises: Map<string, Promise<PreloadResult>> = new Map();
  private preloadedData: Map<string, any> = new Map();
  
  static getInstance(): PreloadService {
    if (!PreloadService.instance) {
      PreloadService.instance = new PreloadService();
    }
    return PreloadService.instance;
  }

  /**
   * جلب بيانات المتجر مسبقاً
   */
  async preloadStoreData(options: PreloadOptions): Promise<PreloadResult> {
    const { storeIdentifier, forceRefresh = false } = options;
    const cacheKey = `preload-${storeIdentifier}`;
    
    const startTime = performance.now();

    // إذا كان هناك طلب معلق، انتظره
    if (this.preloadPromises.has(cacheKey)) {
      return this.preloadPromises.get(cacheKey)!;
    }

    // إذا كانت البيانات محفوظة مسبقاً وليس مطلوب إعادة التحميل
    if (!forceRefresh && this.preloadedData.has(cacheKey)) {
      const executionTime = performance.now() - startTime;
      return {
        success: true,
        data: this.preloadedData.get(cacheKey),
        executionTime
      };
    }

    // إنشاء طلب جديد
    const preloadPromise = this.executePreload(storeIdentifier, startTime, forceRefresh);
    this.preloadPromises.set(cacheKey, preloadPromise);

    try {
      const result = await preloadPromise;
      
      // حفظ البيانات إذا نجح التحميل
      if (result.success && result.data) {
        this.preloadedData.set(cacheKey, result.data);
      }
      
      return result;
    } finally {
      // إزالة الطلب من القائمة المعلقة
      this.preloadPromises.delete(cacheKey);
    }
  }

  /**
   * تنفيذ عملية الـ preload
   */
  private async executePreload(
    storeIdentifier: string, 
    startTime: number,
    forceRefresh: boolean
  ): Promise<PreloadResult> {
    try {
      // مسح cache إذا مطلوب إعادة التحميل
      if (forceRefresh) {
        clearStoreCache(storeIdentifier);
      }

      // جلب البيانات
      const data = await getStoreInitData(storeIdentifier, forceRefresh);
      const executionTime = performance.now() - startTime;

      // إرسال حدث للإعلام عن اكتمال التحميل
      window.dispatchEvent(new CustomEvent('storeDataPreloaded', {
        detail: {
          storeIdentifier,
          data,
          executionTime
        }
      }));

      return {
        success: true,
        data,
        executionTime
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: error?.message || 'خطأ في تحميل بيانات المتجر',
        executionTime
      };
    }
  }

  /**
   * مزامنة البيانات من earlyPreload إلى preloadService
   */
  syncFromEarlyPreload(storeIdentifier: string): void {
    const earlyData = getEarlyPreloadedData(storeIdentifier);
    if (earlyData) {
      const cacheKey = `preload-${storeIdentifier}`;
      this.preloadedData.set(cacheKey, earlyData);
      
    }
  }

  /**
   * الحصول على البيانات المحفوظة مسبقاً مع مزامنة تلقائية
   */
  getPreloadedData(storeIdentifier: string): any | null {
    const cacheKey = `preload-${storeIdentifier}`;

    // التحقق من البيانات في preloadService أولاً
    let data = this.preloadedData.get(cacheKey);
    if (data) return data;

    // إذا لم تكن متوفرة، حاول المزامنة من earlyPreload
    this.syncFromEarlyPreload(storeIdentifier);
    data = this.preloadedData.get(cacheKey);

    return data || null;
  }

  /**
   * التحقق من وجود بيانات محفوظة مسبقاً مع مزامنة تلقائية
   */
  hasPreloadedData(storeIdentifier: string): boolean {
    const cacheKey = `preload-${storeIdentifier}`;

    // التحقق من البيانات في preloadService أولاً
    if (this.preloadedData.has(cacheKey)) return true;

    // إذا لم تكن متوفرة، حاول المزامنة من earlyPreload
    this.syncFromEarlyPreload(storeIdentifier);
    return this.preloadedData.has(cacheKey);
  }

  /**
   * مسح البيانات المحفوظة مسبقاً
   */
  clearPreloadedData(storeIdentifier?: string): void {
    if (storeIdentifier) {
      const cacheKey = `preload-${storeIdentifier}`;
      this.preloadedData.delete(cacheKey);
      this.preloadPromises.delete(cacheKey);
    } else {
      this.preloadedData.clear();
      this.preloadPromises.clear();
    }
  }

  /**
   * الحصول على إحصائيات الـ preload
   */
  getPreloadStats(): {
    preloadedStores: number;
    pendingRequests: number;
    storeIdentifiers: string[];
  } {
    return {
      preloadedStores: this.preloadedData.size,
      pendingRequests: this.preloadPromises.size,
      storeIdentifiers: Array.from(this.preloadedData.keys()).map(key => key.replace('preload-', ''))
    };
  }
}

// تصدير instance واحد
export const preloadService = PreloadService.getInstance();

// دوال مساعدة للاستخدام السريع
export const preloadStoreData = (storeIdentifier: string, forceRefresh = false) => 
  preloadService.preloadStoreData({ storeIdentifier, forceRefresh });

export const getPreloadedStoreData = (storeIdentifier: string) => 
  preloadService.getPreloadedData(storeIdentifier);

export const hasPreloadedStoreData = (storeIdentifier: string) => 
  preloadService.hasPreloadedData(storeIdentifier);

export const clearPreloadedStoreData = (storeIdentifier?: string) => 
  preloadService.clearPreloadedData(storeIdentifier);
