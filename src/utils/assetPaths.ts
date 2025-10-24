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
    // new URL handles both http(s) and file protocols correctly.
    return new URL(`./${normalized}`, window.location.href).href;
  } catch {
    // Fallback to original path if URL construction fails for any reason.
    return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  }
};
