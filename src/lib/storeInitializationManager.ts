// نظام إدارة تهيئة المتجر لمنع الاستدعاءات المكررة
class StoreInitializationManager {
  private static instance: StoreInitializationManager;
  private initializedOrgs = new Set<string>();
  private isInitializing = new Map<string, Promise<any>>();
  private initializationCallbacks = new Map<string, (() => Promise<void>)[]>();

  private constructor() {}

  static getInstance(): StoreInitializationManager {
    if (!StoreInitializationManager.instance) {
      StoreInitializationManager.instance = new StoreInitializationManager();
    }
    return StoreInitializationManager.instance;
  }

  // التحقق من ما إذا كانت المؤسسة تحتاج للتهيئة
  needsInitialization(orgId: string): boolean {
    return !this.initializedOrgs.has(orgId) && !this.isInitializing.has(orgId);
  }

  // التحقق من ما إذا كانت المؤسسة قد تم تحميلها بالفعل
  isInitialized(orgId: string): boolean {
    return this.initializedOrgs.has(orgId);
  }

  // بدء عملية التحميل للمؤسسة مع callback
  async startInitialization(orgId: string, callback: () => Promise<void>): Promise<void> {
    if (this.initializedOrgs.has(orgId)) {
      return; // تمت التهيئة بالفعل
    }

    if (this.isInitializing.has(orgId)) {
      // انتظر التهيئة الحالية
      return this.isInitializing.get(orgId)!;
    }

    // ابدأ عملية التهيئة
    const initializationPromise = (async () => {
      try {
        await callback();
        this.initializedOrgs.add(orgId);
      } finally {
        this.isInitializing.delete(orgId);
      }
    })();

    this.isInitializing.set(orgId, initializationPromise);
    return initializationPromise;
  }

  // إعادة تعيين حالة المؤسسة (للاستخدام في حالة الأخطاء)
  resetInitialization(orgId: string): void {
    this.initializedOrgs.delete(orgId);
    this.isInitializing.delete(orgId);
  }

  // تنظيف جميع المؤسسات (للاستخدام في تسجيل الخروج)
  clearAll(): void {
    this.initializedOrgs.clear();
    this.isInitializing.clear();
  }

  // الحصول على إحصائيات التحميل
  getStats(): {
    initializedOrgs: string[];
    initializingOrgs: string[];
    totalInitialized: number;
    totalInitializing: number;
  } {
    return {
      initializedOrgs: Array.from(this.initializedOrgs),
      initializingOrgs: Array.from(this.isInitializing.keys()),
      totalInitialized: this.initializedOrgs.size,
      totalInitializing: this.isInitializing.size
    };
  }
}

// إنشاء المثيل العام
export const storeInitializationManager = StoreInitializationManager.getInstance();

// ربط مع window للاستخدام في التطوير
if (typeof window !== 'undefined') {
  (window as any).storeInitializationManager = storeInitializationManager;
}
