import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';

interface UseOrderAutoAssignmentOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onAssignment?: (orderId: string, agentId: string) => void;
  onError?: (error: any) => void;
}

export const useOrderAutoAssignment = (options: UseOrderAutoAssignmentOptions = {}) => {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onAssignment,
    onError
  } = options;

  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Auto-assign function
  const autoAssignOrders = useCallback(async () => {
    if (!currentOrganization?.id || isProcessingRef.current) return;

    try {
      isProcessingRef.current = true;

      // جلب الطلبيات غير المُكلفة
      const { data: unassignedOrders, error: fetchError } = await supabase
        .from('online_orders')
        .select('id, total, created_at, form_data, customer_order_number')
        .eq('organization_id', currentOrganization.id)
        .is('assigned_agent_id', null)
        .order('created_at', { ascending: true })
        .limit(10); // معالجة 10 طلبات في المرة الواحدة

      if (fetchError) {
        onError?.(fetchError);
        return;
      }

      if (unassignedOrders && unassignedOrders.length > 0) {

        // معالجة كل طلب
        for (const order of unassignedOrders) {
          try {
            const { data, error } = await (supabase as any).rpc('auto_assign_order_to_agent', {
              p_order_id: order.id,
              p_organization_id: currentOrganization.id
            });

            if (error) {
              onError?.(error);
            } else if ((data as any)?.success) {
              onAssignment?.(order.id, (data as any).agent_id);
              
              // إشعار نجاح
              toast({
                title: "تم التوزيع التلقائي",
                description: `تم توزيع الطلب #${order.customer_order_number} تلقائياً`,
                duration: 3000,
              });
            }
          } catch (err) {
            onError?.(err);
          }

          // تأخير قصير بين الطلبات لتجنب الضغط على قاعدة البيانات
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (err) {
      onError?.(err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentOrganization?.id, onAssignment, onError, toast]);

  // Start/stop auto-assignment
  const startAutoAssignment = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled && currentOrganization?.id) {
      // تشغيل فوري
      autoAssignOrders();
      
      // تشغيل دوري
      intervalRef.current = setInterval(autoAssignOrders, interval);
    }
  }, [enabled, currentOrganization?.id, autoAssignOrders, interval]);

  const stopAutoAssignment = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual trigger
  const triggerAutoAssignment = useCallback(async () => {
    await autoAssignOrders();
  }, [autoAssignOrders]);

  // Setup effect
  useEffect(() => {
    if (enabled && currentOrganization?.id) {
      startAutoAssignment();
    } else {
      stopAutoAssignment();
    }

    return () => {
      stopAutoAssignment();
    };
  }, [enabled, currentOrganization?.id]);

  return {
    triggerAutoAssignment,
    startAutoAssignment,
    stopAutoAssignment,
    isProcessing: isProcessingRef.current
  };
};

// Hook for real-time order monitoring
export const useOrderRealTimeMonitoring = (onNewOrder?: (order: any) => void) => {
  const { currentOrganization } = useTenant();

  useEffect(() => {
    if (!currentOrganization?.id || !onNewOrder) return;

    // إعداد الاستماع للطلبيات الجديدة
    const channel = supabase
      .channel(`new-orders-${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'online_orders',
          filter: `organization_id=eq.${currentOrganization.id}`
        },
        (payload) => {
          onNewOrder?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id, onNewOrder]);
};

export default useOrderAutoAssignment;
