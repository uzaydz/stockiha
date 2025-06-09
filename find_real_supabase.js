// ===================================================================
// العثور على Supabase client الحقيقي - تشغيل في console المتصفح
// ===================================================================

console.log('🔍 البحث عن Supabase client الحقيقي المُستخدم في التطبيق...');

// البحث في جميع المتغيرات العامة
const searchGlobalVariables = () => {
  console.log('\n🌐 فحص المتغيرات العامة:');
  
  const globalKeys = Object.keys(window);
  const supabaseRelated = globalKeys.filter(key => 
    key.toLowerCase().includes('supabase') || 
    key.toLowerCase().includes('client') ||
    key.toLowerCase().includes('api')
  );
  
  console.log('مفاتيح متعلقة بـ Supabase:', supabaseRelated);
  
  supabaseRelated.forEach(key => {
    try {
      const value = window[key];
      if (value && typeof value === 'object') {
        console.log(`🔍 فحص ${key}:`, value);
        
        // فحص إذا كان هذا Supabase client
        if (value.auth && value.from && value.rpc) {
          console.log(`✅ تم العثور على Supabase client في window.${key}`);
          return value;
        }
      }
    } catch (e) {
      console.log(`❌ خطأ في فحص ${key}:`, e);
    }
  });
};

// البحث في React DevTools
const searchReactComponents = () => {
  console.log('\n⚛️ البحث في React components:');
  
  // محاولة الوصول للـ React internals
  const reactFiber = document.querySelector('#root')?._reactInternalFiber || 
                    document.querySelector('#root')?._reactInternals;
  
  if (reactFiber) {
    console.log('✅ تم العثور على React fiber');
    // يمكن البحث هنا في الـ context أو props
  } else {
    console.log('❌ لم يتم العثور على React fiber');
  }
};

// فحص network requests لمعرفة المفاتيح المُستخدمة
const interceptNetworkRequests = () => {
  console.log('\n🌐 مراقبة طلبات الشبكة...');
  
  // حفظ الـ fetch الأصلي
  const originalFetch = window.fetch;
  
  // إنشاء wrapper للـ fetch
  window.fetch = function(...args) {
    const [url, options] = args;
    
    if (url && url.includes('supabase.co')) {
      console.log('🔍 طلب Supabase:');
      console.log('URL:', url);
      console.log('Headers:', options?.headers);
      
      // محاولة استخراج المفتاح
      if (options?.headers) {
        const headers = options.headers;
        if (headers.apikey) {
          console.log('🔑 تم العثور على API key:', headers.apikey);
        }
        if (headers.Authorization) {
          console.log('🔐 تم العثور على Authorization:', headers.Authorization);
        }
      }
    }
    
    // استدعاء الـ fetch الأصلي
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ تم تفعيل مراقبة طلبات الشبكة');
};

// محاولة العثور على الـ Supabase client من خلال modules
const searchModules = () => {
  console.log('\n📦 البحث في modules:');
  
  // البحث في window.modules إذا كان موجود
  if (window.modules) {
    console.log('✅ تم العثور على window.modules');
    // فحص modules
  }
  
  // البحث في window.__webpack_require__ إذا كان موجود
  if (window.__webpack_require__) {
    console.log('✅ تم العثور على webpack modules');
    // فحص webpack modules
  }
};

// اختبار بالمفاتيح الشائعة لـ Supabase
const testCommonApiKeys = async () => {
  console.log('\n🔑 اختبار مفاتيح API شائعة:');
  
  const commonKeys = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo',
    // يمكن إضافة مفاتيح أخرى هنا
  ];
  
  const authData = localStorage.getItem('sb-wrnssatuvmumsczyldth-auth-token');
  let userToken = null;
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      userToken = parsed.access_token;
      console.log('✅ تم استخراج user token من localStorage');
    } catch (e) {
      console.log('❌ فشل في استخراج user token:', e);
    }
  }
  
  for (const apiKey of commonKeys) {
    try {
      console.log(`\n🧪 اختبار مفتاح: ${apiKey.substring(0, 20)}...`);
      
      const headers = {
        'Content-Type': 'application/json',
        'apikey': apiKey
      };
      
      // إضافة user token إذا كان متوفر
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const response = await fetch('https://wrnssatuvmumsczyldth.supabase.co/rest/v1/yalidine_fees?limit=1', {
        headers: headers
      });
      
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ المفتاح يعمل!');
        const data = await response.json();
        console.log('📥 عينة من البيانات:', data);
        
        // الآن نختبر دالة calculate_shipping_fee
        console.log('\n🎯 اختبار دالة calculate_shipping_fee:');
        const rpcResponse = await fetch('https://wrnssatuvmumsczyldth.supabase.co/rest/v1/rpc/calculate_shipping_fee', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
            to_wilaya_id: 5,
            to_municipality_id: 515,
            delivery_type: 'home',
            weight: 1,
            shipping_provider_clone_id: null
          })
        });
        
        const rpcResult = await rpcResponse.text();
        console.log(`🎯 نتيجة calculate_shipping_fee: ${rpcResult}`);
        
        return { apiKey, userToken };
      } else {
        console.log(`❌ المفتاح لا يعمل: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ خطأ في اختبار المفتاح:', error);
    }
  }
};

// تشغيل جميع عمليات البحث
const runAllSearches = async () => {
  searchGlobalVariables();
  searchReactComponents();
  searchModules();
  interceptNetworkRequests();
  await testCommonApiKeys();
  
  console.log('\n📋 ملخص: قم بتغيير الولاية أو تحديث سعر الشحن لرؤية طلبات الشبكة...');
};

// تشغيل البحث
runAllSearches(); 