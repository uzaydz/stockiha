import React from 'react';
import { supabase } from '@/lib/supabase';

interface SubscriptionConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

interface UseSupabaseSubscriptionReturn {
  isConnected: boolean;
  error: string | null;
}

export const useSupabaseSubscription = (
  channelName: string,
  config: SubscriptionConfig,
  onUpdate: (payload: any) => void,
  enabled: boolean = true
): UseSupabaseSubscriptionReturn => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const isSupabaseReady = supabase && typeof supabase.from === 'function' && typeof supabase.channel === 'function';

    if (!isSupabaseReady) {
      setError('Supabase غير جاهز');
      return;
    }

    setError(null);

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter
          },
          (payload) => {
            try {
              onUpdate(payload);
            } catch (err) {
              console.error('Error in subscription callback:', err);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setError('خطأ في الاتصال بالقاعدة');
          }
        });

      return () => {
        channel.unsubscribe();
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Error setting up subscription:', err);
      setError(err instanceof Error ? err.message : 'خطأ في إعداد الاشتراك');
      setIsConnected(false);
    }
  }, [channelName, config.table, config.event, config.filter, config.schema, enabled, onUpdate]);

  return {
    isConnected,
    error
  };
};
