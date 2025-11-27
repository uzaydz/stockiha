/**
 * Platform detection utilities for Tauri, Electron, and Web
 */

export type PlatformType = 'tauri' | 'electron' | 'web';
export type OSPlatform = 'darwin' | 'win32' | 'linux' | 'web';

/**
 * Check if running in Tauri environment
 */
export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI_IPC__ || w.__TAURI__);
}

/**
 * Check if running in Electron environment
 */
export function isElectronApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.electronAPI && !isTauriApp());
}

/**
 * Check if running as a desktop app (Tauri or Electron)
 */
export function isDesktopApp(): boolean {
  return isTauriApp() || isElectronApp();
}

/**
 * Get current platform type
 */
export function getPlatformType(): PlatformType {
  if (isTauriApp()) return 'tauri';
  if (isElectronApp()) return 'electron';
  return 'web';
}

/**
 * Get OS platform
 */
export async function getOSPlatform(): Promise<OSPlatform> {
  if (typeof window === 'undefined') return 'web';

  const w = window as any;

  // Tauri - استخدام user agent كـ fallback بسيط
  if (w.__TAURI_IPC__ || w.__TAURI__) {
    // يمكن استخدام Tauri API في المستقبل عند توفر plugin-os
    return detectPlatformFromUserAgent();
  }

  // Electron
  if (w.electronAPI?.platform) {
    return w.electronAPI.platform as OSPlatform;
  }

  // Web fallback
  return detectPlatformFromUserAgent();
}

/**
 * Detect platform from user agent (fallback)
 */
function detectPlatformFromUserAgent(): OSPlatform {
  if (typeof navigator === 'undefined') return 'web';
  
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'darwin';
  if (ua.includes('win')) return 'win32';
  if (ua.includes('linux')) return 'linux';
  return 'web';
}

/**
 * Window control functions for Tauri/Electron
 */
export const windowControls = {
  async minimize() {
    const w = window as any;
    
    if (isTauriApp()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch (err) {
        console.error('[Platform] Failed to minimize:', err);
      }
    } else if (w.electronAPI?.minimizeWindow) {
      w.electronAPI.minimizeWindow();
    }
  },

  async maximize() {
    const w = window as any;
    
    if (isTauriApp()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const isMaximized = await win.isMaximized();
        
        if (isMaximized) {
          await win.unmaximize();
        } else {
          await win.maximize();
        }
      } catch (err) {
        console.error('[Platform] Failed to maximize:', err);
      }
    } else if (w.electronAPI?.maximizeWindow) {
      w.electronAPI.maximizeWindow();
    }
  },

  async close() {
    const w = window as any;
    
    if (isTauriApp()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (err) {
        console.error('[Platform] Failed to close:', err);
      }
    } else if (w.electronAPI?.closeWindow) {
      w.electronAPI.closeWindow();
    }
  },

  async isMaximized(): Promise<boolean> {
    const w = window as any;
    
    if (isTauriApp()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        return await getCurrentWindow().isMaximized();
      } catch {
        return false;
      }
    } else if (w.electronAPI?.isMaximized) {
      return w.electronAPI.isMaximized();
    }
    
    return false;
  }
};
