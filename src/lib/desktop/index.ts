/**
 * Desktop APIs - Unified Export
 *
 * This module provides a unified interface for desktop (Electron) APIs
 * with automatic fallbacks for web browsers.
 *
 * Usage:
 * ```typescript
 * import { platform, windowControls, updater, notification } from '@/lib/desktop';
 *
 * // Check platform
 * if (platform.isElectron) {
 *   // Desktop-specific code
 * }
 *
 * // Window controls
 * await windowControls.minimize();
 * await windowControls.maximize();
 *
 * // Auto-updater
 * await updater.checkForUpdates();
 *
 * // Notifications
 * await notification.show({ title: 'Hello', body: 'World' });
 * ```
 */

// Types
export * from './types';

// Platform detection
export {
  isElectron,
  isWeb,
  isDesktopApp,
  getPlatform,
  getAppType,
  isMac,
  isWindows,
  isLinux,
  getPlatformInfo,
  platform,
} from './platform';

// Window controls
export { windowControls, minimize, maximize, close, hide, show, fullscreen, toggleDevTools } from './window';

// Auto-updater
export {
  updater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getVersion,
  initializeListeners as initializeUpdaterListeners,
} from './updater';

// Notifications
export { notification, show as showNotification, requestPermission } from './notification';

// Storage
export { storage, get as getStorage, set as setStorage, remove as removeStorage } from './storage';

// Dialogs
export { dialog, showMessage, showSaveDialog, showOpenDialog } from './dialog';

// Session
export { session, getOrCreateKey, clearKey } from './session';

// App
export { app, getVersion as getAppVersion, getName, getSystemInfo, quit } from './app';

// Database
export {
  // Functions
  initializeDatabase,
  query,
  queryOne,
  execute,
  upsert,
  batchUpsert,
  deleteRecord,
  logConflict,
  getConflictHistory,
  // Aliases for backward compatibility
  electronQuery,
  electronQueryOne,
  electronExecute,
  electronUpsert,
  electronBatchUpsert,
  electronDelete,
  electronInitDatabase,
  // Class
  ElectronDatabase,
  // Errors
  DatabaseError,
  DatabaseNotAvailableError,
} from './database';

// Re-export modules as namespace
import { platform } from './platform';
import { windowControls } from './window';
import { updater } from './updater';
import { notification } from './notification';
import { storage } from './storage';
import { dialog } from './dialog';
import { session } from './session';
import { app } from './app';
import database from './database';

// Default export - all modules
export const desktop = {
  platform,
  window: windowControls,
  updater,
  notification,
  storage,
  dialog,
  session,
  app,
  database,
};

export default desktop;
