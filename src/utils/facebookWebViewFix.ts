/**
 * Facebook WebView Fixes: Detect FB in-app browser and apply lighter behavior.
 */

export function isFacebookWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Common FB in-app markers
  return /(FBAN|FBAV|FB_IAB|FB4A|FBIOS)/i.test(ua);
}

interface FbWVFixOptions {
  disableAnimations?: boolean;
  requireUserInteractionForTrackers?: boolean;
  interactionTimeoutMs?: number; // fallback to auto-enable after this timeout
}

export function initFacebookWebViewFix(opts: FbWVFixOptions = {}) {
  if (!isFacebookWebView()) return;

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
        window.dispatchEvent(new CustomEvent('fbwv-first-interaction'));
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

    // Fallback: ensure trackers can load after a timeout even without interaction
    const t = setTimeout(() => {
      try { fire(); } catch {}
      clearTimeout(t);
    }, Math.max(2000, interactionTimeoutMs));
  }
}

