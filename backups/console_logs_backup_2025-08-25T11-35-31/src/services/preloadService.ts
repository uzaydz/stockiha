/**
 * خدمة preloading لجلب بيانات المتجر مباشرة عند فتح الموقع
 * يتم تشغيلها قبل ظهور أي مكون لضمان توفر البيانات فوراً
 */

import { getStoreInitData, clearStoreCache } from '@/lib/api/deduplicatedApi';

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
    
    console.log(`🚀 [PreloadService] بدء preload للمتجر: ${storeIdentifier}`);
    const startTime = performance.now();

    // إذا كان هناك طلب معلق، انتظره
    if (this.preloadPromises.has(cacheKey)) {
      console.log(`⏳ [PreloadService] انتظار طلب معلق: ${storeIdentifier}`);
      return this.preloadPromises.get(cacheKey)!;
    }

    // إذا كانت البيانات محفوظة مسبقاً وليس مطلوب إعادة التحميل
    if (!forceRefresh && this.preloadedData.has(cacheKey)) {
      console.log(`🎯 [PreloadService] استخدام بيانات محفوظة مسبقاً: ${storeIdentifier}`);
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

      console.log(`✅ [PreloadService] تم preload المتجر بنجاح: ${storeIdentifier} في ${executionTime.toFixed(2)}ms`);
      
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
      console.error(`❌ [PreloadService] فشل في preload المتجر: ${storeIdentifier}`, error);
      
      return {
        success: false,
        error: error?.message || 'خطأ في تحميل بيانات المتجر',
        executionTime
      };
    }
  }

  /**
   * الحصول على البيانات المحفوظة مسبقاً
   */
  getPreloadedData(storeIdentifier: string): any | null {
    const cacheKey = `preload-${storeIdentifier}`;
    return this.preloadedData.get(cacheKey) || null;
  }

  /**
   * التحقق من وجود بيانات محفوظة مسبقاً
   */
  hasPreloadedData(storeIdentifier: string): boolean {
    const cacheKey = `preload-${storeIdentifier}`;
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
      console.log(`🧹 [PreloadService] تم مسح preload data للمتجر: ${storeIdentifier}`);
    } else {
      this.preloadedData.clear();
      this.preloadPromises.clear();
      console.log(`🧹 [PreloadService] تم مسح جميع preload data`);
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
