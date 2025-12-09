/**
 * Connectivity Module Index
 *
 * Central export point for all connectivity-related services, types, and utilities.
 * This module provides comprehensive network status detection including:
 * - Multi-layer connectivity checking (browser, ping, Electron)
 * - Network quality assessment via Network Information API
 * - Captive portal detection
 * - Connection quality indicators
 *
 * @module connectivity
 * @version 2.0.0
 */

// ============================================================================
// Types
// ============================================================================

export type {
  ConnectionQuality,
  EffectiveConnectionType,
  NetworkInfo,
  HealthCheckStatus,
  CaptivePortalStatus,
  PingResult,
  ConnectivityConfig,
  ConnectivityState,
  ConnectivityListener,
} from './ConnectivityTypes';

export {
  DEFAULT_CONNECTIVITY_CONFIG,
  createInitialConnectivityState,
  calculateConnectionQuality,
} from './ConnectivityTypes';

// ============================================================================
// Services
// ============================================================================

// Main Connectivity Service
export {
  connectivityService,
  ConnectivityService,
  type ConnectivityLevel,
} from './ConnectivityService';

// Network Quality Service (Network Information API)
export {
  networkQualityService,
  NetworkQualityService,
  type NetworkQualityListener,
} from './NetworkQuality';

// Multi-Endpoint Ping Service
export {
  multiEndpointPing,
  MultiEndpointPingService,
  DEFAULT_PING_ENDPOINTS,
  type PingEndpoint,
  type MultiPingResult,
} from './MultiEndpointPing';

// Captive Portal Detector
export {
  captivePortalDetector,
  CaptivePortalDetectorService,
  type CaptivePortalListener,
} from './CaptivePortalDetector';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick check if device is online (browser API)
 * Note: This is unreliable - use connectivityService.isOnline() for accurate results
 */
export function isNavigatorOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Check if Network Information API is supported
 */
export function isNetworkInfoSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as any;
  return !!(nav.connection || nav.mozConnection || nav.webkitConnection);
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return !!(
    win.electronAPI ||
    win.__ELECTRON__ ||
    win.electron?.isElectron ||
    (typeof process !== 'undefined' && process.versions?.electron)
  );
}

/**
 * Get a human-readable connection quality description
 */
export function getQualityDescription(
  quality: import('./ConnectivityTypes').ConnectionQuality,
  locale: 'en' | 'ar' = 'ar'
): string {
  const descriptions = {
    excellent: { en: 'Excellent connection', ar: 'اتصال ممتاز' },
    good: { en: 'Good connection', ar: 'اتصال جيد' },
    fair: { en: 'Fair connection', ar: 'اتصال متوسط' },
    poor: { en: 'Poor connection', ar: 'اتصال ضعيف' },
    offline: { en: 'No connection', ar: 'لا يوجد اتصال' },
  };

  return descriptions[quality]?.[locale] || descriptions.offline[locale];
}

/**
 * Get quality color for UI
 */
export function getQualityColor(
  quality: import('./ConnectivityTypes').ConnectionQuality
): string {
  const colors = {
    excellent: '#22c55e', // green-500
    good: '#3b82f6',      // blue-500
    fair: '#eab308',      // yellow-500
    poor: '#f97316',      // orange-500
    offline: '#ef4444',   // red-500
  };

  return colors[quality] || colors.offline;
}

/**
 * Get quality Tailwind class
 */
export function getQualityTailwindColor(
  quality: import('./ConnectivityTypes').ConnectionQuality
): string {
  const classes = {
    excellent: 'text-emerald-500',
    good: 'text-blue-500',
    fair: 'text-amber-500',
    poor: 'text-orange-500',
    offline: 'text-red-500',
  };

  return classes[quality] || classes.offline;
}

// ============================================================================
// Default Export
// ============================================================================

export default connectivityService;
