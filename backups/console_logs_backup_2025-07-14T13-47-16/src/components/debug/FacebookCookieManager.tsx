import React, { useState, useEffect, useCallback } from 'react';

interface FacebookCookieStatus {
  fbp: {
    value: string;
    exists: boolean;
    isValid: boolean;
    createdAt?: Date;
    expiresAt?: Date;
  };
  fbc: {
    value: string;
    exists: boolean;
    isValid: boolean;
    createdAt?: Date;
    source?: 'url' | 'stored' | 'manual';
  };
  fbclid: {
    value: string;
    exists: boolean;
    inUrl: boolean;
    inStorage: boolean;
  };
}

export const FacebookCookieManager: React.FC = () => {
  const [cookieStatus, setCookieStatus] = useState<FacebookCookieStatus>({
    fbp: { value: '', exists: false, isValid: false },
    fbc: { value: '', exists: false, isValid: false },
    fbclid: { value: '', exists: false, inUrl: false, inStorage: false }
  });
  const [autoManagement, setAutoManagement] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // فحص وتحديث حالة الكوكيز
  const checkCookieStatus = useCallback(() => {
    const status: FacebookCookieStatus = {
      fbp: { value: '', exists: false, isValid: false },
      fbc: { value: '', exists: false, isValid: false },
      fbclid: { value: '', exists: false, inUrl: false, inStorage: false }
    };

    // فحص _fbp
    const fbpMatch = document.cookie.match(/_fbp=([^;]+)/);
    if (fbpMatch) {
      status.fbp.value = fbpMatch[1];
      status.fbp.exists = true;
      status.fbp.isValid = /^fb\.\d+\.\d+\.\w+$/.test(fbpMatch[1]);
    }

    // فحص _fbc
    const fbcMatch = document.cookie.match(/_fbc=([^;]+)/);
    if (fbcMatch) {
      status.fbc.value = fbcMatch[1];
      status.fbc.exists = true;
      status.fbc.isValid = /^fb\.\d+\.\d+\.\w+$/.test(fbcMatch[1]);
    }

    // فحص fbclid في الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const fbclidFromUrl = urlParams.get('fbclid');
    if (fbclidFromUrl) {
      status.fbclid.value = fbclidFromUrl;
      status.fbclid.exists = true;
      status.fbclid.inUrl = true;
    }

    // فحص fbclid في التخزين المحلي
    try {
      const storedFbclid = localStorage.getItem('facebook_click_id');
      if (storedFbclid && !status.fbclid.exists) {
        status.fbclid.value = storedFbclid;
        status.fbclid.exists = true;
        status.fbclid.inStorage = true;
      }
    } catch (error) {
    }

    setCookieStatus(status);
    setLastUpdate(new Date());
  }, []);

  // إنشاء _fbp إذا لم تكن موجودة
  const createFbpCookie = useCallback(() => {
    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fbpValue = `fb.1.${timestamp}.${randomId}`;
      
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 يوم
      
      document.cookie = `_fbp=${fbpValue}; expires=${expirationDate.toUTCString()}; path=/; domain=${window.location.hostname}`;
      
      checkCookieStatus();
      return true;
    } catch (error) {
      return false;
    }
  }, [checkCookieStatus]);

  // إنشاء _fbc من fbclid
  const createFbcFromFbclid = useCallback((fbclid: string) => {
    try {
      const timestamp = Date.now();
      const fbcValue = `fb.1.${timestamp}.${fbclid}`;
      
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 يوم
      
      document.cookie = `_fbc=${fbcValue}; expires=${expirationDate.toUTCString()}; path=/; domain=${window.location.hostname}`;
      
      // حفظ في التخزين المحلي أيضاً
      try {
        localStorage.setItem('facebook_click_id', fbcValue);
        localStorage.setItem('facebook_click_id_timestamp', timestamp.toString());
      } catch (error) {
      }
      
      checkCookieStatus();
      return true;
    } catch (error) {
      return false;
    }
  }, [checkCookieStatus]);

  // إنشاء _fbc يدوياً (للاختبار)
  const createManualFbc = useCallback(() => {
    const mockFbclid = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return createFbcFromFbclid(mockFbclid);
  }, [createFbcFromFbclid]);

  // إدارة تلقائية للكوكيز
  useEffect(() => {
    if (!autoManagement) return;

    // إنشاء _fbp إذا لم تكن موجودة
    if (!cookieStatus.fbp.exists) {
      createFbpCookie();
    }

    // إنشاء _fbc إذا وجد fbclid في الرابط
    if (cookieStatus.fbclid.inUrl && !cookieStatus.fbc.exists) {
      createFbcFromFbclid(cookieStatus.fbclid.value);
    }
  }, [cookieStatus, autoManagement, createFbpCookie, createFbcFromFbclid]);

  // فحص دوري للكوكيز
  useEffect(() => {
    checkCookieStatus();
    const interval = setInterval(checkCookieStatus, 5000);
    return () => clearInterval(interval);
  }, [checkCookieStatus]);

  // مراقبة تغيير الرابط
  useEffect(() => {
    const handleUrlChange = () => {
      setTimeout(checkCookieStatus, 100);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [checkCookieStatus]);

  const getCookieStatusColor = (exists: boolean, isValid: boolean) => {
    if (!exists) return 'text-red-600';
    if (!isValid) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCookieStatusIcon = (exists: boolean, isValid: boolean) => {
    if (!exists) return '❌';
    if (!isValid) return '⚠️';
    return '✅';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">🍪 مدير Facebook Cookies</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoManagement}
              onChange={(e) => setAutoManagement(e.target.checked)}
              className="mr-2"
            />
            إدارة تلقائية
          </label>
          <span className="text-xs text-gray-500">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-DZ')}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* _fbp Cookie */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">_fbp (Browser ID)</span>
              <span className={getCookieStatusColor(cookieStatus.fbp.exists, cookieStatus.fbp.isValid)}>
                {getCookieStatusIcon(cookieStatus.fbp.exists, cookieStatus.fbp.isValid)}
              </span>
            </div>
            {!cookieStatus.fbp.exists && (
              <button
                onClick={createFbpCookie}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                إنشاء
              </button>
            )}
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
            {cookieStatus.fbp.value || 'غير موجود'}
          </div>
          
          {cookieStatus.fbp.exists && (
            <div className="text-xs text-gray-500 mt-1">
              {cookieStatus.fbp.isValid ? '✅ تنسيق صحيح' : '⚠️ تنسيق غير صحيح'}
            </div>
          )}
        </div>

        {/* _fbc Cookie */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">_fbc (Click ID)</span>
              <span className={getCookieStatusColor(cookieStatus.fbc.exists, cookieStatus.fbc.isValid)}>
                {getCookieStatusIcon(cookieStatus.fbc.exists, cookieStatus.fbc.isValid)}
              </span>
            </div>
            {!cookieStatus.fbc.exists && (
              <div className="space-x-1">
                <button
                  onClick={createManualFbc}
                  className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  إنشاء تجريبي
                </button>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
            {cookieStatus.fbc.value || 'غير موجود'}
          </div>
          
          {cookieStatus.fbc.exists && (
            <div className="text-xs text-gray-500 mt-1">
              {cookieStatus.fbc.isValid ? '✅ تنسيق صحيح' : '⚠️ تنسيق غير صحيح'}
            </div>
          )}
        </div>

        {/* fbclid Status */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">fbclid (من الرابط)</span>
            <span className={cookieStatus.fbclid.exists ? 'text-green-600' : 'text-gray-400'}>
              {cookieStatus.fbclid.exists ? '✅' : '➖'}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
            {cookieStatus.fbclid.value || 'غير موجود في الرابط'}
          </div>
          
          {cookieStatus.fbclid.exists && (
            <div className="text-xs text-gray-500 mt-1 space-x-2">
              {cookieStatus.fbclid.inUrl && <span>📍 في الرابط</span>}
              {cookieStatus.fbclid.inStorage && <span>💾 في التخزين</span>}
            </div>
          )}
        </div>

        {/* نصائح وتحذيرات */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">💡 نصائح مهمة:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• _fbp: يتم إنشاؤها تلقائياً لتتبع المتصفح</li>
            <li>• _fbc: تظهر فقط عند القدوم من إعلان Facebook (fbclid)</li>
            <li>• وجود _fbc يحسن دقة التتبع بنسبة 20-30%</li>
            <li>• الإدارة التلقائية تضمن وجود الكوكيز المطلوبة</li>
          </ul>
        </div>

        {/* إحصائيات */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-2">📊 إحصائيات التتبع:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">جودة التتبع:</span>
              <span className={`ml-2 font-medium ${
                cookieStatus.fbp.exists && cookieStatus.fbc.exists ? 'text-green-600' : 
                cookieStatus.fbp.exists ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {cookieStatus.fbp.exists && cookieStatus.fbc.exists ? 'ممتازة' : 
                 cookieStatus.fbp.exists ? 'جيدة' : 'ضعيفة'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">مصدر الزيارة:</span>
              <span className="ml-2 font-medium text-gray-900">
                {cookieStatus.fbclid.exists ? 'Facebook Ads' : 'مباشر/أخرى'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookCookieManager;
