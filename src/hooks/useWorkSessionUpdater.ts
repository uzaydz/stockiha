import { useCallback } from 'react';
import { useWorkSession } from '@/context/WorkSessionContext';
import { supabase } from '@/lib/supabase';

/**
 * Hook لتحديث جلسة العمل تلقائياً عند كل عملية بيع
 */
export const useWorkSessionUpdater = () => {
  const { activeSession, refreshActiveSession } = useWorkSession();

  /**
   * تحديث إحصائيات الجلسة بعد عملية بيع ناجحة
   */
  const updateSessionAfterSale = useCallback(
    async (saleAmount: number, paymentMethod: 'cash' | 'card' | 'credit_card') => {
      if (!activeSession?.id) {
        console.log('⚠️ [WorkSession] لا توجد جلسة نشطة للتحديث');
        return;
      }

      try {
        console.log('🔄 [WorkSession] تحديث الجلسة:', {
          sessionId: activeSession.id,
          saleAmount,
          paymentMethod,
        });

        // تحديث الإحصائيات في الجلسة
        const updates: any = {
          total_sales: activeSession.total_sales + saleAmount,
          total_orders: activeSession.total_orders + 1,
        };

        // تحديث المبيعات حسب طريقة الدفع
        if (paymentMethod === 'cash') {
          updates.cash_sales = activeSession.cash_sales + saleAmount;
        } else if (paymentMethod === 'card' || paymentMethod === 'credit_card') {
          updates.card_sales = activeSession.card_sales + saleAmount;
        }

        const { error } = await supabase
          .from('pos_work_sessions')
          .update(updates)
          .eq('id', activeSession.id);

        if (error) {
          console.error('❌ [WorkSession] خطأ في تحديث الجلسة:', error);
          throw error;
        }

        console.log('✅ [WorkSession] تم تحديث الجلسة بنجاح');

        // تحديث الجلسة في الـ context
        await refreshActiveSession();
      } catch (error) {
        console.error('❌ [WorkSession] خطأ في updateSessionAfterSale:', error);
        // لا نرمي الخطأ لأن فشل تحديث الجلسة لا يجب أن يمنع إكمال البيع
      }
    },
    [activeSession, refreshActiveSession]
  );

  return {
    updateSessionAfterSale,
    hasActiveSession: !!activeSession,
    activeSession,
  };
};
