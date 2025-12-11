/**
 * Desktop Auto Updater API
 * Wrapper around Electron auto-updater
 */

import type { UpdateInfo, DownloadProgress, UpdateStatus, UpdaterState } from './types';
import { isElectron } from './platform';

// ============================================================================
// State
// ============================================================================

let currentState: UpdaterState = {
  status: 'idle',
};

const listeners = new Set<(state: UpdaterState) => void>();

function updateState(newState: Partial<UpdaterState>): void {
  currentState = { ...currentState, ...newState };
  listeners.forEach((listener) => listener(currentState));
}

// ============================================================================
// API
// ============================================================================

/**
 * Get the Electron updater API
 */
function getUpdaterApi() {
  if (!isElectron() || !window.electronAPI?.updater) {
    return null;
  }
  return window.electronAPI.updater;
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<void> {
  const api = getUpdaterApi();
  if (!api) {
    console.warn('[Updater] Not available in this environment');
    return;
  }

  try {
    updateState({ status: 'checking', error: undefined });
    await api.checkForUpdates();
  } catch (error) {
    updateState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Download available update
 */
export async function downloadUpdate(): Promise<void> {
  const api = getUpdaterApi();
  if (!api) {
    console.warn('[Updater] Not available in this environment');
    return;
  }

  try {
    updateState({ status: 'downloading' });
    await api.downloadUpdate();
  } catch (error) {
    updateState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Quit and install the downloaded update
 * ملاحظة: لا ننتظر النتيجة لأن التطبيق سيغلق فوراً
 */
export async function quitAndInstall(): Promise<void> {
  const api = getUpdaterApi();
  if (!api) {
    console.warn('[Updater] Not available in this environment');
    return;
  }

  // لا ننتظر النتيجة لأن quitAndInstall سيغلق التطبيق فوراً
  api.quitAndInstall().catch(() => {
    // تجاهل الأخطاء لأن التطبيق سيغلق
  });
}

/**
 * Get current app version
 */
export async function getVersion(): Promise<string> {
  const api = getUpdaterApi();
  if (!api) {
    return '0.0.0';
  }

  return await api.getVersion();
}

/**
 * Get current updater state
 */
export function getState(): UpdaterState {
  return currentState;
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener: (state: UpdaterState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

let listenersInitialized = false;

export function initializeListeners(): () => void {
  const api = getUpdaterApi();
  if (!api || listenersInitialized) {
    return () => {};
  }

  const unsubscribers: (() => void)[] = [];

  // Checking for update
  unsubscribers.push(
    api.onCheckingForUpdate(() => {
      updateState({ status: 'checking' });
    })
  );

  // Update available
  unsubscribers.push(
    api.onUpdateAvailable((info: UpdateInfo) => {
      updateState({ status: 'available', updateInfo: info });
    })
  );

  // No update available
  unsubscribers.push(
    api.onUpdateNotAvailable((info: UpdateInfo) => {
      updateState({ status: 'not-available', updateInfo: info });
    })
  );

  // Update error
  unsubscribers.push(
    api.onUpdateError((error: string) => {
      updateState({ status: 'error', error });
    })
  );

  // Download progress
  unsubscribers.push(
    api.onDownloadProgress((progress: DownloadProgress) => {
      updateState({ status: 'downloading', downloadProgress: progress });
    })
  );

  // Update downloaded
  unsubscribers.push(
    api.onUpdateDownloaded((info: UpdateInfo) => {
      updateState({ status: 'downloaded', updateInfo: info });
    })
  );

  listenersInitialized = true;

  return () => {
    unsubscribers.forEach((unsub) => unsub());
    listenersInitialized = false;
  };
}

// ============================================================================
// Updater Object
// ============================================================================

export const updater = {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getVersion,
  getState,
  subscribe,
  initializeListeners,

  /**
   * Check if updater is available
   */
  isAvailable(): boolean {
    return getUpdaterApi() !== null;
  },
};

export default updater;
