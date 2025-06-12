// ===================================================================
// اختبار دالة قاعدة البيانات وتشخيص المشكلة - تشغيل في console المتصفح
// ===================================================================

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
    } catch (e) {
      return;
    }
  }

  if (!userToken) {
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyODk5MTMsImV4cCI6MjA0Nzg2NTkxM30.VJBva-VD8_bHlMy7Xp9wLnyKT94TGqhsHAYKOxLAIDo'
  };

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
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_shipping_fee`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testCase.payload)
      });
      
      if (response.ok) {
        const result = await response.text();
        const numericResult = parseFloat(result);

        const expectedValue = testCase.payload.delivery_type === 'home' 
          ? testCase.expected.home 
          : testCase.expected.desk;
        
        if (numericResult === expectedValue) {
        } else if (numericResult === 900 || numericResult === 400) {
        } else {
        }
      } else {
        const errorText = await response.text();
      }
    } catch (error) {
    }
  }
  
  // اختبار فحص البيانات الخام من yalidine_fees
  
  try {
    // فحص للولاية 8، البلدية 801
    const yalidineResponse = await fetch(`${supabaseUrl}/rest/v1/yalidine_fees?from_wilaya_id=eq.40&to_wilaya_id=eq.8&commune_id=eq.801&select=*`, {
      headers: headers
    });
    
    if (yalidineResponse.ok) {
      const yalidineData = await yalidineResponse.json();
      
      if (yalidineData.length > 0) {
      } else {
      }
    }
  } catch (error) {
  }
  
};

// تشغيل الاختبار
testDatabaseFunction();
