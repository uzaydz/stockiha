import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// أنواع البيانات
export type CallConfirmationStatus = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
};

export type Province = {
  id: number;
  name: string;
};

export type Municipality = {
  id: number;
  name: string;
  wilaya_id: number;
  wilaya_name: string;
  name_ar?: string;
  wilaya_name_ar?: string;
};

export type OrdersData = {
  callConfirmationStatuses: CallConfirmationStatus[];
  provinces: Province[];
  municipalities: Municipality[];
};

// نوع السياق
type OrdersDataContextType = {
  data: OrdersData;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addCallConfirmationStatus: (name: string, color: string) => Promise<number>;
  updateCallConfirmationStatus: (id: number, updates: Partial<CallConfirmationStatus>) => void;
  deleteCallConfirmationStatus: (id: number) => Promise<void>;
};

// إنشاء السياق
const OrdersDataContext = createContext<OrdersDataContextType | undefined>(undefined);

// مزود السياق
export const OrdersDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  const [data, setData] = useState<OrdersData>({
    callConfirmationStatuses: [],
    provinces: [],
    municipalities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب جميع البيانات في استدعاء واحد
  const fetchAllData = useCallback(async () => {
    if (!currentOrganization?.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ⚡ استخدام PowerSync مباشرة Offline-First
      const [
        callStatuses,
        provinces,
        municipalities
      ] = await Promise.all([
        (powerSyncService.db ? powerSyncService.query<CallConfirmationStatus>({
          sql: 'SELECT * FROM call_confirmation_statuses WHERE organization_id = ? ORDER BY is_default DESC, name ASC',
          params: [currentOrganization.id]
        }) : Promise.resolve([])).catch(() => []),
        
        (powerSyncService.db ? powerSyncService.query<Province>({
          sql: 'SELECT id, name FROM yalidine_provinces_global ORDER BY name ASC',
          params: []
        }) : Promise.resolve([])).catch(() => []),
        
        (powerSyncService.db ? powerSyncService.query<Municipality>({
          sql: 'SELECT id, name, wilaya_id, wilaya_name, name_ar, wilaya_name_ar FROM yalidine_municipalities_global ORDER BY name ASC',
          params: []
        }) : Promise.resolve([])).catch(() => [])
      ]);
      // إذا لم يتم العثور على حالات تأكيد اتصال، استخدم حالات افتراضية
      if (callStatuses.length === 0) {
        const defaultStatuses: CallConfirmationStatus[] = [
          {
            id: -1,
            name: 'مؤكد',
            color: '#10B981',
            icon: 'check-circle',
            is_default: true
          },
          {
            id: -2,
            name: 'غير مؤكد',
            color: '#F43F5E',
            icon: 'x-circle',
            is_default: false
          },
          {
            id: -3,
            name: 'لم يتم الرد',
            color: '#F59E0B',
            icon: 'phone-missed',
            is_default: false
          },
          {
            id: -4,
            name: 'الاتصال لاحقاً',
            color: '#6366F1',
            icon: 'clock',
            is_default: false
          }
        ];
        
        setData({
          callConfirmationStatuses: defaultStatuses,
          provinces: provinces || [],
          municipalities: municipalities || [],
        });
      } else {
        setData({
          callConfirmationStatuses: callStatuses,
          provinces: provinces || [],
          municipalities: municipalities || [],
        });
      }

    } catch (error: any) {
      setError(error?.message || 'حدث خطأ أثناء جلب البيانات');
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: error?.message || "حدث خطأ أثناء جلب البيانات المطلوبة"
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, toast]);

  // إضافة حالة تأكيد اتصال جديدة
  const addCallConfirmationStatus = useCallback(async (name: string, color: string): Promise<number> => {
    if (!currentOrganization?.id) {
      const errorMsg = 'لا يوجد معرف منظمة';
      throw new Error(errorMsg);
    }

    try {
      // ⚡ استخدام PowerSync مباشرة Offline-First
      const { v4: uuidv4 } = await import('uuid');
      const newStatusId = Date.now(); // استخدام timestamp كـ ID مؤقت
      const now = new Date().toISOString();
      
      const newStatus: CallConfirmationStatus = {
        id: newStatusId,
        name: name.trim(),
        color: color,
        icon: null,
        is_default: false
      };

      // حفظ محلياً (call_confirmation_statuses قد لا يكون في PowerSync Schema)
      // سنستخدم localStorage كـ fallback
      const existingStatuses = data.callConfirmationStatuses;
      const updatedStatuses = [...existingStatuses, newStatus];
      
      setData(prev => ({
        ...prev,
        callConfirmationStatuses: updatedStatuses
      }));

      // التحقق من وجود معرف
      if (!newStatusId) {
        throw new Error('لم يتم إنشاء معرف لحالة تأكيد الاتصال الجديدة');
      }

      return newStatusId;
    } catch (error: any) {
      throw error;
    }
  }, [currentOrganization?.id]);

  // تحديث حالة تأكيد اتصال محلياً
  const updateCallConfirmationStatus = useCallback((id: number, updates: Partial<CallConfirmationStatus>) => {

    setData(prev => ({
      ...prev,
      callConfirmationStatuses: prev.callConfirmationStatuses.map(status =>
        status.id === id ? { ...status, ...updates } : status
      )
    }));
  }, []);

  // حذف حالة تأكيد اتصال
  const deleteCallConfirmationStatus = useCallback(async (id: number): Promise<void> => {
    if (!currentOrganization?.id) {
      throw new Error('لا يوجد معرف منظمة');
    }

    try {
      // التحقق من أن الحالة ليست افتراضية
      const statusToDelete = data.callConfirmationStatuses.find(s => s.id === id);
      if (statusToDelete?.is_default) {
        throw new Error('لا يمكن حذف الحالة الافتراضية');
      }

      // ⚡ التحقق من عدم استخدام الحالة في أي طلبات محلياً
      if (!powerSyncService.db) {
        console.warn('[OrdersDataContext] PowerSync DB not initialized');
        return [];
      }
      const ordersWithStatus = await powerSyncService.query<{ id: string }>({
        sql: 'SELECT id FROM orders WHERE call_confirmation_status_id = ? AND organization_id = ? LIMIT 1',
        params: [id, currentOrganization.id]
      });

      if (ordersWithStatus.length > 0) {
        throw new Error(`لا يمكن حذف هذه الحالة لأنها مستخدمة في طلبات. يرجى تغيير حالة الطلبات أولاً.`);
      }

      // ⚡ حذف محلياً (call_confirmation_statuses قد لا يكون في PowerSync Schema)
      // سنستخدم localStorage كـ fallback

      // حذف من البيانات المحلية
      setData(prev => ({
        ...prev,
        callConfirmationStatuses: prev.callConfirmationStatuses.filter(status => status.id !== id)
      }));

      toast({
        title: "تم الحذف",
        description: "تم حذف حالة تأكيد الإتصال بنجاح",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "فشل حذف حالة تأكيد الإتصال";
      toast({
        variant: "destructive",
        title: "خطأ",
        description: errorMessage,
      });
      throw error;
    }
  }, [currentOrganization?.id, data.callConfirmationStatuses, toast]);

  // تحديث البيانات عند تغيير المنظمة
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const contextValue: OrdersDataContextType = {
    data,
    loading,
    error,
    refreshData: fetchAllData,
    addCallConfirmationStatus,
    updateCallConfirmationStatus,
    deleteCallConfirmationStatus,
  };

  return (
    <OrdersDataContext.Provider value={contextValue}>
      {children}
    </OrdersDataContext.Provider>
  );
};

// خطاف لاستخدام السياق
export const useOrdersData = (): OrdersDataContextType => {
  const context = useContext(OrdersDataContext);
  if (context === undefined) {
    throw new Error('useOrdersData must be used within an OrdersDataProvider');
  }
  return context;
};
