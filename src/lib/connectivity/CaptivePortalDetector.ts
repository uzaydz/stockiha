/**
 * CaptivePortalDetector.ts
 *
 * Detects captive portals (login pages for hotels, airports, cafes).
 *
 * Strategy:
 * 1. Fetch Apple's captive portal check URL
 * 2. Compare response to expected "Success" HTML
 * 3. Any different response = captive portal detected
 *
 * This is the same method used by iOS/macOS for captive portal detection.
 */

import type { CaptivePortalStatus } from './ConnectivityTypes';

/**
 * Apple's captive portal check URL
 * Returns specific HTML when internet is available
 */
const APPLE_CAPTIVE_URL = 'https://captive.apple.com/hotspot-detect.html';

/**
 * Google's captive portal check URL (returns 204)
 */
const GOOGLE_CAPTIVE_URL = 'https://www.google.com/generate_204';

/**
 * Microsoft's captive portal check URL
 */
const MICROSOFT_CAPTIVE_URL = 'https://www.msftconnecttest.com/connecttest.txt';

/**
 * Expected response from Apple
 */
const APPLE_SUCCESS_BODY = 'Success';

/**
 * Expected response from Microsoft
 */
const MICROSOFT_SUCCESS_BODY = 'Microsoft Connect Test';

/**
 * Callback for captive portal detection
 */
type CaptivePortalListener = (status: CaptivePortalStatus) => void;

/**
 * CaptivePortalDetector
 *
 * Provides captive portal detection using multiple providers
 */
class CaptivePortalDetectorService {
  private lastStatus: CaptivePortalStatus = {
    detected: false,
    checkUrl: null,
    detectedAt: null,
  };
  private listeners = new Set<CaptivePortalListener>();
  private checkInterval: number | null = null;
  private isChecking = false;

  /**
   * Check for captive portal using Apple's endpoint
   * This is the most reliable method
   */
  async checkApple(): Promise<CaptivePortalStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(APPLE_CAPTIVE_URL, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Accept': 'text/html',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Can't determine - network error or blocked
        return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
      }

      const text = await response.text();
      const isSuccess = text.includes(APPLE_SUCCESS_BODY);

      if (!isSuccess) {
        // Response was modified - captive portal detected!
        return this.updateStatus({
          detected: true,
          checkUrl: APPLE_CAPTIVE_URL,
          detectedAt: Date.now(),
        });
      }

      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    } catch (error) {
      clearTimeout(timeoutId);
      // Network error - can't determine
      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    }
  }

  /**
   * Check for captive portal using Google's 204 endpoint
   * Falls back if Apple is blocked
   */
  async checkGoogle(): Promise<CaptivePortalStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(GOOGLE_CAPTIVE_URL, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Google should return 204 No Content
      if (response.status === 204) {
        return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
      }

      // Any other status (especially 200 with body) indicates captive portal
      if (response.status === 200) {
        // Check if response has content (captive portal page)
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 0) {
          return this.updateStatus({
            detected: true,
            checkUrl: GOOGLE_CAPTIVE_URL,
            detectedAt: Date.now(),
          });
        }
      }

      // Redirects also indicate captive portal
      if (response.redirected) {
        return this.updateStatus({
          detected: true,
          checkUrl: response.url, // The redirect URL
          detectedAt: Date.now(),
        });
      }

      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    } catch (error) {
      clearTimeout(timeoutId);
      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    }
  }

  /**
   * Check for captive portal using Microsoft's endpoint
   * Another fallback option
   */
  async checkMicrosoft(): Promise<CaptivePortalStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(MICROSOFT_CAPTIVE_URL, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
      }

      const text = await response.text();
      const isSuccess = text.includes(MICROSOFT_SUCCESS_BODY);

      if (!isSuccess) {
        return this.updateStatus({
          detected: true,
          checkUrl: MICROSOFT_CAPTIVE_URL,
          detectedAt: Date.now(),
        });
      }

      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    } catch (error) {
      clearTimeout(timeoutId);
      return this.updateStatus({ detected: false, checkUrl: null, detectedAt: null });
    }
  }

  /**
   * Comprehensive check using multiple providers
   * Returns true as soon as any provider detects a captive portal
   */
  async check(): Promise<CaptivePortalStatus> {
    if (this.isChecking) {
      return this.lastStatus;
    }

    this.isChecking = true;

    try {
      // Try Apple first (most reliable)
      const appleResult = await this.checkApple();
      if (appleResult.detected) {
        return appleResult;
      }

      // If Apple didn't detect, try Google
      const googleResult = await this.checkGoogle();
      if (googleResult.detected) {
        return googleResult;
      }

      // All clear
      return this.lastStatus;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(status: CaptivePortalStatus): CaptivePortalStatus {
    // Only notify if status changed
    const changed =
      this.lastStatus.detected !== status.detected ||
      this.lastStatus.checkUrl !== status.checkUrl;

    this.lastStatus = status;

    if (changed) {
      for (const listener of this.listeners) {
        try {
          listener(status);
        } catch (error) {
          console.warn('[CaptivePortal] Listener error:', error);
        }
      }

      if (status.detected) {
        console.warn('[CaptivePortal] Captive portal detected:', status.checkUrl);
      } else {
        console.log('[CaptivePortal] No captive portal detected');
      }
    }

    return status;
  }

  /**
   * Subscribe to captive portal detection events
   */
  subscribe(listener: CaptivePortalListener): () => void {
    this.listeners.add(listener);
    // Emit current status
    listener(this.lastStatus);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start periodic captive portal checks
   */
  startPeriodicCheck(intervalMs: number = 60000): void {
    if (this.checkInterval !== null) {
      return;
    }

    // Initial check
    void this.check();

    // Periodic checks
    this.checkInterval = window.setInterval(() => {
      void this.check();
    }, intervalMs);

    console.log('[CaptivePortal] Started periodic checks every', intervalMs, 'ms');
  }

  /**
   * Stop periodic captive portal checks
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[CaptivePortal] Stopped periodic checks');
    }
  }

  /**
   * Get last known status
   */
  getStatus(): CaptivePortalStatus {
    return { ...this.lastStatus };
  }

  /**
   * Check if captive portal was detected
   */
  isDetected(): boolean {
    return this.lastStatus.detected;
  }

  /**
   * Get the captive portal URL (for opening in browser)
   */
  getCaptivePortalUrl(): string | null {
    return this.lastStatus.checkUrl;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.stopPeriodicCheck();
    this.listeners.clear();
  }
}

// Export singleton instance
export const captivePortalDetector = new CaptivePortalDetectorService();

// Export class for custom instances
export { CaptivePortalDetectorService };

// Export type
export type { CaptivePortalListener };
