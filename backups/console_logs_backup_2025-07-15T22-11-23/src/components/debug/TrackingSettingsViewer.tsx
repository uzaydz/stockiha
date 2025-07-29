import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TrackingSettingsViewerProps {
  settings: any;
  productId: string;
  organizationId: string;
}

export const TrackingSettingsViewer: React.FC<TrackingSettingsViewerProps> = ({
  settings,
  productId,
  organizationId
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPlatformStatus = (platform: string) => {
    if (!settings) return { enabled: false, configured: false };
    
    switch (platform) {
      case 'facebook':
        return {
          enabled: settings.facebook_pixel_enabled || false,
          configured: !!(settings.facebook_pixel_id && settings.facebook_access_token),
          pixelId: settings.facebook_pixel_id,
          hasConversionAPI: settings.enable_facebook_conversion_api || false,
          testMode: settings.facebook_test_mode || false,
          testEventCode: settings.facebook_test_event_code
        };
      case 'google':
        return {
          enabled: settings.google_ads_enabled || false,
          configured: !!(settings.google_ads_id),
          adsId: settings.google_ads_id
        };
      case 'tiktok':
        return {
          enabled: settings.tiktok_pixel_enabled || false,
          configured: !!(settings.tiktok_pixel_id),
          pixelId: settings.tiktok_pixel_id
        };
      case 'snapchat':
        return {
          enabled: settings.snapchat_pixel_enabled || false,
          configured: !!(settings.snapchat_pixel_id),
          pixelId: settings.snapchat_pixel_id
        };
      default:
        return { enabled: false, configured: false };
    }
  };

  const platforms = ['facebook', 'google', 'tiktok', 'snapchat'];

  if (!isVisible) {
    return (
      <div className="fixed bottom-36 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
          size="sm"
        >
          ⚙️ الإعدادات
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 w-96 max-h-96 z-50 bg-white rounded-lg shadow-2xl border">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">⚙️ إعدادات التتبع</h3>
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
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {/* معلومات أساسية */}
            <Card className="p-3">
              <div className="space-y-2 text-sm">
                <div><strong>معرف المنتج:</strong> {productId}</div>
                <div><strong>معرف المؤسسة:</strong> {organizationId}</div>
                <div><strong>حالة الإعدادات:</strong> 
                  {settings ? (
                    <Badge className="ml-2 bg-green-500 text-white">محملة</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500 text-white">غير محملة</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* حالة المنصات */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">حالة المنصات:</h4>
              {platforms.map(platform => {
                const status = getPlatformStatus(platform);
                return (
                  <Card key={platform} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">{platform}</span>
                        {status.enabled ? (
                          <Badge className="bg-green-500 text-white text-xs">مفعل</Badge>
                        ) : (
                          <Badge className="bg-gray-500 text-white text-xs">معطل</Badge>
                        )}
                        {status.configured ? (
                          <Badge className="bg-blue-500 text-white text-xs">مكون</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white text-xs">غير مكون</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs space-y-1 text-gray-600">
                      {status.pixelId && (
                        <div><strong>Pixel ID:</strong> {status.pixelId}</div>
                      )}
                      {status.adsId && (
                        <div><strong>Ads ID:</strong> {status.adsId}</div>
                      )}
                      {status.hasConversionAPI && (
                        <div className="flex items-center gap-1">
                          <strong>Conversion API:</strong>
                          <Badge className="bg-purple-500 text-white text-xs">مفعل</Badge>
                        </div>
                      )}
                      {status.testMode && (
                        <div className="flex items-center gap-1">
                          <strong>Test Mode:</strong>
                          <Badge className="bg-yellow-500 text-white text-xs">مفعل</Badge>
                          {status.testEventCode && (
                            <span className="text-xs">({status.testEventCode})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* البيانات الخام */}
            {settings && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 font-medium mb-2">
                  عرض البيانات الخام
                </summary>
                <pre className="p-3 bg-gray-100 rounded overflow-auto text-xs max-h-40">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </details>
            )}

            {/* معلومات المتصفح */}
            <Card className="p-3">
              <h4 className="font-medium text-sm mb-2">حالة المتصفح:</h4>
              <div className="space-y-1 text-xs">
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
                  <strong>User Agent:</strong> 
                  <div className="text-xs text-gray-500 break-all">
                    {navigator.userAgent.slice(0, 100)}...
                  </div>
                </div>
              </div>
            </Card>

            {/* أزرار الاختبار */}
            <Card className="p-3">
              <h4 className="font-medium text-sm mb-2">اختبارات سريعة:</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    if (window.fbq) {
                      window.fbq('track', 'ViewContent', {
                        content_ids: [productId],
                        content_type: 'product',
                        value: 100,
                        currency: 'DZD'
                      });
                    }
                  }}
                >
                  ViewContent
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    if (window.fbq) {
                      window.fbq('track', 'AddToCart', {
                        content_ids: [productId],
                        content_type: 'product',
                        value: 100,
                        currency: 'DZD'
                      });
                    }
                  }}
                >
                  AddToCart
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                  }}
                >
                  طباعة الإعدادات
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  إعادة تحميل
                </Button>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TrackingSettingsViewer;
