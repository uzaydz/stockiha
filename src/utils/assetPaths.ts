/**
 * Helper to resolve static asset paths so they work in both web and Electron builds.
 */
export const resolveAssetPath = (assetPath: string): string => {
  if (!assetPath) return assetPath;

  // Passthrough for absolute URLs (http/https or data URIs)
  if (/^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:')) {
    return assetPath;
  }

  // Guard for non-browser environments (should be rare in this app)
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return assetPath;
  }

  const normalized = assetPath.replace(/^\/+/, '');

  try {
    const protocol = window.location.protocol;
    const isHttp = protocol === 'http:' || protocol === 'https:';

    // Web (http/https): always use root-relative paths so deep routes like /dashboard/... don't break assets.
    if (isHttp) {
      return `/${normalized}`;
    }

    // Desktop (file/custom protocols): keep relative paths.
    return new URL(`./${normalized}`, window.location.href).href;
  } catch {
    // Fallback to original path if URL construction fails for any reason.
    return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  }
};
