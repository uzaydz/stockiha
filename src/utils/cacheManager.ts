/**
 * مكون إدارة التخزين المؤقت
 */

import type { CacheData, FastOrgIdCache, OrganizationIdResult } from './types/interfaces';

export class CacheManager {
  private static domainCache: Map<string, CacheData> = new Map();

  /**
   * الحصول على البيانات المحفوظة مسبقاً
   */
  static getPreloadedData(storeIdentifier?: string, preloadResult?: any): any | null {
    // أولوية قصوى للبيانات الحالية في الذاكرة
    if (preloadResult?.success && preloadResult.data) {
      return preloadResult.data;
    }

    // محاولة الحصول على البيانات من cache محلي
    if (storeIdentifier && this.domainCache.has(storeIdentifier)) {
      const cached = this.domainCache.get(storeIdentifier)!;
      if (Date.now() - cached.timestamp < 10 * 60 * 1000) {
        return cached.data;
      }
    }

    // البحث في localStorage
    return this.getFromLocalStorage(storeIdentifier);
  }

  /**
   * البحث في localStorage
   */
  private static getFromLocalStorage(storeIdentifier?: string): any | null {
    const possibleKeys = storeIdentifier ? [
      `early_preload_${storeIdentifier}`,
      `organization_data_${storeIdentifier}`,
      `store_init_data_${storeIdentifier}`
    ] : [];

    possibleKeys.push('bazaar_app_init_data', 'bazaar_organization_id');

    for (const key of possibleKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = this.parseStoredData(key, stored);
          if (parsed && this.isValidData(parsed)) {
            if (this.isNotExpired(parsed)) {
              return parsed.data || parsed;
            } else {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ [CacheManager] خطأ في قراءة ${key}:`, e);
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }

    return null;
  }

  /**
   * تحليل البيانات المحفوظة
   */
  private static parseStoredData(key: string, stored: string): any {
    if (key === 'bazaar_organization_id') {
      if (stored.length === 36 && stored.includes('-')) {
        return { organization_id: stored };
      }
      try {
        return JSON.parse(stored);
      } catch {
        console.warn(`⚠️ [CacheManager] تجاهل ${key} - ليس JSON صحيح`);
        localStorage.removeItem(key);
        return null;
      }
    }
    return JSON.parse(stored);
  }

  /**
   * التحقق من صحة البيانات
   */
  private static isValidData(parsed: any): boolean {
    return parsed && (
      parsed.data || 
      parsed.organization || 
      parsed.organization_id ||
      (typeof parsed === 'string' && parsed.length > 10)
    );
  }

  /**
   * التحقق من عدم انتهاء صلاحية البيانات
   */
  private static isNotExpired(parsed: any): boolean {
    const maxAge = 10 * 60 * 1000;
    return !parsed.timestamp || (Date.now() - parsed.timestamp < maxAge);
  }

  /**
   * حفظ البيانات في cache
   */
  static setCacheData(storeIdentifier: string, data: any, executionTime: number, domainType: string): void {
    try {
      localStorage.setItem(`early_preload_${storeIdentifier}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        executionTime,
        domainType
      }));

      this.domainCache.set(storeIdentifier, {
        data,
        timestamp: Date.now()
      });

      if (data?.organization_details?.id) {
        localStorage.setItem('bazaar_organization_id', data.organization_details.id);
      }
    } catch (e) {
      console.warn('فشل حفظ البيانات في cache:', e);
    }
  }

  /**
   * حفظ Organization ID السريع
   */
  static setFastOrgId(storeIdentifier: string, organizationId: string): void {
    try {
      const cacheData: FastOrgIdCache = {
        organizationId,
        timestamp: Date.now(),
        storeIdentifier
      };
      
      localStorage.setItem(`fast_org_id_${storeIdentifier}`, JSON.stringify(cacheData));
      
      window.dispatchEvent(new CustomEvent('fastOrganizationIdReady', {
        detail: { organizationId, storeIdentifier, source: 'early-preload' }
      }));
    } catch (e) {
      console.warn('فشل حفظ Organization ID السريع:', e);
    }
  }

  /**
   * الحصول على Organization ID السريع من cache
   */
  static getFastOrgIdFromCache(storeIdentifier: string): string | null {
    try {
      const cached = localStorage.getItem(`fast_org_id_${storeIdentifier}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.timestamp && (Date.now() - data.timestamp) < 5 * 60 * 1000) {
          return data.organizationId;
        }
      }
    } catch {}
    return null;
  }

  /**
   * مسح البيانات المحفوظة مسبقاً
   */
  static clearCache(): void {
    this.domainCache.clear();
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('early_preload_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }
}
