// ===================================================================
// اختبار دالة قاعدة البيانات وتشخيص المشكلة - تشغيل في console المتصفح
// ===================================================================

console.log('🔧 اختبار دالة calculate_shipping_fee في قاعدة البيانات...');

// استخدام المفاتيح التي تم العثور عليها من مراقب الشبكة
const testDatabaseFunction = async () => {
  const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
  
  // استخراج التوكن من localStorage
  const authData = localStorage.getItem('sb-wrnssatuvmumsczyldth-auth-token');
  let userToken = null;
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      userToken = parsed.access_token;
      console.log('✅ تم استخراج user token من localStorage');
    } catch (e) {
      console.log('❌ فشل في استخراج user token:', e);
      return;
    }
  }

  if (!userToken) {
    console.log('❌ لم يتم العثور على user token');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo'
  };

  console.log('\n🎯 اختبار دالة calculate_shipping_fee مع حالات حقيقية:');
  
  const testCases = [
    {
      name: 'الولاية 8، البلدية 801 (Béchar) - منزل',
      expected: { home: 1400, desk: 1100 },
      payload: {
        organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
        to_wilaya_id: 8,
        to_municipality_id: 801,
        delivery_type: 'home',
        weight: 1,
        shipping_provider_clone_id: null
      }
    },
    {
      name: 'الولاية 8، البلدية 801 (Béchar) - مكتب',
      expected: { home: 1400, desk: 1100 },
      payload: {
        organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
        to_wilaya_id: 8,
        to_municipality_id: 801,
        delivery_type: 'desk',
        weight: 1,
        shipping_provider_clone_id: null
      }
    },
    {
      name: 'الولاية 5، البلدية 515 - منزل (المُستخدم في الواجهة)',
      expected: { home: 900, desk: 350 },
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
      name: 'الولاية 5، البلدية 515 - مكتب (المُستخدم في الواجهة)',
      expected: { home: 900, desk: 350 },
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

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 اختبار: ${testCase.name}`);
      console.log('📤 البيانات المُرسلة:', testCase.payload);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_shipping_fee`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testCase.payload)
      });
      
      if (response.ok) {
        const result = await response.text();
        const numericResult = parseFloat(result);
        
        console.log(`📥 النتيجة: ${numericResult}`);
        
        const expectedValue = testCase.payload.delivery_type === 'home' 
          ? testCase.expected.home 
          : testCase.expected.desk;
        
        if (numericResult === expectedValue) {
          console.log(`✅ نجح الاختبار! (متوقع: ${expectedValue})`);
        } else if (numericResult === 900 || numericResult === 400) {
          console.log(`❌ فشل الاختبار! يُرجع القيم الافتراضية (${numericResult}) بدلاً من القيمة المتوقعة (${expectedValue})`);
        } else {
          console.log(`⚠️ نتيجة غير متوقعة: ${numericResult} (متوقع: ${expectedValue})`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ فشل الاختبار: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ خطأ في الاختبار "${testCase.name}":`, error);
    }
  }
  
  // اختبار فحص البيانات الخام من yalidine_fees
  console.log('\n📊 فحص البيانات الخام من yalidine_fees:');
  
  try {
    // فحص للولاية 8، البلدية 801
    const yalidineResponse = await fetch(`${supabaseUrl}/rest/v1/yalidine_fees?from_wilaya_id=eq.40&to_wilaya_id=eq.8&commune_id=eq.801&select=*`, {
      headers: headers
    });
    
    if (yalidineResponse.ok) {
      const yalidineData = await yalidineResponse.json();
      console.log('📥 بيانات yalidine_fees للولاية 8، البلدية 801:', yalidineData);
      
      if (yalidineData.length > 0) {
        console.log('✅ البيانات موجودة في الجدول');
        console.log(`📊 المنزل: ${yalidineData[0].home_fee}, المكتب: ${yalidineData[0].stop_desk_fee}`);
      } else {
        console.log('❌ لا توجد بيانات في الجدول');
      }
    }
  } catch (error) {
    console.error('❌ خطأ في فحص yalidine_fees:', error);
  }
  
  console.log('\n📋 ملخص التشخيص:');
  console.log('1. إذا كانت النتائج تُظهر 900/400 باستمرار، فإن دالة الإصلاح لم يتم تطبيقها على قاعدة البيانات');
  console.log('2. إذا كانت البيانات موجودة في yalidine_fees لكن الدالة لا تُرجعها، فهناك مشكلة في منطق الدالة');
  console.log('3. يجب تطبيق ملف fix_calculate_shipping_fee.sql على قاعدة البيانات');
};

// تشغيل الاختبار
testDatabaseFunction(); 