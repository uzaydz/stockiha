// Lightweight language debug helper. Enable logs by any of:
// - localStorage key: LANG_DEBUG = '1' | 'true'
// - URL query contains: langdebug=1
// - window.__LANG_DEBUG__ = true

export function isLangDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const ls = localStorage.getItem('LANG_DEBUG');
    if (ls && ['1', 'true', 'on', 'yes'].includes(ls.toLowerCase())) return true;
    if ((window as any).__LANG_DEBUG__ === true) return true;
    const search = window.location.search || '';
    if (/([?&])langdebug=1(&|$)/i.test(search)) return true;
  } catch {}
  return false;
}

export function langLog(...args: any[]) {
  if (!isLangDebugEnabled()) return;
  try {
    // eslint-disable-next-line no-console
    
  } catch {}
}

export function langWarn(...args: any[]) {
  if (!isLangDebugEnabled()) return;
  try {
    // eslint-disable-next-line no-console
    console.warn('[LANG]', ...args);
  } catch {}
}

