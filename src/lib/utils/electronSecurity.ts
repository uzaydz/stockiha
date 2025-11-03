/**
 * Electron Security Utilities
 * Prevents access to Super Admin pages in Electron desktop app
 */

/**
 * Check if the app is running in Electron
 */
export function isElectron(): boolean {
  // Check if running in Electron
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.userAgent.toLowerCase().includes('electron');
  }
  return false;
}

/**
 * List of Super Admin routes that should be blocked in Electron
 */
const SUPER_ADMIN_ROUTES = [
  '/super-admin',
  '/super-admin/login',
  '/super-admin/dashboard',
  '/super-admin/organizations',
  '/super-admin/subscriptions',
  '/super-admin/payment-methods',
  '/super-admin/activation-codes',
  '/super-admin/yalidine-sync'
];

/**
 * Check if a path is a Super Admin route
 * @param path - The path to check
 * @returns true if the path is a Super Admin route
 */
export function isSuperAdminRoute(path: string): boolean {
  return SUPER_ADMIN_ROUTES.some(route =>
    path === route || path.startsWith(route + '/')
  );
}

/**
 * Check if current route is accessible in Electron
 * @param path - The current path
 * @returns true if the route should be blocked
 */
export function shouldBlockRouteInElectron(path: string): boolean {
  return isElectron() && isSuperAdminRoute(path);
}

/**
 * Redirect to home if current route is blocked in Electron
 * @param path - The current path
 * @param navigate - React Router navigate function
 */
export function enforceElectronSecurity(path: string, navigate?: (path: string) => void): boolean {
  if (shouldBlockRouteInElectron(path)) {
    console.warn('[Electron Security] محاولة الوصول إلى صفحة محظورة:', path);

    // Show alert to user
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(
        'غير مسموح بالوصول إلى لوحة السوبر أدمين\n\n' +
        'لوحة السوبر أدمين متاحة فقط عبر المتصفح الويب.\n' +
        'يرجى استخدام متصفح الويب للوصول إلى هذه الصفحة.'
      );
    }

    // Redirect to home
    if (navigate) {
      navigate('/');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }

    return true; // Route was blocked
  }

  return false; // Route is allowed
}

/**
 * React Hook to enforce Electron security on mount
 * @returns Object with isElectron and isBlocked status
 */
export function useElectronSecurity(currentPath: string) {
  const isElectronApp = isElectron();
  const isBlocked = shouldBlockRouteInElectron(currentPath);

  return {
    isElectron: isElectronApp,
    isBlocked,
    shouldRedirect: isBlocked
  };
}
