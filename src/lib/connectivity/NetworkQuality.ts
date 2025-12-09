/**
 * NetworkQuality.ts
 *
 * Wrapper for the Network Information API
 * Provides connection quality metrics like effectiveType, downlink, rtt
 *
 * Browser Support:
 * - Chrome/Edge: Full support
 * - Firefox: No support (partial via polyfill)
 * - Safari: No support
 */

import type {
  NetworkInfo,
  EffectiveConnectionType,
  NetworkConnectionType,
  ConnectionQuality,
} from './ConnectivityTypes';

/**
 * Extended Navigator interface with Network Information API
 */
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

/**
 * NetworkInformation interface from the API
 */
interface NetworkConnection extends EventTarget {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  onchange?: EventListener | null;
}

/**
 * Callback type for network quality changes
 */
type NetworkQualityListener = (info: NetworkInfo) => void;

/**
 * NetworkQualityService
 *
 * Provides:
 * - Real-time network quality information
 * - Connection type detection (wifi, cellular, etc.)
 * - Effective connection type (4g, 3g, 2g, slow-2g)
 * - Data saver mode detection
 * - Quality estimation
 */
class NetworkQualityService {
  private connection: NetworkConnection | null = null;
  private listeners = new Set<NetworkQualityListener>();
  private cachedInfo: NetworkInfo | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the service and attach to Network Information API
   */
  private init(): void {
    if (typeof navigator === 'undefined') {
      this.isInitialized = true;
      return;
    }

    const nav = navigator as NavigatorWithConnection;

    // Try different prefixes for browser compatibility
    this.connection =
      nav.connection || nav.mozConnection || nav.webkitConnection || null;

    if (this.connection) {
      // Listen for connection changes
      this.connection.addEventListener('change', this.handleChange);
      console.log(
        '[NetworkQuality] Network Information API supported. EffectiveType:',
        this.connection.effectiveType
      );
    } else {
      console.log('[NetworkQuality] Network Information API not supported');
    }

    this.isInitialized = true;
    // Cache initial info
    this.cachedInfo = this.getInfo();
  }

  /**
   * Handle network connection changes
   */
  private handleChange = (): void => {
    const info = this.getInfo();
    this.cachedInfo = info;

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(info);
      } catch (error) {
        console.warn('[NetworkQuality] Listener error:', error);
      }
    }

    console.log('[NetworkQuality] Connection changed:', info);
  };

  /**
   * Get current network information
   */
  getInfo(): NetworkInfo {
    if (!this.connection) {
      return {
        effectiveType: null,
        downlink: null,
        rtt: null,
        saveData: false,
        type: null,
        isSupported: false,
      };
    }

    return {
      effectiveType: (this.connection.effectiveType as EffectiveConnectionType) || null,
      downlink: this.connection.downlink ?? null,
      rtt: this.connection.rtt ?? null,
      saveData: this.connection.saveData || false,
      type: (this.connection.type as NetworkConnectionType) || null,
      isSupported: true,
    };
  }

  /**
   * Get cached info (faster, no recalculation)
   */
  getCachedInfo(): NetworkInfo {
    return this.cachedInfo || this.getInfo();
  }

  /**
   * Subscribe to network quality changes
   */
  subscribe(callback: NetworkQualityListener): () => void {
    this.listeners.add(callback);

    // Emit current state immediately
    callback(this.getInfo());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if current connection is slow (2G or slow-2G)
   */
  isConnectionSlow(): boolean {
    const info = this.getInfo();
    if (!info.isSupported) return false;
    return info.effectiveType === 'slow-2g' || info.effectiveType === '2g';
  }

  /**
   * Check if current connection is fast (4G)
   */
  isConnectionFast(): boolean {
    const info = this.getInfo();
    if (!info.isSupported) return false;
    return info.effectiveType === '4g';
  }

  /**
   * Check if user has data saver enabled
   */
  isDataSaverEnabled(): boolean {
    return this.getInfo().saveData;
  }

  /**
   * Estimate connection quality based on Network Information API
   *
   * Returns: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
   */
  estimateQuality(): ConnectionQuality | 'unknown' {
    const info = this.getInfo();

    if (!info.isSupported) {
      return 'unknown';
    }

    // Based on effective type
    switch (info.effectiveType) {
      case '4g':
        // Further refine based on RTT if available
        if (info.rtt !== null && info.rtt < 100) {
          return 'excellent';
        }
        return 'good';

      case '3g':
        return 'fair';

      case '2g':
      case 'slow-2g':
        return 'poor';

      default:
        // Fallback to downlink/rtt if available
        if (info.downlink !== null && info.rtt !== null) {
          if (info.downlink >= 10 && info.rtt < 100) return 'excellent';
          if (info.downlink >= 1.5 && info.rtt < 300) return 'good';
          if (info.downlink >= 0.5 && info.rtt < 600) return 'fair';
          return 'poor';
        }
        return 'unknown';
    }
  }

  /**
   * Get human-readable connection description
   */
  getConnectionDescription(): string {
    const info = this.getInfo();

    if (!info.isSupported) {
      return 'Network information not available';
    }

    const parts: string[] = [];

    // Connection type
    if (info.type) {
      parts.push(`Type: ${info.type}`);
    }

    // Effective type
    if (info.effectiveType) {
      parts.push(`Speed: ${info.effectiveType.toUpperCase()}`);
    }

    // Downlink
    if (info.downlink !== null) {
      parts.push(`Download: ${info.downlink.toFixed(1)} Mbps`);
    }

    // RTT
    if (info.rtt !== null) {
      parts.push(`Latency: ${info.rtt}ms`);
    }

    // Data saver
    if (info.saveData) {
      parts.push('Data Saver: On');
    }

    return parts.join(' | ') || 'No connection info';
  }

  /**
   * Get recommended quality settings based on connection
   *
   * Useful for adaptive content loading
   */
  getRecommendedSettings(): {
    loadImages: boolean;
    imageQuality: 'high' | 'medium' | 'low';
    prefetch: boolean;
    animations: boolean;
  } {
    const quality = this.estimateQuality();
    const info = this.getInfo();

    // Respect data saver preference
    if (info.saveData) {
      return {
        loadImages: false,
        imageQuality: 'low',
        prefetch: false,
        animations: false,
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          loadImages: true,
          imageQuality: 'high',
          prefetch: true,
          animations: true,
        };

      case 'good':
        return {
          loadImages: true,
          imageQuality: 'medium',
          prefetch: true,
          animations: true,
        };

      case 'fair':
        return {
          loadImages: true,
          imageQuality: 'low',
          prefetch: false,
          animations: true,
        };

      case 'poor':
        return {
          loadImages: false,
          imageQuality: 'low',
          prefetch: false,
          animations: false,
        };

      default:
        // Unknown - use moderate settings
        return {
          loadImages: true,
          imageQuality: 'medium',
          prefetch: false,
          animations: true,
        };
    }
  }

  /**
   * Check if Network Information API is supported
   */
  isSupported(): boolean {
    return this.connection !== null;
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.connection) {
      this.connection.removeEventListener('change', this.handleChange);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkQualityService = new NetworkQualityService();

// Export class for testing
export { NetworkQualityService };

// Export type
export type { NetworkQualityListener };
