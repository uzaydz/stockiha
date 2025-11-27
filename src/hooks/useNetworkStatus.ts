import { useEffect, useState } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';
import { connectionState } from '@/lib/sync/delta/ConnectionState';

interface NetworkStatusResult {
  isOnline: boolean;
  lastOnlineChange: Date;
  /** 🆕 عدد الفشل المتتالي */
  consecutiveFailures: number;
  /** 🆕 حالة الاتصال التفصيلية */
  connectionStatus: 'online' | 'offline' | 'unstable';
}

/**
 * ⚡ Hook محسّن لحالة الشبكة
 * 
 * يستخدم ConnectionState كمصدر أساسي للحقيقة
 */
export function useNetworkStatus(): NetworkStatusResult {
  const [status, setStatus] = useState(() => networkStatusManager.getStatus());
  const [connectionInfo, setConnectionInfo] = useState(() => connectionState.getState());

  useEffect(() => {
    const unsubscribeNetwork = networkStatusManager.subscribe(setStatus);
    const unsubscribeConnection = connectionState.subscribe(setConnectionInfo);
    
    return () => {
      unsubscribeNetwork();
      unsubscribeConnection();
    };
  }, []);

  // تحديد حالة الاتصال التفصيلية
  const getConnectionStatus = (): 'online' | 'offline' | 'unstable' => {
    if (!connectionInfo.isOnline) return 'offline';
    if (connectionInfo.consecutiveFailures > 0) return 'unstable';
    return 'online';
  };

  return {
    isOnline: connectionInfo.isOnline,
    lastOnlineChange: new Date(status.timestamp),
    consecutiveFailures: connectionInfo.consecutiveFailures,
    connectionStatus: getConnectionStatus()
  };
}
