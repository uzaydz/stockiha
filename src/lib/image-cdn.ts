// Lightweight helper to generate CDN URLs via the Cloudflare Worker /img route

export interface CdnOptions {
  width?: number;
  height?: number;
  quality?: number; // 10-100
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  format?: 'auto' | 'webp' | 'avif';
  dpr?: number; // 1..3
}

function isLocalhost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h.startsWith('127.') || h.endsWith('.localhost');
}

function shouldBypass(src?: string) {
  if (!src) return true;
  if (import.meta.env?.DEV) return true; // use original in dev
  if (isLocalhost()) return true;
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  // Local static assets can load directly
  if (src.startsWith('/') && !src.startsWith('http')) return true;
  return false;
}

export function getCdnImageUrl(src: string, opts: CdnOptions = {}): string {
  const flag = (import.meta as any)?.env?.VITE_ENABLE_IMG_CDN;
  if (flag === 'false') return src;
  if (shouldBypass(src)) return src;
  try {
    const u = new URL(src);
    // Basic allowlist: proxy Supabase and Unsplash by default
    const allow = [
      'supabase.co',
      'images.unsplash.com'
    ];
    if (!allow.some(host => u.hostname.includes(host))) {
      return src; // do not proxy unknown origins
    }
    // Bypass proxy for Unsplash to avoid upstream 502 edge cases from CF resizing
    if (u.hostname.includes('images.unsplash.com')) {
      return src;
    }
  } catch {
    return src;
  }

  const params = new URLSearchParams();
  params.set('url', src);
  if (opts.width) params.set('w', String(Math.max(16, Math.min(2000, opts.width))));
  if (opts.height) params.set('h', String(Math.max(16, Math.min(2000, opts.height))));
  if (opts.quality) params.set('q', String(Math.max(10, Math.min(100, opts.quality))));
  if (opts.fit) params.set('fit', opts.fit);
  if (opts.format) params.set('f', opts.format);
  if (opts.dpr) params.set('dpr', String(Math.max(1, Math.min(3, opts.dpr))));
  return `/img?${params.toString()}`;
}

export function deviceAdjustedWidth(target: number) {
  if (typeof window === 'undefined') return target;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  return Math.min(2000, Math.round(target * dpr));
}
