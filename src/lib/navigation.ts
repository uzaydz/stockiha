export type GoToOptions = { replace?: boolean };

export const isElectronEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // Prefer explicit preload bridge when available
    if ((window as any).electronAPI) return true;
  } catch {}
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  return ua.includes('Electron');
};

export const getCurrentPath = (): string => {
  if (typeof window === 'undefined') return '/';
  const h = window.location.hash || '';
  if (h.startsWith('#/')) return h.slice(1);
  return window.location.pathname || '/';
};

export const getCurrentSearch = (): string => {
  if (typeof window === 'undefined') return '';
  const h = window.location.hash || '';
  const qIndex = h.indexOf('?');
  if (h.startsWith('#/') && qIndex !== -1) return h.slice(qIndex);
  return window.location.search || '';
};

export const getWebOrigin = (): string => {
  if (typeof window === 'undefined') return (import.meta as any)?.env?.VITE_SITE_URL || 'https://stockiha.com';
  const origin = window.location.origin;
  if (origin.startsWith('file:') || isElectronEnv()) {
    return (import.meta as any)?.env?.VITE_SITE_URL || 'https://stockiha.com';
  }
  return origin;
};

export const goTo = (path: string, opts: GoToOptions = {}): void => {
  if (typeof window === 'undefined') return;
  if (!path.startsWith('/')) path = `/${path}`;
  if (isElectronEnv()) {
    const target = `#${path}`;
    if (opts.replace) {
      // Replace current hash without adding history entry
      const { pathname, search } = window.location;
      const newUrl = `${pathname}${search}${target}`;
      window.history.replaceState(null, '', newUrl);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = target;
    }
    return;
  }
  try {
    if (opts.replace) {
      window.history.replaceState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  } catch {
    if (opts.replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  }
};

