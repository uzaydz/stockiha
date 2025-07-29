import React, { useState, useEffect } from 'react';

interface PixelHealth {
  score: number;
  issues: string[];
  recommendations: string[];
}

export const FacebookPixelChecker: React.FC = () => {
  const [pixelStatus, setPixelStatus] = useState({
    loaded: false,
    pixelId: '',
    events: [] as string[],
    cookies: {
      fbp: '',
      fbc: ''
    },
    health: {
      score: 0,
      issues: [],
      recommendations: []
    } as PixelHealth
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const checkPixelStatus = () => {
      // فحص وجود Facebook Pixel
      const fbqExists = typeof window !== 'undefined' && typeof window.fbq === 'function';
      
      // فحص Pixel ID من script tags
      let pixelId = '';
      if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.innerHTML.includes('fbq(\'init\'')) {
            const match = script.innerHTML.match(/fbq\('init',\s*['"](\d+)['"]/);
            if (match) {
              pixelId = match[1];
            }
          }
        });
      }

      // فحص الكوكيز
      const cookies = { fbp: '', fbc: '' };
      if (typeof document !== 'undefined') {
        const cookieString = document.cookie;
        const fbpMatch = cookieString.match(/_fbp=([^;]+)/);
        const fbcMatch = cookieString.match(/_fbc=([^;]+)/);
        
        if (fbpMatch) cookies.fbp = fbpMatch[1];
        if (fbcMatch) cookies.fbc = fbcMatch[1];
      }

      // فحص الأحداث المُرسلة
      const trackingData = (window as any).__trackingDebugData || [];
      const pixelEvents: string[] = trackingData
        .filter((event: any) => event.platform === 'Facebook Pixel')
        .map((event: any) => String(event.type))
        .filter((type: string) => type && type !== 'undefined');

      // تقييم صحة البكسل
      const health = evaluatePixelHealth(fbqExists, pixelId, cookies, pixelEvents);

      setPixelStatus({
        loaded: !!fbqExists,
        pixelId,
        events: [...new Set(pixelEvents)],
        cookies,
        health
      });
    };

    checkPixelStatus();
    const interval = setInterval(checkPixelStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // تقييم صحة البكسل
  const evaluatePixelHealth = (
    loaded: boolean, 
    pixelId: string, 
    cookies: any, 
    events: string[]
  ): PixelHealth => {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // فحص التحميل (40 نقطة)
    if (loaded) {
      score += 40;
    } else {
      issues.push('Facebook Pixel غير محمل');
      recommendations.push('تأكد من إضافة Facebook Pixel script للصفحة');
    }

    // فحص معرف البكسل (20 نقطة)
    if (pixelId) {
      score += 20;
    } else {
      issues.push('معرف البكسل غير موجود');
      recommendations.push('تأكد من تهيئة البكسل بمعرف صحيح');
    }

    // فحص _fbp cookie (20 نقطة)
    if (cookies.fbp) {
      score += 20;
    } else {
      issues.push('_fbp cookie غير موجود');
      recommendations.push('تأكد من السماح بالكوكيز في المتصفح');
    }

    // فحص _fbc cookie (10 نقاط)
    if (cookies.fbc) {
      score += 10;
    } else {
      issues.push('_fbc cookie غير موجود (يؤثر على دقة التتبع)');
      recommendations.push('تأكد من وجود fbclid في الروابط القادمة من Facebook');
    }

    // فحص الأحداث (10 نقاط)
    if (events.length > 0) {
      score += 10;
    } else {
      issues.push('لا توجد أحداث مُرسلة');
      recommendations.push('تأكد من إرسال الأحداث (PageView, ViewContent, etc.)');
    }

    return { score, issues, recommendations };
  };

  // اختبار إرسال حدث
  const testPixelEvent = async (eventType: string) => {
    try {
      if (window.fbq) {
        const testData = {
          content_type: 'product',
          content_ids: ['test_product'],
          value: 100,
          currency: 'DZD'
        };

        window.fbq('track', eventType, testData);
        
        const result = {
          timestamp: new Date().toISOString(),
          event: eventType,
          status: 'success',
          data: testData
        };

        setTestResults(prev => [result, ...prev.slice(0, 4)]);
        
        console.log(`✅ تم إرسال ${eventType} بنجاح:`, testData);
      } else {
        throw new Error('Facebook Pixel غير محمل');
      }
    } catch (error) {
      const result = {
        timestamp: new Date().toISOString(),
        event: eventType,
        status: 'error',
        error: error.message
      };

      setTestResults(prev => [result, ...prev.slice(0, 4)]);
      console.error(`❌ فشل في إرسال ${eventType}:`, error);
    }
  };

  // فحص شامل للبكسل
  const runComprehensiveCheck = () => {
    const checkResults = {
      pixelScript: !!window.fbq,
      pixelId: pixelStatus.pixelId,
      cookies: pixelStatus.cookies,
      events: pixelStatus.events,
      networkRequests: [],
      console: []
    };

    // فحص طلبات الشبكة
    if (window.performance && window.performance.getEntriesByType) {
      const networkEntries = window.performance.getEntriesByType('resource');
      checkResults.networkRequests = networkEntries
        .filter((entry: any) => entry.name.includes('facebook.com'))
        .map((entry: any) => ({
          url: entry.name,
          status: entry.responseStatus,
          duration: entry.duration
        }));
    }

    console.log('🔍 فحص Facebook Pixel الشامل:', checkResults);
    alert('تحقق من Console للحصول على نتائج الفحص الشامل');
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'ممتاز';
    if (score >= 60) return 'جيد';
    if (score >= 40) return 'متوسط';
    return 'ضعيف';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">📊 حالة Facebook Pixel</h3>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            pixelStatus.loaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {pixelStatus.loaded ? 'محمل ✅' : 'غير محمل ❌'}
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            pixelStatus.health.score >= 80 ? 'bg-green-100 text-green-800' : 
            pixelStatus.health.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {pixelStatus.health.score}/100
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* تقييم الصحة */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">تقييم الصحة العام</span>
            <span className={`font-bold ${getHealthColor(pixelStatus.health.score)}`}>
              {getHealthLabel(pixelStatus.health.score)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                pixelStatus.health.score >= 80 ? 'bg-green-500' : 
                pixelStatus.health.score >= 60 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${pixelStatus.health.score}%` }}
            />
          </div>
        </div>

        {/* معرف البكسل */}
        <div>
          <div className="text-sm font-medium text-gray-700">معرف البكسل:</div>
          <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
            {pixelStatus.pixelId || 'غير موجود'}
          </div>
        </div>

        {/* الكوكيز */}
        <div>
          <div className="text-sm font-medium text-gray-700">الكوكيز:</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>_fbp:</span>
              <span className={`font-mono ${pixelStatus.cookies.fbp ? 'text-green-600' : 'text-red-600'}`}>
                {pixelStatus.cookies.fbp ? '✅ موجود' : '❌ غير موجود'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>_fbc:</span>
              <span className={`font-mono ${pixelStatus.cookies.fbc ? 'text-green-600' : 'text-red-600'}`}>
                {pixelStatus.cookies.fbc ? '✅ موجود' : '❌ غير موجود'}
              </span>
            </div>
          </div>
        </div>

        {/* الأحداث المُرسلة */}
        <div>
          <div className="text-sm font-medium text-gray-700">الأحداث المُرسلة من Pixel:</div>
          <div className="text-xs">
            {pixelStatus.events.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {pixelStatus.events.map((event, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {event}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">لا توجد أحداث</span>
            )}
          </div>
        </div>

        {/* المشاكل والتوصيات */}
        {pixelStatus.health.issues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-red-800 text-sm font-medium mb-1">⚠️ مشاكل مكتشفة:</div>
            <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
              {pixelStatus.health.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {pixelStatus.health.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-blue-800 text-sm font-medium mb-1">💡 توصيات للتحسين:</div>
            <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
              {pixelStatus.health.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* أدوات الاختبار */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">أدوات الاختبار:</span>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'إخفاء' : 'عرض'} الأدوات المتقدمة
            </button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => testPixelEvent('ViewContent')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              disabled={!pixelStatus.loaded}
            >
              اختبار ViewContent
            </button>
            <button
              onClick={() => testPixelEvent('AddToCart')}
              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
              disabled={!pixelStatus.loaded}
            >
              اختبار AddToCart
            </button>
            <button
              onClick={() => testPixelEvent('Purchase')}
              className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
              disabled={!pixelStatus.loaded}
            >
              اختبار Purchase
            </button>
          </div>
        </div>

        {/* نتائج الاختبار */}
        {testResults.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 mb-2">نتائج الاختبار:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs flex items-center justify-between">
                  <span>{result.event}</span>
                  <span className={`px-1 rounded ${
                    result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.status === 'success' ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* أدوات متقدمة */}
        {showAdvanced && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">أدوات متقدمة:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={runComprehensiveCheck}
                className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
              >
                فحص شامل
              </button>
              <button
                onClick={() => {
                  console.log('🔍 Facebook Pixel Debug:', {
                    fbq: window.fbq,
                    pixelStatus,
                    cookies: document.cookie,
                    trackingData: (window as any).__trackingDebugData
                  });
                  alert('تحقق من Console للحصول على التفاصيل الكاملة');
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                تصدير Debug
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookPixelChecker; 