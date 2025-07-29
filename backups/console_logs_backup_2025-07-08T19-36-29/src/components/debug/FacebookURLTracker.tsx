import React, { useState, useEffect, useCallback } from 'react';

interface FacebookURLData {
  currentUrl: string;
  fbclid: string | null;
  hasClickId: boolean;
  referrer: string;
  isFromFacebook: boolean;
  campaignData: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  visitHistory: Array<{
    timestamp: Date;
    url: string;
    fbclid?: string;
    referrer?: string;
  }>;
}

export const FacebookURLTracker: React.FC = () => {
  const [urlData, setUrlData] = useState<FacebookURLData>({
    currentUrl: '',
    fbclid: null,
    hasClickId: false,
    referrer: '',
    isFromFacebook: false,
    campaignData: {},
    visitHistory: []
  });
  const [isTracking, setIsTracking] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // تحليل الرابط الحالي
  const analyzeCurrentURL = useCallback(() => {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    
    // استخراج fbclid
    const fbclid = urlParams.get('fbclid');
    
    // استخراج بيانات الحملة
    const campaignData = {
      utm_source: urlParams.get('utm_source') || undefined,
      utm_medium: urlParams.get('utm_medium') || undefined,
      utm_campaign: urlParams.get('utm_campaign') || undefined,
      utm_content: urlParams.get('utm_content') || undefined,
      utm_term: urlParams.get('utm_term') || undefined,
    };

    // تحديد ما إذا كان من Facebook
    const isFromFacebook = !!(
      fbclid ||
      referrer.includes('facebook.com') ||
      referrer.includes('fb.com') ||
      campaignData.utm_source === 'facebook' ||
      campaignData.utm_medium === 'facebook'
    );

    // تحديث تاريخ الزيارات
    const currentVisitHistory = [...urlData.visitHistory];
    
    // إضافة الزيارة الحالية إذا كانت جديدة
    const lastVisit = currentVisitHistory[currentVisitHistory.length - 1];
    if (!lastVisit || lastVisit.url !== currentUrl) {
      currentVisitHistory.push({
        timestamp: new Date(),
        url: currentUrl,
        fbclid: fbclid || undefined,
        referrer: referrer || undefined
      });
      
      // الاحتفاظ بآخر 10 زيارات فقط
      if (currentVisitHistory.length > 10) {
        currentVisitHistory.shift();
      }
    }

    setUrlData({
      currentUrl,
      fbclid,
      hasClickId: !!fbclid,
      referrer,
      isFromFacebook,
      campaignData,
      visitHistory: currentVisitHistory
    });
    
    setLastUpdate(new Date());

    // حفظ في localStorage للمراجعة
    if (isTracking) {
      try {
        const trackingData = {
          timestamp: new Date().toISOString(),
          url: currentUrl,
          fbclid,
          referrer,
          isFromFacebook,
          campaignData
        };
        
        const existingData = JSON.parse(localStorage.getItem('facebook_url_tracking') || '[]');
        existingData.push(trackingData);
        
        // الاحتفاظ بآخر 50 سجل
        if (existingData.length > 50) {
          existingData.shift();
        }
        
        localStorage.setItem('facebook_url_tracking', JSON.stringify(existingData));
      } catch (error) {
        console.warn('فشل في حفظ بيانات التتبع:', error);
      }
    }

    // تسجيل في بيانات التشخيص العامة
    if (typeof window !== 'undefined') {
      if (!window.__trackingDebugData) {
        window.__trackingDebugData = [];
      }
      
      window.__trackingDebugData.push({
        timestamp: new Date().toISOString(),
        type: 'url_analysis',
        status: 'success',
        details: {
          url: currentUrl,
          fbclid,
          isFromFacebook,
          referrer,
          campaignData
        },
        platform: 'Facebook URL Tracker'
      });
    }
  }, [urlData.visitHistory, isTracking]);

  // مراقبة تغيير الرابط
  useEffect(() => {
    if (!isTracking) return;

    analyzeCurrentURL();

    const handleUrlChange = () => {
      setTimeout(analyzeCurrentURL, 100);
    };

    // مراقبة تغيير history
    window.addEventListener('popstate', handleUrlChange);
    
    // مراقبة تغيير pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleUrlChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [isTracking, analyzeCurrentURL]);

  // تحديث دوري
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(analyzeCurrentURL, 10000);
    return () => clearInterval(interval);
  }, [isTracking, analyzeCurrentURL]);

  // تصدير البيانات
  const exportTrackingData = () => {
    try {
      const data = localStorage.getItem('facebook_url_tracking');
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facebook-url-tracking-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('فشل في تصدير البيانات:', error);
    }
  };

  // مسح البيانات
  const clearTrackingData = () => {
    try {
      localStorage.removeItem('facebook_url_tracking');
      setUrlData(prev => ({ ...prev, visitHistory: [] }));
    } catch (error) {
      console.error('فشل في مسح البيانات:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">🔗 مراقب روابط Facebook</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isTracking}
              onChange={(e) => setIsTracking(e.target.checked)}
              className="mr-2"
            />
            تتبع نشط
          </label>
          <span className="text-xs text-gray-500">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-DZ')}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* الرابط الحالي */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">الرابط الحالي</span>
            <span className={`text-xs px-2 py-1 rounded ${
              urlData.isFromFacebook ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {urlData.isFromFacebook ? 'من Facebook' : 'مصدر آخر'}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
            {urlData.currentUrl}
          </div>
        </div>

        {/* fbclid */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Facebook Click ID</span>
            <span className={`text-xs ${urlData.hasClickId ? 'text-green-600' : 'text-gray-400'}`}>
              {urlData.hasClickId ? '✅ موجود' : '➖ غير موجود'}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
            {urlData.fbclid || 'غير موجود في الرابط'}
          </div>
        </div>

        {/* مصدر الإحالة */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">مصدر الإحالة</span>
            <span className={`text-xs ${
              urlData.referrer.includes('facebook') ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {urlData.referrer.includes('facebook') ? '🔵 Facebook' : '🌐 أخرى'}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
            {urlData.referrer || 'مباشر (لا يوجد مصدر إحالة)'}
          </div>
        </div>

        {/* بيانات الحملة */}
        {Object.keys(urlData.campaignData).some(key => urlData.campaignData[key as keyof typeof urlData.campaignData]) && (
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-2">بيانات الحملة الإعلانية</div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(urlData.campaignData).map(([key, value]) => 
                value && (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-900 font-mono">{value}</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* تاريخ الزيارات */}
        <div className="border border-gray-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">تاريخ الزيارات</span>
            <span className="text-xs text-gray-500">
              آخر {urlData.visitHistory.length} زيارة
            </span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {urlData.visitHistory.slice(-5).reverse().map((visit, index) => (
              <div key={index} className="text-xs border-l-2 border-gray-200 pl-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {visit.timestamp.toLocaleTimeString('ar-DZ')}
                  </span>
                  {visit.fbclid && (
                    <span className="bg-blue-100 text-blue-800 px-1 rounded">
                      fbclid
                    </span>
                  )}
                </div>
                <div className="text-gray-500 font-mono truncate">
                  {visit.url}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* أدوات التحكم */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <div className="space-x-2">
            <button
              onClick={exportTrackingData}
              className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              تصدير البيانات
            </button>
            <button
              onClick={clearTrackingData}
              className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              مسح البيانات
            </button>
          </div>
          
          <button
            onClick={() => {
              console.log('🔍 بيانات تتبع Facebook URLs:', {
                current: urlData,
                stored: JSON.parse(localStorage.getItem('facebook_url_tracking') || '[]')
              });
              alert('تحقق من Console للحصول على التفاصيل الكاملة');
            }}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            فحص في Console
          </button>
        </div>

        {/* نصائح */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-medium text-yellow-900 mb-2">💡 نصائح مهمة:</h4>
          <ul className="text-xs text-yellow-800 space-y-1">
            <li>• fbclid يظهر فقط عند النقر على إعلان Facebook</li>
            <li>• تأكد من تفعيل التتبع قبل اختبار الإعلانات</li>
            <li>• استخدم "تصدير البيانات" لحفظ سجل التتبع</li>
            <li>• يمكن محاكاة fbclid بإضافة ?fbclid=test123 للرابط</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FacebookURLTracker; 