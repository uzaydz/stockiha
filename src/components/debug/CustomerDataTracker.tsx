import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CustomerDataEvent {
  timestamp: string;
  type: string;
  customerData: any;
  hashedData?: any;
  status: 'success' | 'error';
  platform: string;
}

export const CustomerDataTracker: React.FC = () => {
  const [events, setEvents] = useState<CustomerDataEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

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

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          👤 بيانات العميل
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <Card className="bg-white shadow-lg border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              👤 تشخيص بيانات العميل
            </CardTitle>
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
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                لا توجد أحداث بعد
              </p>
            ) : (
              events.slice(-5).reverse().map((event, index) => (
                <div key={index} className="border rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant={event.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {event.platform}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString('ar-DZ')}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-2 rounded mt-1">
                    <div className="text-xs font-medium mb-1">البيانات المرسلة:</div>
                    <div className="space-y-1">
                      {Object.entries(event.customerData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600">{key}:</span>
                          <span className="font-mono text-xs max-w-32 truncate">
                            {typeof value === 'string' ? (
                              value.length > 20 ? 
                                `${value.substring(0, 20)}...` : 
                                value
                            ) : (
                              JSON.stringify(value)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDataTracker; 