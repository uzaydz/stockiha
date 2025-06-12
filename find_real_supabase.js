// ===================================================================
// العثور على Supabase client الحقيقي - تشغيل في console المتصفح
// ===================================================================

// البحث في جميع المتغيرات العامة
const searchGlobalVariables = () => {
  
  const globalKeys = Object.keys(window);
  const supabaseRelated = globalKeys.filter(key => 
    key.toLowerCase().includes('supabase') || 
    key.toLowerCase().includes('client') ||
    key.toLowerCase().includes('api')
  );

  supabaseRelated.forEach(key => {
    try {
      const value = window[key];
      if (value && typeof value === 'object') {
        
        // فحص إذا كان هذا Supabase client
        if (value.auth && value.from && value.rpc) {
          return value;
        }
      }
    } catch (e) {
    }
  });
};

// البحث في React DevTools
const searchReactComponents = () => {
  
  // محاولة الوصول للـ React internals
  const reactFiber = document.querySelector('#root')?._reactInternalFiber || 
                    document.querySelector('#root')?._reactInternals;
  
  if (reactFiber) {
    // يمكن البحث هنا في الـ context أو props
  } else {
  }
};

// فحص network requests لمعرفة المفاتيح المُستخدمة
const interceptNetworkRequests = () => {
  
  // حفظ الـ fetch الأصلي
  const originalFetch = window.fetch;
  
  // إنشاء wrapper للـ fetch
  window.fetch = function(...args) {
    const [url, options] = args;
    
    if (url && url.includes('supabase.co')) {
      
      // محاولة استخراج المفتاح
      if (options?.headers) {
        const headers = options.headers;
        if (headers.apikey) {
        }
        if (headers.Authorization) {
        }
      }
    }
    
    // استدعاء الـ fetch الأصلي
    return originalFetch.apply(this, args);
  };
  
};

// محاولة العثور على الـ Supabase client من خلال modules
const searchModules = () => {
  
  // البحث في window.modules إذا كان موجود
  if (window.modules) {
    // فحص modules
  }
  
  // البحث في window.__webpack_require__ إذا كان موجود
  if (window.__webpack_require__) {
    // فحص webpack modules
  }
};

// اختبار بالمفاتيح الشائعة لـ Supabase
const testCommonApiKeys = async () => {
  
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
    } catch (e) {
    }
  }
  
  for (const apiKey of commonKeys) {
    try {
      
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

      if (response.ok) {
        const data = await response.json();
        
        // الآن نختبر دالة calculate_shipping_fee
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
        
        return { apiKey, userToken };
      } else {
      }
    } catch (error) {
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
  
};

// تشغيل البحث
runAllSearches();
