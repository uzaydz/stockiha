/**
 * مكون حل النطاقات وتحديد نوع النطاق
 */

import { getSubdomainInfo } from './subdomainDetector';
import type { StoreIdentifier } from './types/interfaces';

export class DomainResolver {
  /**
   * تحديد store identifier مع دعم Cloudflare Worker
   */
  static resolveStoreIdentifier(): StoreIdentifier {
    try {
      // استخراج معلومات النطاق الفرعي باستخدام الكاشف المحسن
      const subdomainInfo = getSubdomainInfo();
      
      // إذا كان نطاق فرعي
      if (subdomainInfo.isSubdomain && subdomainInfo.subdomain) {
        return { 
          storeIdentifier: subdomainInfo.subdomain, 
          domainType: 'subdomain' 
        };
      }
      
      // إذا كان النطاق الرئيسي
      if (subdomainInfo.domainType === 'main') {
        return { 
          storeIdentifier: null, 
          domainType: 'localhost' 
        };
      }
      
      // Fallback للطريقة القديمة
      return this.fallbackResolve();
    } catch (error) {
      console.warn('Error in resolveStoreIdentifier:', error);
      return { storeIdentifier: null, domainType: 'localhost' };
    }
  }

  /**
   * الطريقة البديلة لحل النطاق
   */
  private static fallbackResolve(): StoreIdentifier {
    const hostname = window.location.hostname.split(':')[0];
    const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const publicDomains = ['stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];
    
    // فحص النطاقات العامة
    if (publicDomains.includes(hostname)) {
      return { storeIdentifier: null, domainType: 'localhost' };
    }
    
    const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
    const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
    const isCustomDomain = !isLocalhost && !isBaseDomain;

    // للنطاقات المخصصة
    if (isCustomDomain) {
      let cleanHostname = hostname;
      if (cleanHostname.startsWith('www.')) {
        cleanHostname = cleanHostname.substring(4);
      }
      return { storeIdentifier: cleanHostname, domainType: 'custom-domain' };
    }

    // للنطاقات الأساسية
    if (isBaseDomain) {
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
        const cleanSubdomain = parts[0]
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/^-+|-+$/g, '')
          .replace(/-+/g, '-');

        return { storeIdentifier: cleanSubdomain, domainType: 'subdomain' };
      }
    }

    // للنطاقات المحلية
    if (isLocalhost) {
      return this.handleLocalhost(hostname);
    }

    // fallback لـ localStorage
    const stored = localStorage.getItem('bazaar_current_subdomain');
    if (stored && stored !== 'main' && stored !== 'www') {
      return { storeIdentifier: stored, domainType: 'subdomain' };
    }

    return { storeIdentifier: null, domainType: 'localhost' };
  }

  /**
   * معالجة النطاقات المحلية
   */
  private static handleLocalhost(hostname: string): StoreIdentifier {
    // فحص URL parameters للتطوير
    const urlParams = new URLSearchParams(window.location.search);
    const subdomainParam = urlParams.get('subdomain');
    
    if (subdomainParam) {
      return { storeIdentifier: subdomainParam, domainType: 'subdomain' };
    }
    
    if (hostname.includes('localhost')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'localhost') {
        return { storeIdentifier: subdomain, domainType: 'subdomain' };
      }
    }
    
    return { storeIdentifier: null, domainType: 'localhost' };
  }
}
