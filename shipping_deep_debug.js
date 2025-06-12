// ===================================================================
// تشخيص شامل لمشكلة أسعار الشحن - تشغيل في console المتصفح
// ===================================================================

// 1. فحص التخزين المؤقت بتفصيل أكبر
const allLocalStorage = Object.keys(localStorage);
const allSessionStorage = Object.keys(sessionStorage);

// البحث عن أي مفاتيح تحتوي على shipping أو fee أو cache
const shippingRelated = allLocalStorage.filter(k => 
  k.toLowerCase().includes('shipping') || 
  k.toLowerCase().includes('fee') || 
  k.toLowerCase().includes('cache')
);

// 2. اختبار مباشر لدالة قاعدة البيانات

// محاولة الوصول لـ Supabase client
const testDatabaseFunction = async () => {
  try {
    // البحث عن Supabase client في المتغيرات العامة
    let supabase;
    if (window.supabase) {
      supabase = window.supabase;
    } else if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
    } else {
      return;
    }

    // اختبار الدالة مباشرة
    const testCases = [
      { orgId: 'fed872f9-1ade-4351-b020-5598fda976fe', wilayaId: 5, municipalityId: 515, deliveryType: 'home' },
      { orgId: 'fed872f9-1ade-4351-b020-5598fda976fe', wilayaId: 5, municipalityId: 515, deliveryType: 'desk' },
      { orgId: 'fed872f9-1ade-4351-b020-5598fda976fe', wilayaId: 14, municipalityId: 1401, deliveryType: 'home' },
      { orgId: 'fed872f9-1ade-4351-b020-5598fda976fe', wilayaId: 14, municipalityId: 1401, deliveryType: 'desk' }
    ];

    for (const testCase of testCases) {
      
      const { data, error } = await supabase.rpc('calculate_shipping_fee', {
        organization_id: testCase.orgId,
        to_wilaya_id: testCase.wilayaId,
        to_municipality_id: testCase.municipalityId,
        delivery_type: testCase.deliveryType,
        weight: 1,
        shipping_provider_clone_id: null
      });

    }

  } catch (error) {
  }
};

// 3. فحص بيانات yalidine_fees مباشرة
const checkYalidineFeesData = async () => {
  try {
    let supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from('yalidine_fees')
      .select('*')
      .eq('from_wilaya_id', 40)
      .in('to_wilaya_id', [5, 14])
      .in('commune_id', [515, 1401])
      .limit(10);

  } catch (error) {
  }
};

// 4. فحص إعدادات yalidine_settings
const checkYalidineSettings = async () => {
  try {
    let supabase = window.supabase || window.__SUPABASE_CLIENT__;
    if (!supabase) return;

    const { data, error } = await supabase
      .from('yalidine_settings_with_origin')
      .select('*')
      .eq('organization_id', 'fed872f9-1ade-4351-b020-5598fda976fe')
      .limit(5);

  } catch (error) {
  }
};

// 5. محاولة مسح جميع أنواع التخزين المؤقت
const clearAllCaches = () => {
  
  // مسح localStorage
  let clearedCount = 0;
  Object.keys(localStorage).forEach(key => {
    if (key.includes('shipping') || key.includes('fee') || key.includes('cache') || key.includes('calculate')) {
      localStorage.removeItem(key);
      clearedCount++;
    }
  });

  // مسح sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('shipping') || key.includes('fee') || key.includes('cache') || key.includes('calculate')) {
      sessionStorage.removeItem(key);
      clearedCount++;
    }
  });

  // مسح ذاكرة المتصفح
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
};

// 6. تشغيل جميع الاختبارات
const runAllTests = async () => {
  await testDatabaseFunction();
  await checkYalidineFeesData();
  await checkYalidineSettings();
  clearAllCaches();
  
  setTimeout(() => {
    window.location.reload();
  }, 3000);
};

// تشغيل التشخيص
runAllTests();
