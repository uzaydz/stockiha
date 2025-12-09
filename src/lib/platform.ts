/**
 * Platform detection utilities
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * This module provides backward compatibility for code that used isTauriApp().
 * All Tauri-specific functions now return false or redirect to Electron equivalents.
 */

import {
  isElectron,
  isWeb,
  isDesktopApp as desktopCheck,
  getPlatform,
  isMac,
  isWindows,
  isLinux,
  windowControls as desktopWindowControls,
} from '@/lib/desktop';

export type PlatformType = 'electron' | 'web';
export type OSPlatform = 'darwin' | 'win32' | 'linux' | 'web';

/**
 * Check if running in Tauri environment
 * @deprecated Tauri has been removed. Always returns false.
 */
export function isTauriApp(): boolean {
  return false;
}

/**
 * Check if running in Electron environment
 */
export function isElectronApp(): boolean {
  return isElectron();
}

/**
 * Check if running as a desktop app (Electron only)
 */
export function isDesktopApp(): boolean {
  return desktopCheck();
}

/**
 * Get current platform type
 */
export function getPlatformType(): PlatformType {
  if (isElectron()) return 'electron';
  return 'web';
}

/**
 * Get OS platform
 */
export async function getOSPlatform(): Promise<OSPlatform> {
  return getPlatform();
}

/**
 * Window control functions for Electron
 */
export const windowControls = {
  async minimize() {
    await desktopWindowControls.minimize();
  },

  async maximize() {
    await desktopWindowControls.maximize();
  },

  async close() {
    await desktopWindowControls.close();
  },

  async isMaximized(): Promise<boolean> {
    // Electron doesn't expose isMaximized in the current preload
    // Return false as default
    return false;
  },
};

// Re-export from desktop module for convenience
export { isElectron, isWeb, isMac, isWindows, isLinux };
