import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FacebookEvent {
  id: string;
  timestamp: string;
  action: string;
  event: string;
  data: any;
  options?: any;
  source: 'pixel' | 'manual';
  pixelId?: string;
}

interface FacebookEventsLoggerProps {
  pixelId?: string;
}

export const FacebookEventsLogger: React.FC<FacebookEventsLoggerProps> = ({
  pixelId
}) => {
  const [events, setEvents] = useState<FacebookEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const eventIdCounter = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // مراقبة أحداث Facebook Pixel
    const originalFbq = window.fbq;
    if (originalFbq) {
      window.fbq = function(action: string, event: string, data?: any, options?: any) {
        // تسجيل الحدث
        const fbEvent: FacebookEvent = {
          id: `fb_event_${++eventIdCounter.current}`,
          timestamp: new Date().toISOString(),
          action,
          event,
          data: data || {},
          options: options || {},
          source: 'pixel',
          pixelId: pixelId || 'unknown'
        };

        setEvents(prev => [fbEvent, ...prev].slice(0, 100));

        // استدعاء الدالة الأصلية
        return originalFbq.apply(this, arguments as any);
      };

      // نسخ خصائص الدالة الأصلية
      Object.keys(originalFbq).forEach(key => {
        (window.fbq as any)[key] = (originalFbq as any)[key];
      });
    }

    return () => {
      if (originalFbq) {
        window.fbq = originalFbq;
      }
    };
  }, [pixelId]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'track': return 'bg-blue-500';
      case 'trackCustom': return 'bg-purple-500';
      case 'init': return 'bg-green-500';
      case 'consent': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'ViewContent': return '👁️';
      case 'AddToCart': return '🛒';
      case 'InitiateCheckout': return '💳';
      case 'Purchase': return '✅';
      case 'AddToWishlist': return '❤️';
      case 'Search': return '🔍';
      case 'Lead': return '📝';
      case 'CompleteRegistration': return '📋';
      default: return '📊';
    }
  };

  const formatEventData = (data: any) => {
    if (!data || Object.keys(data).length === 0) return 'لا توجد بيانات';
    
    const formatted = [];
    if (data.content_ids) formatted.push(`IDs: ${data.content_ids.join(', ')}`);
    if (data.content_type) formatted.push(`Type: ${data.content_type}`);
    if (data.value) formatted.push(`Value: ${data.value}`);
    if (data.currency) formatted.push(`Currency: ${data.currency}`);
    if (data.content_name) formatted.push(`Name: ${data.content_name}`);
    if (data.content_category) formatted.push(`Category: ${data.content_category}`);
    
    return formatted.length > 0 ? formatted.join(' | ') : JSON.stringify(data);
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facebook-events-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-52 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          📘 FB Events ({events.length})
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-96 max-h-96 z-50 bg-white rounded-lg shadow-2xl border">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">📘 Facebook Events</h3>
          <Badge variant="outline">{events.length}</Badge>
          {pixelId && (
            <Badge className="bg-blue-500 text-white text-xs">{pixelId}</Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsVisible(false)}
        >
          ✕
        </Button>
      </div>

      <div className="p-3">
        <div className="flex gap-2 mb-3">
          <Button 
            onClick={() => setEvents([])}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            مسح
          </Button>
          <Button 
            onClick={exportEvents}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            تصدير
          </Button>
          <Button 
            onClick={() => {
              if (window.fbq) {
                window.fbq('track', 'ViewContent', {
                  content_ids: ['test-product'],
                  content_type: 'product',
                  value: 100,
                  currency: 'DZD'
                });
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            اختبار
          </Button>
        </div>

        <ScrollArea className="h-64">
          {events.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              لا توجد أحداث Facebook
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <Card key={event.id} className="p-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEventIcon(event.event)}</span>
                        <div>
                          <div className="font-medium text-sm">{event.event}</div>
                          <div className="flex items-center gap-1">
                            <Badge className={`text-white text-xs ${getActionColor(event.action)}`}>
                              {event.action}
                            </Badge>
                            <Badge className="bg-gray-500 text-white text-xs">
                              {event.source}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString('ar')}
                      </span>
                    </div>

                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">البيانات:</div>
                      <div className="bg-gray-100 p-2 rounded text-xs">
                        {formatEventData(event.data)}
                      </div>
                    </div>

                    {event.options && Object.keys(event.options).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 font-medium">
                          عرض الخيارات
                        </summary>
                        <pre className="mt-1 p-2 bg-blue-50 rounded overflow-auto text-xs">
                          {JSON.stringify(event.options, null, 2)}
                        </pre>
                      </details>
                    )}

                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 font-medium">
                        عرض البيانات الكاملة
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto text-xs">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default FacebookEventsLogger; 