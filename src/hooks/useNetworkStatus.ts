/**
 * useNetworkStatus.ts (Enhanced v2.0)
 *
 * React hook for comprehensive network status monitoring.
 * Provides connection status, quality, and network information.
 */

import { useEffect, useState, useCallback } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';
import {
  connectivityService,
  type ConnectivityLevel,
} from '@/lib/connectivity/ConnectivityService';
import type {
  ConnectivityState,
  ConnectionQuality,
  EffectiveConnectionType,
} from '@/lib/connectivity/ConnectivityTypes';

/**
 * Result interface for useNetworkStatus hook
 */
export interface NetworkStatusResult {
  /** Is the device online */
  isOnline: boolean;

  /** Connection quality level */
  quality: ConnectionQuality;

  /** Timestamp of last online change */
  lastOnlineChange: Date;

  /** Number of consecutive connection failures */
  consecutiveFailures: number;

  /** Detailed connection status */
  connectionStatus: 'online' | 'offline' | 'unstable' | 'captive-portal';

  /** Average latency in milliseconds */
  averageLatency: number | null;

  /** Last verified online timestamp */
  lastVerified: Date | null;

  /** Network effective type from Network Information API */
  effectiveType: EffectiveConnectionType;

  /** Is data saver enabled */
  isSaveData: boolean;

  /** Is a captive portal detected */
  isCaptivePortal: boolean;

  /** Force connectivity check */
  forceCheck: () => Promise<void>;

  /** Full connectivity state (for advanced use) */
  state: ConnectivityState;
}

/**
 * Hook for comprehensive network status monitoring
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isOnline,
 *     quality,
 *     consecutiveFailures,
 *     isCaptivePortal,
 *     forceCheck,
 *   } = useNetworkStatus();
 *
 *   if (!isOnline) {
 *     return <OfflineMessage />;
 *   }
 *
 *   if (isCaptivePortal) {
 *     return <CaptivePortalWarning />;
 *   }
 *
 *   return <OnlineContent quality={quality} />;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatusResult {
  const [state, setState] = useState<ConnectivityState>(
    connectivityService.getState()
  );
  const [lastOnlineChange, setLastOnlineChange] = useState<Date>(
    new Date(state.lastUpdate)
  );

  useEffect(() => {
    let prevOnline = state.isOnline;

    // Subscribe to connectivity state changes
    const unsubscribeConnectivity = connectivityService.subscribe((newState) => {
      setState(newState);

      // Track online/offline transitions
      if (newState.isOnline !== prevOnline) {
        setLastOnlineChange(new Date());
        prevOnline = newState.isOnline;
      }
    });

    // Also subscribe to legacy networkStatusManager for backward compatibility
    const unsubscribeNetwork = networkStatusManager.subscribe((status) => {
      // Update lastOnlineChange if status changed
      if (status.isOnline !== prevOnline) {
        setLastOnlineChange(new Date(status.timestamp));
        prevOnline = status.isOnline;
      }
    });

    return () => {
      unsubscribeConnectivity();
      unsubscribeNetwork();
    };
  }, []);

  // Force check function
  const forceCheck = useCallback(async () => {
    await connectivityService.forceCheck();
  }, []);

  // Determine connection status
  const getConnectionStatus = (): 'online' | 'offline' | 'unstable' | 'captive-portal' => {
    if (state.captivePortal.detected) {
      return 'captive-portal';
    }
    if (!state.isOnline) {
      return 'offline';
    }
    // Consider unstable if recent failures or poor quality
    if (
      state.healthCheck.consecutiveFailures > 0 ||
      state.quality === 'poor'
    ) {
      return 'unstable';
    }
    return 'online';
  };

  return {
    isOnline: state.isOnline,
    quality: state.quality,
    lastOnlineChange,
    consecutiveFailures: state.healthCheck.consecutiveFailures,
    connectionStatus: getConnectionStatus(),
    averageLatency: state.healthCheck.averageLatency,
    lastVerified: state.lastVerifiedOnline
      ? new Date(state.lastVerifiedOnline)
      : null,
    effectiveType: state.networkInfo.effectiveType,
    isSaveData: state.networkInfo.saveData,
    isCaptivePortal: state.captivePortal.detected,
    forceCheck,
    state,
  };
}

/**
 * Simple hook that returns just the online status
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(connectivityService.isOnline());

  useEffect(() => {
    return connectivityService.subscribe((state) => {
      setIsOnline(state.isOnline);
    });
  }, []);

  return isOnline;
}

/**
 * Hook that returns the connection quality
 */
export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState(connectivityService.getQuality());

  useEffect(() => {
    return connectivityService.subscribe((state) => {
      setQuality(state.quality);
    });
  }, []);

  return quality;
}

/**
 * Hook that triggers a callback when connection is restored
 */
export function useOnConnectionRestored(callback: () => void): void {
  useEffect(() => {
    let wasOffline = !connectivityService.isOnline();

    return connectivityService.subscribe((state) => {
      if (wasOffline && state.isOnline) {
        callback();
      }
      wasOffline = !state.isOnline;
    });
  }, [callback]);
}

/**
 * Hook that triggers a callback when connection is lost
 */
export function useOnConnectionLost(callback: () => void): void {
  useEffect(() => {
    let wasOnline = connectivityService.isOnline();

    return connectivityService.subscribe((state) => {
      if (wasOnline && !state.isOnline) {
        callback();
      }
      wasOnline = state.isOnline;
    });
  }, [callback]);
}

// Re-export types for convenience
export type { ConnectivityLevel, ConnectionQuality };

export default useNetworkStatus;
