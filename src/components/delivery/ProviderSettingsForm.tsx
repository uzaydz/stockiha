import { useState } from 'react';
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

interface AvailableProvider {
  id: number;
  code: string;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface ProviderSettingsFormProps {
  provider: AvailableProvider;
  organizationId: string;
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
  // Ecotrack-integrated providers
  anderson_delivery: Truck,
  areex: Package,
  ba_consult: TruckIcon,
  conexlog: Truck,
  coyote_express: Package2,
  dhd: Truck,
  distazero: Package,
  e48hr_livraison: TruckIcon,
  fretdirect: Truck,
  golivri: Package2,
  mono_hub: Package,
  msm_go: TruckIcon,
  imir_express: Truck,
  packers: Package,
  prest: Package2,
  rb_livraison: TruckIcon,
  rex_livraison: Truck,
  rocket_delivery: Package2,
  salva_delivery: Package,
  speed_delivery: TruckIcon,
  tsl_express: Truck,
  worldexpress: Package2,
  default: Package
};

export default function ProviderSettingsForm({ 
  provider, 
  organizationId, 
  onSuccess, 
  onCancel 
}: ProviderSettingsFormProps) {
  const { toast } = useToast();
  const [apiToken, setApiToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoShipping, setAutoShipping] = useState(false);
  const [trackUpdates, setTrackUpdates] = useState(false);
  const [originWilayaId, setOriginWilayaId] = useState<number | undefined>(undefined);
  
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
          token: 'مفتاح API (API Key)*',
          key: 'توكن API (API Token)*',
          tokenPlaceholder: 'أدخل مفتاح API الخاص بياليدين',
          keyPlaceholder: 'أدخل توكن API الخاص بياليدين'
        };
      case 'zrexpress':
        return {
          token: 'Token',
          key: 'Key',
          tokenPlaceholder: 'أدخل Token الخاص بـ ZR Express',
          keyPlaceholder: 'أدخل Key الخاص بـ ZR Express'
        };
      case 'ecotrack':
      case 'anderson_delivery':
      case 'areex':
      case 'ba_consult':
      case 'conexlog':
      case 'coyote_express':
      case 'dhd':
      case 'distazero':
      case 'e48hr_livraison':
      case 'fretdirect':
      case 'golivri':
      case 'mono_hub':
      case 'msm_go':
      case 'imir_express':
      case 'packers':
      case 'prest':
      case 'rb_livraison':
      case 'rex_livraison':
      case 'rocket_delivery':
      case 'salva_delivery':
      case 'speed_delivery':
      case 'tsl_express':
      case 'worldexpress':
        return {
          token: 'Bearer Token',
          key: 'مفتاح إضافي (اختياري)',
          tokenPlaceholder: 'أدخل Bearer Token للمصادقة مع Ecotrack',
          keyPlaceholder: 'مفتاح إضافي إذا لزم الأمر (اختياري)'
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
    console.log('🔍 بدء اختبار الاتصال...', {
      provider: provider.code,
      apiToken: apiToken ? `${apiToken.substring(0, 8)}...` : 'غير موجود',
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'غير موجود'
    });

    // For Ecotrack providers, only token is required
    const isEcotrackProvider = ['ecotrack', 'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 'speed_delivery', 'tsl_express', 'worldexpress'].includes(provider.code.toLowerCase());
    
    console.log('🔍 نوع الموفر:', { isEcotrackProvider, providerCode: provider.code });

    if (!apiToken.trim()) {
      console.log('❌ Token مفقود');
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال Token المطلوب",
        variant: "destructive",
      });
      return;
    }
    
    if (!isEcotrackProvider && !apiKey.trim()) {
      console.log('❌ Key مفقود لموفر غير Ecotrack');
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 بدء عملية الاختبار...');
    setIsTesting(true);
    setTestResult(null);

    try {
      // Map provider code to ShippingProvider enum
      console.log('🔄 تحديد نوع الموفر...', provider.code.toLowerCase());
      let providerEnum: ShippingProviderEnum;
      switch (provider.code.toLowerCase()) {
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
        case 'anderson_delivery':
          providerEnum = ShippingProviderEnum.ANDERSON_DELIVERY;
          break;
        case 'areex':
          providerEnum = ShippingProviderEnum.AREEX;
          break;
        case 'ba_consult':
          providerEnum = ShippingProviderEnum.BA_CONSULT;
          break;
        case 'conexlog':
          providerEnum = ShippingProviderEnum.CONEXLOG;
          break;
        case 'coyote_express':
          providerEnum = ShippingProviderEnum.COYOTE_EXPRESS;
          break;
        case 'dhd':
          providerEnum = ShippingProviderEnum.DHD;
          break;
        case 'distazero':
          providerEnum = ShippingProviderEnum.DISTAZERO;
          break;
        case 'e48hr_livraison':
          providerEnum = ShippingProviderEnum.E48HR_LIVRAISON;
          break;
        case 'fretdirect':
          providerEnum = ShippingProviderEnum.FRETDIRECT;
          break;
        case 'golivri':
          providerEnum = ShippingProviderEnum.GOLIVRI;
          break;
        case 'mono_hub':
          providerEnum = ShippingProviderEnum.MONO_HUB;
          break;
        case 'msm_go':
          providerEnum = ShippingProviderEnum.MSM_GO;
          break;
        case 'imir_express':
          providerEnum = ShippingProviderEnum.IMIR_EXPRESS;
          break;
        case 'packers':
          providerEnum = ShippingProviderEnum.PACKERS;
          break;
        case 'prest':
          providerEnum = ShippingProviderEnum.PREST;
          break;
        case 'rb_livraison':
          providerEnum = ShippingProviderEnum.RB_LIVRAISON;
          break;
        case 'rex_livraison':
          providerEnum = ShippingProviderEnum.REX_LIVRAISON;
          break;
        case 'rocket_delivery':
          providerEnum = ShippingProviderEnum.ROCKET_DELIVERY;
          break;
        case 'salva_delivery':
          providerEnum = ShippingProviderEnum.SALVA_DELIVERY;
          break;
        case 'speed_delivery':
          providerEnum = ShippingProviderEnum.SPEED_DELIVERY;
          break;
        case 'tsl_express':
          providerEnum = ShippingProviderEnum.TSL_EXPRESS;
          break;
        case 'worldexpress':
          providerEnum = ShippingProviderEnum.WORLDEXPRESS;
          break;
        default:
          throw new Error(`Provider ${provider.code} is not supported`);
      }

      console.log('✅ تم تحديد نوع الموفر:', providerEnum);

      // Create shipping service instance for testing
      console.log('🔨 إنشاء خدمة الشحن...', {
        providerEnum,
        credentials: {
          token: apiToken ? `${apiToken.substring(0, 8)}...` : 'غير موجود',
          key: apiKey ? `${apiKey.substring(0, 8)}...` : 'غير موجود'
        }
      });
      
      const shippingService = createShippingService(providerEnum, {
        token: apiToken.trim(),
        key: apiKey.trim()
      });

      console.log('✅ تم إنشاء خدمة الشحن، بدء اختبار البيانات...');

      // Test credentials
      const result = await shippingService.testCredentials();
      
      console.log('📥 نتيجة اختبار الاتصال:', result);
      
      setTestResult({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      console.error('❌ خطأ في اختبار الاتصال:', error);
      setTestResult({
        success: false,
        message: 'حدث خطأ أثناء اختبار الاتصال: ' + ((error as Error)?.message || 'خطأ غير معروف')
      });
    } finally {
      console.log('🏁 انتهاء اختبار الاتصال');
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    // For Ecotrack providers, only token is required
    const isEcotrackProvider = ['ecotrack', 'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 'speed_delivery', 'tsl_express', 'worldexpress'].includes(provider.code.toLowerCase());
    
    if (!apiToken.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال Token المطلوب",
        variant: "destructive",
      });
      return;
    }
    
    if (!isEcotrackProvider && !apiKey.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    // Test connection first if not already tested successfully
    if (!testResult?.success) {
      toast({
        title: "اختبار الاتصال مطلوب",
        description: "يرجى اختبار الاتصال أولاً للتأكد من صحة البيانات",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare settings object
      const settings: any = {};
      if (originWilayaId) {
        settings.origin_wilaya_id = originWilayaId;
      }

      // Insert provider settings
      const { error } = await supabase
        .from('shipping_provider_settings')
        .insert({
          organization_id: organizationId,
          provider_id: provider.id,
          api_token: apiToken.trim(),
          api_key: apiKey.trim(),
          is_enabled: isEnabled,
          auto_shipping: autoShipping,
          track_updates: trackUpdates,
          settings: settings
        });

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم إضافة ${provider.name} وحفظ إعداداته بنجاح`,
        variant: "default",
      });

      onSuccess();

    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const IconComponent = getProviderIcon(provider.code);
  const fieldLabels = getFieldLabels(provider.code);

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
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {provider.code.toUpperCase()}
                </Badge>
                <span>إعداد الاتصال مع شركة التوصيل</span>
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
            أدخل بيانات API للاتصال مع {provider.name}
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
              <Label htmlFor="api-key">
                {fieldLabels.key} 
                {!['ecotrack', 'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 'speed_delivery', 'tsl_express', 'worldexpress'].includes(provider.code.toLowerCase()) && <span className="text-destructive">*</span>}
              </Label>
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
            {provider.code.toLowerCase() === 'yalidine' && (
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
              onClick={() => {
                console.log('🔘 تم الضغط على زر اختبار الاتصال');
                testConnection();
              }} 
              variant="outline" 
              disabled={isTesting || !apiToken.trim() || (!['ecotrack', 'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 'speed_delivery', 'tsl_express', 'worldexpress'].includes(provider.code.toLowerCase()) && !apiKey.trim()) || isSaving}
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
            إعدادات إضافية لتخصيص سلوك شركة التوصيل
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
          disabled={isSaving || !testResult?.success}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
