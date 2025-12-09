/**
 * ConnectivityTypes.ts
 *
 * Types and interfaces for the enhanced connectivity detection system
 */

// Connection quality levels (5 levels for better granularity)
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

// Source of the connectivity detection
export type ConnectivitySource = 'navigator' | 'ping' | 'electron' | 'network-info' | 'health-check';

// Network effective type from Network Information API
export type EffectiveConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | null;

// Network connection type from Network Information API
export type NetworkConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'wifi'
  | 'wimax'
  | 'other'
  | 'none'
  | 'unknown'
  | null;

/**
 * Network Information from Network Information API
 */
export interface NetworkInfo {
  // Effective connection type (4g, 3g, 2g, slow-2g)
  effectiveType: EffectiveConnectionType;

  // Downlink speed in Mbps
  downlink: number | null;

  // Round-trip time in milliseconds
  rtt: number | null;

  // User has requested reduced data usage
  saveData: boolean;

  // Connection type (wifi, cellular, ethernet, etc.)
  type: NetworkConnectionType;

  // Is Network Information API supported
  isSupported: boolean;
}

/**
 * Health check status and metrics
 */
export interface HealthCheckStatus {
  // Timestamp of last successful check
  lastSuccess: number | null;

  // Timestamp of last failed check
  lastFailure: number | null;

  // Number of consecutive failures
  consecutiveFailures: number;

  // Number of consecutive successes
  consecutiveSuccesses: number;

  // Average latency from recent samples (ms)
  averageLatency: number | null;

  // Last measured latency (ms)
  lastLatency: number | null;
}

/**
 * Captive portal detection status
 */
export interface CaptivePortalStatus {
  // Is a captive portal detected
  detected: boolean;

  // URL that triggered the detection
  checkUrl: string | null;

  // Timestamp of detection
  detectedAt: number | null;
}

/**
 * Ping result from multi-endpoint ping service
 */
export interface PingResult {
  // Was the ping successful
  success: boolean;

  // Measured latency in ms
  latency: number | null;

  // Which endpoint responded
  endpoint: string | null;

  // Error message if failed
  error?: string;

  // Was a captive portal detected
  isCaptivePortal?: boolean;
}

/**
 * Main connectivity state - the complete picture
 */
export interface ConnectivityState {
  // Basic online status
  isOnline: boolean;

  // Connection quality assessment
  quality: ConnectionQuality;

  // What determined the current status
  source: ConnectivitySource;

  // Network Information API data
  networkInfo: NetworkInfo;

  // Health check metrics
  healthCheck: HealthCheckStatus;

  // Captive portal status
  captivePortal: CaptivePortalStatus;

  // Timestamp of last state update
  lastUpdate: number;

  // Timestamp when internet was last verified (via actual request)
  lastVerifiedOnline: number | null;
}

/**
 * Configuration options for connectivity service
 */
export interface ConnectivityConfig {
  // === Ping Configuration ===

  // URLs to ping for connectivity check
  pingEndpoints: string[];

  // Timeout for ping requests (ms)
  pingTimeout: number;

  // Interval between pings when online (ms)
  pingIntervalOnline: number;

  // Interval between pings when offline (ms) - faster for quick recovery
  pingIntervalOffline: number;

  // === Health Check Configuration ===

  // Interval for deep health checks (ms)
  healthCheckInterval: number;

  // Timeout for health check requests (ms)
  healthCheckTimeout: number;

  // URL for health check (Supabase endpoint)
  healthCheckUrl?: string;

  // === Quality Thresholds ===

  // Latency threshold for "degraded" quality (ms)
  degradedLatencyThreshold: number;

  // Latency threshold for "poor" quality (ms)
  poorLatencyThreshold: number;

  // Number of failures before considering offline
  maxConsecutiveFailures: number;

  // === Backoff Configuration ===

  // Minimum backoff interval after failures (ms)
  minBackoffInterval: number;

  // Maximum backoff interval (ms)
  maxBackoffInterval: number;

  // === Feature Flags ===

  // Enable captive portal detection
  useCaptivePortalDetection: boolean;

  // Enable Network Information API usage
  useNetworkInfoAPI: boolean;

  // Enable Electron net module integration
  useElectronNet: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONNECTIVITY_CONFIG: ConnectivityConfig = {
  // Ping configuration
  pingEndpoints: [
    'https://www.google.com/generate_204',
    'https://connectivitycheck.gstatic.com/generate_204',
    'https://captive.apple.com/hotspot-detect.html',
    'https://www.cloudflare.com/favicon.ico',
  ],
  pingTimeout: 3000,
  pingIntervalOnline: 30000,    // 30 seconds when online
  pingIntervalOffline: 5000,    // 5 seconds when offline (user choice)

  // Health check configuration
  healthCheckInterval: 60000,   // 60 seconds
  healthCheckTimeout: 5000,

  // Quality thresholds
  degradedLatencyThreshold: 1200,  // 1.2 seconds
  poorLatencyThreshold: 3000,      // 3 seconds
  maxConsecutiveFailures: 3,

  // Backoff configuration
  minBackoffInterval: 5000,
  maxBackoffInterval: 180000,

  // Feature flags
  useCaptivePortalDetection: true,  // User enabled
  useNetworkInfoAPI: true,
  useElectronNet: true,
};

/**
 * Create initial connectivity state
 */
export function createInitialConnectivityState(): ConnectivityState {
  return {
    isOnline: false,  // Start pessimistic until verified
    quality: 'offline',
    source: 'navigator',
    networkInfo: {
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false,
      type: null,
      isSupported: false,
    },
    healthCheck: {
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      averageLatency: null,
      lastLatency: null,
    },
    captivePortal: {
      detected: false,
      checkUrl: null,
      detectedAt: null,
    },
    lastUpdate: Date.now(),
    lastVerifiedOnline: null,
  };
}

/**
 * Calculate connection quality from various inputs
 */
export function calculateConnectionQuality(
  isOnline: boolean,
  latency: number | null,
  effectiveType: EffectiveConnectionType,
  config: ConnectivityConfig = DEFAULT_CONNECTIVITY_CONFIG
): ConnectionQuality {
  if (!isOnline) {
    return 'offline';
  }

  // Use Network Info API effective type as primary indicator
  if (effectiveType === 'slow-2g') {
    return 'poor';
  }
  if (effectiveType === '2g') {
    return 'fair';
  }

  // Use latency as secondary indicator
  if (latency !== null) {
    if (latency < 100) {
      return 'excellent';
    }
    if (latency < config.degradedLatencyThreshold) {
      return 'good';
    }
    if (latency < config.poorLatencyThreshold) {
      return 'fair';
    }
    return 'poor';
  }

  // Fall back to effective type
  if (effectiveType === '4g') {
    return 'excellent';
  }
  if (effectiveType === '3g') {
    return 'good';
  }

  // Default to good if online but no quality info
  return 'good';
}

// Type for connectivity state listener callback
export type ConnectivityStateListener = (state: ConnectivityState) => void;
