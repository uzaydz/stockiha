

// 🔍 تتبع بداية التطبيق
const MAIN_START_TIME = performance.now();
console.log(`🚀 [main.tsx] بدء main.tsx - الوقت: ${MAIN_START_TIME.toFixed(2)}ms`);
console.log(`🔍 [main.tsx] معلومات التنقل:`, {
  navigationStart: performance.timing?.navigationStart || 0,
  domContentLoaded: performance.timing?.domContentLoadedEventEnd || 0,
  loadComplete: performance.timing?.loadEventEnd || 0,
  currentTime: performance.now()
});

// ✅ تم تحديث النظام لتحميل جميع صور الألوان دائماً
console.log('✅ [main.tsx] النظام محدث لتحميل جميع صور الألوان');

// ⚡ تحسين: استخدام Promise.all لتحميل متوازي
const startEarlyPreloads = async () => {
  try {
    const [earlyPreloadResult, productPreloadResult] = await Promise.allSettled([
      import('./utils/earlyPreload').then(m => m.startEarlyPreload()),
      // تخطي product page preload هنا لأنه يحتاج إلى معاملات محددة
      Promise.resolve({ success: true, data: null })
    ]);

    if (earlyPreloadResult.status === 'fulfilled' && earlyPreloadResult.value.success) {
      console.log(`✅ [main.tsx] اكتمل early preload في ${earlyPreloadResult.value.executionTime?.toFixed(2)}ms`);
    } else {
      console.warn(`⚠️ [main.tsx] فشل early preload:`, earlyPreloadResult.status === 'rejected' ? earlyPreloadResult.reason : earlyPreloadResult.value?.error);
    }

    if (productPreloadResult.status === 'fulfilled') {
      console.log('✅ [main.tsx] اكتمل product page preload');
    }
  } catch (error) {
    console.warn(`⚠️ [main.tsx] خطأ في preloads:`, error);
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
    const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
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
            console.log('✅ [main.tsx] تم العثور على معرف المؤسسة في localStorage للنطاق المحلي:', parsed.data.organization.id);
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
        console.log('🔍 [main.tsx] محاولة استخراج subdomain من النطاق المخصص:', possibleSubdomain);

        // ابحث في localStorage باستخدام subdomain المستخرج
        const cachedOrg = localStorage.getItem(`early_preload_${possibleSubdomain}`);
        if (cachedOrg) {
          const parsed = JSON.parse(cachedOrg);
          if (parsed.data?.organization?.id) {
            console.log('✅ [main.tsx] تم العثور على معرف المؤسسة في localStorage للنطاق المخصص:', parsed.data.organization.id);
            return parsed.data.organization.id;
          }
        }

        // إذا لم يعمل subdomain، ابحث بالنطاق كاملاً
        const cachedOrgFull = localStorage.getItem(`early_preload_${hostname}`);
        if (cachedOrgFull) {
          const parsed = JSON.parse(cachedOrgFull);
          if (parsed.data?.organization?.id) {
            console.log('✅ [main.tsx] تم العثور على معرف المؤسسة في localStorage للنطاق الكامل:', parsed.data.organization.id);
            return parsed.data.organization.id;
          }
        }
      }
    }

    // ابحث في localStorage العام
    const orgId = localStorage.getItem('bazaar_organization_id');
    if (orgId && orgId.length > 10) {
      console.log('✅ [main.tsx] تم العثور على معرف المؤسسة في localStorage العام:', orgId);
      return orgId;
    }

    return null;
  } catch (error) {
    console.warn('⚠️ [main.tsx] فشل في استخراج معرف المؤسسة:', error);
    return null;
  }
};

// بدء preload صفحة المنتج إذا كان المستخدم في صفحة منتج
const startProductPagePreloadIfNeeded = async () => {
  if (!isProductPage()) {
    console.log('🚫 [main.tsx] المستخدم ليس في صفحة منتج، تخطي preload صفحة المنتج');
    return;
  }

  const productId = extractProductIdFromPath();
  if (!productId) {
    console.log('🚫 [main.tsx] لم يتم العثور على معرف المنتج في المسار');
    return;
  }

  console.log(`🔍 [main.tsx] تم اكتشاف صفحة منتج: ${productId}`);

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
                      console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في المفتاح العام (${generalKey}): ${organizationId}`);
                      break;
                    } else {
                      const generalParsed = JSON.parse(generalData);
                      if (generalParsed.organization_id) {
                        organizationId = generalParsed.organization_id;
                        console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في المفتاح العام (${generalKey}): ${organizationId}`);
                        break;
                      } else if (generalParsed.id) {
                        organizationId = generalParsed.id;
                        console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في المفتاح العام (${generalKey}): ${organizationId}`);
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
              console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في localStorage (${key}): ${organizationId}`);
              break;
            }
          } catch (e) {
            console.warn(`⚠️ [main.tsx] خطأ في قراءة localStorage (${key}):`, e);
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
                console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في sessionStorage (${key}): ${organizationId}`);
                break;
              }
            } catch (e) {
              console.warn(`⚠️ [main.tsx] خطأ في قراءة sessionStorage (${key}):`, e);
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
      console.log('🔍 [main.tsx] البحث في النطاق المخصص باستخدام subdomain:', possibleSubdomain);

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
              console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في النطاق المخصص (${key}): ${organizationId}`);
              break;
            }
          } catch (e) {
            console.warn(`⚠️ [main.tsx] خطأ في قراءة localStorage (${key}):`, e);
          }
        }
      }
    }
  }

  // إضافة debug log لإظهار جميع المفاتيح المتاحة
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [main.tsx] فحص localStorage للمؤسسة:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('org') || key.includes('organization') || key.includes('asray'))) {
        const value = localStorage.getItem(key);
        console.log(`   ${key}: ${value?.substring(0, 100)}...`);
      }
    }
  }

  if (organizationId) {
    console.log(`🚀 [main.tsx] بدء preload صفحة المنتج مباشرة: ${productId} للمؤسسة: ${organizationId}`);

    startProductPagePreload({
      productId,
      organizationId,
      dataScope: 'ultra',
      forceUltraOnly: true // إجبار استخدام ultra فقط
    }).then(result => {
      if (result.success) {
        console.log(`✅ [main.tsx] اكتمل preload صفحة المنتج في ${result.executionTime?.toFixed(2)}ms`);
      } else {
        console.warn(`⚠️ [main.tsx] فشل preload صفحة المنتج:`, result.error);
      }
    }).catch(error => {
      console.warn(`⚠️ [main.tsx] خطأ في preload صفحة المنتج:`, error);
    });
  } else {
    console.log('⏳ [main.tsx] لم يتم العثور على معرف المؤسسة فوراً، محاولة الانتظار والتحقق مرة أخرى...');

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
                  console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في المحاولة الثانية (${key}): ${foundOrgId}`);
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
          console.log('🔍 [main.tsx] البحث في النطاق المخصص في المحاولة الثانية:', possibleSubdomain);

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
                  console.log(`✅ [main.tsx] تم العثور على معرف المؤسسة في النطاق المخصص (${key}): ${foundOrgId}`);
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
        console.log(`🚀 [main.tsx] بدء preload صفحة المنتج بعد انتظار: ${productId} للمؤسسة: ${foundOrgId}`);

        startProductPagePreload({
          productId,
          organizationId: foundOrgId,
          dataScope: 'ultra',
          forceUltraOnly: true // إجبار استخدام ultra فقط
        }).then(result => {
          if (result.success) {
            console.log(`✅ [main.tsx] اكتمل preload صفحة المنتج في ${result.executionTime?.toFixed(2)}ms`);
          } else {
            console.warn(`⚠️ [main.tsx] فشل preload صفحة المنتج:`, result.error);
          }
        }).catch(error => {
          console.warn(`⚠️ [main.tsx] خطأ في preload صفحة المنتج:`, error);
        });
      } else {
        console.log('⏳ [main.tsx] لم يتم العثور على معرف المؤسسة بعد الانتظار، سيتم تحميل المنتج بالطريقة العادية');

        // بدء early preload في الخلفية للحصول على معرف المؤسسة للمرة القادمة
        import('./utils/earlyPreload').then(m => m.startEarlyPreload()).then(result => {
          if (result.success && result.data?.organization?.id) {
            console.log('✅ [main.tsx] تم حفظ معرف المؤسسة للتحميل المبكر في المرات القادمة');
          }
        }).catch(error => {
          console.warn('⚠️ [main.tsx] فشل early preload:', error);
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
      console.log(`🚀 [main.tsx] تم حفظ معرف المؤسسة، بدء preload للمنتج: ${productId} للمؤسسة: ${event.detail.organizationId}`);

      startProductPagePreload({
        productId,
        organizationId: event.detail.organizationId,
        dataScope: 'ultra',
        forceUltraOnly: true // إجبار استخدام ultra فقط
      }).then(result => {
        if (result.success) {
          console.log(`✅ [main.tsx] اكتمل preload صفحة المنتج في ${result.executionTime?.toFixed(2)}ms`);
        } else {
          console.warn(`⚠️ [main.tsx] فشل preload صفحة المنتج:`, result.error);
        }
      }).catch(error => {
        console.warn(`⚠️ [main.tsx] خطأ في preload صفحة المنتج:`, error);
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
console.log(`📦 [main.tsx] انتهاء استيراد React - الوقت: ${REACT_IMPORTS_TIME.toFixed(2)}ms (استغرق: ${(REACT_IMPORTS_TIME - MAIN_START_TIME).toFixed(2)}ms)`);

// 🚫 تعطيل React DevTools Hook مبكراً لتفعيل Fast Refresh
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // التحقق من وجود الخاصية قبل محاولة حذفها
  if (window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    try {
      // محاولة حذف الخاصية بطريقة آمنة
      const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
      if (descriptor && descriptor.configurable) {
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        console.log('✅ [main.tsx] تم حذف __REACT_DEVTOOLS_GLOBAL_HOOK__ بنجاح');
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
        console.log('✅ [main.tsx] تم تعطيل __REACT_DEVTOOLS_GLOBAL_HOOK__ بنجاح');
      } else {
        // إذا كانت الخاصية محمية تماماً، نتجاهلها
        console.log('ℹ️ [main.tsx] __REACT_DEVTOOLS_GLOBAL_HOOK__ محمي - سيتم تجاهله');
      }
    } catch (e) {
      // تجاهل الأخطاء إذا كانت الخاصية محمية
      console.warn('⚠️ [main.tsx] لا يمكن حذف __REACT_DEVTOOLS_GLOBAL_HOOK__:', e);
      
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
          console.log('✅ [main.tsx] تم إعادة تعريف __REACT_DEVTOOLS_GLOBAL_HOOK__ بنجاح');
        } else {
          console.log('ℹ️ [main.tsx] __REACT_DEVTOOLS_GLOBAL_HOOK__ محمي - سيتم تجاهله');
        }
      } catch (disableError) {
        console.log('ℹ️ [main.tsx] __REACT_DEVTOOLS_GLOBAL_HOOK__ محمي - سيتم تجاهله');
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
      console.log('✅ [main.tsx] تم إنشاء __REACT_DEVTOOLS_GLOBAL_HOOK__ فارغ بنجاح');
    } catch (e) {
      console.log('ℹ️ [main.tsx] لا يمكن إنشاء __REACT_DEVTOOLS_GLOBAL_HOOK__ - سيتم تجاهله');
    }
  }
}

// 🎨 تحميل CSS الأساسي أولاً
const CSS_START_TIME = performance.now();
console.log(`🎨 [main.tsx] بدء تحميل CSS - الوقت: ${CSS_START_TIME.toFixed(2)}ms`);
import './index.css';
import './App.css';
const CSS_END_TIME = performance.now();
console.log(`🎨 [main.tsx] انتهاء تحميل CSS - الوقت: ${CSS_END_TIME.toFixed(2)}ms (استغرق: ${(CSS_END_TIME - CSS_START_TIME).toFixed(2)}ms)`);

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
console.log(`🌐 [main.tsx] بدء استيراد Router - الوقت: ${ROUTER_START_TIME.toFixed(2)}ms`);
import { BrowserRouter } from 'react-router-dom';
const ROUTER_END_TIME = performance.now();
console.log(`🌐 [main.tsx] انتهاء استيراد Router - الوقت: ${ROUTER_END_TIME.toFixed(2)}ms (استغرق: ${(ROUTER_END_TIME - ROUTER_START_TIME).toFixed(2)}ms)`);

const APP_START_TIME = performance.now();
console.log(`📱 [main.tsx] بدء استيراد App - الوقت: ${APP_START_TIME.toFixed(2)}ms`);
import App from './App.tsx';
const APP_END_TIME = performance.now();
console.log(`📱 [main.tsx] انتهاء استيراد App - الوقت: ${APP_END_TIME.toFixed(2)}ms (استغرق: ${(APP_END_TIME - APP_START_TIME).toFixed(2)}ms)`);

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
  console.log(`🚀 [main.tsx] بدء رندر التطبيق - الوقت: ${RENDER_START_TIME.toFixed(2)}ms`);
  
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
  console.log(`✅ [main.tsx] انتهاء رندر التطبيق - الوقت: ${RENDER_END_TIME.toFixed(2)}ms (استغرق: ${(RENDER_END_TIME - RENDER_START_TIME).toFixed(2)}ms)`);
  console.log(`📊 [main.tsx] الوقت الإجمالي حتى الرندر: ${(RENDER_END_TIME - MAIN_START_TIME).toFixed(2)}ms`);
  
  // حفظ وقت انتهاء الرندر
  (window as any).__APP_TIMING__.renderEnd = RENDER_END_TIME;
  (window as any).__APP_TIMING__.totalToRender = RENDER_END_TIME - MAIN_START_TIME;

} else {
}

// 🚀 Service Worker الموحد - يحل جميع مشاكل الكاش
if ('serviceWorker' in navigator) {
  // إلغاء تسجيل جميع Service Workers القديمة أولاً
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('🗑️ إلغاء تسجيل Service Worker قديم:', registration.scope);
      registration.unregister();
    });
  });

  // تفعيل Service Worker الموحد في الإنتاج
  if (import.meta.env.PROD) {
    window.addEventListener('load', async () => {
      try {
        console.log('🔧 تسجيل Service Worker الموحد...');

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        console.log('✅ تم تسجيل Service Worker الموحد بنجاح');

        // التعامل مع التحديثات
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('🔄 تم العثور على تحديث للـ Service Worker');

            newWorker.addEventListener('statechange', () => {
              console.log('📊 حالة Service Worker الجديد:', newWorker.state);

              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // إشعار المستخدم بتوفر تحديث
                  console.log('🎉 تحديث Service Worker جاهز، سيتم التطبيق في المرة القادمة');

                  // إرسال رسالة للتفعيل الفوري
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  // أول مرة تثبيت
                  console.log('✅ تم تثبيت Service Worker لأول مرة');
                }
              }
            });
          }
        });

        // الاستماع لتغيير الـ controller
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 تم تفعيل Service Worker الجديد، إعادة تحميل الصفحة...');
          window.location.reload();
        });

        // إضافة دوال للتحكم في الكاش من التطبيق
        (window as any).serviceWorkerCache = {
          // الحصول على إحصائيات الكاش
          getStats: () => {
            return new Promise((resolve) => {
              if (navigator.serviceWorker.controller) {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => resolve(event.data);
                navigator.serviceWorker.controller.postMessage(
                  { type: 'GET_CACHE_STATS' },
                  [channel.port2]
                );
              } else {
                resolve({ error: 'لا يوجد Service Worker نشط' });
              }
            });
          },

          // مسح جميع الكاش
          clearAll: () => {
            return new Promise((resolve) => {
              if (navigator.serviceWorker.controller) {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => resolve(event.data);
                navigator.serviceWorker.controller.postMessage(
                  { type: 'CLEAR_CACHE' },
                  [channel.port2]
                );
              } else {
                resolve({ error: 'لا يوجد Service Worker نشط' });
              }
            });
          },

          // إبطال كاش بنمط معين
          invalidatePattern: (pattern: string) => {
            return new Promise((resolve) => {
              if (navigator.serviceWorker.controller) {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => resolve(event.data);
                navigator.serviceWorker.controller.postMessage(
                  { type: 'INVALIDATE_CACHE_PATTERN', pattern },
                  [channel.port2]
                );
              } else {
                resolve({ error: 'لا يوجد Service Worker نشط' });
              }
            });
          }
        };

        console.log('🎯 تم إضافة دوال التحكم في الكاش للـ window');

      } catch (error) {
        console.error('❌ خطأ في تسجيل Service Worker:', error);
      }
    });
  } else {
    console.log('ℹ️ Service Worker معطل في وضع التطوير');
  }
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

// Defer non-critical systems
setTimeout(() => {

}, 500);

