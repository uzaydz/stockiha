/**
 * Desktop Window API
 * Wrapper around Electron window controls
 */

import { isElectron } from './platform';

/**
 * Get the Electron window API
 */
function getWindowApi() {
  if (!isElectron() || !window.electronAPI?.window) {
    return null;
  }
  return window.electronAPI.window;
}

/**
 * Minimize the window
 */
export async function minimize(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.minimize();
  }
}

/**
 * Maximize/restore the window
 */
export async function maximize(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.maximize();
  }
}

/**
 * Close the window
 */
export async function close(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.close();
  }
}

/**
 * Hide the window
 */
export async function hide(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.hide();
  }
}

/**
 * Show the window
 */
export async function show(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.show();
  }
}

/**
 * Toggle fullscreen mode
 */
export async function fullscreen(enable: boolean): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.fullscreen(enable);
  }
}

/**
 * Toggle developer tools
 */
export async function toggleDevTools(): Promise<void> {
  const api = getWindowApi();
  if (api) {
    await api.toggleDevTools();
  }
}

// ============================================================================
// Window Controls Object
// ============================================================================

export const windowControls = {
  minimize,
  maximize,
  close,
  hide,
  show,
  fullscreen,
  toggleDevTools,

  /**
   * Check if window controls are available
   */
  isAvailable(): boolean {
    return getWindowApi() !== null;
  },
};

export default windowControls;
