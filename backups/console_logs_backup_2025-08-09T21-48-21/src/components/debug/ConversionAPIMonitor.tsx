import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversionAPIRequest {
  id: string;
  timestamp: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  status?: number;
  response?: any;
  duration?: number;
  error?: string;
}

interface ConversionAPIMonitorProps {
  onRequestCaptured?: (request: ConversionAPIRequest) => void;
}

export const ConversionAPIMonitor: React.FC<ConversionAPIMonitorProps> = ({
  onRequestCaptured
}) => {
  const [requests, setRequests] = useState<ConversionAPIRequest[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const requestIdCounter = useRef(0);

  // مراقبة طلبات Conversion API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = input.toString();
      
      // مراقبة طلبات Facebook Conversion API فقط
      if (url.includes('graph.facebook.com') && url.includes('events')) {
        const requestId = `req_${++requestIdCounter.current}`;
        const startTime = Date.now();
        
        // تسجيل بداية الطلب
        const request: ConversionAPIRequest = {
          id: requestId,
          timestamp: new Date().toISOString(),
          url,
          method: init?.method || 'GET',
          headers: (init?.headers as Record<string, string>) || {},
          body: init?.body ? JSON.parse(init.body as string) : null
        };

        setRequests(prev => [request, ...prev].slice(0, 50));
        onRequestCaptured?.(request);

        try {
          const response = await originalFetch.apply(this, arguments as any);
          const responseData = await response.clone().json().catch(() => null);
          const duration = Date.now() - startTime;
          
          // تحديث الطلب بالاستجابة
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { 
                  ...req, 
                  status: response.status, 
                  response: responseData, 
                  duration 
                }
              : req
          ));

          return response;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // تحديث الطلب بالخطأ
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { 
                  ...req, 
                  error: error.toString(), 
                  duration 
                }
              : req
          ));
          
          throw error;
        }
      }

      return originalFetch.apply(this, arguments as any);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [onRequestCaptured]);

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-500';
    if (status >= 400) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const formatHeaders = (headers: Record<string, string>) => {
    return Object.entries(headers)
      .filter(([key]) => !key.toLowerCase().includes('authorization'))
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          size="sm"
        >
          🔄 Conversion API
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 z-50 bg-white rounded-lg shadow-2xl border">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">🔄 Conversion API Monitor</h3>
          <Badge variant="outline">{requests.length}</Badge>
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
            onClick={() => setRequests([])}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            مسح الكل
          </Button>
          <Button 
            onClick={() => {
              // اختبار طلب تجريبي
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
          {requests.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              لا توجد طلبات Conversion API
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <Card key={request.id} className="p-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-white text-xs ${getStatusColor(request.status)}`}>
                          {request.status || 'Pending'}
                        </Badge>
                        <span className="text-xs font-medium">{request.method}</span>
                        {request.duration && (
                          <span className="text-xs text-gray-500">{request.duration}ms</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(request.timestamp).toLocaleTimeString('ar')}
                      </span>
                    </div>

                    <div className="text-xs">
                      <div className="font-medium mb-1">URL:</div>
                      <div className="bg-gray-100 p-1 rounded text-xs break-all">
                        {request.url}
                      </div>
                    </div>

                    {request.body && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 font-medium">
                          عرض البيانات المرسلة
                        </summary>
                        <pre className="mt-1 p-2 bg-blue-50 rounded overflow-auto text-xs">
                          {JSON.stringify(request.body, null, 2)}
                        </pre>
                      </details>
                    )}

                    {request.response && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-600 font-medium">
                          عرض الاستجابة
                        </summary>
                        <pre className="mt-1 p-2 bg-green-50 rounded overflow-auto text-xs">
                          {JSON.stringify(request.response, null, 2)}
                        </pre>
                      </details>
                    )}

                    {request.error && (
                      <div className="text-xs">
                        <div className="font-medium text-red-600 mb-1">خطأ:</div>
                        <div className="bg-red-50 p-1 rounded text-red-700">
                          {request.error}
                        </div>
                      </div>
                    )}

                    {Object.keys(request.headers).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 font-medium">
                          عرض Headers
                        </summary>
                        <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto text-xs">
                          {formatHeaders(request.headers)}
                        </pre>
                      </details>
                    )}
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

export default ConversionAPIMonitor;
