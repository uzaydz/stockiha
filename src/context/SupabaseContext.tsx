import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';

type SupabaseContextType = {
  supabase: SupabaseClient;
  isLoading: boolean;
};

// إنشاء السياق
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// الحصول على عميل Supabase المشترك
const supabaseClient = getSupabaseClient();

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // التحقق من جلسة المستخدم الحالية عند تحميل التطبيق
    const checkSession = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // الاستماع لتغييرات حالة المصادقة
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(() => {
      // تحديث حالة التطبيق عند تغير حالة المصادقة
      // يمكن إضافة منطق إضافي هنا حسب الحاجة
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase: supabaseClient, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase يجب استخدامه داخل SupabaseProvider');
  }
  return context;
};
