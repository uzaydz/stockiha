import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
// import { forceDataRefresh } from '@/lib/ultimateRequestController'; // تعطيل مؤقت

// =================================================================
// 🚀 UNIVERSAL DATA UPDATE CONTEXT - الحل الشامل لمشكلة التحديث
// =================================================================

interface UniversalDataUpdateContextType {
  // دوال التحديث الشاملة
  refreshAllData: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshFinancials: () => Promise<void>;
  
  // دوال التحديث المحددة
  invalidateDataType: (dataType: DataType) => Promise<void>;
  invalidateMultipleTypes: (dataTypes: DataType[]) => Promise<void>;
  
  // معالجات الأحداث
  onDataUpdate: (callback: (dataType: DataType) => void) => () => void;
  notifyDataUpdate: (dataType: DataType) => void;
  
  // معلومات الحالة
  isUpdating: boolean;
  lastUpdateTime: Record<DataType, number>;
}

type DataType = 
  | 'products' 
  | 'categories' 
  | 'inventory' 
  | 'orders' 
  | 'settings' 
  | 'subscriptions' 
  | 'employees' 
  | 'customers' 
  | 'financials'
  | 'pos-data'
  | 'dashboard-stats'
  | 'organization-apps'
  | 'all';

const UniversalDataUpdateContext = createContext<UniversalDataUpdateContextType | null>(null);

// =================================================================
// 🎯 Provider Component
// =================================================================
export const UniversalDataUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();
  const updateCallbacksRef = useRef<((dataType: DataType) => void)[]>([]);
  const isUpdatingRef = useRef(false);
  const lastUpdateTimeRef = useRef<Record<DataType, number>>({} as Record<DataType, number>);
  const debounceTimersRef = useRef<Record<DataType, NodeJS.Timeout>>({} as Record<DataType, NodeJS.Timeout>);

  // =================================================================
  // 🔧 Core Invalidation Functions
  // =================================================================

  const invalidateReactQueryCache = useCallback(async (dataType: DataType) => {
    console.log('🚫 [UniversalDataUpdate] DISABLED - Not invalidating cache for:', dataType);
    // Do nothing - universal data update is disabled
    return;
  }, []);

  const clearLocalStorageCache = useCallback((dataType: DataType) => {
    console.log('🚫 [UniversalDataUpdate] DISABLED - Not clearing localStorage for:', dataType);
    // Do nothing - cache clearing is disabled
    return;
  }, []);

  const triggerCustomRefreshEvents = useCallback((dataType: DataType) => {

    // إرسال أحداث مخصصة للمكونات التي تعتمد على أحداث DOM
    const eventMap: Record<DataType, string[]> = {
      'products': ['products-updated', 'inventory-updated'],
      'categories': ['categories-updated'],
      'inventory': ['inventory-updated', 'stock-updated'],
      'orders': ['orders-updated'],
      'settings': ['settings-updated'],
      'subscriptions': ['subscriptions-updated'],
      'employees': ['employees-updated'],
      'customers': ['customers-updated'],
      'financials': ['financials-updated'],
      'pos-data': ['pos-data-updated'],
      'dashboard-stats': ['dashboard-updated'],
      'organization-apps': ['apps-updated'],
      'all': ['data-updated']
    };

    const events = eventMap[dataType] || [];
    events.forEach(eventName => {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { 
          detail: { 
            dataType, 
            timestamp: Date.now(),
            organizationId: currentOrganization?.id 
          } 
        }));
      } catch (error) {
        // Silent fail
      }
    });
  }, [currentOrganization?.id]);

  // =================================================================
  // 🎯 Public API Functions
  // =================================================================

  const invalidateDataType = useCallback(async (dataType: DataType) => {
    if (isUpdatingRef.current) {
      
      // إلغاء التايمر السابق وإنشاء جديد
      if (debounceTimersRef.current[dataType]) {
        clearTimeout(debounceTimersRef.current[dataType]);
      }
      
      debounceTimersRef.current[dataType] = setTimeout(() => {
        invalidateDataType(dataType);
      }, 500);
      
      return;
    }

    isUpdatingRef.current = true;
    lastUpdateTimeRef.current[dataType] = Date.now();

    try {

      // 1. تنظيف React Query cache
      await invalidateReactQueryCache(dataType);

      // 2. تنظيف localStorage cache
      clearLocalStorageCache(dataType);

      // 3. إرسال الأحداث المخصصة
      triggerCustomRefreshEvents(dataType);

      // 4. إشعار المستمعين
      updateCallbacksRef.current.forEach(callback => {
        try {
          callback(dataType);
        } catch (error) {
        }
      });

    } catch (error) {
    } finally {
      // تأخير قصير قبل السماح بالتحديث التالي
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 200);
    }
  }, [invalidateReactQueryCache, clearLocalStorageCache, triggerCustomRefreshEvents]);

  const invalidateMultipleTypes = useCallback(async (dataTypes: DataType[]) => {
    
    for (const dataType of dataTypes) {
      await invalidateDataType(dataType);
    }
  }, [invalidateDataType]);

  // =================================================================
  // 🎯 Specific Refresh Functions
  // =================================================================

  const refreshProducts = useCallback(async () => {
    await invalidateDataType('products');
  }, [invalidateDataType]);

  const refreshCategories = useCallback(async () => {
    await invalidateDataType('categories');
  }, [invalidateDataType]);

  const refreshInventory = useCallback(async () => {
    await invalidateDataType('inventory');
  }, [invalidateDataType]);

  const refreshOrders = useCallback(async () => {
    await invalidateDataType('orders');
  }, [invalidateDataType]);

  const refreshSettings = useCallback(async () => {
    await invalidateDataType('settings');
  }, [invalidateDataType]);

  const refreshSubscriptions = useCallback(async () => {
    await invalidateDataType('subscriptions');
  }, [invalidateDataType]);

  const refreshEmployees = useCallback(async () => {
    await invalidateDataType('employees');
  }, [invalidateDataType]);

  const refreshCustomers = useCallback(async () => {
    await invalidateDataType('customers');
  }, [invalidateDataType]);

  const refreshFinancials = useCallback(async () => {
    await invalidateDataType('financials');
  }, [invalidateDataType]);

  const refreshAllData = useCallback(async () => {
    await invalidateDataType('all');
  }, [invalidateDataType]);

  // =================================================================
  // 🎯 Event System
  // =================================================================

  const onDataUpdate = useCallback((callback: (dataType: DataType) => void) => {
    updateCallbacksRef.current.push(callback);
    
    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      const index = updateCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        updateCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  const notifyDataUpdate = useCallback((dataType: DataType) => {
    invalidateDataType(dataType);
  }, [invalidateDataType]);

  // =================================================================
  // 🎯 Auto-cleanup
  // =================================================================
  useEffect(() => {
    return () => {
      // تنظيف التايمرات عند إلغاء المكون
      Object.values(debounceTimersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // =================================================================
  // 🎯 Context Value
  // =================================================================
  const contextValue: UniversalDataUpdateContextType = {
    refreshAllData,
    refreshProducts,
    refreshCategories,
    refreshInventory,
    refreshOrders,
    refreshSettings,
    refreshSubscriptions,
    refreshEmployees,
    refreshCustomers,
    refreshFinancials,
    invalidateDataType,
    invalidateMultipleTypes,
    onDataUpdate,
    notifyDataUpdate,
    isUpdating: isUpdatingRef.current,
    lastUpdateTime: lastUpdateTimeRef.current,
  };

  return (
    <UniversalDataUpdateContext.Provider value={contextValue}>
      {children}
    </UniversalDataUpdateContext.Provider>
  );
};

// =================================================================
// 🎯 Hook للاستخدام
// =================================================================
export const useUniversalDataUpdate = () => {
  const context = useContext(UniversalDataUpdateContext);
  if (!context) {
    throw new Error('useUniversalDataUpdate must be used within UniversalDataUpdateProvider');
  }
  return context;
};

// =================================================================
// 🎯 Hook محسن للتحديث التلقائي
// =================================================================
export const useAutoRefresh = (dataTypes: DataType[], interval = 30000) => {
  const { invalidateMultipleTypes } = useUniversalDataUpdate();
  
  useEffect(() => {
    const timer = setInterval(() => {
      invalidateMultipleTypes(dataTypes);
    }, interval);

    return () => clearInterval(timer);
  }, [dataTypes, interval, invalidateMultipleTypes]);
};

// =================================================================
// 🎯 دوال مساعدة عامة للاستخدام المباشر
// =================================================================
export const refreshDataAfterOperation = async (operation: 'create' | 'update' | 'delete', entityType: DataType) => {
  // إنشاء instance مؤقت للاستخدام خارج المكونات
  const event = new CustomEvent('force-data-refresh', {
    detail: { operation, entityType, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};
