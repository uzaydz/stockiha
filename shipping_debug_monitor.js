// أداة المراقبة والتشخيص الشاملة لنظام الشحن
// =================================================

// مراقب الاستعلامات
const originalFetch = window.fetch;
const queries = [];

window.fetch = async function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('shipping_providers')) {
    
    // تحقق من وجود id=eq.null في الاستعلام
    if (url.includes('id=eq.null')) {
    }
    
    queries.push({ url, timestamp: new Date(), args });
  }
  
  return originalFetch.apply(this, args);
};

// الوظائف المتاحة
window.shippingDebug = {
  // فحص التخزين المؤقت
  checkCache: function() {
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('shipping') || key.includes('fee') || key.includes('municipalities') || key.includes('abandoned_orders')) {
        const value = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(value);
        } catch (e) {
        }
      }
    });
  },
  
  // مسح التخزين المؤقت
  clearCache: function() {
    
    const keysToDelete = [];
    Object.keys(localStorage).forEach(key => {
      if (key.includes('shipping') || key.includes('fee') || key.includes('municipalities')) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
    });
    
  },
  
  // اختبار البلديات مباشرة
  testMunicipalities: async function(wilayaId) {
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
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

      return data;
    } catch (error) {
    }
  },
  
  // اختبار حساب الأسعار مباشرة
  testShippingFee: async function(wilayaId, municipalityId, deliveryType = 'home') {
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
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

      // اختبار أنواع التوصيل المختلفة
      if (!error && deliveryType === 'home') {
        const { data: deskData, error: deskError } = await supabase.rpc('calculate_shipping_fee', {
          p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
          p_to_wilaya_id: Number(wilayaId),
          p_to_municipality_id: Number(municipalityId),
          p_delivery_type: 'desk',
          p_weight: 1
        });
        
      }
      
      return data;
    } catch (error) {
    }
  },
  
  // فحص البيانات الخام للأسعار
  checkRawFeesData: async function(wilayaId, municipalityId) {
    
    try {
      const { createClient } = window.supabase || {};
      if (!createClient) {
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

      return data;
    } catch (error) {
    }
  },
  
  // مراقبة الاستعلامات
  monitorQueries: function() {
    return queries;
  },
  
  // مسح قائمة الاستعلامات المراقبة
  clearQueries: function() {
    queries.length = 0;
  },
  
  // اختبار شامل
  fullTest: async function(wilayaId = 8, municipalityId = 801) {
    
    // 1. مسح التخزين المؤقت
    this.clearCache();
    
    // 2. اختبار البلديات
    await this.testMunicipalities(wilayaId);
    
    // 3. اختبار الأسعار
    await this.testShippingFee(wilayaId, municipalityId, 'home');
    await this.testShippingFee(wilayaId, municipalityId, 'desk');
    
    // 4. فحص البيانات الخام
    await this.checkRawFeesData(wilayaId, municipalityId);
    
  }
};

// تشغيل فحص أولي
shippingDebug.checkCache();
