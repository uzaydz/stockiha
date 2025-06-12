import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Package2,
  TruckIcon,
  Package,
  Truck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createShippingService, ShippingProvider as ShippingProviderEnum } from '@/api/shippingService';
import { supabase } from '@/lib/supabase-client';
import { ShippingProvider } from '@/hooks/useShippingProviders';

interface ProviderEditFormProps {
  provider: ShippingProvider;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TestResult {
  success: boolean;
  message: string;
}

// Provider icons mapping
const providerIcons = {
  yalidine: Package2,
  zrexpress: TruckIcon,
  mayesto: Package,
  ecotrack: Truck,
  default: Package
};

export default function ProviderEditForm({ 
  provider, 
  onSuccess, 
  onCancel 
}: ProviderEditFormProps) {
  const { toast } = useToast();
  const [apiToken, setApiToken] = useState(provider.api_token || '');
  const [apiKey, setApiKey] = useState(provider.api_key || '');
  const [isEnabled, setIsEnabled] = useState(provider.is_enabled);
  const [autoShipping, setAutoShipping] = useState(provider.auto_shipping);
  const [trackUpdates, setTrackUpdates] = useState(provider.track_updates);
  const [originWilayaId, setOriginWilayaId] = useState<number | undefined>(
    provider.settings?.origin_wilaya_id
  );
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getProviderIcon = (providerCode: string) => {
    const IconComponent = providerIcons[providerCode as keyof typeof providerIcons] || providerIcons.default;
    return IconComponent;
  };

  const getFieldLabels = (providerCode: string) => {
    switch (providerCode.toLowerCase()) {
      case 'yalidine':
        return {
          token: 'رمز API (API Token)',
          key: 'مفتاح API (API Key)',
          tokenPlaceholder: 'أدخل رمز API الخاص بياليدين',
          keyPlaceholder: 'أدخل مفتاح API الخاص بياليدين'
        };
      case 'zrexpress':
        return {
          token: 'Token',
          key: 'Key',
          tokenPlaceholder: 'أدخل Token الخاص بـ ZR Express',
          keyPlaceholder: 'أدخل Key الخاص بـ ZR Express'
        };
      default:
        return {
          token: 'API Token',
          key: 'API Key',
          tokenPlaceholder: 'أدخل API Token',
          keyPlaceholder: 'أدخل API Key'
        };
    }
  };

  const testConnection = async () => {
    if (!apiToken.trim() || !apiKey.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Map provider code to ShippingProvider enum
      let providerEnum: ShippingProviderEnum;
      switch (provider.provider_code.toLowerCase()) {
        case 'yalidine':
          providerEnum = ShippingProviderEnum.YALIDINE;
          break;
        case 'zrexpress':
          providerEnum = ShippingProviderEnum.ZREXPRESS;
          break;
        case 'mayesto':
          providerEnum = ShippingProviderEnum.MAYESTO;
          break;
        case 'ecotrack':
          providerEnum = ShippingProviderEnum.ECOTRACK;
          break;
        default:
          throw new Error(`Provider ${provider.provider_code} is not supported`);
      }

      // Create shipping service instance for testing
      const shippingService = createShippingService(providerEnum, {
        token: apiToken.trim(),
        key: apiKey.trim()
      });

      // Test credentials
      const result = await shippingService.testCredentials();
      
      setTestResult({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      setTestResult({
        success: false,
        message: 'حدث خطأ أثناء اختبار الاتصال: ' + ((error as Error)?.message || 'خطأ غير معروف')
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiToken.trim() || !apiKey.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare settings object
      const settings: any = { ...provider.settings };
      if (originWilayaId) {
        settings.origin_wilaya_id = originWilayaId;
      } else {
        delete settings.origin_wilaya_id;
      }

      // Update provider settings
      const { error } = await supabase
        .from('shipping_provider_settings')
        .update({
          api_token: apiToken.trim(),
          api_key: apiKey.trim(),
          is_enabled: isEnabled,
          auto_shipping: autoShipping,
          track_updates: trackUpdates,
          settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', provider.organization_id)
        .eq('provider_id', provider.provider_id);

      if (error) throw error;

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث إعدادات ${provider.provider_name} بنجاح`,
        variant: "default",
      });

      onSuccess();

    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث الإعدادات: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const IconComponent = getProviderIcon(provider.provider_code);
  const fieldLabels = getFieldLabels(provider.provider_code);

  return (
    <div className="space-y-6">
      {/* Provider Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{provider.provider_name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {provider.provider_code.toUpperCase()}
                </Badge>
                <span>تعديل إعدادات الاتصال</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Test Result */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات الاعتماد</CardTitle>
          <CardDescription>
            تعديل بيانات API للاتصال مع {provider.provider_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-token">{fieldLabels.token} <span className="text-destructive">*</span></Label>
              <Input
                id="api-token"
                type="password"
                placeholder={fieldLabels.tokenPlaceholder}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">{fieldLabels.key} <span className="text-destructive">*</span></Label>
              <Input
                id="api-key"
                type="password"
                placeholder={fieldLabels.keyPlaceholder}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Origin Wilaya for Yalidine */}
            {provider.provider_code.toLowerCase() === 'yalidine' && (
              <div className="space-y-2">
                <Label htmlFor="origin-wilaya">ولاية المصدر (اختياري)</Label>
                <Input
                  id="origin-wilaya"
                  type="number"
                  placeholder="مثال: 40 لولاية خنشلة"
                  value={originWilayaId || ''}
                  onChange={(e) => setOriginWilayaId(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  يمكنك تحديد ولاية المصدر لحساب أسعار الشحن بدقة أكبر
                </p>
              </div>
            )}

            {/* Test Connection Button */}
            <Button 
              onClick={testConnection} 
              variant="outline" 
              disabled={isTesting || !apiToken.trim() || !apiKey.trim() || isSaving}
              className="w-full"
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              اختبار الاتصال
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>الإعدادات المتقدمة</CardTitle>
          <CardDescription>
            تعديل إعدادات إضافية لتخصيص سلوك شركة التوصيل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>تفعيل الخدمة</Label>
              <p className="text-sm text-muted-foreground">
                تفعيل أو تعطيل استخدام هذه الشركة
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>الشحن التلقائي</Label>
              <p className="text-sm text-muted-foreground">
                إرسال الطلبات تلقائياً لشركة التوصيل
              </p>
            </div>
            <Switch
              checked={autoShipping}
              onCheckedChange={setAutoShipping}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>تتبع التحديثات</Label>
              <p className="text-sm text-muted-foreground">
                تلقي تحديثات حالة الشحنات تلقائياً
              </p>
            </div>
            <Switch
              checked={trackUpdates}
              onCheckedChange={setTrackUpdates}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving}
        >
          إلغاء
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
