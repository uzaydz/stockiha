/**
 * التحقق من بيئة Electron
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * كشف Electron عبر عدة طرق موثوقة
 */
export const isElectron = (): boolean => {
  // 1. فحص وجود Electron في window
  if (typeof window !== 'undefined') {
    // فحص electron object (من preload script)
    if ((window as any).electron?.isElectron) {
      return true;
    }

    // فحص electronAPI (طريقة بديلة)
    if ((window as any).electronAPI) {
      return true;
    }

    // فحص __ELECTRON__ flag
    if ((window as any).__ELECTRON__) {
      return true;
    }
  }

  // 2. فحص User Agent
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    if (navigator.userAgent.includes('Electron')) {
      return true;
    }
  }

  // 3. فحص process.versions.electron (في Node context)
  if (typeof process !== 'undefined' && process.versions && (process.versions as any).electron) {
    return true;
  }

  return false;
};

/**
 * كشف إذا كان التطبيق يعمل في بيئة Desktop (Electron)
 */
export const isDesktopApp = (): boolean => {
  return isElectron();
};

/**
 * كشف Tauri
 * @deprecated Tauri has been removed. Always returns false.
 */
export const isTauri = (): boolean => {
  return false;
};

export default isElectron;
