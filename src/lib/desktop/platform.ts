/**
 * Platform Detection
 * Unified platform detection for Electron and Web
 */

import type { Platform, PlatformInfo, AppType } from './types';

/**
 * Check if running in Electron
 */
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for electronAPI (from preload script)
  if (window.electronAPI) return true;

  // Check User Agent
  if (navigator?.userAgent?.includes('Electron')) return true;

  return false;
};

/**
 * Check if running in Web browser
 */
export const isWeb = (): boolean => {
  return !isElectron();
};

/**
 * Check if running as Desktop app (Electron)
 */
export const isDesktopApp = (): boolean => {
  return isElectron();
};

/**
 * Get current platform
 */
export const getPlatform = (): Platform => {
  if (!isElectron()) return 'web';

  const api = window.electronAPI;
  if (api?.app?.isMac) return 'darwin';
  if (api?.app?.isWindows) return 'win32';
  if (api?.app?.isLinux) return 'linux';

  // Fallback to navigator
  const platform = navigator.platform?.toLowerCase() || '';
  if (platform.includes('mac')) return 'darwin';
  if (platform.includes('win')) return 'win32';
  if (platform.includes('linux')) return 'linux';

  return 'web';
};

/**
 * Get app type
 */
export const getAppType = (): AppType => {
  return isElectron() ? 'electron' : 'web';
};

/**
 * Check if running on macOS
 */
export const isMac = (): boolean => {
  if (isElectron() && window.electronAPI?.app?.isMac) {
    return true;
  }
  return navigator.platform?.toLowerCase().includes('mac') || false;
};

/**
 * Check if running on Windows
 */
export const isWindows = (): boolean => {
  if (isElectron() && window.electronAPI?.app?.isWindows) {
    return true;
  }
  return navigator.platform?.toLowerCase().includes('win') || false;
};

/**
 * Check if running on Linux
 */
export const isLinux = (): boolean => {
  if (isElectron() && window.electronAPI?.app?.isLinux) {
    return true;
  }
  return navigator.platform?.toLowerCase().includes('linux') || false;
};

/**
 * Get full platform info
 */
export const getPlatformInfo = (): PlatformInfo => {
  const electron = isElectron();
  return {
    isElectron: electron,
    isWeb: !electron,
    isMac: isMac(),
    isWindows: isWindows(),
    isLinux: isLinux(),
    platform: getPlatform(),
    appType: getAppType(),
  };
};

/**
 * Platform singleton for performance
 */
let cachedPlatformInfo: PlatformInfo | null = null;

export const platform = {
  get info(): PlatformInfo {
    if (!cachedPlatformInfo) {
      cachedPlatformInfo = getPlatformInfo();
    }
    return cachedPlatformInfo;
  },

  get isElectron(): boolean {
    return this.info.isElectron;
  },

  get isWeb(): boolean {
    return this.info.isWeb;
  },

  get isMac(): boolean {
    return this.info.isMac;
  },

  get isWindows(): boolean {
    return this.info.isWindows;
  },

  get isLinux(): boolean {
    return this.info.isLinux;
  },

  get current(): Platform {
    return this.info.platform;
  },

  get appType(): AppType {
    return this.info.appType;
  },

  // Clear cache (useful for testing)
  clearCache(): void {
    cachedPlatformInfo = null;
  },
};

export default platform;
