/**
 * ConnectivityService.ts (Enhanced v2.0)
 *
 * Multi-layer connectivity detection system:
 * - Layer 1: Browser events + navigator.onLine (instant)
 * - Layer 2: Network Information API (quality assessment)
 * - Layer 3: Quick multi-endpoint ping (verification)
 * - Layer 4: Deep health check (Supabase endpoint)
 * - Layer 5: Electron net.isOnline() (desktop only)
 */

import { networkStatusManager } from '@/lib/events/networkStatusManager';
import { networkQualityService } from './NetworkQuality';
import { multiEndpointPing } from './MultiEndpointPing';
import { captivePortalDetector } from './CaptivePortalDetector';
import {
  ConnectivityState,
  ConnectivityConfig,
  ConnectionQuality,
  ConnectivityStateListener,
  DEFAULT_CONNECTIVITY_CONFIG,
  createInitialConnectivityState,
  calculateConnectionQuality,
  NetworkInfo,
} from './ConnectivityTypes';

// Re-export for backward compatibility
export type ConnectivityLevel = ConnectionQuality;

/**
 * EnhancedConnectivityService
 *
 * Provides comprehensive connectivity detection and monitoring
 */
class EnhancedConnectivityService {
  private state: ConnectivityState;
  private config: ConnectivityConfig;
  private listeners = new Set<ConnectivityStateListener>();

  // Timers
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  // State tracking
  private started = false;
  private latencySamples: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 10;

  // Environment
  private readonly SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || '';
  private readonly ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || '';
  private readonly IS_DEV = (import.meta as any)?.env?.DEV || false;

  constructor(config: Partial<ConnectivityConfig> = {}) {
    this.config = { ...DEFAULT_CONNECTIVITY_CONFIG, ...config };
    this.state = createInitialConnectivityState();

    // Adjust intervals for development
    if (this.IS_DEV) {
      this.config.pingIntervalOnline = 15000; // 15s in dev
      this.config.healthCheckInterval = 30000; // 30s in dev
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Start the connectivity service
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    console.log('[ConnectivityService] Starting enhanced connectivity service v2.0');

    // 1. Setup browser event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);
    }

    // 2. Subscribe to Network Information API changes
    if (this.config.useNetworkInfoAPI) {
      networkQualityService.subscribe(this.handleNetworkQualityChange);
    }

    // 3. Subscribe to captive portal detection
    if (this.config.useCaptivePortalDetection) {
      captivePortalDetector.subscribe(this.handleCaptivePortalChange);
    }

    // 4. Setup Electron IPC listener (if available)
    if (this.config.useElectronNet) {
      this.setupElectronListener();
    }

    // 5. Run initial connectivity check
    void this.runFullCheck();

    // 6. Start periodic timers
    this.startTimers();

    console.log('[ConnectivityService] Started with config:', {
      pingIntervalOnline: this.config.pingIntervalOnline,
      pingIntervalOffline: this.config.pingIntervalOffline,
      healthCheckInterval: this.config.healthCheckInterval,
    });
  }

  /**
   * Stop the connectivity service
   */
  stop(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineEvent);
      window.removeEventListener('offline', this.handleOfflineEvent);
    }

    this.stopTimers();
    this.started = false;
    console.log('[ConnectivityService] Stopped');
  }

  /**
   * Subscribe to connectivity state changes
   */
  subscribe(callback: ConnectivityStateListener): () => void {
    this.listeners.add(callback);
    callback(this.state); // Emit current state immediately
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current connectivity state
   */
  getState(): ConnectivityState {
    return { ...this.state };
  }

  /**
   * Get current status (backward compatibility)
   */
  getStatus(): ConnectivityState {
    return this.getState();
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Get current connection quality
   */
  getQuality(): ConnectionQuality {
    return this.state.quality;
  }

  /**
   * Check if internet has been verified (actual request succeeded)
   */
  hasVerifiedInternet(): boolean {
    return this.state.lastVerifiedOnline !== null &&
      Date.now() - this.state.lastVerifiedOnline < 60000; // Within last minute
  }

  /**
   * Force immediate connectivity check
   */
  async forceCheck(): Promise<ConnectivityState> {
    console.log('[ConnectivityService] Force check triggered');
    await this.runFullCheck();
    return this.state;
  }

  /**
   * Sync with external connection state (backward compatibility)
   */
  syncWithConnectionState(connectionState: any): void {
    if (!connectionState) return;

    const isOnline = connectionState.isOnline?.() ?? connectionState.isOnline ?? false;

    if (isOnline !== this.state.isOnline) {
      console.log(`[ConnectivityService] Synced with ConnectionState: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      this.updateState({
        isOnline,
        quality: isOnline ? this.state.quality : 'offline',
        source: 'electron',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  private handleOnlineEvent = (): void => {
    console.log('[ConnectivityService] Browser online event received');
    // Don't trust immediately - verify with ping
    void this.verifyConnectivity('navigator-online');
  };

  private handleOfflineEvent = (): void => {
    console.log('[ConnectivityService] Browser offline event received');
    // Offline event is more trustworthy
    this.updateState({
      isOnline: false,
      quality: 'offline',
      source: 'navigator',
      healthCheck: {
        ...this.state.healthCheck,
        lastFailure: Date.now(),
        consecutiveFailures: this.state.healthCheck.consecutiveFailures + 1,
        consecutiveSuccesses: 0,
      },
    });
    // Switch to faster retry interval
    this.adjustTimers();
  };

  private handleNetworkQualityChange = (info: NetworkInfo): void => {
    console.log('[ConnectivityService] Network quality changed:', info.effectiveType);

    // Update network info
    this.updateState({
      networkInfo: info,
    });

    // If connection degraded significantly, trigger verification
    if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
      void this.verifyConnectivity('network-quality-degraded');
    }
  };

  private handleCaptivePortalChange = (status: { detected: boolean; checkUrl: string | null; detectedAt: number | null }): void => {
    if (status.detected) {
      console.warn('[ConnectivityService] Captive portal detected!');
      this.updateState({
        isOnline: false,
        quality: 'offline',
        source: 'ping',
        captivePortal: {
          detected: true,
          checkUrl: status.checkUrl,
          detectedAt: status.detectedAt,
        },
      });
    } else if (this.state.captivePortal.detected) {
      // Captive portal was resolved
      console.log('[ConnectivityService] Captive portal resolved');
      this.updateState({
        captivePortal: {
          detected: false,
          checkUrl: null,
          detectedAt: null,
        },
      });
      // Re-verify connectivity
      void this.verifyConnectivity('captive-portal-resolved');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTIVITY CHECKS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Run full connectivity check (all layers)
   */
  private async runFullCheck(): Promise<void> {
    console.log('[ConnectivityService] Running full connectivity check');

    // Layer 1: Check navigator.onLine first
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.log('[ConnectivityService] navigator.onLine reports offline');
      this.updateState({
        isOnline: false,
        quality: 'offline',
        source: 'navigator',
      });
      return;
    }

    // Layer 2: Get Network Information API data
    const networkInfo = networkQualityService.getInfo();
    const networkQuality = networkQualityService.estimateQuality();

    // Layer 3: Quick ping verification
    const pingResult = await multiEndpointPing.ping();
    console.log('[ConnectivityService] Ping result:', pingResult);

    if (!pingResult.success) {
      // Captive portal check
      if (pingResult.isCaptivePortal) {
        this.updateState({
          isOnline: false,
          quality: 'offline',
          source: 'ping',
          captivePortal: {
            detected: true,
            checkUrl: pingResult.endpoint,
            detectedAt: Date.now(),
          },
          healthCheck: {
            ...this.state.healthCheck,
            lastFailure: Date.now(),
            consecutiveFailures: this.state.healthCheck.consecutiveFailures + 1,
            consecutiveSuccesses: 0,
          },
        });
        return;
      }

      // Ping failed - likely offline
      this.updateState({
        isOnline: false,
        quality: 'offline',
        source: 'ping',
        networkInfo,
        healthCheck: {
          ...this.state.healthCheck,
          lastFailure: Date.now(),
          consecutiveFailures: this.state.healthCheck.consecutiveFailures + 1,
          consecutiveSuccesses: 0,
        },
      });
      return;
    }

    // Layer 4: Deep health check (Supabase)
    const healthResult = await this.runHealthCheck();

    // Record latency if available
    if (pingResult.latency !== null) {
      this.pushLatencySample(pingResult.latency);
    }
    if (healthResult.latency > 0) {
      this.pushLatencySample(healthResult.latency);
    }

    // Calculate quality
    const avgLatency = this.calculateAverageLatency();
    const quality = calculateConnectionQuality(
      true,
      avgLatency,
      networkInfo.effectiveType,
      this.config
    );

    // Update state with success
    this.updateState({
      isOnline: true,
      quality,
      source: healthResult.success ? 'health-check' : 'ping',
      networkInfo,
      healthCheck: {
        lastSuccess: Date.now(),
        lastFailure: this.state.healthCheck.lastFailure,
        consecutiveSuccesses: this.state.healthCheck.consecutiveSuccesses + 1,
        consecutiveFailures: 0,
        averageLatency: avgLatency,
        lastLatency: pingResult.latency,
      },
      captivePortal: {
        detected: false,
        checkUrl: null,
        detectedAt: null,
      },
      lastVerifiedOnline: Date.now(),
    });

    console.log(`[ConnectivityService] Check complete: ONLINE, quality=${quality}, latency=${avgLatency}ms`);
  }

  /**
   * Quick verification (ping only)
   */
  private async verifyConnectivity(trigger: string): Promise<void> {
    console.log(`[ConnectivityService] Verifying connectivity (trigger: ${trigger})`);

    const pingResult = await multiEndpointPing.quickCheck();

    if (pingResult) {
      // Online - update state and run full check for quality
      if (!this.state.isOnline) {
        console.log('[ConnectivityService] Connectivity restored!');
      }
      this.updateState({
        isOnline: true,
        source: 'ping',
      });
      // Run full check to get accurate quality
      void this.runFullCheck();
    } else {
      // Offline
      this.updateState({
        isOnline: false,
        quality: 'offline',
        source: 'ping',
        healthCheck: {
          ...this.state.healthCheck,
          lastFailure: Date.now(),
          consecutiveFailures: this.state.healthCheck.consecutiveFailures + 1,
          consecutiveSuccesses: 0,
        },
      });
    }
  }

  /**
   * Deep health check to Supabase
   */
  private async runHealthCheck(): Promise<{ success: boolean; latency: number }> {
    const url = this.getHealthCheckUrl();
    if (!url) {
      return { success: false, latency: 0 };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.healthCheckTimeout
    );
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(this.ANON_KEY ? {
            'apikey': this.ANON_KEY,
            'Authorization': `Bearer ${this.ANON_KEY}`
          } : {}),
        },
      });

      clearTimeout(timeout);
      const latency = Math.round(performance.now() - startTime);

      // Any response (even 4xx) means internet works
      const success = response.status < 500;

      if (success) {
        // Update time anchor from server (for license validation)
        await this.updateTimeAnchor(response);
      }

      return { success, latency };
    } catch {
      clearTimeout(timeout);
      return { success: false, latency: Math.round(performance.now() - startTime) };
    }
  }

  /**
   * Update time anchor from server response (for license validation)
   */
  private async updateTimeAnchor(response: Response): Promise<void> {
    try {
      const dateHeader = response.headers?.get?.('date');
      if (dateHeader) {
        const serverNowMs = Date.parse(dateHeader);
        if (Number.isFinite(serverNowMs) && typeof window !== 'undefined') {
          // Safe localStorage access with try-catch for Electron preload context
          let orgId: string | null = null;
          try {
            orgId = localStorage.getItem('bazaar_organization_id');
          } catch {
            // localStorage not available in this context
          }
          const api: any = (window as any).electronAPI;
          if (api?.license && typeof api.license.setAnchor === 'function') {
            await api.license.setAnchor(orgId || null, serverNowMs);
          }
        }
      }
    } catch {
      // Ignore anchor errors
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private updateState(partial: Partial<ConnectivityState>): void {
    const prevOnline = this.state.isOnline;
    const prevQuality = this.state.quality;

    this.state = {
      ...this.state,
      ...partial,
      lastUpdate: Date.now(),
    };

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {
        // Ignore listener errors
      }
    }

    // Notify legacy networkStatusManager
    if (prevOnline !== this.state.isOnline) {
      networkStatusManager.setStatus(this.state.isOnline);

      // Log status change
      const statusEmoji = this.state.isOnline ? '🟢' : '🔴';
      console.log(
        `%c[ConnectivityService] ${statusEmoji} Status changed: ${prevOnline ? 'ONLINE' : 'OFFLINE'} → ${this.state.isOnline ? 'ONLINE' : 'OFFLINE'}`,
        this.state.isOnline ? 'color: #22c55e' : 'color: #ef4444'
      );
    }

    // Log quality change
    if (prevQuality !== this.state.quality && this.state.isOnline) {
      console.log(`[ConnectivityService] Quality changed: ${prevQuality} → ${this.state.quality}`);
    }

    // Adjust timers based on online status
    if (prevOnline !== this.state.isOnline) {
      this.adjustTimers();
    }
  }

  private pushLatencySample(latency: number): void {
    this.latencySamples.push(latency);
    if (this.latencySamples.length > this.MAX_LATENCY_SAMPLES) {
      this.latencySamples.shift();
    }
  }

  private calculateAverageLatency(): number | null {
    if (this.latencySamples.length === 0) return null;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  private startTimers(): void {
    this.adjustTimers();
  }

  private adjustTimers(): void {
    this.stopTimers();

    // Use different intervals based on online status
    const pingInterval = this.state.isOnline
      ? this.config.pingIntervalOnline
      : this.config.pingIntervalOffline;

    console.log(`[ConnectivityService] Setting ping interval to ${pingInterval}ms (${this.state.isOnline ? 'online' : 'offline'} mode)`);

    // Ping timer
    this.pingTimer = setInterval(() => {
      void this.verifyConnectivity('timer');
    }, pingInterval);

    // Health check timer (less frequent)
    this.healthCheckTimer = setInterval(() => {
      void this.runFullCheck();
    }, this.config.healthCheckInterval);
  }

  private stopTimers(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private getHealthCheckUrl(): string | null {
    if (!this.SUPABASE_URL) return null;
    return `${this.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/settings`;
  }

  private setupElectronListener(): void {
    if (typeof window === 'undefined') return;

    // Check for Electron API
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.network) return;

    // Poll Electron's net.isOnline periodically
    // This provides system-level network detection
    const checkElectronNet = async () => {
      try {
        const electronOnline = await electronAPI.network.isOnlineSystem?.();
        if (typeof electronOnline === 'boolean') {
          if (!electronOnline && this.state.isOnline) {
            console.log('[ConnectivityService] Electron reports offline');
            this.updateState({
              isOnline: false,
              quality: 'offline',
              source: 'electron',
            });
          }
        }
      } catch {
        // Electron API not available or failed
      }
    };

    // Check immediately and then periodically
    void checkElectronNet();
    setInterval(checkElectronNet, 10000); // Every 10 seconds
  }
}

// Create and export singleton instance
export const ConnectivityService = new EnhancedConnectivityService();

// Also export as named export for new code
export const connectivityService = ConnectivityService;

// ⚡ Start with a small delay to avoid blocking initial render
// This ensures the DOM and other critical systems are ready first
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for best performance, fallback to setTimeout
  const startService = () => {
    try {
      ConnectivityService.start();
    } catch (error) {
      console.error('[ConnectivityService] Failed to start:', error);
    }
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(startService, { timeout: 2000 });
  } else {
    setTimeout(startService, 100);
  }
}
