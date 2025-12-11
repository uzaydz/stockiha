/**
 * MultiEndpointPing.ts
 *
 * Verifies internet connectivity by pinging multiple endpoints.
 * Uses a "Smart Failover" strategy - tries primary fast endpoint first, then falls back to others.
 *
 * Features:
 * - Smart Failover: Google -> Cloudflare -> Apple -> etc.
 * - Captive portal detection via Apple's endpoint
 * - Lightweight requests (HEAD/204 responses)
 * - Configurable timeout
 */

import type { PingResult } from './ConnectivityTypes';

/**
 * Default ping endpoints - ordered by priority
 * 1. Google (Fastest global CDN)
 * 2. Cloudflare (Reliable fallback)
 * 3. Apple (Captive portal check)
 * 4. Mozilla (Community standard)
 */
const DEFAULT_PING_ENDPOINTS = [
  // Google 204 endpoints (0 bytes response body) - Primary
  'https://www.google.com/generate_204',

  // Cloudflare - Secondary (Reliable)
  'https://www.cloudflare.com/cdn-cgi/trace',

  // Apple captive portal check (returns specific HTML)
  'https://captive.apple.com/hotspot-detect.html',

  // Mozilla Detect Portal
  'http://detectportal.firefox.com/success.txt',
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
  failoverInterval?: number;
}

/**
 * MultiEndpointPingService
 *
 * Provides reliable internet connectivity verification through multiple endpoints.
 */
class MultiEndpointPingService {
  private endpoints: string[];
  private timeout: number;
  private failoverInterval: number;
  private lastResult: PingResult | null = null;
  private onPing: PingEventListener | null = null;
  private isPinging = false;

  constructor(options: MultiEndpointPingOptions = {}) {
    this.endpoints = options.endpoints || DEFAULT_PING_ENDPOINTS;
    this.timeout = options.timeout || 3000;
    this.failoverInterval = options.failoverInterval || 500;
    this.onPing = options.onPing || null;
  }

  /**
   * Ping using Smart Failover strategy.
   * Tries endpoints sequentially (or with slight overlap) to ensure accuracy.
   */
  async ping(): Promise<PingResult> {
    if (this.isPinging) {
      // Return cached result if already pinging
      return this.lastResult || { success: false, latency: null, endpoint: null, error: 'Already pinging' };
    }

    this.isPinging = true;
    const startTime = performance.now();

    try {
      // Try the first endpoint (Primary)
      try {
        const primaryResult = await this.pingEndpoint(this.endpoints[0], this.timeout);
        this.finishPing(primaryResult);
        return primaryResult;
      } catch (e) {
        // Primary failed, continue to fallbacks
        // console.log('[MultiEndpointPing] Primary endpoint failed, switching to failover...');
      }

      // Try remaining endpoints with failover logic
      for (let i = 1; i < this.endpoints.length; i++) {
        const endpoint = this.endpoints[i];
        try {
          // Add small delay between failovers to avoid network congestion if it's just a hiccup
          if (i > 1 && this.failoverInterval > 0) {
            await new Promise(resolve => setTimeout(resolve, this.failoverInterval));
          }

          const result = await this.pingEndpoint(endpoint, this.timeout);
          this.finishPing(result);
          return result;
        } catch (e) {
          // Continue to next endpoint
        }
      }

      // All endpoints failed
      const latency = Math.round(performance.now() - startTime);
      const result: PingResult = {
        success: false,
        latency,
        endpoint: null,
        error: 'All ping endpoints failed',
      };
      this.finishPing(result);
      return result;

    } catch (error) {
      // Unexpected error
      const result: PingResult = {
        success: false,
        latency: 0,
        endpoint: null,
        error: 'Unexpected ping error',
      };
      this.finishPing(result);
      return result;
    } finally {
      this.isPinging = false;
    }
  }

  private finishPing(result: PingResult) {
    this.lastResult = result;
    if (this.onPing) {
      this.onPing(result);
    }
  }

  /**
   * Ping a single endpoint with timeout
   */
  private async pingEndpoint(endpoint: string, timeoutVal: number): Promise<PingResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutVal);
    const startTime = performance.now();

    try {
      // Use different strategies based on endpoint
      const isAppleEndpoint = endpoint.includes('apple.com');
      const is204Endpoint = endpoint.includes('generate_204');

      // In Electron context, check if we can use no-cors safely
      const isElectron = typeof window !== 'undefined' && (
        (window as any).electronAPI ||
        navigator.userAgent.includes('Electron')
      );

      // Request options
      const options: RequestInit = {
        method: is204Endpoint ? 'HEAD' : 'GET',
        mode: 'cors', // Try CORS first
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
        },
      };

      // Special handling for 204 endpoints in Electron (to avoid CORS errors in console)
      // or known CORS-blocking endpoints
      if (isElectron && is204Endpoint) {
        options.mode = 'no-cors';
      }

      const response = await fetch(endpoint, options);

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      // Handle no-cors opaque response
      if (response.type === 'opaque') {
        return {
          success: true,
          latency,
          endpoint,
          isCaptivePortal: false,
        };
      }

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

      // For 204 endpoints, success status is enough
      if (is204Endpoint) {
        return {
          success: true,
          latency,
          endpoint,
          isCaptivePortal: false,
        };
      }

      // Standard success check
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

      // If CORS failed, try no-cors as a last resort fallback for simple reachability
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Retry with no-cors if not already tried
        // This is a minimal check just to see if we can reach the server
        try {
          await fetch(endpoint, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal // Re-use signal, might need new timeout if strict
          });
          // If we get here, it means we reached it but couldn't read logic
          return {
            success: true,
            latency: Math.round(performance.now() - startTime),
            endpoint,
            isCaptivePortal: false
          };
        } catch {
          // Ignore secondary failure
        }
      }

      const isAbort = error instanceof Error && error.name === 'AbortError';
      const msg = isAbort ? `Timeout after ${timeoutVal}ms` : (error instanceof Error ? error.message : 'Unknown error');
      throw new Error(msg);
    }
  }

  /**
   * Check Apple's response for captive portal
   */
  private async checkAppleCaptivePortal(response: Response): Promise<boolean> {
    try {
      const text = await response.text();
      const isSuccess = text.includes('Success') || text === APPLE_SUCCESS_RESPONSE;
      return !isSuccess;
    } catch {
      return false;
    }
  }

  /**
   * Quick connectivity check - alias for checks that might need less overhead
   * For v2, we reuse the smart ping but maybe with shorter timeout logic if needed later
   */
  async quickCheck(): Promise<boolean> {
    const result = await this.ping();
    return result.success;
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
        return { detected: true, url };
      }

      return { detected: false, url: null };
    } catch {
      clearTimeout(timeoutId);
      return { detected: false, url: null };
    }
  }

  getLastResult(): PingResult | null {
    return this.lastResult;
  }

  getIsPinging(): boolean {
    return this.isPinging;
  }

  setEndpoints(endpoints: string[]): void {
    this.endpoints = endpoints;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  setOnPing(listener: PingEventListener | null): void {
    this.onPing = listener;
  }

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
