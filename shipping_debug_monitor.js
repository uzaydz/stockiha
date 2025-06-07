// أداة المراقبة والتشخيص الشاملة لنظام الشحن
// =================================================

console.log('🔍 بدء مراقبة استعلامات shipping_providers...');

// مراقب الاستعلامات
const originalFetch = window.fetch;
const queries = [];

window.fetch = async function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('shipping_providers')) {
    console.log('🔍 [MONITOR] استعلام shipping_providers:', {
      url,
      timestamp: new Date().toISOString(),
      args
    });
    
    // تحقق من وجود id=eq.null في الاستعلام
    if (url.includes('id=eq.null')) {
      console.error('🚨 [CRITICAL] استعلام يحتوي على id=eq.null:', url);
      console.trace('المصدر:');
    }
    
    queries.push({ url, timestamp: new Date(), args });
  }
  
  return originalFetch.apply(this, args);
};

// الوظائف المتاحة
window.shippingDebug = {
  // فحص التخزين المؤقت
  checkCache: function() {
    console.log('🗂️ فحص التخزين المؤقت للشحن:');
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('shipping') || key.includes('fee') || key.includes('municipalities') || key.includes('abandoned_orders')) {
        const value = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(value);
          console.log(`📁 localStorage[${key}]:`, parsed);
        } catch (e) {
          console.log(`📄 localStorage[${key}]:`, value);
        }
      }
    });
  },
  
  // مسح التخزين المؤقت
  clearCache: function() {
    console.log('🗑️ مسح التخزين المؤقت للشحن...');
    
    const keysToDelete = [];
    Object.keys(localStorage).forEach(key => {
      if (key.includes('shipping') || key.includes('fee') || key.includes('municipalities')) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      console.log(`❌ تم حذف: ${key}`);
    });
    
    console.log('✅ تم مسح التخزين المؤقت بنجاح');
  },
  
  // اختبار البلديات مباشرة
  testMunicipalities: async function(wilayaId) {
    console.log(`🧪 اختبار البلديات للولاية ${wilayaId}...`);
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
        console.error('❌ Supabase غير متاح');
        return;
      }
      
      const supabase = createClient(
        'https://wrnssatuvmumsczyldth.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0MDE4ODQsImV4cCI6MjAyMDk3Nzg4NH0.9CGQZJ3wUo7Fzm1qJw7mQ7_LvQrFx5dF5Y9K0C5qOVE'
      );
      
      const { data, error } = await supabase.rpc('get_shipping_municipalities', {
        p_wilaya_id: Number(wilayaId),
        p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe'
      });
      
      console.log('📊 نتيجة الاختبار المباشر:', {
        wilayaId,
        hasData: !!data,
        isArray: Array.isArray(data),
        count: data?.length || 0,
        error: error?.message,
        data: data?.slice(0, 5)
      });
      
      return data;
    } catch (error) {
      console.error('❌ خطأ في الاختبار:', error);
    }
  },
  
  // اختبار حساب الأسعار مباشرة
  testShippingFee: async function(wilayaId, municipalityId, deliveryType = 'home') {
    console.log(`💰 اختبار حساب السعر مباشرة...`);
    console.log(`📍 المعاملات: wilaya=${wilayaId}, municipality=${municipalityId}, type=${deliveryType}`);
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
        console.error('❌ Supabase غير متاح');
        return;
      }
      
      const supabase = createClient(
        'https://wrnssatuvmumsczyldth.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0MDE4ODQsImV4cCI6MjAyMDk3Nzg4NH0.9CGQZJ3wUo7Fzm1qJw7mQ7_LvQrFx5dF5Y9K0C5qOVE'
      );
      
      const { data, error } = await supabase.rpc('calculate_shipping_fee', {
        p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
        p_to_wilaya_id: Number(wilayaId),
        p_to_municipality_id: Number(municipalityId),
        p_delivery_type: deliveryType,
        p_weight: 1
      });
      
      console.log('📊 نتيجة حساب السعر المباشر:', {
        wilayaId,
        municipalityId,
        deliveryType,
        calculatedFee: data,
        error: error?.message,
        dataType: typeof data
      });
      
      // اختبار أنواع التوصيل المختلفة
      if (!error && deliveryType === 'home') {
        console.log('🔄 اختبار سعر التوصيل للمكتب أيضاً...');
        const { data: deskData, error: deskError } = await supabase.rpc('calculate_shipping_fee', {
          p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
          p_to_wilaya_id: Number(wilayaId),
          p_to_municipality_id: Number(municipalityId),
          p_delivery_type: 'desk',
          p_weight: 1
        });
        
        console.log('🏢 سعر التوصيل للمكتب:', deskData);
      }
      
      return data;
    } catch (error) {
      console.error('❌ خطأ في اختبار السعر:', error);
    }
  },
  
  // فحص البيانات الخام للأسعار
  checkRawFeesData: async function(wilayaId, municipalityId) {
    console.log(`🔍 فحص البيانات الخام للأسعار...`);
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
        console.error('❌ Supabase غير متاح');
        return;
      }
      
      const supabase = createClient(
        'https://wrnssatuvmumsczyldth.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0MDE4ODQsImV4cCI6MjAyMDk3Nzg4NH0.9CGQZJ3wUo7Fzm1qJw7mQ7_LvQrFx5dF5Y9K0C5qOVE'
      );
      
      const { data, error } = await supabase
        .from('yalidine_fees')
        .select('*')
        .eq('organization_id', 'fed872f9-1ade-4351-b020-5598fda976fe')
        .eq('to_wilaya_id', Number(wilayaId))
        .eq('commune_id', Number(municipalityId));
      
      console.log('📊 البيانات الخام من yalidine_fees:', {
        wilayaId,
        municipalityId,
        data,
        error: error?.message
      });
      
      return data;
    } catch (error) {
      console.error('❌ خطأ في فحص البيانات الخام:', error);
    }
  },
  
  // مراقبة الاستعلامات
  monitorQueries: function() {
    console.log('📊 استعلامات shipping_providers المراقبة:', queries);
    return queries;
  },
  
  // مسح قائمة الاستعلامات المراقبة
  clearQueries: function() {
    queries.length = 0;
    console.log('✅ تم مسح قائمة الاستعلامات المراقبة');
  },
  
  // اختبار شامل
  fullTest: async function(wilayaId = 8, municipalityId = 801) {
    console.log('🧪 بدء الاختبار الشامل...');
    
    // 1. مسح التخزين المؤقت
    this.clearCache();
    
    // 2. اختبار البلديات
    await this.testMunicipalities(wilayaId);
    
    // 3. اختبار الأسعار
    await this.testShippingFee(wilayaId, municipalityId, 'home');
    await this.testShippingFee(wilayaId, municipalityId, 'desk');
    
    // 4. فحص البيانات الخام
    await this.checkRawFeesData(wilayaId, municipalityId);
    
    console.log('✅ انتهاء الاختبار الشامل');
  }
};

console.log('✅ تم تفعيل مراقب استعلامات الشحن');
console.log('📚 الوظائف المتاحة:');
console.log('  - shippingDebug.checkCache() - فحص التخزين المؤقت');
console.log('  - shippingDebug.clearCache() - مسح التخزين المؤقت'); 
console.log('  - shippingDebug.testMunicipalities(wilayaId) - اختبار البلديات');
console.log('  - shippingDebug.testShippingFee(wilayaId, municipalityId, type) - اختبار الأسعار');
console.log('  - shippingDebug.checkRawFeesData(wilayaId, municipalityId) - فحص البيانات الخام');
console.log('  - shippingDebug.fullTest(wilayaId, municipalityId) - اختبار شامل');
console.log('  - shippingDebug.monitorQueries() - مراقبة الاستعلامات');

// تشغيل فحص أولي
shippingDebug.checkCache(); 