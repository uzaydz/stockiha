import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';

// مكون قابل لإعادة الاستخدام لبكسل التتبع
interface TrackingPixelProps {
  platform: string;
  enabled: boolean;
  pixelId: string;
  onEnabledChange: (checked: boolean) => void;
  onPixelIdChange: (value: string) => void;
  icon: React.ReactNode;
  bgColor: string;
  textColor?: string;
  placeholder?: string;
  helpText?: string;
}

const TrackingPixel = ({
  platform,
  enabled,
  pixelId,
  onEnabledChange,
  onPixelIdChange,
  icon,
  bgColor,
  textColor = 'white',
  placeholder,
  helpText
}: TrackingPixelProps) => {
  return (
    <div className="space-y-4 rounded-md border-2 p-4 transition-all hover:border-primary/30 hover:bg-muted/5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{ backgroundColor: bgColor }}>
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-lg">بكسل {platform}</h3>
            {!enabled && <p className="text-xs text-muted-foreground">غير مفعل</p>}
          </div>
        </div>
        <Switch 
          id={`${platform.toLowerCase()}_enabled`}
          checked={enabled}
          onCheckedChange={onEnabledChange}
          className="scale-110"
        />
      </div>
      
      {enabled && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor={`${platform.toLowerCase()}_pixel_id`} className="font-medium">
            معرف بكسل {platform}
          </Label>
          <Input 
            id={`${platform.toLowerCase()}_pixel_id`} 
            value={pixelId} 
            onChange={(e) => onPixelIdChange(e.target.value)}
            placeholder={placeholder}
            className="h-11"
          />
          {helpText && (
            <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1.5">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{helpText}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface TrackingPixelsSettingsProps {
  trackingPixels: {
    facebook: { enabled: boolean; pixelId: string };
    tiktok: { enabled: boolean; pixelId: string };
    snapchat: { enabled: boolean; pixelId: string };
    google: { enabled: boolean; pixelId: string };
  };
  updateTrackingPixel: (platform: string, field: string, value: any) => void;
}

const TrackingPixelsSettings = ({ trackingPixels, updateTrackingPixel }: TrackingPixelsSettingsProps) => {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-muted/30">
        <CardTitle>بكسل التتبع الإعلاني</CardTitle>
        <CardDescription>
          إضافة بكسل التتبع للحملات الإعلانية على المنصات المختلفة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* نبذة تعريفية */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg mb-6">
          <h3 className="font-medium mb-2 text-blue-700 dark:text-blue-400">ما هي بكسلات التتبع؟</h3>
          <p className="text-sm text-blue-700/90 dark:text-blue-400/90">
            بكسلات التتبع هي أدوات تتيح لك تتبع نشاط الزوار على موقعك وقياس أداء حملاتك الإعلانية.
            عند تفعيل بكسل تتبع، يمكنك استهداف الزائرين الذين تفاعلوا مع متجرك في حملاتك الإعلانية المستقبلية.
          </p>
        </div>
        
        {/* فيسبوك بكسل */}
        <TrackingPixel
          platform="فيسبوك"
          enabled={trackingPixels.facebook.enabled}
          pixelId={trackingPixels.facebook.pixelId}
          onEnabledChange={(checked) => updateTrackingPixel('facebook', 'enabled', checked)}
          onPixelIdChange={(value) => updateTrackingPixel('facebook', 'pixelId', value)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          }
          bgColor="#1877F2"
          placeholder="مثال: 123456789012345"
          helpText="يمكنك الحصول على معرف البكسل من إدارة الإعلانات على فيسبوك"
        />
        
        {/* تيك توك بكسل */}
        <TrackingPixel
          platform="تيك توك"
          enabled={trackingPixels.tiktok.enabled}
          pixelId={trackingPixels.tiktok.pixelId}
          onEnabledChange={(checked) => updateTrackingPixel('tiktok', 'enabled', checked)}
          onPixelIdChange={(value) => updateTrackingPixel('tiktok', 'pixelId', value)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 448 512" fill="white">
              <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
            </svg>
          }
          bgColor="#000000"
          placeholder="مثال: CGNXXXXXXX"
          helpText="يمكنك الحصول على معرف البكسل من منصة TikTok Ads في قسم Library > Events"
        />
        
        {/* سناب شات بكسل */}
        <TrackingPixel
          platform="سناب شات"
          enabled={trackingPixels.snapchat.enabled}
          pixelId={trackingPixels.snapchat.pixelId}
          onEnabledChange={(checked) => updateTrackingPixel('snapchat', 'enabled', checked)}
          onPixelIdChange={(value) => updateTrackingPixel('snapchat', 'pixelId', value)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c-1.4 0-2.6.4-3.7 1.2C7.1 4 6.5 5 6.2 6.2c-.3 1.3-.2 2.4-.2 3.8 0 .3-.1.7.1 1 .2.2.3.2.6.2.4 0 .8-.2 1.1-.4.1-.1.1-.1.2-.1s.1 0 .1.1v.1c.1.6.2 1.2.6 1.7.4.6 1 1 1.7 1.3.5.2 1 .3 1.6.3.7 0 1.4-.2 2-.5.7-.3 1.2-.8 1.6-1.3.3-.5.5-1 .6-1.6V9.9c0-.1 0-.2.1-.2s.2 0 .3.1c.3.2.7.4 1.1.4.3 0 .4-.1.5-.2.1-.2.1-.5.1-.7v-.4c0-1.3.1-2.4-.2-3.6-.3-1.3-.8-2.2-2-3C14.6 2.4 13.4 2 12 2z"></path>
            </svg>
          }
          bgColor="#FFFC00"
          textColor="black"
          placeholder="مثال: 12a34b56-7c89-0d12-e3f4-567g8h90ij12"
          helpText="يمكنك الحصول على معرف البكسل من إعدادات الإعلانات في سناب شات"
        />
        
        {/* جوجل أناليتكس */}
        <TrackingPixel
          platform="جوجل أناليتكس"
          enabled={trackingPixels.google.enabled}
          pixelId={trackingPixels.google.pixelId}
          onEnabledChange={(checked) => updateTrackingPixel('google', 'enabled', checked)}
          onPixelIdChange={(value) => updateTrackingPixel('google', 'pixelId', value)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 10 10v-3" /><path d="M22 12h-3" /><path d="M19 15h-2a5 5 0 0 0-5 5v2" />
            </svg>
          }
          bgColor="#DB4437"
          placeholder="مثال: G-XXXXXXXXXX أو UA-XXXXXXXXX-X"
          helpText="يمكنك الحصول على معرف التتبع من لوحة تحكم جوجل أناليتكس"
        />
      </CardContent>
    </Card>
  );
};

export default TrackingPixelsSettings;
