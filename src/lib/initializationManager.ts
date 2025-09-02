// نظام إدارة التحميل الأولي للتطبيق لمنع الاستدعاءات المكررة
class InitializationManager {
  private static instance: InitializationManager;
  private initializedOrgs = new Set<string>();
  private isInitializing = new Map<string, boolean>();

  private constructor() {}

  static getInstance(): InitializationManager {
    if (!InitializationManager.instance) {
      InitializationManager.instance = new InitializationManager();
    }
    return InitializationManager.instance;
  }

  // التحقق من ما إذا كانت المؤسسة قد تم تحميلها بالفعل
  isInitialized(orgId: string): boolean {
    return this.initializedOrgs.has(orgId);
  }

  // التحقق من ما إذا كانت المؤسسة قيد التحميل حالياً
  isInitializingOrg(orgId: string): boolean {
    return this.isInitializing.get(orgId) || false;
  }

  // بدء عملية التحميل للمؤسسة
  startInitialization(orgId: string): boolean {
    if (this.isInitialized(orgId) || this.isInitializingOrg(orgId)) {
      return false; // لا نحتاج للتحميل
    }

    this.isInitializing.set(orgId, true);
    return true; // يمكن بدء التحميل
  }

  // إنهاء عملية التحميل للمؤسسة
  finishInitialization(orgId: string): void {
    this.isInitializing.set(orgId, false);
    this.initializedOrgs.add(orgId);
  }

  // إعادة تعيين حالة المؤسسة (للاستخدام في حالة الأخطاء)
  resetOrganization(orgId: string): void {
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
      initializingOrgs: Array.from(this.isInitializing.keys()).filter(key => this.isInitializing.get(key)),
      totalInitialized: this.initializedOrgs.size,
      totalInitializing: this.isInitializing.size
    };
  }
}

// نظام التحميل الأولي العام
export const initializationManager = InitializationManager.getInstance();

// دوال مساعدة للتحقق من الاستدعاءات المكررة
export const initializationUtils = {
  // دالة مساعدة للتحقق من الحاجة للتحميل
  shouldInitialize: (orgId: string): boolean => {
    return initializationManager.startInitialization(orgId);
  },

  // دالة مساعدة لإنهاء التحميل
  finishInitialization: (orgId: string): void => {
    initializationManager.finishInitialization(orgId);
  },

  // دالة مساعدة لإعادة التعيين في حالة الأخطاء
  resetOnError: (orgId: string): void => {
    initializationManager.resetOrganization(orgId);
  },

  // دالة مساعدة للتحقق من الحالة
  isAlreadyInitialized: (orgId: string): boolean => {
    return initializationManager.isInitialized(orgId);
  },

  // دالة مساعدة للتحقق من التحميل الجاري
  isCurrentlyInitializing: (orgId: string): boolean => {
    return initializationManager.isInitializingOrg(orgId);
  }
};

// دالة لتنظيف البيانات عند تسجيل الخروج
export const clearInitializationData = (): void => {
  initializationManager.clearAll();
};

// ربط مع window للاستخدام في التطوير
if (typeof window !== 'undefined') {
  (window as any).initializationManager = initializationManager;
  (window as any).clearInitializationData = clearInitializationData;
}
