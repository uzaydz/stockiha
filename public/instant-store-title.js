/**
 * 🚀 INSTANT STORE TITLE SCRIPT
 * يتم تشغيل هذا الملف فوراً عند تحميل الصفحة لعرض اسم المتجر
 * يجب أن يكون هذا الملف في <head> قبل أي شيء آخر
 */

(function() {
  'use strict';
  
  // الحصول على subdomain
  function getCurrentSubdomain() {
    try {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      if (parts.length > 2 && parts[0] !== 'www' && hostname !== 'localhost') {
        return parts[0];
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // الحصول على اسم المتجر من مصادر مختلفة
  function getInstantStoreName() {
    try {
      const subdomain = getCurrentSubdomain();
      if (!subdomain) return null;
      
      // 1. البحث في sessionStorage أولاً
      try {
        const sessionData = sessionStorage.getItem('store_' + subdomain);
        if (sessionData) {
          const storeInfo = JSON.parse(sessionData);
          if (storeInfo.name) {
            return {
              name: storeInfo.name,
              description: storeInfo.description,
              source: 'sessionStorage'
            };
          }
        }
      } catch (e) {}
      
      // 2. البحث في instant store cache
      try {
        const instantData = sessionStorage.getItem('instant_store_' + subdomain);
        if (instantData) {
          const storeInfo = JSON.parse(instantData);
          if (storeInfo.name) {
            return {
              name: storeInfo.name,
              description: storeInfo.description,
              source: 'instant-cache'
            };
          }
        }
      } catch (e) {}
      
      // 3. البحث في localStorage للمؤسسة
      try {
        const organizationId = localStorage.getItem('bazaar_organization_id');
        if (organizationId) {
          const orgData = localStorage.getItem('bazaar_organization_' + organizationId);
          if (orgData) {
            const parsed = JSON.parse(orgData);
            if (parsed.name && parsed.subdomain === subdomain) {
              return {
                name: parsed.name,
                description: parsed.description,
                source: 'localStorage-org'
              };
            }
          }
          
          const orgSettings = localStorage.getItem('bazaar_org_settings_' + organizationId);
          if (orgSettings) {
            const parsed = JSON.parse(orgSettings);
            if (parsed.site_name) {
              return {
                name: parsed.site_name,
                description: parsed.seo_meta_description,
                source: 'localStorage-settings'
              };
            }
          }
        }
      } catch (e) {}
      
      // 4. البحث في early preload
      try {
        const earlyPreload = localStorage.getItem('early_preload_' + subdomain);
        if (earlyPreload) {
          const data = JSON.parse(earlyPreload);
          const orgDetails = data.data && data.data.organization_details;
          const orgSettings = data.data && data.data.organization_settings;
          
          if ((orgDetails && orgDetails.name) || (orgSettings && orgSettings.site_name)) {
            return {
              name: (orgDetails && orgDetails.name) || (orgSettings && orgSettings.site_name),
              description: (orgDetails && orgDetails.description) || (orgSettings && orgSettings.seo_meta_description),
              source: 'early-preload'
            };
          }
        }
      } catch (e) {}
      
      // 5. استخدام subdomain كاسم احتياطي مع تحسين
      if (subdomain && subdomain.length > 2) {
        // تحويل subdomain إلى اسم أكثر قابلية للقراءة
        let displayName = subdomain;
        
        // إزالة الأرقام والرموز الغريبة
        displayName = displayName.replace(/[0-9\-_]/g, ' ');
        
        // تحويل الحرف الأول إلى capital
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        
        // إضافة "متجر" إذا كان الاسم قصير
        if (displayName.length < 5) {
          displayName = 'متجر ' + displayName;
        }
        
        return {
          name: displayName,
          description: 'متجر إلكتروني متخصص',
          source: 'subdomain'
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // تطبيق اسم المتجر فوراً
  function applyInstantStoreTitle() {
    const storeInfo = getInstantStoreName();
    
    if (storeInfo && storeInfo.name) {
      // تعيين عنوان الصفحة فوراً
      document.title = storeInfo.name;
      
      // إضافة meta description إذا كان متوفراً
      if (storeInfo.description) {
        const existingDescription = document.querySelector('meta[name="description"]');
        if (!existingDescription) {
          const metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          metaDesc.content = storeInfo.description;
          document.head.appendChild(metaDesc);
        }
      }
      
      // حفظ للاستخدام السريع
      const subdomain = getCurrentSubdomain();
      if (subdomain) {
        try {
          sessionStorage.setItem('instant_store_' + subdomain, JSON.stringify({
            name: storeInfo.name,
            description: storeInfo.description,
            timestamp: Date.now()
          }));
        } catch (e) {}
      }
      
      return true;
    }
    
    return false;
  }
  
  // تشغيل فوري
  const success = applyInstantStoreTitle();
  
  // طباعة log للتتبع (يمكن إزالته في الإنتاج)
  if (success) {
    console.log('✅ تم تعيين عنوان المتجر فوراً:', document.title);
  }
  
  // تصدير الدوال للاستخدام من React
  window.__INSTANT_STORE_UTILS__ = {
    getInstantStoreName: getInstantStoreName,
    applyInstantStoreTitle: applyInstantStoreTitle,
    getCurrentSubdomain: getCurrentSubdomain
  };
  
})();
