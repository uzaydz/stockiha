/**
 * useNetworkQuality.ts
 *
 * React hook for accessing Network Information API data.
 * Provides real-time network quality metrics.
 */

import { useEffect, useState, useMemo } from 'react';
import {
  networkQualityService,
  type NetworkQualityListener,
} from '@/lib/connectivity/NetworkQuality';
import type {
  NetworkInfo,
  ConnectionQuality,
} from '@/lib/connectivity/ConnectivityTypes';

/**
 * Return type for useNetworkQuality hook
 */
export interface NetworkQualityHookResult extends NetworkInfo {
  /** Is the connection slow (2G or slow-2G) */
  isSlowConnection: boolean;

  /** Is the connection fast (4G) */
  isFastConnection: boolean;

  /** Estimated quality level */
  estimatedQuality: ConnectionQuality | 'unknown';

  /** Human-readable description */
  description: string;

  /** Recommended settings based on connection */
  recommendedSettings: {
    loadImages: boolean;
    imageQuality: 'high' | 'medium' | 'low';
    prefetch: boolean;
    animations: boolean;
  };
}

/**
 * Hook for accessing Network Information API data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     effectiveType,
 *     isSlowConnection,
 *     estimatedQuality,
 *   } = useNetworkQuality();
 *
 *   if (isSlowConnection) {
 *     return <LowQualityContent />;
 *   }
 *
 *   return <HighQualityContent />;
 * }
 * ```
 */
export function useNetworkQuality(): NetworkQualityHookResult {
  const [info, setInfo] = useState<NetworkInfo>(networkQualityService.getInfo());

  useEffect(() => {
    // Subscribe to network quality changes
    const unsubscribe = networkQualityService.subscribe((newInfo: NetworkInfo) => {
      setInfo(newInfo);
    });

    return unsubscribe;
  }, []);

  // Computed values
  const isSlowConnection = useMemo(
    () => networkQualityService.isConnectionSlow(),
    [info.effectiveType]
  );

  const isFastConnection = useMemo(
    () => networkQualityService.isConnectionFast(),
    [info.effectiveType]
  );

  const estimatedQuality = useMemo(
    () => networkQualityService.estimateQuality(),
    [info.effectiveType, info.downlink, info.rtt]
  );

  const description = useMemo(
    () => networkQualityService.getConnectionDescription(),
    [info]
  );

  const recommendedSettings = useMemo(
    () => networkQualityService.getRecommendedSettings(),
    [info.effectiveType, info.saveData]
  );

  return {
    ...info,
    isSlowConnection,
    isFastConnection,
    estimatedQuality,
    description,
    recommendedSettings,
  };
}

/**
 * Hook that returns true if connection is slow
 * Simpler version for basic use cases
 */
export function useIsSlowConnection(): boolean {
  const [isSlowConnection, setIsSlowConnection] = useState(
    networkQualityService.isConnectionSlow()
  );

  useEffect(() => {
    const unsubscribe = networkQualityService.subscribe(() => {
      setIsSlowConnection(networkQualityService.isConnectionSlow());
    });

    return unsubscribe;
  }, []);

  return isSlowConnection;
}

/**
 * Hook that returns true if data saver is enabled
 */
export function useDataSaver(): boolean {
  const [saveData, setSaveData] = useState(
    networkQualityService.isDataSaverEnabled()
  );

  useEffect(() => {
    const unsubscribe = networkQualityService.subscribe((info: NetworkInfo) => {
      setSaveData(info.saveData);
    });

    return unsubscribe;
  }, []);

  return saveData;
}

/**
 * Hook for adaptive content loading based on network quality
 */
export function useAdaptiveContent<T>(options: {
  highQuality: T;
  mediumQuality: T;
  lowQuality: T;
  offline?: T;
}): T {
  const { estimatedQuality, isSupported } = useNetworkQuality();

  if (!isSupported) {
    // If Network Information API not supported, return medium quality
    return options.mediumQuality;
  }

  switch (estimatedQuality) {
    case 'excellent':
    case 'good':
      return options.highQuality;
    case 'fair':
      return options.mediumQuality;
    case 'poor':
      return options.lowQuality;
    case 'offline':
      return options.offline ?? options.lowQuality;
    default:
      return options.mediumQuality;
  }
}

export default useNetworkQuality;
