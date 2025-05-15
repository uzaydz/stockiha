import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, ShieldOff, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShippingProvider } from '@/api/shippingService'; // Assuming ShippingProvider enum/type exists
import { useShippingSettings } from '@/hooks/useShippingSettings';
import { useToast } from '@/components/ui/use-toast';
import { ShippingProviderSettings as ShippingProviderSettingsType } from '@/api/shippingSettingsService';
import axios from 'axios';

export default function ZRExpressSettings() {
  const { toast } = useToast();
  const { 
    settings, 
    isLoading: isLoadingSettings, 
    saveSettings,
    refetch,
    error: settingsError
  } = useShippingSettings(ShippingProvider.ZREXPRESS); // Assuming ZREXPRESS is a valid provider code

  const [isEnabled, setIsEnabled] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false); // For future "Test Connection"
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);


  useEffect(() => {
    if (settings) {
      // setIsEnabled(settings.is_enabled); // Temporarily commented out for debugging switch behavior
      setApiToken(settings.api_token || '');
      setApiKey(settings.api_key || '');
      // We don't have autoShipping or trackUpdates for ZR Express yet in this basic version
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const settingsToSave: Partial<ShippingProviderSettingsType> = {
        is_enabled: isEnabled,
        api_token: apiToken,
        api_key: apiKey,
      };
      await saveSettings(settingsToSave);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات ZR Express بنجاح.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving ZR Express settings:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ إعدادات ZR Express.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    console.log('[ZRExpressSettings] handleTestConnection: Starting test...');
    setIsTesting(true);
    setTestResult(null);

    console.log('[ZRExpressSettings] Using API Token:', apiToken_masked(apiToken)); // Mask token for safety
    console.log('[ZRExpressSettings] Using API Key:', apiToken_masked(apiKey));     // Mask key for safety

    const testUrl = 'https://procolis.com/api_v1/token';
    console.log('[ZRExpressSettings] Test URL:', testUrl);

    const headers = {
      'token': apiToken,
      'key': apiKey
    };
    console.log('[ZRExpressSettings] Request Headers:', headers);

    try {
      const response = await axios.get(testUrl, {
        headers: headers,
        timeout: 10000 // Increased timeout to 10 seconds
      });

      console.log('[ZRExpressSettings] Raw API Response:', response);

      // You might need to adjust this condition based on the actual successful response structure from ZR Express
      if (response.status === 200 && response.data /* && response.data.some_success_indicator */) {
        console.log('[ZRExpressSettings] Test successful:', response.data);
        setTestResult({ success: true, message: 'تم الاتصال بنجاح بـ ZR Express!' });
      } else {
        console.warn('[ZRExpressSettings] Test unsuccessful despite 2xx response:', response);
        setTestResult({ success: false, message: `فشل الاتصال. استجابة غير متوقعة من الخادم (الحالة: ${response.status})` });
      }
    } catch (error: any) {
      console.error('[ZRExpressSettings] Connection test error object:', JSON.parse(JSON.stringify(error)));
      
      let errorMessage = 'فشل الاتصال. تحقق من بيانات الاعتماد أو الشبكة.';
      if (error.response) {
        console.error('[ZRExpressSettings] Error Response Data:', error.response.data);
        console.error('[ZRExpressSettings] Error Response Status:', error.response.status);
        console.error('[ZRExpressSettings] Error Response Headers:', error.response.headers);
        errorMessage = `فشل الاتصال. الخادم رد بخطأ: ${error.response.status}${error.response.data?.message || error.response.data?.error || error.response.statusText ? ' - ' + (error.response.data?.message || error.response.data?.error || error.response.statusText) : ''}`;
      } else if (error.request) {
        console.error('[ZRExpressSettings] Error Request Data:', error.request);
        errorMessage = 'فشل الاتصال: لم يتم استلام رد من الخادم. تحقق من إعدادات الشبكة أو عنوان URL.';
      } else {
        console.error('[ZRExpressSettings] Generic Error Message:', error.message);
        errorMessage = `فشل الاتصال: ${error.message}`;
      }
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
      console.log('[ZRExpressSettings] handleTestConnection: Test finished.');
    }
  };

  // Helper function to mask sensitive data in logs
  const apiToken_masked = (value: string) => {
    if (!value) return '';
    if (value.length <= 8) return '********';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  if (settingsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطأ في تحميل الإعدادات</AlertTitle>
        <AlertDescription>
          حدث خطأ أثناء تحميل إعدادات ZR Express. يرجى المحاولة مرة أخرى لاحقًا.
          {settingsError.message && <p className="mt-2 text-xs">{settingsError.message}</p>}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            إعدادات ZR Express
          </CardTitle>
          <CardDescription>
            قم بتفعيل وإدارة إعدادات الربط مع شركة ZR Express.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="is-enabled-zr" className="text-base font-medium">
                تفعيل ZR Express
              </Label>
              <p className="text-sm text-muted-foreground">
                تفعيل أو تعطيل استخدام ZR Express كشركة توصيل.
              </p>
            </div>
            <Switch
              id="is-enabled-zr"
              checked={isEnabled}
              onCheckedChange={(newCheckedState) => {
                console.log('Switch new state:', newCheckedState);
                setIsEnabled(newCheckedState);
              }}
              disabled={isSaving}
            />
          </div>

          {isEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="api-token-zr">API Token</Label>
                <Input
                  id="api-token-zr"
                  type="password"
                  placeholder="أدخل API Token الخاص بـ ZR Express"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  يمكنك الحصول عليه من لوحة تحكم ZR Express.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-zr">API Key</Label>
                <Input
                  id="api-key-zr"
                  type="password"
                  placeholder="أدخل API Key الخاص بـ ZR Express"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isSaving}
                />
                 <p className="text-xs text-muted-foreground">
                  يمكنك الحصول عليه من لوحة تحكم ZR Express.
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex w-full justify-between items-center">
            <Button onClick={handleSave} disabled={isSaving || isLoadingSettings}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              حفظ التغييرات
            </Button>
            {isEnabled && (
            <Button onClick={handleTestConnection} variant="outline" disabled={isTesting || !apiToken || !apiKey}>
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              اختبار الاتصال
            </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{testResult.success ? 'نجاح!' : 'فشل!'}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Make sure ShippingProvider.ZREXPRESS is defined in your shippingService or a similar central place.
// Example:
// export enum ShippingProvider {
//   YALIDINE = 'yalidine',
//   ZREXPRESS = 'zrexpress',
//   // ... other providers
// } 