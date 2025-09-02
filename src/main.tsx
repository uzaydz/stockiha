// 🔍 تتبع بداية التطبيق
const MAIN_START_TIME = performance.now();

// ✅ تم تحديث النظام لتحميل جميع صور الألوان دائماً

// ⚡ تحسين: استخدام Promise.all لتحميل متوازي
const startEarlyPreloads = async () => {
  try {
    // 🔥 إضافة منطق خاص للتعامل مع نطاقات Cloudflare Pages التلقائية
    const hostname = window.location.hostname;
    if (hostname.endsWith('.stockiha.pages.dev')) {
      const parts = hostname.split('.');
      if (parts.length === 3 && parts[0] && parts[0] !== 'www') {
        // التحقق من أن الجزء الأول هو hash عشوائي (8 أحرف hex)
        const firstPart = parts[0];
        if (/^[a-f0-9]{8}$/i.test(firstPart)) {
          // هذا نطاق Cloudflare Pages تلقائي - لا نبدأ preload
          console.log('🚫 [main.tsx] نطاق Cloudflare Pages تلقائي - تخطي preload');
          return;
        }
      }
    }
    
    const [earlyPreloadResult, productPreloadResult] = await Promise.allSettled([
      import('./utils/earlyPreload').then(m => m.startEarlyPreload()),
      // تخطي product page preload هنا لأنه يحتاج إلى معاملات محددة
      Promise.resolve({ success: true, data: null })
    ]);

    if (earlyPreloadResult.status === 'fulfilled' && earlyPreloadResult.value.success) {
    } else {
    }

    if (productPreloadResult.status === 'fulfilled') {
    }
  } catch (error) {
  }
};

// 🚀 بدء preloads بشكل متوازي
startEarlyPreloads();

// 🚀 بدء preload صفحة المنتج إذا كان المستخدم في صفحة منتج
import { startProductPagePreload } from './utils/productPagePreloader';

// دالة كشف ما إذا كان المستخدم في صفحة منتج
const isProductPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const pathname = window.location.pathname;
  return pathname.includes('/product-purchase-max-v2/') || 
         pathname.includes('/product-purchase/') ||
         pathname.includes('/product/');
};

// دالة استخراج معرف المنتج من المسار
const extractProductIdFromPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const pathname = window.location.pathname;
  const productMatch = pathname.match(/\/(?:product-purchase-max-v2|product-purchase|product)\/([^\/]+)/);
  return productMatch ? productMatch[1] : null;
};

// دالة استخراج معرف المؤسسة من النطاق
const extractOrganizationIdFromDomain = async (): Promise<string | null> => {
  try {
    const hostname = window.location.hostname;
    
    // 🔥 إضافة منطق خاص للتعامل مع نطاقات Cloudflare Pages التلقائية
    if (hostname.endsWith('.stockiha.pages.dev')) {
      const parts = hostname.split('.');
      if (parts.length === 3 && parts[0] && parts[0] !== 'www') {
        // التحقق من أن الجزء الأول هو hash عشوائي (8 أحرف hex)
        const firstPart = parts[0];
        if (/^[a-f0-9]{8}$/i.test(firstPart)) {
          // هذا نطاق Cloudflare Pages تلقائي - لا نعتبره متجر
          return null;
        }
      }
    }
    
    const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com', '.stockiha.pages.dev'];
    const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
    const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
    const isCustomDomain = !isLocalhost && !isBaseDomain;

    // إذا كان localhost، استخرج subdomain
    if (isLocalhost && hostname.includes('localhost')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'localhost') {
        // استخدم localStorage للحصول على معرف المؤسسة
        const cachedOrg = localStorage.getItem(`early_preload_${subdomain}`);
        if (cachedOrg) {
          const parsed = JSON.parse(cachedOrg);
          // استخرج معرف المؤسسة من البيانات المحفوظة
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }
      }
    }

    // للنطاقات المخصصة، نحاول استخراج subdomain أولاً
    if (isCustomDomain) {
      const domainParts = hostname.split('.');
      if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
        const possibleSubdomain = domainParts[0].toLowerCase().trim();

        // ابحث في localStorage باستخدام subdomain المستخرج
        const cachedOrg = localStorage.getItem(`early_preload_${possibleSubdomain}`);
        if (cachedOrg) {
          const parsed = JSON.parse(cachedOrg);
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }

        // إذا لم يعمل subdomain، ابحث بالنطاق كاملاً
        const cachedOrgFull = localStorage.getItem(`early_preload_${hostname}`);
        if (cachedOrgFull) {
          const parsed = JSON.parse(cachedOrgFull);
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }
      }
    }

    // ابحث في localStorage العام
    const orgId = localStorage.getItem('bazaar_organization_id');
    if (orgId && orgId.length > 10) {
      return orgId;
    }

    return null;
  } catch (error) {
    return null;
  }
};

// بدء preload صفحة المنتج إذا كان المستخدم في صفحة منتج
const startProductPagePreloadIfNeeded = async () => {
  if (!isProductPage()) {
    return;
  }

  const productId = extractProductIdFromPath();
  if (!productId) {
    return;
  }

  // بدء preload مباشرة بمجرد الحصول على معرف المؤسسة من localStorage
  const hostname = window.location.hostname;
  let organizationId: string | null = null;

  // تحديد نوع النطاق
  const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
  const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
  const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
  const isCustomDomain = !isLocalhost && !isBaseDomain;

  if (isLocalhost && hostname.includes('localhost')) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost') {
      // محاولة البحث في عدة أماكن في localStorage
      const subdomainKeys = [
        `early_preload_${subdomain}`,
        `organization_data_${subdomain}`,
        `org_${subdomain}`,
        `store_init_data_${subdomain}`,
        `bazaar_organization_${subdomain}`,
        `organization_${subdomain}`,
        `org_data_${subdomain}`
      ];

      const generalKeys = [
        `bazaar_organization_id`, // المفتاح الرئيسي المستخدم في النظام
        `organization_id`,
        `current_org_id`,
        `current_organization`
      ];

      const possibleKeys = [...subdomainKeys, ...generalKeys];

      for (const key of possibleKeys) {
        const cachedData = localStorage.getItem(key);
        if (cachedData) {
          try {
            let foundOrgId = null;

            // معالجة خاصة لمفاتيح تحتوي على string مباشرة
            if (key === 'bazaar_organization_id' && typeof cachedData === 'string' && cachedData.length > 10) {
              // هذا المفتاح يحتوي على معرف المؤسسة مباشرة
              foundOrgId = cachedData;
            } else {
              // محاولة تحليل JSON للمفاتيح الأخرى
              const parsed = JSON.parse(cachedData);

              // البحث عن معرف المؤسسة في أماكن مختلفة
              if (parsed.data?.organization?.id) {
                foundOrgId = parsed.data.organization.id;
              } else if (parsed.organization_id) {
                foundOrgId = parsed.organization_id;
              } else if (parsed.organization?.id) {
                foundOrgId = parsed.organization.id;
              } else if (parsed.id) {
                foundOrgId = parsed.id;
              } else if (typeof parsed === 'string' && parsed.length > 10) {
                // إذا كان المفتاح يحتوي على معرف المؤسسة مباشرة
                foundOrgId = parsed;
              }
            }

            // البحث في المفاتيح العامة إذا لم نجد في subdomain
            if (!organizationId && key === possibleKeys[possibleKeys.length - 1]) {
              // البحث في جميع المفاتيح العامة
              for (const generalKey of generalKeys) {
                const generalData = localStorage.getItem(generalKey);
                if (generalData) {
                  try {
                    if (generalKey === 'bazaar_organization_id') {
                      // هذا المفتاح يحتوي على المعرف مباشرة
                      organizationId = generalData;
                      break;
                    } else {
                      const generalParsed = JSON.parse(generalData);
                      if (generalParsed.organization_id) {
                        organizationId = generalParsed.organization_id;
                        break;
                      } else if (generalParsed.id) {
                        organizationId = generalParsed.id;
                        break;
                      }
                    }
                  } catch (e) {
                    // console.warn(`⚠️ خطأ في قراءة المفتاح العام ${generalKey}:`, e);
                  }
                }
              }
            }

            if (foundOrgId) {
              organizationId = foundOrgId;
              break;
            }
          } catch (e) {
          }
        }
      }

      // إذا لم نجد في localStorage، نبحث في sessionStorage أيضاً
      if (!organizationId) {
        for (const key of possibleKeys) {
          const sessionData = sessionStorage.getItem(key);
          if (sessionData) {
            try {
              const parsed = JSON.parse(sessionData);
              let foundOrgId = null;

              if (parsed.data?.organization?.id) {
                foundOrgId = parsed.data.organization.id;
              } else if (parsed.organization_id) {
                foundOrgId = parsed.organization_id;
              } else if (parsed.organization?.id) {
                foundOrgId = parsed.organization.id;
              } else if (parsed.id) {
                foundOrgId = parsed.id;
              }

              if (foundOrgId) {
                organizationId = foundOrgId;
                break;
              }
            } catch (e) {
            }
          }
        }
      }
    }
  }

  // البحث في النطاقات المخصصة
  if (!organizationId && isCustomDomain) {
    const domainParts = hostname.split('.');
    if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
      const possibleSubdomain = domainParts[0].toLowerCase().trim();

      // محاولة البحث في عدة أماكن في localStorage للنطاق المخصص
      const customDomainKeys = [
        `early_preload_${possibleSubdomain}`,
        `organization_data_${possibleSubdomain}`,
        `org_${possibleSubdomain}`,
        `store_init_data_${possibleSubdomain}`,
        `bazaar_organization_${possibleSubdomain}`,
        `organization_${possibleSubdomain}`,
        `org_data_${possibleSubdomain}`,
        // البحث بالنطاق كاملاً أيضاً
        `early_preload_${hostname}`,
        `organization_data_${hostname}`,
        `org_${hostname}`,
        `store_init_data_${hostname}`,
        `bazaar_organization_${hostname}`,
        `organization_${hostname}`,
        `org_data_${hostname}`
      ];

      for (const key of customDomainKeys) {
        const cachedData = localStorage.getItem(key);
        if (cachedData) {
          try {
            let foundOrgId = null;

            // معالجة خاصة لمفاتيح تحتوي على string مباشرة
            if (key === 'bazaar_organization_id' && typeof cachedData === 'string' && cachedData.length > 10) {
              foundOrgId = cachedData;
            } else {
              // محاولة تحليل JSON للمفاتيح الأخرى
              const parsed = JSON.parse(cachedData);

              // البحث عن معرف المؤسسة في أماكن مختلفة
              if (parsed.data?.organization?.id) {
                foundOrgId = parsed.data.organization.id;
              } else if (parsed.organization_id) {
                foundOrgId = parsed.organization_id;
              } else if (parsed.organization?.id) {
                foundOrgId = parsed.organization.id;
              } else if (parsed.id) {
                foundOrgId = parsed.id;
              } else if (typeof parsed === 'string' && parsed.length > 10) {
                foundOrgId = parsed;
              }
            }

            if (foundOrgId) {
              organizationId = foundOrgId;
              break;
            }
          } catch (e) {
          }
        }
      }
    }
  }

  // إضافة debug log لإظهار جميع المفاتيح المتاحة
  if (process.env.NODE_ENV === 'development') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('org') || key.includes('organization') || key.includes('asray'))) {
        const value = localStorage.getItem(key);
      }
    }
  }

  if (organizationId) {

    startProductPagePreload({
      productId,
      organizationId,
      dataScope: 'ultra',
      forceUltraOnly: true // إجبار استخدام ultra فقط
    }).then(result => {
      if (result.success) {
      } else {
      }
    }).catch(error => {
    });
  } else {

    // انتظار قصير ثم محاولة مرة أخرى
    setTimeout(async () => {
      let foundOrgId = null;

      // البحث في localhost
      if (hostname.includes('localhost')) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'localhost') {
          const subdomainKeys = [
            `early_preload_${subdomain}`,
            `organization_data_${subdomain}`,
            `org_${subdomain}`,
            `store_init_data_${subdomain}`,
            `bazaar_organization_${subdomain}`,
            `organization_${subdomain}`,
            `org_data_${subdomain}`
          ];

          const generalKeys = [
            `bazaar_organization_id`,
            `organization_id`,
            `current_org_id`,
            `current_organization`
          ];

          const possibleKeys = [...subdomainKeys, ...generalKeys];

          for (const key of possibleKeys) {
            const cachedData = localStorage.getItem(key);
            if (cachedData) {
              try {
                // معالجة خاصة لمفاتيح تحتوي على string مباشرة
                if (key === 'bazaar_organization_id' && typeof cachedData === 'string' && cachedData.length > 10) {
                  foundOrgId = cachedData;
                } else {
                  // محاولة تحليل JSON للمفاتيح الأخرى
                  const parsed = JSON.parse(cachedData);

                  if (parsed.data?.organization?.id) {
                    foundOrgId = parsed.data.organization.id;
                  } else if (parsed.organization_id) {
                    foundOrgId = parsed.organization_id;
                  } else if (parsed.organization?.id) {
                    foundOrgId = parsed.organization.id;
                  } else if (parsed.id) {
                    foundOrgId = parsed.id;
                  } else if (typeof parsed === 'string' && parsed.length > 10) {
                    foundOrgId = parsed;
                  }
                }

                if (foundOrgId) {
                  break;
                }
              } catch (e) {
                // console.warn(`⚠️ خطأ في قراءة ${key}:`, e);
              }
            }
          }
        }
      }

      // البحث في النطاقات المخصصة إذا لم نجد في localhost
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      if (!foundOrgId && isCustomDomain) {
        const domainParts = hostname.split('.');
        if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
          const possibleSubdomain = domainParts[0].toLowerCase().trim();

          const customDomainKeys = [
            `early_preload_${possibleSubdomain}`,
            `organization_data_${possibleSubdomain}`,
            `org_${possibleSubdomain}`,
            `store_init_data_${possibleSubdomain}`,
            `bazaar_organization_${possibleSubdomain}`,
            `organization_${possibleSubdomain}`,
            `org_data_${possibleSubdomain}`,
            // البحث بالنطاق كاملاً أيضاً
            `early_preload_${hostname}`,
            `organization_data_${hostname}`,
            `org_${hostname}`,
            `store_init_data_${hostname}`,
            `bazaar_organization_${hostname}`,
            `organization_${hostname}`,
            `org_data_${hostname}`
          ];

          for (const key of customDomainKeys) {
            const cachedData = localStorage.getItem(key);
            if (cachedData) {
              try {
                let foundOrgIdCustom = null;

                // معالجة خاصة لمفاتيح تحتوي على string مباشرة
                if (key === 'bazaar_organization_id' && typeof cachedData === 'string' && cachedData.length > 10) {
                  foundOrgIdCustom = cachedData;
                } else {
                  // محاولة تحليل JSON للمفاتيح الأخرى
                  const parsed = JSON.parse(cachedData);

                  if (parsed.data?.organization?.id) {
                    foundOrgIdCustom = parsed.data.organization.id;
                  } else if (parsed.organization_id) {
                    foundOrgIdCustom = parsed.organization_id;
                  } else if (parsed.organization?.id) {
                    foundOrgIdCustom = parsed.organization.id;
                  } else if (parsed.id) {
                    foundOrgIdCustom = parsed.id;
                  } else if (typeof parsed === 'string' && parsed.length > 10) {
                    foundOrgIdCustom = parsed;
                  }
                }

                if (foundOrgIdCustom) {
                  foundOrgId = foundOrgIdCustom;
                  break;
                }
              } catch (e) {
                // console.warn(`⚠️ خطأ في قراءة ${key}:`, e);
              }
            }
          }
        }
      }

      if (foundOrgId) {

        startProductPagePreload({
          productId,
          organizationId: foundOrgId,
          dataScope: 'ultra',
          forceUltraOnly: true // إجبار استخدام ultra فقط
        }).then(result => {
          if (result.success) {
          } else {
          }
        }).catch(error => {
        });
      } else {

        // بدء early preload في الخلفية للحصول على معرف المؤسسة للمرة القادمة
        import('./utils/earlyPreload').then(m => m.startEarlyPreload()).then(result => {
          if (result.success && result.data?.organization?.id) {
          }
        }).catch(error => {
        });
      }
    }, 500); // انتظار 500ms ثم المحاولة مرة أخرى
  }
};

// إضافة event listener للاستماع لحفظ بيانات المؤسسة
const handleOrganizationDataSaved = (event: any) => {
  if (event.detail?.organizationId && isProductPage()) {
    const productId = extractProductIdFromPath();
    if (productId) {

      startProductPagePreload({
        productId,
        organizationId: event.detail.organizationId,
        dataScope: 'ultra',
        forceUltraOnly: true // إجبار استخدام ultra فقط
      }).then(result => {
        if (result.success) {
        } else {
        }
      }).catch(error => {
      });
    }
  }
};

// الاستماع لأحداث حفظ بيانات المؤسسة
window.addEventListener('organizationDataSaved', handleOrganizationDataSaved);
window.addEventListener('domain-detected', handleOrganizationDataSaved);

// بدء preload صفحة المنتج
startProductPagePreloadIfNeeded();

// 🌍 تهيئة i18n مبكراً لحل مشكلة useTranslation
import './i18n/index';

// 🚀 Core React - Essential Only
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

// 🔍 تتبع انتهاء الاستيراد الأساسي
const REACT_IMPORTS_TIME = performance.now();

// 🚫 تعطيل React DevTools Hook مبكراً لتفعيل Fast Refresh
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // التحقق من وجود الخاصية قبل محاولة حذفها
  if (window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    try {
      // محاولة حذف الخاصية بطريقة آمنة
      const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
      if (descriptor && descriptor.configurable) {
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      } else if (descriptor && descriptor.writable) {
        // إذا كانت الخاصية قابلة للكتابة، نقوم بتعطيلها
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          isDisabled: true,
          supportsFiber: false,
          supportsProfiling: false,
          inject: () => {},
          on: () => {},
          off: () => {},
          sub: () => {},
          rendererPackageName: 'react-dom',
          version: '18.0.0',
          rendererConfig: {},
          hook: null
        };
      } else {
        // إذا كانت الخاصية محمية تماماً، نتجاهلها
      }
    } catch (e) {
      // تجاهل الأخطاء إذا كانت الخاصية محمية
      
      // محاولة تعطيلها بطريقة أخرى
      try {
        // محاولة إعادة تعريف الخاصية إذا كانت قابلة للإعادة التعريف
        const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
        if (descriptor && descriptor.configurable) {
          Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
            value: {
              isDisabled: true,
              supportsFiber: false,
              supportsProfiling: false,
              inject: () => {},
              on: () => {},
              off: () => {},
              sub: () => {},
              rendererPackageName: 'react-dom',
              version: '18.0.0',
              rendererConfig: {},
              hook: null
            },
            writable: false,
            configurable: false
          });
        } else {
        }
      } catch (disableError) {
      }
    }
  }
  
  // إنشاء hook فارغ فقط إذا لم يكن موجوداً بالفعل
  if (!window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    try {
      Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        value: {
          isDisabled: true,
          supportsFiber: false,
          supportsProfiling: false,
          inject: () => {},
          on: () => {},
          off: () => {},
          sub: () => {},
          rendererPackageName: 'react-dom',
          version: '18.0.0',
          rendererConfig: {},
          hook: null
        },
        writable: true,
        configurable: true
      });
    } catch (e) {
    }
  }
}

// 🎨 تحميل CSS الأساسي أولاً
const CSS_START_TIME = performance.now();
import './index.css';
import './App.css';
const CSS_END_TIME = performance.now();

// 🔤 Font Loading Optimization - CSS فقط، بدون JavaScript
document.documentElement.classList.add('font-loading');

// تحقق سريع من تحميل الخطوط
document.fonts.ready.then(() => {
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-loaded');
}).catch(() => {
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-error');
});
const ROUTER_START_TIME = performance.now();
import { BrowserRouter } from 'react-router-dom';
const ROUTER_END_TIME = performance.now();

const APP_START_TIME = performance.now();
import App from './App.tsx';
const APP_END_TIME = performance.now();

// 🔧 Make React globally available if needed
(window as any).React = React;

// ⚡ Essential polyfills only
import './lib/polyfills';

// 🚫 نظام منع الطلبات المتكررة - يجب أن يحمل أولاً
import { initializeRequestBlocker } from './lib/requestBlocker';

// 📊 نظام إدارة preload لمنع التحذيرات
import './lib/preloadManager';

// 🔧 إضافة polyfill لـ requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = function(callback: any, options?: any) {
    const start = Date.now();
    return setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: function() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };
  
  (window as any).cancelIdleCallback = function(id: any) {
    clearTimeout(id);
  };
}

// 🚀 تطبيق تحسينات الأداء فوراً
const initPerformanceOptimizations = () => {
  // تقليل console errors في production
  if (import.meta.env.PROD) {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      
      // تجاهل أخطاء WebSocket و HMR في production
      if (
        message.includes('websocket') ||
        message.includes('hmr') ||
        message.includes('vite') ||
        message.includes('failed to connect')
      ) {
        return;
      }
      
      // عرض الأخطاء الأخرى
      originalError.apply(console, args);
    };
  }

  // تحسين CSS loading
  if (typeof window !== 'undefined') {
    // منع FOUC (Flash of Unstyled Content)
    document.documentElement.style.visibility = 'visible';
    
    // تطبيق الخطوط فوراً لخفض LCP
    const applyFonts = () => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // تطبيق الخطوط
          document.body.classList.add('tajawal-forced');
        });
      } else {
        // fallback للمتصفحات القديمة
        setTimeout(() => {
          document.body.classList.add('tajawal-forced');
        }, 25); // ✅ تقليل من 50ms إلى 25ms لتحسين الأداء
      }
    };
    
    // استخدام requestIdleCallback إذا كان متوفراً، وإلا استخدم setTimeout
    if (window.requestIdleCallback) {
      window.requestIdleCallback(applyFonts, { timeout: 0 }); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    } else {
      setTimeout(applyFonts, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    }
  }
};

initPerformanceOptimizations();

// 🚫 تفعيل نظام منع الطلبات المتكررة
initializeRequestBlocker();

// تم نقل إدارة QueryClient إلى SmartProviderWrapper باستخدام '@/lib/config/queryClient'

// 🌐 Browser Router Configuration
const browserRouterOptions = {
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  basename: '/'
};

// تمت إزالة مزودات غير مستخدمة من ملف الإقلاع لتقليل حجم الحزمة

// 🎯 Essential Providers Only - تنظيف التكرار مع SmartProviderWrapper
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter future={browserRouterOptions.future}>
      {/* إزالة المزودين المكررين - SmartProviderWrapper سيتولاهم */}
      {children}
    </BrowserRouter>
  );
};

// 🎨 Render Application
const rootElement = document.getElementById('root');
let root = (rootElement as any)?.__reactRootContainer;

if (rootElement && !root) {
  root = ReactDOM.createRoot(rootElement);
  (rootElement as any).__reactRootContainer = root;
}

if (root) {
  const RENDER_START_TIME = performance.now();
  
  // حفظ الأوقات عالمياً
  (window as any).__APP_TIMING__ = {
    mainStart: MAIN_START_TIME,
    reactImports: REACT_IMPORTS_TIME,
    cssLoad: CSS_END_TIME - CSS_START_TIME,
    routerLoad: ROUTER_END_TIME - ROUTER_START_TIME,
    appLoad: APP_END_TIME - APP_START_TIME,
    renderStart: RENDER_START_TIME,
    totalBeforeRender: RENDER_START_TIME - MAIN_START_TIME
  };
  
  // إزالة فرض الخط عبر الجافاسكربت لضمان اتساق CSS
  
  // عرض التطبيق فوراً - بدون StrictMode في التطوير
  if (import.meta.env.DEV) {
    // في التطوير: بدون StrictMode لتقليل إعادة الرندر
    root.render(
      <AppProviders>
        <App />
      </AppProviders>
    );
  } else {
    // في الإنتاج: مع StrictMode للأمان
    root.render(
      <StrictMode>
        <AppProviders>
          <App />
        </AppProviders>
      </StrictMode>
    );
  }
  
  const RENDER_END_TIME = performance.now();
  
  // حفظ وقت انتهاء الرندر
  (window as any).__APP_TIMING__.renderEnd = RENDER_END_TIME;
  (window as any).__APP_TIMING__.totalToRender = RENDER_END_TIME - MAIN_START_TIME;

} else {
}

// 🚀 تنظيف Service Workers القديمة (تم حذف Service Worker لأنه يسبب مشاكل في الأداء)
if ('serviceWorker' in navigator) {
  // إلغاء تسجيل جميع Service Workers القديمة أولاً
  navigator.serviceWorker.getRegistrations().then(registrations => {
    const hasActiveWorkers = registrations.length > 0;
    registrations.forEach(registration => {
      console.log('🗑️ إلغاء تسجيل Service Worker:', registration.scope);
      registration.unregister();
    });

    // إذا كان هناك Service Workers نشطة، أعد تحميل الصفحة
    if (hasActiveWorkers) {
      console.log('🔄 إعادة تحميل الصفحة لإزالة Service Worker القديم...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  // أداة تنظيف Service Worker متاحة عبر console
  (window as any).clearServiceWorkers = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log(`🗑️ العثور على ${registrations.length} Service Worker`);
        registrations.forEach((registration, index) => {
          console.log(`🗑️ إلغاء تسجيل SW ${index + 1}:`, registration.scope);
          registration.unregister().then(() => {
            console.log(`✅ تم إلغاء تسجيل SW ${index + 1}`);
          });
        });
        if (registrations.length > 0) {
          console.log('🔄 أعد تحميل الصفحة يدوياً أو انتظر إعادة التحميل التلقائي');
        }
      });
    } else {
      console.log('🚫 Service Worker غير مدعوم');
    }
  };

  console.log('💡 استخدم clearServiceWorkers() في console لتنظيف Service Worker يدوياً');
}

// 🚀 تأجيل الأنظمة غير الحرجة لما بعد التفاعل الأول
const deferNonCriticalSystems = () => {
  // إزالة تأجيل i18n لحل مشكلة useTranslation
  // import('./i18n/index').catch(() => {});
  import('./lib/themeManager').then(({ applyInstantTheme }) => {
    applyInstantTheme();
  }).catch(() => {});
};

// استخدام requestIdleCallback إذا كان متوفراً، وإلا استخدم setTimeout
if (typeof window !== 'undefined') {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(deferNonCriticalSystems, { timeout: 500 }); // زيادة لتحسين LCP
  } else {
    setTimeout(deferNonCriticalSystems, 500); // زيادة لتحسين LCP
  }
}

// 🔌 تحميل Supabase عند الطلب فقط لتقليل LCP
// (window as any).loadSupabase = () => {
//   return import('./lib/supabase-unified')
//     .then(({ getSupabaseClient }) => getSupabaseClient())
//     .catch(() => undefined);
// };

// تأجيل تحميل Supabase حتى بعد اكتمال التطبيق
setTimeout(() => {
  (window as any).loadSupabase = () => {
    return import('./lib/supabase-unified')
      .then(({ getSupabaseClient }) => getSupabaseClient())
      .catch(() => undefined);
  };
}, 1000); // زيادة إلى 1000ms لتحسين LCP

// 🛡️ تهيئة معالج أخطاء CSP
setTimeout(() => {
  import('./utils/cspErrorHandler').then(({ initCSPErrorHandler }) => {
    try {
      initCSPErrorHandler();
      console.log('🛡️ CSP Error Handler initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize CSP Error Handler:', error);
    }
  }).catch(() => {
    console.warn('CSP Error Handler module not found');
  });
}, 500);

// 📱 تهيئة إصلاحات Instagram WebView
setTimeout(() => {
  import('./utils/instagramWebViewFix').then(({ initInstagramWebViewFix, isInstagramWebView, getInstagramWebViewInfo }) => {
    try {
      // فحص ما إذا كان المتصفح Instagram WebView
      if (isInstagramWebView()) {
        console.log('📱 Initializing Instagram WebView fixes...');

        // عرض معلومات Instagram WebView للتطوير
        if (process.env.NODE_ENV === 'development') {
          const info = getInstagramWebViewInfo();
          console.log('📱 Instagram WebView Info:', info);
        }

        // تهيئة الإصلاحات
        initInstagramWebViewFix({
          enableChunkRetry: true,
          maxRetryAttempts: 3,
          retryDelay: 2000,
          bundleSizeThreshold: 500 * 1024, // 500KB
          enableServiceWorkerFix: true,
          enableCSPFix: true
        });

        console.log('✅ Instagram WebView fixes initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize Instagram WebView fixes:', error);
    }
  }).catch(() => {
    console.warn('Instagram WebView Fix module not found');
  });
}, 300);

// Defer non-critical systems
setTimeout(() => {

}, 500);
