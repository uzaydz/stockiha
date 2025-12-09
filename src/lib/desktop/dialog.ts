/**
 * Desktop Dialog API
 * Wrapper around Electron dialogs with browser fallback
 */

import type { MessageBoxOptions, SaveDialogOptions, OpenDialogOptions } from './types';
import { isElectron } from './platform';

/**
 * Get the Electron dialog API
 */
function getDialogApi() {
  if (!isElectron() || !window.electronAPI?.dialog) {
    return null;
  }
  return window.electronAPI.dialog;
}

/**
 * Show a message box dialog
 */
export async function showMessage(
  options: MessageBoxOptions
): Promise<{ response: number }> {
  const api = getDialogApi();

  if (api) {
    return await api.showMessage(options);
  }

  // Browser fallback using confirm/alert
  const buttons = options.buttons || ['OK'];

  if (buttons.length === 1) {
    alert(options.message);
    return { response: 0 };
  }

  // For multiple buttons, use confirm (limited to 2 buttons)
  const confirmed = confirm(options.message);
  return { response: confirmed ? 0 : 1 };
}

/**
 * Show a save file dialog
 */
export async function showSaveDialog(
  options: SaveDialogOptions
): Promise<{ canceled: boolean; filePath?: string }> {
  const api = getDialogApi();

  if (api) {
    return await api.showSaveDialog(options);
  }

  // Browser fallback - no native file picker for save
  console.warn('[Dialog] Save dialog not available in browser');
  return { canceled: true };
}

/**
 * Show an open file dialog
 */
export async function showOpenDialog(
  options: OpenDialogOptions
): Promise<{ canceled: boolean; filePaths: string[] }> {
  const api = getDialogApi();

  if (api) {
    return await api.showOpenDialog(options);
  }

  // Browser fallback using file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';

    if (options.properties?.includes('multiSelections')) {
      input.multiple = true;
    }

    if (options.properties?.includes('openDirectory')) {
      input.webkitdirectory = true;
    }

    if (options.filters?.length) {
      const extensions = options.filters.flatMap((f) => f.extensions);
      input.accept = extensions.map((ext) => `.${ext}`).join(',');
    }

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const filePaths = Array.from(input.files).map((f) => f.name);
        resolve({ canceled: false, filePaths });
      } else {
        resolve({ canceled: true, filePaths: [] });
      }
    };

    input.oncancel = () => {
      resolve({ canceled: true, filePaths: [] });
    };

    input.click();
  });
}

// ============================================================================
// Dialog Object
// ============================================================================

export const dialog = {
  showMessage,
  showSaveDialog,
  showOpenDialog,

  /**
   * Check if native dialogs are available
   */
  isNative(): boolean {
    return getDialogApi() !== null;
  },

  // Convenience methods
  async confirm(message: string, title?: string): Promise<boolean> {
    const result = await showMessage({
      type: 'question',
      title: title || 'Confirm',
      message,
      buttons: ['Yes', 'No'],
    });
    return result.response === 0;
  },

  async alert(message: string, title?: string): Promise<void> {
    await showMessage({
      type: 'info',
      title: title || 'Alert',
      message,
      buttons: ['OK'],
    });
  },

  async error(message: string, title?: string): Promise<void> {
    await showMessage({
      type: 'error',
      title: title || 'Error',
      message,
      buttons: ['OK'],
    });
  },
};

export default dialog;
