/**
 * Store URL utilities for building tracking and store URLs
 */

/**
 * Build a tracking URL for store analytics
 * @param storeId - The store identifier
 * @param action - The action being tracked
 * @param params - Additional parameters
 * @returns The tracking URL
 */
export function buildTrackingUrl(
  storeId: string,
  action: string,
  params: Record<string, string> = {}
): string {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://stockiha.com' 
    : 'http://localhost:8080';
  
  const searchParams = new URLSearchParams({
    store_id: storeId,
    action,
    ...params,
    timestamp: Date.now().toString()
  });
  
  return `${baseUrl}/track?${searchParams.toString()}`;
}

/**
 * Build a store URL for a specific store
 * @param subdomain - The store subdomain
 * @param path - Optional path within the store
 * @returns The store URL
 */
export function buildStoreUrl(subdomain: string, path: string = ''): string {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${subdomain}.stockiha.com`
    : `http://${subdomain}.localhost:8080`;
  
  return path ? `${baseUrl}/${path}` : baseUrl;
}

/**
 * Extract store information from a URL
 * @param url - The URL to parse
 * @returns Store information or null if not a store URL
 */
export function parseStoreUrl(url: string): { subdomain: string; path: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's a store subdomain
    if (hostname.includes('.stockiha.com') || hostname.includes('.localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return {
          subdomain: parts[0],
          path: urlObj.pathname
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
