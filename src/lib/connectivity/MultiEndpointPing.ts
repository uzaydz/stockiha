/**
 * MultiEndpointPing.ts
 *
 * Verifies internet connectivity by pinging multiple endpoints.
 * Uses a race strategy - first successful response wins.
 *
 * Features:
 * - Multiple fallback endpoints (Google, Apple, Cloudflare)
 * - Captive portal detection via Apple's endpoint
 * - Lightweight requests (HEAD/204 responses)
 * - Configurable timeout
 */

import type { PingResult } from './ConnectivityTypes';

/**
 * Default ping endpoints - ordered by reliability
 * ✅ تم إزالة endpoints التي تسبب أخطاء CORS:
 *    - cloudflare.com/favicon.ico (CORS blocked)
 *    - msftconnecttest.com (SSL certificate issues)
 */
const DEFAULT_PING_ENDPOINTS = [
  // Google 204 endpoints (0 bytes response body) - الأفضل للـ connectivity check
  'https://www.google.com/generate_204',
  'https://connectivitycheck.gstatic.com/generate_204',
  'https://clients3.google.com/generate_204',

  // Apple captive portal check (returns specific HTML)
  'https://captive.apple.com/hotspot-detect.html',
];

/**
 * Expected response from Apple's captive portal check
 */
const APPLE_SUCCESS_RESPONSE = '<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>';

/**
 * Callback for ping events
 */
type PingEventListener = (result: PingResult) => void;

/**
 * Options for MultiEndpointPing
 */
interface MultiEndpointPingOptions {
  endpoints?: string[];
  timeout?: number;
  onPing?: PingEventListener;
}

/**
 * MultiEndpointPingService
 *
 * Provides reliable internet connectivity verification through multiple endpoints.
 */
class MultiEndpointPingService {
  private endpoints: string[];
  private timeout: number;
  private lastResult: PingResult | null = null;
  private onPing: PingEventListener | null = null;
  private isPinging = false;

  constructor(options: MultiEndpointPingOptions = {}) {
    this.endpoints = options.endpoints || DEFAULT_PING_ENDPOINTS;
    this.timeout = options.timeout || 3000;
    this.onPing = options.onPing || null;
  }

  /**
   * Ping multiple endpoints and return first successful result.
   * Uses Promise.any for race condition - first success wins.
   */
  async ping(): Promise<PingResult> {
    if (this.isPinging) {
      // Return cached result if already pinging
      return this.lastResult || { success: false, latency: null, endpoint: null, error: 'Already pinging' };
    }

    this.isPinging = true;
    const startTime = performance.now();

    try {
      // Create promises for all endpoints
      const promises = this.endpoints.map((endpoint) =>
        this.pingEndpoint(endpoint)
      );

      // Race all endpoints - first successful response wins
      const result = await Promise.any(promises);
      this.lastResult = result;

      // Notify listener
      if (this.onPing) {
        this.onPing(result);
      }

      return result;
    } catch (aggregateError) {
      // All endpoints failed
      const latency = Math.round(performance.now() - startTime);
      const result: PingResult = {
        success: false,
        latency,
        endpoint: null,
        error: 'All ping endpoints failed',
      };
      this.lastResult = result;

      // Notify listener
      if (this.onPing) {
        this.onPing(result);
      }

      return result;
    } finally {
      this.isPinging = false;
    }
  }

  /**
   * Ping a single endpoint with timeout
   */
  private async pingEndpoint(endpoint: string): Promise<PingResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = performance.now();

    try {
      // Use different strategies based on endpoint
      const isAppleEndpoint = endpoint.includes('apple.com');
      const is204Endpoint = endpoint.includes('generate_204');

      // في Electron/Desktop، استخدم no-cors مباشرة لتجنب أخطاء CORS في الـ console
      const isElectron = typeof window !== 'undefined' && (
        (window as any).electronAPI ||
        navigator.userAgent.includes('Electron')
      );

      // استخدم no-cors للـ 204 endpoints لتجنب أخطاء CORS
      if (isElectron && is204Endpoint) {
        return await this.pingNoCors(endpoint);
      }

      const response = await fetch(endpoint, {
        method: is204Endpoint ? 'HEAD' : 'GET',
        mode: 'cors', // Try CORS first for proper response
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
        },
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      // Check for captive portal on Apple's endpoint
      if (isAppleEndpoint && response.ok) {
        const isCaptivePortal = await this.checkAppleCaptivePortal(response);
        if (isCaptivePortal) {
          return {
            success: false,
            latency,
            endpoint,
            isCaptivePortal: true,
            error: 'Captive portal detected',
          };
        }
      }

      // For 204 endpoints, any response is success
      if (is204Endpoint) {
        return {
          success: true,
          latency,
          endpoint,
          isCaptivePortal: false,
        };
      }

      // For other endpoints, check status code
      if (response.ok || response.status < 500) {
        return {
          success: true,
          latency,
          endpoint,
          isCaptivePortal: false,
        };
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      // Check if it's an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout after ${this.timeout}ms`);
      }

      // For CORS errors, try no-cors mode
      // In no-cors mode, we can't read the response but we know the server responded
      try {
        const noCorsResponse = await this.pingNoCors(endpoint);
        if (noCorsResponse.success) {
          return noCorsResponse;
        }
      } catch {
        // no-cors also failed
      }

      throw error;
    }
  }

  /**
   * Ping with no-cors mode (opaque response)
   * Can't read response but confirms server is reachable
   */
  private async pingNoCors(endpoint: string): Promise<PingResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = performance.now();

    try {
      await fetch(endpoint, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      // If we get here without error, the server responded (opaque response)
      return {
        success: true,
        latency,
        endpoint,
        isCaptivePortal: false,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`no-cors failed: ${errorMsg}`);
    }
  }

  /**
   * Check Apple's response for captive portal
   */
  private async checkAppleCaptivePortal(response: Response): Promise<boolean> {
    try {
      const text = await response.text();
      // Apple returns specific HTML for success
      // Any different response indicates captive portal
      const isSuccess = text.includes('Success') || text === APPLE_SUCCESS_RESPONSE;
      return !isSuccess;
    } catch {
      // If we can't read the response, assume no captive portal
      return false;
    }
  }

  /**
   * Quick connectivity check - single fast endpoint
   * Use this for rapid checks (e.g., after online event)
   */
  async quickCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }

  /**
   * Check specifically for captive portal
   */
  async checkCaptivePortal(): Promise<{ detected: boolean; url: string | null }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const url = 'https://captive.apple.com/hotspot-detect.html';

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { detected: false, url: null };
      }

      const text = await response.text();
      const isSuccess = text.includes('Success');

      if (!isSuccess) {
        // Captive portal detected - the response was redirected/modified
        return { detected: true, url };
      }

      return { detected: false, url: null };
    } catch {
      clearTimeout(timeoutId);
      // Network error - can't determine, assume no captive portal
      return { detected: false, url: null };
    }
  }

  /**
   * Get last ping result
   */
  getLastResult(): PingResult | null {
    return this.lastResult;
  }

  /**
   * Check if currently pinging
   */
  getIsPinging(): boolean {
    return this.isPinging;
  }

  /**
   * Configure endpoints
   */
  setEndpoints(endpoints: string[]): void {
    this.endpoints = endpoints;
  }

  /**
   * Configure timeout
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Set ping event listener
   */
  setOnPing(listener: PingEventListener | null): void {
    this.onPing = listener;
  }

  /**
   * Get current configuration
   */
  getConfig(): { endpoints: string[]; timeout: number } {
    return {
      endpoints: [...this.endpoints],
      timeout: this.timeout,
    };
  }
}

// Export singleton instance
export const multiEndpointPing = new MultiEndpointPingService();

// Export class for custom instances
export { MultiEndpointPingService };

// Export types
export type { PingEventListener, MultiEndpointPingOptions };
