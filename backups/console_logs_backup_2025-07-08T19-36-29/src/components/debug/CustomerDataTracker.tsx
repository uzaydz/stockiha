import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface CustomerDataEvent {
  timestamp: string;
  type: string;
  customerData: Record<string, any>;
  hashedData: Record<string, any>;
  status: 'success' | 'error';
  platform: string;
}

interface MatchQualityMetrics {
  currentParameters: string[];
  missingParameters: string[];
  potentialImprovement: number;
  recommendations: string[];
}

export const CustomerDataTracker: React.FC = () => {
  const [events, setEvents] = useState<CustomerDataEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    // مراقبة window.__trackingDebugData للأحداث الجديدة
    const checkForNewEvents = () => {
      if (typeof window !== 'undefined' && window.__trackingDebugData) {
        const newEvents = window.__trackingDebugData
          .filter(event => 
            event.type === 'conversion_api_success' || 
            event.type === 'conversion_api_error'
          )
          .map(event => ({
            timestamp: event.timestamp,
            type: event.type,
            customerData: event.details?.payload?.data?.[0]?.user_data || {},
            hashedData: event.details?.payload?.data?.[0]?.user_data || {},
            status: event.status,
            platform: event.platform || 'Facebook'
          }));
        
        setEvents(newEvents);
      }
    };

    const interval = setInterval(checkForNewEvents, 1000);
    checkForNewEvents(); // تحقق فوري

    return () => clearInterval(interval);
  }, []);

  const clearEvents = () => {
    setEvents([]);
    if (typeof window !== 'undefined') {
      window.__trackingDebugData = [];
    }
  };

  const testCustomerData = async () => {
    // إنشاء بيانات تجريبية
    const testData = {
      email: 'test@example.com',
      phone: '0123456789',
      firstName: 'أحمد',
      lastName: 'محمد',
      city: 'الجزائر',
      state: 'الجزائر',
      country: 'DZ'
    };

    console.log('🧪 اختبار بيانات العميل:', testData);
    
    // محاكاة إرسال الحدث
    if (typeof window !== 'undefined') {
      if (!window.__trackingDebugData) {
        window.__trackingDebugData = [];
      }
      
      window.__trackingDebugData.push({
        timestamp: new Date().toISOString(),
        type: 'conversion_api_test',
        status: 'success',
        details: {
          payload: {
            data: [{
              user_data: testData
            }]
          }
        },
        platform: 'Facebook Test'
      });
    }
  };

  // تحليل جودة المطابقة
  const analyzeMatchQuality = (customerData: Record<string, any>): MatchQualityMetrics => {
    const availableParams = Object.keys(customerData).filter(key => customerData[key]);
    
    // المعايير المهمة لجودة المطابقة مع النسب المحتملة للتحسين
    const importantParams = {
      'em': { name: 'البريد الإلكتروني', improvement: 25 },
      'ph': { name: 'رقم الهاتف', improvement: 0 }, // موجود دائماً
      'fn': { name: 'الاسم الأول', improvement: 11 },
      'ln': { name: 'اسم العائلة', improvement: 11 },
      'ct': { name: 'المدينة', improvement: 0 }, // موجود دائماً
      'st': { name: 'الولاية', improvement: 0 }, // موجود دائماً
      'country': { name: 'الدولة', improvement: 0 }, // موجود دائماً
      'client_ip_address': { name: 'عنوان IP', improvement: 22 },
      'fbc': { name: 'معرف النقر (fbc)', improvement: 22 },
      'fbp': { name: 'معرف المتصفح (fbp)', improvement: 0 }, // موجود دائماً
      'client_user_agent': { name: 'وكيل المستخدم', improvement: 0 }, // موجود دائماً
    };

    const currentParams = availableParams.filter(param => importantParams[param]);
    const missingParams = Object.keys(importantParams).filter(param => !availableParams.includes(param));
    
    const potentialImprovement = missingParams.reduce((total, param) => {
      return total + (importantParams[param]?.improvement || 0);
    }, 0);

    const recommendations = missingParams.map(param => {
      const info = importantParams[param];
      return `إضافة ${info.name} يمكن أن يحسن جودة المطابقة بنسبة ${info.improvement}%`;
    }).filter(rec => !rec.includes('0%'));

    return {
      currentParameters: currentParams.map(param => importantParams[param]?.name || param),
      missingParameters: missingParams.map(param => importantParams[param]?.name || param),
      potentialImprovement,
      recommendations
    };
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          👤 بيانات العميل
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="shadow-xl border-2 border-blue-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-blue-800">تتبع بيانات العميل</CardTitle>
              <CardDescription>جودة مطابقة أحداث Facebook</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* أزرار التحكم */}
          <div className="flex gap-2">
            <Button 
              onClick={testCustomerData}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              🧪 اختبار
            </Button>
            <Button 
              onClick={clearEvents}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              🗑️ مسح
            </Button>
            <Button 
              onClick={() => setShowRawData(!showRawData)}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              {showRawData ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              البيانات الخام
            </Button>
          </div>

          {/* إحصائيات عامة */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">الإحصائيات</span>
            </div>
            <div className="text-sm text-blue-700">
              <div>إجمالي الأحداث: {events.length}</div>
              <div>الناجحة: {events.filter(e => e.status === 'success').length}</div>
              <div>الفاشلة: {events.filter(e => e.status === 'error').length}</div>
            </div>
          </div>

          {/* الأحداث */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                لا توجد أحداث بعد
              </div>
            ) : (
              events.map((event, index) => {
                const matchQuality = analyzeMatchQuality(event.customerData);
                
                return (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    {/* رأس الحدث */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {event.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{event.platform}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString('ar')}
                      </span>
                    </div>

                    {/* تحليل جودة المطابقة */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">جودة المطابقة</span>
                      </div>
                      
                      {/* المعايير الحالية */}
                      <div>
                        <div className="text-xs text-gray-600 mb-1">المعايير المرسلة:</div>
                        <div className="flex flex-wrap gap-1">
                          {matchQuality.currentParameters.map((param, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* المعايير المفقودة */}
                      {matchQuality.missingParameters.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">معايير مفقودة:</div>
                          <div className="flex flex-wrap gap-1">
                            {matchQuality.missingParameters.map((param, i) => (
                              <Badge key={i} variant="outline" className="text-xs text-red-600">
                                {param}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* إمكانية التحسين */}
                      {matchQuality.potentialImprovement > 0 && (
                        <div className="bg-yellow-50 p-2 rounded text-xs">
                          <div className="font-medium text-yellow-800 mb-1">
                            🚀 إمكانية تحسين: +{matchQuality.potentialImprovement}%
                          </div>
                          <ul className="text-yellow-700 space-y-1">
                            {matchQuality.recommendations.map((rec, i) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* البيانات الخام */}
                      {showRawData && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            عرض البيانات الخام
                          </summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                            {JSON.stringify(event.customerData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDataTracker; 