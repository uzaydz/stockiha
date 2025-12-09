/**
 * Desktop Notification API
 * Wrapper around Electron notifications with browser fallback
 */

import type { NotificationOptions } from './types';
import { isElectron } from './platform';

/**
 * Get the Electron notification API
 */
function getNotificationApi() {
  if (!isElectron() || !window.electronAPI?.notification) {
    return null;
  }
  return window.electronAPI.notification;
}

/**
 * Show a notification using Electron or browser fallback
 */
export async function show(options: NotificationOptions): Promise<boolean> {
  const api = getNotificationApi();

  // Try Electron notification first
  if (api) {
    try {
      return await api.show(options);
    } catch (error) {
      console.warn('[Notification] Electron notification failed, falling back to browser:', error);
    }
  }

  // Browser fallback
  return showBrowserNotification(options);
}

/**
 * Show a browser notification as fallback
 */
async function showBrowserNotification(options: NotificationOptions): Promise<boolean> {
  // Check if Notification API is available
  if (!('Notification' in window)) {
    console.warn('[Notification] Browser Notification API not available');
    return false;
  }

  // Request permission if needed
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Notification] Permission denied');
      return false;
    }
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notification] Permission not granted');
    return false;
  }

  // Show browser notification
  try {
    new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      silent: options.silent,
    });
    return true;
  } catch (error) {
    console.error('[Notification] Failed to show browser notification:', error);
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

/**
 * Check if notifications are available and permitted
 */
export function isAvailable(): boolean {
  // Electron notifications are always available
  if (getNotificationApi()) {
    return true;
  }

  // Check browser Notification API
  if (!('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Get current permission status
 */
export function getPermission(): NotificationPermission | 'unavailable' {
  if (getNotificationApi()) {
    return 'granted'; // Electron doesn't need permission
  }

  if (!('Notification' in window)) {
    return 'unavailable';
  }

  return Notification.permission;
}

// ============================================================================
// Notification Object
// ============================================================================

export const notification = {
  show,
  requestPermission,
  isAvailable,
  getPermission,
};

export default notification;
