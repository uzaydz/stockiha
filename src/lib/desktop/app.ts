/**
 * Desktop App API
 * Wrapper around Electron app APIs
 */

import { isElectron } from './platform';

/**
 * Get the Electron app API
 */
function getAppApi() {
  if (!isElectron() || !window.electronAPI?.app) {
    return null;
  }
  return window.electronAPI.app;
}

/**
 * Get app version
 */
export async function getVersion(): Promise<string> {
  const api = getAppApi();

  if (api) {
    return await api.getVersion();
  }

  // Fallback to package.json version if available
  return '1.0.0';
}

/**
 * Get app name
 */
export async function getName(): Promise<string> {
  const api = getAppApi();

  if (api) {
    return await api.getName();
  }

  return 'Stockiha';
}

/**
 * Get system info
 */
export async function getSystemInfo(): Promise<Record<string, unknown>> {
  const api = getAppApi();

  if (api) {
    return await api.getSystemInfo();
  }

  // Browser fallback
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
  };
}

/**
 * Quit the application
 */
export async function quit(): Promise<void> {
  const api = getAppApi();

  if (api) {
    await api.quit();
    return;
  }

  // Browser fallback - just close the window
  window.close();
}

// ============================================================================
// App Object
// ============================================================================

export const app = {
  getVersion,
  getName,
  getSystemInfo,
  quit,

  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return getAppApi() !== null;
  },

  /**
   * Get platform info
   */
  get platform() {
    const api = getAppApi();
    return {
      isMac: api?.isMac ?? navigator.platform.includes('Mac'),
      isWindows: api?.isWindows ?? navigator.platform.includes('Win'),
      isLinux: api?.isLinux ?? navigator.platform.includes('Linux'),
    };
  },
};

export default app;
