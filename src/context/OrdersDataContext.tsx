import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/hooks/use-toast';

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
  refreshData: () => Promise<void>;
  addCallConfirmationStatus: (name: string, color: string) => Promise<number>;
  updateCallConfirmationStatus: (id: number, updates: Partial<CallConfirmationStatus>) => void;
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

  // جلب جميع البيانات في استدعاء واحد
  const fetchAllData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      
      // جلب جميع البيانات بشكل متوازي
      const [
        callConfirmationResult,
        provincesResult,
        municipalitiesResult
      ] = await Promise.all([
        supabase
          .from('call_confirmation_statuses')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('is_default', { ascending: false })
          .order('name'),
        
        supabase
          .from('yalidine_provinces_global')
          .select('id, name')
          .order('name'),
        
        supabase
          .from('yalidine_municipalities_global')
          .select('id, name, wilaya_id, wilaya_name, name_ar, wilaya_name_ar')
          .order('name')
      ]);

      if (callConfirmationResult.error) {
      }
      if (provincesResult.error) {
      }
      if (municipalitiesResult.error) {
      }

      setData({
        callConfirmationStatuses: callConfirmationResult.data || [],
        provinces: provincesResult.data || [],
        municipalities: municipalitiesResult.data || [],
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: "حدث خطأ أثناء جلب البيانات المطلوبة"
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, toast]);

  // إضافة حالة تأكيد اتصال جديدة
  const addCallConfirmationStatus = useCallback(async (name: string, color: string): Promise<number> => {
    if (!currentOrganization?.id) throw new Error('لا يوجد معرف منظمة');

    try {
      const { data: newStatusId, error } = await supabase.rpc(
        'add_call_confirmation_status',
        {
          p_name: name.trim(),
          p_organization_id: currentOrganization.id,
          p_color: color,
        }
      );

      if (error) throw error;

      // إضافة الحالة الجديدة للبيانات المحلية
      const newStatus: CallConfirmationStatus = {
        id: newStatusId,
        name: name.trim(),
        color: color,
        icon: null,
        is_default: false
      };

      setData(prev => ({
        ...prev,
        callConfirmationStatuses: [...prev.callConfirmationStatuses, newStatus]
      }));

      return newStatusId;
    } catch (error) {
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

  // تحديث البيانات عند تغيير المنظمة
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const contextValue: OrdersDataContextType = {
    data,
    loading,
    refreshData: fetchAllData,
    addCallConfirmationStatus,
    updateCallConfirmationStatus,
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
