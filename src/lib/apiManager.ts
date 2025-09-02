// نظام إدارة الاستدعاءات API لمنع التكرار
class ApiManager {
  private static instance: ApiManager;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();

  private constructor() {}

  static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  // تنفيذ طلب API مع منع التكرار
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    cacheTime: number = 5 * 60 * 1000 // 5 دقائق افتراضياً
  ): Promise<T> {
    // التحقق من الكاش أولاً
    const cached = this.requestCache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cacheTime) {
        return cached.data;
      } else {
        this.requestCache.delete(key);
      }
    }

    // التحقق من وجود طلب جاري
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    // إنشاء طلب جديد
    const request = requestFn()
      .then(result => {
        // حفظ في الكاش
        this.requestCache.set(key, {
          data: result,
          timestamp: Date.now()
        });
        return result;
      })
      .finally(() => {
        // إزالة من الطلبات المعلقة
        this.pendingRequests.delete(key);
      });

    // حفظ الطلب المعلق
    this.pendingRequests.set(key, request);

    return request;
  }

  // تنظيف الكاش القديم
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, item] of this.requestCache.entries()) {
      // إزالة العناصر القديمة (أكثر من 10 دقائق)
      if (now - item.timestamp > 10 * 60 * 1000) {
        this.requestCache.delete(key);
      }
    }
  }

  // تنظيف جميع الطلبات المعلقة
  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }

  // الحصول على إحصائيات
  getStats(): {
    pendingRequests: number;
    cachedRequests: number;
    cacheKeys: string[];
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedRequests: this.requestCache.size,
      cacheKeys: Array.from(this.requestCache.keys())
    };
  }
}

// نظام API العام
export const apiManager = ApiManager.getInstance();

// دوال مساعدة للاستخدام الشائع
export const apiUtils = {
  // طلب بيانات المؤسسة
  getOrganizationData: async (organizationId: string, supabase: any) => {
    const key = `org_data_${organizationId}`;
    return apiManager.executeRequest(
      key,
      async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();

        if (error) throw error;
        return data;
      },
      10 * 60 * 1000 // 10 دقائق
    );
  },

  // طلب إعدادات المؤسسة
  getOrganizationSettings: async (organizationId: string, supabase: any) => {
    const key = `org_settings_${organizationId}`;
    return apiManager.executeRequest(
      key,
      async () => {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
      },
      15 * 60 * 1000 // 15 دقيقة
    );
  },

  // طلب تطبيقات المؤسسة
  getOrganizationApps: async (organizationId: string, supabase: any) => {
    const key = `org_apps_${organizationId}`;
    return apiManager.executeRequest(
      key,
      async () => {
        const { data, error } = await supabase
          .from('organization_apps')
          .select('*')
          .eq('organization_id', organizationId);

        if (error) throw error;
        return data;
      },
      5 * 60 * 1000 // 5 دقائق
    );
  },

  // طلب بيانات المستخدم
  getUserData: async (userId: string, supabase: any) => {
    const key = `user_data_${userId}`;
    return apiManager.executeRequest(
      key,
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      30 * 60 * 1000 // 30 دقيقة
    );
  }
};

// تنظيف دوري للكاش
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiManager.cleanupCache();
  }, 5 * 60 * 1000); // كل 5 دقائق
}
