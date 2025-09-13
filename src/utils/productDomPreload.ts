/**
 * قراءة بيانات المنتج المحمّلة مسبقاً من DOM (حقنها العامل Cloudflare)
 */

export interface DomPreloadedProduct {
  success: boolean;
  product_identifier?: string;
  organization_id?: string | null;
  scope?: string;
  data?: any;
}

export function getPreloadedProductFromDOM(): DomPreloadedProduct | null {
  if (typeof document === 'undefined') return null;
  try {
    const el = document.getElementById('__PRELOADED_PRODUCT__') as HTMLScriptElement | null;
    if (!el || !el.textContent) return null;
    const json = el.textContent.trim();
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && ('data' in parsed || 'success' in parsed)) {
      return parsed as DomPreloadedProduct;
    }
  } catch {
    // ignore
  }
  return null;
}

