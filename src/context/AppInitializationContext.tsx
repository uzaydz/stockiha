/**
 * ============================================================================
 * Context موحد لتهيئة التطبيق
 * ============================================================================
 * يستخدم RPC واحد لجلب كل البيانات المطلوبة
 * يقلل الاستدعاءات من 8 إلى 1 فقط
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  getAppInitializationData,
  refreshAppInitializationData,
  clearAppInitializationCache,
  updateCachedData,
  type AppInitializationData,
  type UserWithPermissions,
  type Organization,
  type OrganizationSettings,
  type POSSettings,
  type Category,
  type Subcategory,
  type Employee,
  type ConfirmationAgent,
  type ExpenseCategory
} from '@/api/appInitializationService';

// ============================================================================
// واجهات Context
// ============================================================================

interface AppInitializationContextType {
  // البيانات
  data: AppInitializationData | null;
  user: UserWithPermissions | null;
  organization: Organization | null;
  organizationSettings: OrganizationSettings | null;
  posSettings: POSSettings | null;
  categories: Category[];
  subcategories: Subcategory[];
  employees: Employee[];
  confirmationAgents: ConfirmationAgent[];
  expenseCategories: ExpenseCategory[];
  
  // حالة التحميل
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  
  // دوال التحديث
  refresh: () => Promise<void>;
  updateData: (updates: Partial<AppInitializationData>) => void;
  clearCache: () => void;
}

// ============================================================================
// إنشاء Context
// ============================================================================

const AppInitializationContext = createContext<AppInitializationContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export const AppInitializationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  
  const [data, setData] = useState<AppInitializationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * جلب البيانات من الخادم
   */
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!authUser?.id) {
      console.log('⏸️ [AppInitialization] لا يوجد مستخدم مسجل');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 [AppInitialization] بدء جلب البيانات...');
      
      const appData = forceRefresh
        ? await refreshAppInitializationData(authUser.id)
        : await getAppInitializationData(authUser.id);
      
      setData(appData);
      setIsInitialized(true);
      
      console.log('✅ [AppInitialization] تم جلب البيانات بنجاح');
      
    } catch (err) {
      const error = err as Error;
      console.error('❌ [AppInitialization] خطأ في جلب البيانات:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]);

  /**
   * تحميل البيانات عند تسجيل الدخول
   */
  useEffect(() => {
    if (authUser?.id && !isInitialized) {
      fetchData(false);
    }
  }, [authUser?.id, isInitialized, fetchData]);

  /**
   * إعادة تحميل البيانات
   */
  const refresh = useCallback(async () => {
    console.log('🔄 [AppInitialization] إعادة تحميل البيانات...');
    await fetchData(true);
  }, [fetchData]);

  /**
   * تحديث البيانات في الـ cache
   */
  const updateData = useCallback((updates: Partial<AppInitializationData>) => {
    if (!authUser?.id || !data) return;
    
    console.log('🔄 [AppInitialization] تحديث البيانات المحلية');
    
    const updatedData = {
      ...data,
      ...updates
    };
    
    setData(updatedData);
    updateCachedData(authUser.id, updates);
  }, [authUser?.id, data]);

  /**
   * مسح الـ cache
   */
  const clearCache = useCallback(() => {
    console.log('🗑️ [AppInitialization] مسح الـ cache');
    clearAppInitializationCache();
    setData(null);
    setIsInitialized(false);
  }, []);

  /**
   * قيمة Context
   */
  const contextValue = useMemo<AppInitializationContextType>(() => ({
    // البيانات
    data,
    user: data?.user || null,
    organization: data?.organization || null,
    organizationSettings: data?.organization_settings || null,
    posSettings: data?.pos_settings || null,
    categories: data?.categories || [],
    subcategories: data?.subcategories || [],
    employees: data?.employees || [],
    confirmationAgents: data?.confirmation_agents || [],
    expenseCategories: data?.expense_categories || [],
    
    // حالة التحميل
    isLoading,
    isInitialized,
    error,
    
    // دوال التحديث
    refresh,
    updateData,
    clearCache
  }), [
    data,
    isLoading,
    isInitialized,
    error,
    refresh,
    updateData,
    clearCache
  ]);

  return (
    <AppInitializationContext.Provider value={contextValue}>
      {children}
    </AppInitializationContext.Provider>
  );
};

// ============================================================================
// Hook للوصول إلى Context
// ============================================================================

export const useAppInitialization = (): AppInitializationContextType => {
  const context = useContext(AppInitializationContext);
  
  if (context === undefined) {
    throw new Error('useAppInitialization must be used within AppInitializationProvider');
  }
  
  return context;
};

// ============================================================================
// Hooks مساعدة للوصول السريع
// ============================================================================

/**
 * Hook للحصول على بيانات المستخدم مع الصلاحيات
 */
export const useUserWithPermissions = (): UserWithPermissions | null => {
  const { user } = useAppInitialization();
  return user;
};

/**
 * Hook للحصول على بيانات المؤسسة
 */
export const useOrganizationData = (): Organization | null => {
  const { organization } = useAppInitialization();
  return organization;
};

/**
 * Hook للحصول على إعدادات المؤسسة
 */
export const useOrganizationSettings = (): OrganizationSettings | null => {
  const { organizationSettings } = useAppInitialization();
  return organizationSettings;
};

/**
 * Hook للحصول على إعدادات POS
 */
export const usePOSSettings = (): POSSettings | null => {
  const { posSettings } = useAppInitialization();
  return posSettings;
};

/**
 * Hook للحصول على الفئات
 */
export const useCategories = (): Category[] => {
  const { categories } = useAppInitialization();
  return categories;
};

/**
 * Hook للحصول على الفئات الفرعية
 */
export const useSubcategories = (): Subcategory[] => {
  const { subcategories } = useAppInitialization();
  return subcategories;
};

/**
 * Hook للحصول على الموظفين
 */
export const useEmployees = (): Employee[] => {
  const { employees } = useAppInitialization();
  return employees;
};

/**
 * Hook للحصول على وكلاء التأكيد
 */
export const useConfirmationAgents = (): ConfirmationAgent[] => {
  const { confirmationAgents } = useAppInitialization();
  return confirmationAgents;
};

/**
 * Hook للحصول على فئات المصروفات
 */
export const useExpenseCategories = (): ExpenseCategory[] => {
  const { expenseCategories } = useAppInitialization();
  return expenseCategories;
};

/**
 * Hook للتحقق من صلاحية معينة
 */
export const useHasPermission = (permission: string): boolean => {
  const { user } = useAppInitialization();
  return user?.permissions?.includes(permission) || false;
};

/**
 * Hook للتحقق من عدة صلاحيات
 */
export const useHasPermissions = (permissions: string[]): boolean => {
  const { user } = useAppInitialization();
  if (!user?.permissions) return false;
  return permissions.every(p => user.permissions.includes(p));
};

/**
 * Hook للتحقق من أي صلاحية من مجموعة
 */
export const useHasAnyPermission = (permissions: string[]): boolean => {
  const { user } = useAppInitialization();
  if (!user?.permissions) return false;
  return permissions.some(p => user.permissions.includes(p));
};
