// ===================================================================
// اختبار دالة قاعدة البيانات مباشرة - تشغيل في console المتصفح
// ===================================================================

console.log('🔧 البحث عن Supabase client والاختبار المباشر...');

// محاولة العثور على Supabase client بطرق مختلفة
const findSupabaseClient = () => {
  // البحث في المتغيرات العامة
  if (window.supabase) return window.supabase;
  if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;
  
  // البحث في React DevTools أو أي object آخر
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    console.log('🔍 جاري البحث في React internals...');
  }
  
  // محاولة الوصول من خلال الشبكة المحلية
  if (window.fetch) {
    console.log('✅ تم العثور على fetch، سنستخدم استدعاءات REST مباشرة');
    return 'fetch';
  }
  
  return null;
};

// اختبار دالة قاعدة البيانات باستخدام fetch مباشرة
const testDatabaseDirectly = async () => {
  const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
  const restUrl = `${supabaseUrl}/rest/v1/rpc/calculate_shipping_fee`;
  
  // استخراج التوكن من localStorage
  const authData = localStorage.getItem('sb-wrnssatuvmumsczyldth-auth-token');
  let token = null;
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      token = parsed.access_token;
      console.log('✅ تم استخراج التوكن من localStorage');
    } catch (e) {
      console.log('❌ فشل في استخراج التوكن:', e);
    }
  }
  
  if (!token) {
    console.log('❌ لم يتم العثور على التوكن');
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo'
  };
  
  // حالات الاختبار
  const testCases = [
    {
      name: 'الولاية 5، البلدية 515 (منزل)',
      payload: {
        organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
        to_wilaya_id: 5,
        to_municipality_id: 515,
        delivery_type: 'home',
        weight: 1,
        shipping_provider_clone_id: null
      }
    },
    {
      name: 'الولاية 5، البلدية 515 (مكتب)',
      payload: {
        organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
        to_wilaya_id: 5,
        to_municipality_id: 515,
        delivery_type: 'desk',
        weight: 1,
        shipping_provider_clone_id: null
      }
    }
  ];
  
  console.log('\n🧪 بدء اختبار دالة calculate_shipping_fee:');
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📋 اختبار: ${testCase.name}`);
      console.log('📤 البيانات المُرسلة:', testCase.payload);
      
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testCase.payload)
      });
      
      const result = await response.text();
      console.log(`📥 النتيجة الخام: "${result}"`);
      
      if (response.ok) {
        console.log(`✅ نجح الاختبار: ${result}`);
      } else {
        console.log(`❌ فشل الاختبار: ${response.status} - ${result}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في الاختبار "${testCase.name}":`, error);
    }
  }
};

// فحص بيانات yalidine_fees مباشرة
const checkYalidineData = async () => {
  const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
  const restUrl = `${supabaseUrl}/rest/v1/yalidine_fees`;
  
  const authData = localStorage.getItem('sb-wrnssatuvmumsczyldth-auth-token');
  let token = null;
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      token = parsed.access_token;
    } catch (e) {
      console.log('❌ فشل في استخراج التوكن:', e);
      return;
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo'
  };
  
  try {
    console.log('\n📊 فحص بيانات yalidine_fees:');
    
    // فحص للولاية 5، البلدية 515
    const url = `${restUrl}?from_wilaya_id=eq.40&to_wilaya_id=eq.5&commune_id=eq.515&select=*`;
    console.log('🔗 الرابط:', url);
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    console.log('📥 بيانات yalidine_fees للولاية 5، البلدية 515:', data);
    
    if (data && data.length > 0) {
      console.log(`✅ تم العثور على ${data.length} سجل`);
      console.log('📋 أول سجل:', data[0]);
    } else {
      console.log('❌ لم يتم العثور على بيانات');
    }
    
  } catch (error) {
    console.error('❌ خطأ في فحص yalidine_fees:', error);
  }
};

// فحص إعدادات yalidine_settings_with_origin
const checkYalidineSettings = async () => {
  const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
  const restUrl = `${supabaseUrl}/rest/v1/yalidine_settings_with_origin`;
  
  const authData = localStorage.getItem('sb-wrnssatuvmumsczyldth-auth-token');
  let token = null;
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      token = parsed.access_token;
    } catch (e) {
      return;
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo'
  };
  
  try {
    console.log('\n⚙️ فحص إعدادات yalidine_settings_with_origin:');
    
    const url = `${restUrl}?organization_id=eq.fed872f9-1ade-4351-b020-5598fda976fe&select=*`;
    console.log('🔗 الرابط:', url);
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    console.log('📥 إعدادات yalidine_settings_with_origin:', data);
    
  } catch (error) {
    console.error('❌ خطأ في فحص yalidine_settings_with_origin:', error);
  }
};

// تشغيل جميع الاختبارات
const runAllTests = async () => {
  const client = findSupabaseClient();
  console.log('🔍 نتيجة البحث عن Supabase client:', client || 'لم يتم العثور عليه');
  
  await testDatabaseDirectly();
  await checkYalidineData();
  await checkYalidineSettings();
  
  console.log('\n✅ انتهت جميع الاختبارات');
};

// تشغيل الاختبارات
runAllTests(); 