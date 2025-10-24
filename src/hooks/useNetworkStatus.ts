import { useEffect, useState } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';

export function useNetworkStatus() {
  const [status, setStatus] = useState(() => networkStatusManager.getStatus());

  useEffect(() => {
    return networkStatusManager.subscribe(setStatus);
  }, []);

  return {
    isOnline: status.isOnline,
    lastOnlineChange: new Date(status.timestamp)
  };
}
