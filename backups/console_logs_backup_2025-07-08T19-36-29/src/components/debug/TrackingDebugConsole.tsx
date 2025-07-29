import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DuplicateEventDetector from './DuplicateEventDetector';
import FacebookPixelChecker from './FacebookPixelChecker';
import FacebookCookieManager from './FacebookCookieManager';
import FacebookURLTracker from './FacebookURLTracker';

interface TrackingEvent {
  id: string;
  timestamp: string;
  type: 'pixel' | 'conversion_api' | 'error' | 'info';
  platform: 'facebook' | 'google' | 'tiktok' | 'system';
  event_name: string;
  data?: any;
  status: 'success' | 'error' | 'pending';
  details?: string;
  response?: any;
}

interface TrackingDebugConsoleProps {
  productId: string;
  organizationId: string;
}

export const TrackingDebugConsole: React.FC<TrackingDebugConsoleProps> = ({
  productId,
  organizationId
}) => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [filters, setFilters] = useState({
    platform: 'all',
    type: 'all',
    status: 'all'
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventIdCounter = useRef(0);

  // تسجيل حدث جديد
  const logEvent = (event: Omit<TrackingEvent, 'id' | 'timestamp'>) => {
    const newEvent: TrackingEvent = {
      ...event,
      id: `event_${++eventIdCounter.current}`,
      timestamp: new Date().toISOString()
    };
    
    setEvents(prev => [newEvent, ...prev].slice(0, 100)); // الاحتفاظ بآخر 100 حدث
    
    // التمرير التلقائي للأسفل
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, 100);
  };

  // مراقبة أحداث Facebook Pixel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // مراقبة Facebook Pixel
    const originalFbq = window.fbq;
    if (originalFbq) {
      window.fbq = function(action: string, event: string, data?: any, options?: any) {
        // تسجيل الحدث
        logEvent({
          type: 'pixel',
          platform: 'facebook',
          event_name: `${action}:${event}`,
          data: { data, options },
          status: 'success',
          details: `Facebook Pixel: ${action} ${event}`
        });

        // استدعاء الدالة الأصلية
        return originalFbq.apply(this, arguments as any);
      };
    }

    // مراقبة طلبات Conversion API
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = input.toString();
      
      // مراقبة طلبات Facebook Conversion API
      if (url.includes('graph.facebook.com') && url.includes('events')) {
        const startTime = Date.now();
        
        logEvent({
          type: 'conversion_api',
          platform: 'facebook',
          event_name: 'API Request',
          status: 'pending',
          details: `إرسال إلى Facebook Conversion API`,
          data: { url, method: init?.method || 'GET' }
        });

        try {
          const response = await originalFetch.apply(this, arguments as any);
          const responseData = await response.clone().json().catch(() => null);
          const duration = Date.now() - startTime;
          
          logEvent({
            type: 'conversion_api',
            platform: 'facebook',
            event_name: 'API Response',
            status: response.ok ? 'success' : 'error',
            details: `Facebook Conversion API: ${response.status} (${duration}ms)`,
            data: { status: response.status, duration },
            response: responseData
          });

          return response;
        } catch (error) {
          const duration = Date.now() - startTime;
          logEvent({
            type: 'conversion_api',
            platform: 'facebook',
            event_name: 'API Error',
            status: 'error',
            details: `Facebook Conversion API خطأ: ${error}`,
            data: { error: error.toString(), duration }
          });
          throw error;
        }
      }

      return originalFetch.apply(this, arguments as any);
    };

    // تنظيف
    return () => {
      if (originalFbq) {
        window.fbq = originalFbq;
      }
      window.fetch = originalFetch;
    };
  }, []);

  // مراقبة أخطاء JavaScript
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.toLowerCase().includes('pixel') || 
          event.message.toLowerCase().includes('fbq') ||
          event.message.toLowerCase().includes('gtag')) {
        logEvent({
          type: 'error',
          platform: 'system',
          event_name: 'JavaScript Error',
          status: 'error',
          details: event.message,
          data: { filename: event.filename, lineno: event.lineno }
        });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // فلترة الأحداث
  const filteredEvents = events.filter(event => {
    if (filters.platform !== 'all' && event.platform !== filters.platform) return false;
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.status !== 'all' && event.status !== filters.status) return false;
    return true;
  });

  // إحصائيات
  const stats = {
    total: events.length,
    success: events.filter(e => e.status === 'success').length,
    errors: events.filter(e => e.status === 'error').length,
    facebook_pixel: events.filter(e => e.platform === 'facebook' && e.type === 'pixel').length,
    facebook_api: events.filter(e => e.platform === 'facebook' && e.type === 'conversion_api').length
  };

  const getEventIcon = (event: TrackingEvent) => {
    switch (event.type) {
      case 'pixel': return '🎯';
      case 'conversion_api': return '🔄';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'bg-blue-500';
      case 'google': return 'bg-red-500';
      case 'tiktok': return 'bg-black';
      default: return 'bg-gray-500';
    }
  };

  // اختبار أحداث تجريبية
  const testEvents = {
    viewContent: () => {
      if (window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_ids: [productId],
          content_type: 'product',
          value: 3000,
          currency: 'DZD'
        });
      }
    },
    addToCart: () => {
      if (window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_ids: [productId],
          content_type: 'product',
          value: 3000,
          currency: 'DZD'
        });
      }
    },
    initiateCheckout: () => {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: [productId],
          content_type: 'product',
          value: 3000,
          currency: 'DZD'
        });
      }
    },
    purchase: () => {
      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          content_ids: [productId],
          content_type: 'product',
          value: 3000,
          currency: 'DZD'
        });
      }
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          🔍 فتح كونسول التتبع
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">🔍 كونسول تشخيص التتبع</h2>
          <Badge variant="outline">{productId}</Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsVisible(false)}
        >
          ✕ إغلاق
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="live">الأحداث المباشرة</TabsTrigger>
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
            <TabsTrigger value="duplicates">الأحداث المكررة</TabsTrigger>
            <TabsTrigger value="test">اختبار الأحداث</TabsTrigger>
            <TabsTrigger value="pixel">Facebook Pixel</TabsTrigger>
            <TabsTrigger value="cookies">إدارة الكوكيز</TabsTrigger>
            <TabsTrigger value="urls">مراقب الروابط</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="flex-1 flex flex-col">
            {/* فلاتر */}
            <div className="flex gap-2 mb-4">
              <select 
                value={filters.platform} 
                onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                className="px-3 py-1 border rounded"
              >
                <option value="all">جميع المنصات</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="system">النظام</option>
              </select>
              
              <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-1 border rounded"
              >
                <option value="all">جميع الأنواع</option>
                <option value="pixel">Pixel</option>
                <option value="conversion_api">Conversion API</option>
                <option value="error">أخطاء</option>
                <option value="info">معلومات</option>
              </select>

              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-1 border rounded"
              >
                <option value="all">جميع الحالات</option>
                <option value="success">نجح</option>
                <option value="error">فشل</option>
                <option value="pending">معلق</option>
              </select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEvents([])}
              >
                مسح الكل
              </Button>
            </div>

            {/* قائمة الأحداث */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="space-y-2">
                {filteredEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    لا توجد أحداث لعرضها
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <Card key={event.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getEventIcon(event)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{event.event_name}</span>
                              <Badge className={`text-white ${getPlatformColor(event.platform)}`}>
                                {event.platform}
                              </Badge>
                              <Badge className={`text-white ${getStatusColor(event.status)}`}>
                                {event.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                            {event.data && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-600">عرض التفاصيل</summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                                  {JSON.stringify(event.data, null, 2)}
                                </pre>
                              </details>
                            )}
                            {event.response && (
                              <details className="text-xs mt-2">
                                <summary className="cursor-pointer text-green-600">عرض الاستجابة</summary>
                                <pre className="mt-2 p-2 bg-green-50 rounded overflow-auto">
                                  {JSON.stringify(event.response, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString('ar')}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">إجمالي الأحداث</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الأحداث الناجحة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">الأخطاء</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Facebook Pixel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.facebook_pixel}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conversion API</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.facebook_api}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">معدل النجاح</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="flex-1">
            <DuplicateEventDetector />
          </TabsContent>

          <TabsContent value="test" className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>اختبار أحداث Facebook</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={testEvents.viewContent} className="w-full">
                    🎯 اختبار ViewContent
                  </Button>
                  <Button onClick={testEvents.addToCart} className="w-full">
                    🛒 اختبار AddToCart
                  </Button>
                  <Button onClick={testEvents.initiateCheckout} className="w-full">
                    💳 اختبار InitiateCheckout
                  </Button>
                  <Button onClick={testEvents.purchase} className="w-full">
                    ✅ اختبار Purchase
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات التشخيص</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Facebook Pixel:</strong> {window.fbq ? '✅ محمل' : '❌ غير محمل'}
                  </div>
                  <div>
                    <strong>Google Analytics:</strong> {window.gtag ? '✅ محمل' : '❌ غير محمل'}
                  </div>
                  <div>
                    <strong>TikTok Pixel:</strong> {window.ttq ? '✅ محمل' : '❌ غير محمل'}
                  </div>
                  <div>
                    <strong>معرف المنتج:</strong> {productId}
                  </div>
                  <div>
                    <strong>معرف المؤسسة:</strong> {organizationId}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pixel" className="flex-1">
            <FacebookPixelChecker />
          </TabsContent>

          <TabsContent value="cookies" className="flex-1">
            <FacebookCookieManager />
          </TabsContent>

          <TabsContent value="urls" className="flex-1">
            <FacebookURLTracker />
          </TabsContent>

          <TabsContent value="settings" className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الكونسول</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    عدد الأحداث المحفوظة
                  </label>
                  <input 
                    type="number" 
                    defaultValue={100}
                    className="w-full px-3 py-2 border rounded"
                    min="10"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>تسجيل أحداث Pixel</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>تسجيل أحداث Conversion API</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>تسجيل الأخطاء</span>
                  </label>
                </div>
                
                <Button 
                  onClick={() => {
                    localStorage.removeItem('tracking_debug_events');
                    setEvents([]);
                  }}
                  variant="destructive"
                  className="w-full"
                >
                  مسح جميع البيانات المحفوظة
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// تصدير نوع للاستخدام في مكونات أخرى
export type { TrackingEvent }; 