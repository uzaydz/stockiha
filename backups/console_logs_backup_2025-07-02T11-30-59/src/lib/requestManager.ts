/**
 * مدير الطلبات المركزي لمنع التحميل المتزامن والطلبات المكررة
 */

import { supabase } from '@/lib/supabase-client';
import { cachedQuery, queryCache } from '@/lib/cache/queryCache';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  priority: number;
}

class RequestManager {
  private static instance: RequestManager;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue: Array<{ 
    key: string; 
    priority: number; 
    fn: () => Promise<any>; 
    resolve: (value: any) => void; 
    reject: (reason: any) => void; 
  }> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 3;
  private currentRequests = 0;

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  async executeRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    options: {
      priority?: number;
      ttl?: number;
      forceNew?: boolean;
    } = {}
  ): Promise<T> {
    const { priority = 1, ttl = 30000, forceNew = false } = options;
    
    if (!forceNew) {
    const existingRequest = this.pendingRequests.get(key);
      if (existingRequest && Date.now() - existingRequest.timestamp < ttl) {
        return existingRequest.promise;
      }
    }

    if (this.currentRequests >= this.maxConcurrentRequests) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ key, priority, fn: requestFn, resolve, reject });
        this.requestQueue.sort((a, b) => b.priority - a.priority);
        this.processQueue();
      });
    }

    return this.executeRequestDirectly(key, requestFn, priority);
  }

  private async executeRequestDirectly<T>(key: string, requestFn: () => Promise<T>, priority: number): Promise<T> {
    this.currentRequests++;

    const requestPromise = requestFn();
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: Date.now(),
      priority
    });

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
      this.currentRequests--;
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0 || this.currentRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (request) {
        this.executeRequestDirectly(request.key, request.fn, request.priority)
          .then((result) => request.resolve(result))
          .catch((error) => request.reject(error));
      }
    }

    this.isProcessingQueue = false;
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      queueLength: this.requestQueue.length,
      currentRequests: this.currentRequests,
      maxConcurrentRequests: this.maxConcurrentRequests,
      cacheStats: queryCache.getStats()
    };
  }

  clearAll(): void {
    this.pendingRequests.clear();
    this.requestQueue.length = 0;
    queryCache.clearAll();
  }

  setMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = Math.max(1, max);
  }
}

// تصدير مدير الطلبات المركزي
export const requestManager = RequestManager.getInstance();

// دوال محسنة للاستعلامات الشائعة مع معالجة PGRST116
export const optimizedQueries = {
  getShippingProvider: async (providerId: number | string) => {
    return cachedQuery.single('shipping_providers', () => 
      supabase
        .from('shipping_providers')
        .select('*')
        .eq('id', providerId)
    );
  },

  getAllShippingProviders: async () => {
    return cachedQuery.multiple('shipping_providers', () => 
      supabase
        .from('shipping_providers')
        .select('*')
        .order('name')
    );
  },

  getShippingProviderSettings: async (organizationId: string, providerId?: number | string) => {
    return cachedQuery.auto('shipping_provider_settings', () => {
      let query = supabase
        .from('shipping_provider_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_enabled', true);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      return query.order('created_at', { ascending: false });
    });
  },

  getStoreSettings: async (organizationId: string) => {
    return cachedQuery.single('store_settings', () => 
      supabase
        .from('store_settings')
        .select('*')
        .eq('organization_id', organizationId)
    );
  },

  getProducts: async (organizationId: string, limit = 500) => {
    return cachedQuery.multiple('products', () => 
      supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  },

  getOrders: async (organizationId: string, limit = 100) => {
    return cachedQuery.multiple('orders', () => 
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
  },

  getGlobalProvinces: async () => {
    return cachedQuery.multiple('yalidine_provinces_global', () => 
      supabase
        .from('yalidine_provinces_global')
        .select('*')
        .eq('is_deliverable', true)
        .order('name')
    );
  },

  getServices: async (organizationId: string, availableOnly = true) => {
    return cachedQuery.multiple('services', () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('organization_id', organizationId);

      if (availableOnly) {
        query = query.eq('is_available', true);
      }

      return query.order('name');
    });
  },

  getCustomers: async (organizationId: string) => {
    return cachedQuery.multiple('customers', () => 
      supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    );
  },

  getOrganization: async (organizationId: string) => {
    return cachedQuery.single('organizations', () => 
      supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
    );
  },

  getOrganizationSettings: async (organizationId: string) => {
    return cachedQuery.single('organization_settings', () => 
      supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
    );
  }
};

// دالة للبحث الذكي مع معالجة PGRST116
export const smartSearch = {
  findOrganizationByDomain: async (domain: string) => {
    const byCustomDomain = await cachedQuery.single('organizations', () => 
      supabase
        .from('organizations')
        .select('*')
        .eq('domain', domain)
    );

    if (byCustomDomain) return byCustomDomain;

    return cachedQuery.single('organizations', () => 
      supabase
        .from('organizations')
        .select('*')
        .eq('subdomain', domain)
    );
  },

  findShippingClone: async (organizationId: string, originalProviderId?: number) => {
    let query = supabase
      .from('shipping_provider_clones')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (originalProviderId) {
      query = query.eq('original_provider_id', originalProviderId);
    }

    return cachedQuery.auto('shipping_provider_clones', () => 
      query.order('created_at', { ascending: true }).limit(1)
    );
  }
};

export const clearAllCaches = () => {
  requestManager.clearAll();
};

export const getPerformanceStats = () => {
  return {
    requestManager: requestManager.getStats(),
    cache: queryCache.getStats()
  };
};

// إحصائيات عامة للتشخيص
if (typeof window !== 'undefined') {
  (window as any).bazaarPerformance = {
    stats: getPerformanceStats,
    clearCache: clearAllCaches,
    requestManager,
    queryCache
  };
}
