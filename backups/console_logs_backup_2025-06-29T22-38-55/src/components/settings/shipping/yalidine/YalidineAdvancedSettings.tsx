import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { YalidineProviderProps } from './types';

export default function YalidineAdvancedSettings({
  isEnabled,
  autoShipping,
  trackUpdates,
  setAutoShipping,
  setTrackUpdates,
  saveSettings,
  apiToken,
  apiKey,
  toast
}: YalidineProviderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات متقدمة</CardTitle>
        <CardDescription>
          إعدادات إضافية لتخصيص تكامل خدمة ياليدين
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-3 rounded-md border">
          <div className="space-y-0.5">
            <Label htmlFor="auto-shipping" className="text-base">شحن تلقائي</Label>
            <p className="text-sm text-muted-foreground">
              إنشاء طلبات شحن تلقائياً عند تأكيد الطلبات
            </p>
          </div>
          <Switch 
            id="auto-shipping" 
            checked={autoShipping}
            onCheckedChange={(checked) => {
              setAutoShipping(checked);
              saveSettings({
                is_enabled: isEnabled,
                api_token: apiToken,
                api_key: apiKey,
                auto_shipping: checked,
                track_updates: trackUpdates
              });
              
              toast({
                title: checked ? "تم تفعيل الشحن التلقائي" : "تم تعطيل الشحن التلقائي",
                variant: "default",
              });
            }}
            disabled={!isEnabled}
          />
        </div>
        
        <div className="flex items-center justify-between gap-4 p-3 rounded-md border">
          <div className="space-y-0.5">
            <Label htmlFor="tracking-updates" className="text-base">تحديثات التتبع</Label>
            <p className="text-sm text-muted-foreground">
              تحديث حالة الطلبات تلقائياً عند تغير حالة الشحن
            </p>
          </div>
          <Switch 
            id="tracking-updates"
            checked={trackUpdates}
            onCheckedChange={(checked) => {
              setTrackUpdates(checked);
              saveSettings({
                is_enabled: isEnabled,
                api_token: apiToken,
                api_key: apiKey,
                auto_shipping: autoShipping,
                track_updates: checked
              });
              
              toast({
                title: checked ? "تم تفعيل تحديثات التتبع" : "تم تعطيل تحديثات التتبع",
                variant: "default",
              });
            }}
            disabled={!isEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
