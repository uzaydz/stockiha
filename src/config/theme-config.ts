// تكوين الثيم للمشروع
export const THEME_CONFIG = {
  // النطاقات العامة المعروفة
  PUBLIC_DOMAINS: ['ktobi.online', 'stockiha.com', 'stockiha.pages.dev', 'localhost'],
  
  // الألوان الافتراضية للموقع العام
  DEFAULT_GLOBAL_COLORS: {
    primary: '#fc5a3e',
    secondary: '#6b21a8'
  },
  
  // الألوان الافتراضية للمتاجر
  DEFAULT_STORE_COLORS: {
    primary: '#22c55e',
    secondary: '#16a34a'
  },
  
  // مفاتيح التخزين المحلي
  STORAGE_KEYS: {
    GLOBAL_THEME: 'bazaar_global_theme',
    STORE_THEME: 'bazaar_store_theme',
    ORGANIZATION_THEME: 'bazaar_org_theme',
    ORGANIZATION_ID: 'bazaar_organization_id',
    CURRENT_SUBDOMAIN: 'bazaar_current_subdomain'
  }
};

/**
 * تحديد ما إذا كان النطاق هو نطاق فرعي أو مخصص
 */
export function detectDomainType(hostname: string): {
  type: 'global' | 'store';
  subdomain?: string;
  isLocalhost: boolean;
} {
  const isLocalhost = hostname.includes('localhost') || hostname === '127.0.0.1';
  
  // التحقق من النطاق الفرعي في localhost
  if (isLocalhost) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return {
        type: 'store',
        subdomain: parts[0],
        isLocalhost: true
      };
    }
    return { type: 'global', isLocalhost: true };
  }
  
  // التحقق من النطاق الفرعي أو المخصص
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    const parts = hostname.split('.');
    
    // نطاق فرعي (مثل store.example.com)
    if (parts.length > 2) {
      return {
        type: 'store',
        subdomain: parts[0],
        isLocalhost: false
      };
    }
    
    // نطاق مخصص أو نطاق فرعي من مستوى واحد
    const baseDomain = parts.slice(-2).join('.');
    const isPublicDomain = THEME_CONFIG.PUBLIC_DOMAINS.includes(hostname) || 
                          THEME_CONFIG.PUBLIC_DOMAINS.includes(baseDomain);
    
    if (!isPublicDomain) {
      return {
        type: 'store',
        subdomain: parts[0] !== 'www' ? parts[0] : undefined,
        isLocalhost: false
      };
    }
    
    // نطاق فرعي من نطاق عام
    if (parts[0] !== 'www' && parts.length === 2) {
      return {
        type: 'store',
        subdomain: parts[0],
        isLocalhost: false
      };
    }
  }
  
  return { type: 'global', isLocalhost };
}

/**
 * الحصول على مفتاح التخزين للثيم حسب النطاق
 */
export function getThemeStorageKey(hostname: string): string {
  return `org_theme_${hostname}`;
}
