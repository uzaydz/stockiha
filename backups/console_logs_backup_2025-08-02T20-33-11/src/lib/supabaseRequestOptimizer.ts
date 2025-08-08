/**
 * 🚀 محسن طلبات Supabase - مكتبة متخصصة لتحسين طلبات قاعدة البيانات
 */

import { getSupabaseClient } from './supabase';
import { requestOptimizer } from './requestOptimizer';

interface SupabaseRequestOptions {
  cacheKey: string;
  cacheDuration?: number;
  debounceTime?: number;
  retryAttempts?: number;
  retryDelay?: number;
  organizationId?: string;
}

class SupabaseRequestOptimizer {
  private supabase = getSupabaseClient();

  /**
   * جلب بيانات من جدول مع تحسينات
   */
  async fetchFromTable<T>(
    tableName: string,
    options: SupabaseRequestOptions & {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<T[]> {
    const {
      cacheKey,
      cacheDuration = 5 * 60 * 1000,
      debounceTime = 1000,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId,
      select = '*',
      filters = {},
      orderBy,
      limit
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        let query = this.supabase
          .from(tableName as any)
          .select(select);

        // تطبيق الفلاتر
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        // تطبيق الترتيب
        if (orderBy) {
          query = query.order(orderBy.column, { 
            ascending: orderBy.ascending ?? true 
          });
        }

        // تطبيق الحد الأقصى
        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data || [];
      },
      {
        cacheKey: `${cacheKey}_${organizationId || 'global'}`,
        cacheDuration,
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * جلب سجل واحد من جدول
   */
  async fetchSingleFromTable<T>(
    tableName: string,
    options: SupabaseRequestOptions & {
      select?: string;
      filters: Record<string, any>;
    }
  ): Promise<T | null> {
    const {
      cacheKey,
      cacheDuration = 5 * 60 * 1000,
      debounceTime = 1000,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId,
      select = '*',
      filters
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        let query = this.supabase
          .from(tableName as any)
          .select(select)
          .single();

        // تطبيق الفلاتر
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data, error } = await query;

        if (error) {
          // إذا لم يتم العثور على السجل، نرجع null بدلاً من رمي خطأ
          if (error.code === 'PGRST116') {
            return null;
          }
          throw error;
        }

        return data;
      },
      {
        cacheKey: `${cacheKey}_${organizationId || 'global'}`,
        cacheDuration,
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * تنفيذ استعلام RPC مع تحسينات
   */
  async executeRPC<T>(
    functionName: string,
    params: Record<string, any>,
    options: SupabaseRequestOptions
  ): Promise<T> {
    const {
      cacheKey,
      cacheDuration = 5 * 60 * 1000,
      debounceTime = 1000,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        const { data, error } = await this.supabase
          .rpc(functionName, params);

        if (error) {
          throw error;
        }

        return data;
      },
      {
        cacheKey: `${cacheKey}_${organizationId || 'global'}`,
        cacheDuration,
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * إدراج بيانات في جدول
   */
  async insertIntoTable<T>(
    tableName: string,
    data: Record<string, any>,
    options: SupabaseRequestOptions & {
      select?: string;
    } = {}
  ): Promise<T> {
    const {
      cacheKey,
      debounceTime = 500,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId,
      select = '*'
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        const { data: result, error } = await this.supabase
          .from(tableName as any)
          .insert(data)
          .select(select)
          .single();

        if (error) {
          throw error;
        }

        // مسح الكاش المرتبط بهذا الجدول
        requestOptimizer.clearCache(`${cacheKey}_${organizationId || 'global'}`);

        return result;
      },
      {
        cacheKey: `${cacheKey}_insert_${organizationId || 'global'}`,
        cacheDuration: 0, // لا نريد كاش للعمليات الكتابة
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * تحديث بيانات في جدول
   */
  async updateTable<T>(
    tableName: string,
    data: Record<string, any>,
    filters: Record<string, any>,
    options: SupabaseRequestOptions & {
      select?: string;
    } = {}
  ): Promise<T[]> {
    const {
      cacheKey,
      debounceTime = 500,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId,
      select = '*'
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        let query = this.supabase
          .from(tableName as any)
          .update(data)
          .select(select);

        // تطبيق الفلاتر
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data: result, error } = await query;

        if (error) {
          throw error;
        }

        // مسح الكاش المرتبط بهذا الجدول
        requestOptimizer.clearCache(`${cacheKey}_${organizationId || 'global'}`);

        return result || [];
      },
      {
        cacheKey: `${cacheKey}_update_${organizationId || 'global'}`,
        cacheDuration: 0, // لا نريد كاش للعمليات الكتابة
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * حذف بيانات من جدول
   */
  async deleteFromTable<T>(
    tableName: string,
    filters: Record<string, any>,
    options: SupabaseRequestOptions & {
      select?: string;
    } = {}
  ): Promise<T[]> {
    const {
      cacheKey,
      debounceTime = 500,
      retryAttempts = 3,
      retryDelay = 1000,
      organizationId,
      select = '*'
    } = options;

    return requestOptimizer.executeRequest(
      async () => {
        let query = this.supabase
          .from(tableName as any)
          .delete()
          .select(select);

        // تطبيق الفلاتر
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data: result, error } = await query;

        if (error) {
          throw error;
        }

        // مسح الكاش المرتبط بهذا الجدول
        requestOptimizer.clearCache(`${cacheKey}_${organizationId || 'global'}`);

        return result || [];
      },
      {
        cacheKey: `${cacheKey}_delete_${organizationId || 'global'}`,
        cacheDuration: 0, // لا نريد كاش للعمليات الكتابة
        debounceTime,
        retryAttempts,
        retryDelay
      }
    );
  }

  /**
   * مسح كاش لجدول محدد
   */
  clearTableCache(tableName: string, organizationId?: string) {
    const cacheKey = `${tableName}_${organizationId || 'global'}`;
    requestOptimizer.clearCache(cacheKey);
  }

  /**
   * مسح جميع الكاش
   */
  clearAllCache() {
    requestOptimizer.clearAllCache();
  }
}

// إنشاء نسخة عامة
export const supabaseRequestOptimizer = new SupabaseRequestOptimizer();

/**
 * Hook لاستخدام محسن طلبات Supabase
 */
export function useSupabaseRequestOptimizer() {
  return {
    fetchFromTable: supabaseRequestOptimizer.fetchFromTable.bind(supabaseRequestOptimizer),
    fetchSingleFromTable: supabaseRequestOptimizer.fetchSingleFromTable.bind(supabaseRequestOptimizer),
    executeRPC: supabaseRequestOptimizer.executeRPC.bind(supabaseRequestOptimizer),
    insertIntoTable: supabaseRequestOptimizer.insertIntoTable.bind(supabaseRequestOptimizer),
    updateTable: supabaseRequestOptimizer.updateTable.bind(supabaseRequestOptimizer),
    deleteFromTable: supabaseRequestOptimizer.deleteFromTable.bind(supabaseRequestOptimizer),
    clearTableCache: supabaseRequestOptimizer.clearTableCache.bind(supabaseRequestOptimizer),
    clearAllCache: supabaseRequestOptimizer.clearAllCache.bind(supabaseRequestOptimizer)
  };
} 