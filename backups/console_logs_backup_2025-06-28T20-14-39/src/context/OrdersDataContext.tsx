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
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);

  // جلب جميع البيانات في استدعاء واحد
  const fetchAllData = useCallback(async () => {
    if (!currentOrganization?.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      // التحقق من الأخطاء
      if (callConfirmationResult.error) {
        setError(`خطأ في جلب حالات تأكيد الاتصال: ${callConfirmationResult.error.message}`);
      }
      if (provincesResult.error) {
      }
      if (municipalitiesResult.error) {
      }

      const callStatuses = callConfirmationResult.data || [];
      
      // إذا لم يتم العثور على حالات تأكيد اتصال، قم بإنشاء حالات افتراضية
      if (callStatuses.length === 0) {
        
        try {
          // استدعاء وظيفة قاعدة البيانات بطريقة أخرى
          // استخدام API عام لتجنب مشكلات التوافق مع TypeScript
          const { data: refreshedStatuses, error: createError } = await supabase
            .from('call_confirmation_statuses')
            .select('*')
            .eq('organization_id', currentOrganization.id)
            .limit(1);
            
          if (createError || !refreshedStatuses || refreshedStatuses.length === 0) {
            
            // إنشاء حالات افتراضية في الذاكرة فقط (إذا فشلت عملية الإنشاء في قاعدة البيانات)
            const defaultStatuses: CallConfirmationStatus[] = [
              {
                id: -1, // معرف مؤقت سالب
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
            
            toast({
              title: "استخدام حالات افتراضية",
              description: "يتم حاليًا استخدام حالات تأكيد افتراضية في الذاكرة. قد تفقد البيانات عند تحديث الصفحة.",
              variant: "destructive"
            });
            
            setData({
              callConfirmationStatuses: defaultStatuses,
              provinces: provincesResult.data || [],
              municipalities: municipalitiesResult.data || [],
            });

          } else if (refreshedStatuses && refreshedStatuses.length > 0) {
            setData({
              callConfirmationStatuses: refreshedStatuses,
              provinces: provincesResult.data || [],
              municipalities: municipalitiesResult.data || [],
            });
            setLoading(false);
            return;
          }
        } catch (createStatusesError) {
        }
      } else {
        // إذا تم العثور على حالات، استخدمها
        setData({
          callConfirmationStatuses: callStatuses,
          provinces: provincesResult.data || [],
          municipalities: municipalitiesResult.data || [],
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
      
      const { data: newStatusId, error } = await supabase.rpc(
        'add_call_confirmation_status',
        {
          p_name: name.trim(),
          p_organization_id: currentOrganization.id,
          p_color: color,
        }
      );

      if (error) {
        throw error;
      }

      // التحقق من وجود معرف
      if (!newStatusId) {
        throw new Error('لم يتم إنشاء معرف لحالة تأكيد الاتصال الجديدة');
      }

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
