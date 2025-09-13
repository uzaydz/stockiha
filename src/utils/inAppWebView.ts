/**
 * Generic In‑App Browser (IAB) detection and lightweight fixes for FB/IG/TikTok.
 */

export function isFacebookWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /(FBAN|FBAV|FB_IAB|FB4A|FBIOS)/i.test(navigator.userAgent || '');
}

export function isInstagramWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Instagram/i.test(navigator.userAgent || '');
}

export function isTikTokWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Common TikTok UA hints
  return /(TTWebView|TikTok|musical\.ly|aweme)/i.test(navigator.userAgent || '');
}

export function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Android WebView indicators must include Android plus either "; wv" or a Chrome Mobile signature with Version/
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const hasWV = /; wv\)/i.test(ua);
  const hasChromeMobile = /Chrome\/\d+/i.test(ua) && /Mobile/i.test(ua);
  const hasVersionToken = /Version\//i.test(ua);
  return isAndroid && (hasWV || (hasChromeMobile && hasVersionToken));
}

export function isInAppWebView(): boolean {
  return isFacebookWebView() || isInstagramWebView() || isTikTokWebView() || isAndroidWebView();
}

interface IabFixOptions {
  disableAnimations?: boolean;
  requireUserInteractionForTrackers?: boolean;
  interactionTimeoutMs?: number;
}

export function initInAppWebViewFix(opts: IabFixOptions = {}) {
  if (!isInAppWebView()) return;

  const {
    disableAnimations = true,
    requireUserInteractionForTrackers = true,
    interactionTimeoutMs = 8000,
  } = opts;

  try {
    if (disableAnimations && typeof document !== 'undefined') {
      const html = document.documentElement;
      const body = document.body;
      html.classList.add('no-motion', 'no-smooth');
      body.classList.add('no-motion', 'no-smooth');
      html.style.scrollBehavior = 'auto';
      body.style.scrollBehavior = 'auto';
    }
  } catch {}

  if (requireUserInteractionForTrackers && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const fire = () => {
      try {
        // Generic + specific events for compatibility
        window.dispatchEvent(new CustomEvent('iab-first-interaction'));
        if (isFacebookWebView()) window.dispatchEvent(new CustomEvent('fbwv-first-interaction'));
        if (isInstagramWebView()) window.dispatchEvent(new CustomEvent('igwv-first-interaction'));
        if (isTikTokWebView()) window.dispatchEvent(new CustomEvent('ttwv-first-interaction'));
      } catch {}
      cleanup();
    };
    const onClick = () => fire();
    const onTouch = () => fire();
    const cleanup = () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('touchstart', onTouch, true);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('touchstart', onTouch, true);

    const t = setTimeout(() => {
      try { fire(); } catch {}
      clearTimeout(t);
    }, Math.max(2000, interactionTimeoutMs));
  }
}
