/**
 * ⚡ PowerSync Background Sync Service
 *
 * خدمة مزامنة خلفية بسيطة تعمل مع PowerSync
 * - مزامنة دورية كل 5 دقائق فقط
 * - بدون مستمعين متكررين
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { isAppOnline } from '@/utils/networkStatus';

export class PowerSyncBackgroundService {
  private static instance: PowerSyncBackgroundService;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;
  private organizationId: string | null = null;
  // ⚡ مرجع للـ handler لتنظيفه لاحقاً
  private onlineHandler: (() => void) | null = null;

  // إعدادات المزامنة
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 دقائق
  private readonly MIN_SYNC_INTERVAL_MS = 60 * 1000; // دقيقة واحدة كحد أدنى

  private constructor() {
    // فقط مستمع واحد للعودة للاتصال - مع حفظ المرجع للتنظيف
    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        if (this.organizationId) {
          this.syncNow();
        }
      };
      window.addEventListener('online', this.onlineHandler);
    }
  }

  static getInstance(): PowerSyncBackgroundService {
    if (!PowerSyncBackgroundService.instance) {
      PowerSyncBackgroundService.instance = new PowerSyncBackgroundService();
    }
    return PowerSyncBackgroundService.instance;
  }

  /**
   * بدء خدمة المزامنة الخلفية
   * ⚡ محسّن: ينتظر جاهزية PowerSync قبل بدء المزامنة
   */
  async start(organizationId: string): Promise<void> {
    this.organizationId = organizationId;

    // ⚡ انتظار جاهزية PowerSync أولاً (بحد أقصى 10 ثوان)
    const maxWaitTime = 10000;
    const startTime = Date.now();

    while (!powerSyncService.isReady() && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (!powerSyncService.isReady()) {
      console.warn('[PowerSyncBG] PowerSync not ready after waiting, will retry on interval');
    } else {
      // مزامنة أولية فقط إذا كان جاهزاً
      await this.syncNow();
    }

    // بدء المزامنة الدورية
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * إيقاف خدمة المزامنة
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    // ⚡ تنظيف event listener لمنع تسرب الذاكرة
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    this.organizationId = null;
  }

  /**
   * مزامنة فورية
   */
  async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (!this.organizationId) {
      return { success: false, error: 'No organization ID' };
    }

    if (this.isSyncing) {
      return { success: false, error: 'Sync in progress' };
    }

    // منع المزامنة المفرطة
    const now = Date.now();
    if (now - this.lastSyncTime < this.MIN_SYNC_INTERVAL_MS) {
      return { success: false, error: 'Too soon' };
    }

    if (!isAppOnline()) {
      return { success: false, error: 'Offline' };
    }

    this.isSyncing = true;

    try {
      // ⚡ إصلاح: إزالة manualSyncFromSupabase الوهمية
      // PowerSync يتولى المزامنة تلقائياً - نستخدم forceSync فقط
      if (powerSyncService.isReady()) {
        await powerSyncService.forceSync();
      } else {
        console.warn('[PowerSyncBG] PowerSync not ready, skipping sync');
        return { success: false, error: 'PowerSync not ready' };
      }

      this.lastSyncTime = Date.now();
      return { success: true };
    } catch (error: any) {
      console.error('[PowerSyncBG] Sync error:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * الحصول على حالة المزامنة
   */
  getStatus() {
    return {
      isRunning: this.syncInterval !== null,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      organizationId: this.organizationId
    };
  }
}

export const powerSyncBackgroundService = PowerSyncBackgroundService.getInstance();
export default powerSyncBackgroundService;
