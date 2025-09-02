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
      setIsEnabled(settings.is_enabled || false);
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
    setIsTesting(true);
    setTestResult(null);

    const token = apiToken.trim();
    const key = apiKey.trim();

    // استخدام نقطة نهاية tarification بدلاً من token
    const tarificationUrl = 'https://procolis.com/api_v1/tarification';

    // إنشاء أمر curl للتنفيذ في الخلفية
    const curlCommand = `curl -s -X POST "${tarificationUrl}" \
      -H "token: ${token}" \
      -H "key: ${key}" \
      -H "Content-Type: application/json" \
      -d '{"IDWilaya": "16"}'`;
    
    // تنفيذ امر curl مباشرة من المتصفح
    // هذا يتطلب إنشاء كائن XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/run-test?cmd=${encodeURIComponent(curlCommand)}`, true);
    
    // استخدام fetch مع جسم الطلب المناسب
    try {
      // تنفيذ الاختبار باستخدام iframe مخفي أو نافذة منبثقة
      // لتجنب مشاكل CORS
      
      // إنشاء عنصر iframe مخفي
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // كود HTML للاختبار
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ZRExpress Test</title>
          <script>
            function executeTest() {
              var result = document.getElementById('result');
              result.innerHTML = 'جاري الاختبار...';
              
              // محاولة إظهار نتيجة الاختبار للمستخدم
              try {
                fetch('${tarificationUrl}', {
                  method: 'POST',
                  headers: {
                    'token': '${token}',
                    'key': '${key}',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ IDWilaya: "16" })
                })
                .then(response => {
                  if (response.ok) {
                    return response.json();
                  }
                  throw new Error('خطأ في الاستجابة: ' + response.status);
                })
                .then(data => {
                  if (data && Array.isArray(data)) {
                    const algerData = data.find(item => item.IDWilaya === 16);
                    result.innerHTML = '<div style="color: green;">تم الاتصال بنجاح!</div>' + 
                      '<p>سعر التوصيل للجزائر العاصمة (الولاية 16):</p>' +
                      '<p>إلى المنزل: ' + algerData.Domicile + ' دج</p>' +
                      '<p>إلى نقطة استلام: ' + algerData.Stopdesk + ' دج</p>';
                  } else {
                    result.innerHTML = '<div style="color: orange;">تم الاتصال لكن البيانات ليست بالتنسيق المتوقع.</div>';
                  }
                })
                .catch(error => {
                  result.innerHTML = '<div style="color: red;">فشل الاتصال: ' + error.message + '</div>';
                });
              } catch (e) {
                result.innerHTML = '<div style="color: red;">خطأ في إجراء الاختبار: ' + e.message + '</div>';
              }
            }
          </script>
        </head>
        <body onload="executeTest()">
          <div id="result">جاري التحميل...</div>
        </body>
        </html>
      `;
      
      // إعداد محتوى iframe
      if (iframe.contentWindow) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(testHTML);
        iframe.contentWindow.document.close();
      }
      
      // ونقوم بدلاً من ذلك بتنفيذ الأمر مباشرة في العملية الخلفية
      // باستخدام XMLHttpRequest وتقنية JSONP
      
      // إنشاء طلب JSONP
      const script = document.createElement('script');
      const callbackName = 'zrExpressCallback_' + Math.random().toString(36).substring(2, 15);
      
      // تعريف دالة رد النداء العالمية
      window[callbackName] = function(result) {
        if (script.parentNode) script.parentNode.removeChild(script);
        
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        
        // تحليل النتيجة
        if (result && Array.isArray(result)) {
          const algerData = result.find(item => item.IDWilaya === 16);
          if (algerData) {
            setTestResult({
              success: true,
              message: `تم الاتصال بنجاح! وتم التحقق من سعر الشحن للجزائر العاصمة (الولاية 16):
              - توصيل إلى المنزل: ${algerData.Domicile} دج
              - توصيل إلى نقطة استلام: ${algerData.Stopdesk} دج
              - رسوم الإلغاء: ${algerData.Annuler} دج`
            });
          } else {
            setTestResult({
              success: true,
              message: 'تم الاتصال بنجاح! لكن لم نجد معلومات عن الولاية 16 (الجزائر العاصمة) في البيانات.'
            });
          }
        } else {
          // فشل في الحصول على بيانات صحيحة
          setTestResult({
            success: false,
            message: 'تم الاتصال بالخادم، لكن البيانات المسترجعة ليست بالتنسيق المتوقع.'
          });
        }
        
        setIsTesting(false);
        
        // إزالة دالة رد النداء من النافذة
        delete window[callbackName];
      };
      
      // عرض نصيحة للمستخدم
      setTestResult({
        success: null,
        message: `نظرًا لقيود CORS في المتصفح، لتحقق من اتصالك بـ ZR Express، اتبع الخطوات التالية:

        1. افتح Terminal أو أي برنامج سطر أوامر
        2. قم بتنفيذ الأمر التالي:

        curl -X POST "${tarificationUrl}" \\
          -H "token: ${token}" \\
          -H "key: ${key}" \\
          -H "Content-Type: application/json" \\
          -d '{"IDWilaya": "16"}'
        
        3. إذا ظهرت بيانات تحتوي على قائمة مع معلومات "Alger" فهذا يعني أن اتصالك ناجح!`
      });
      
      // إظهار تعليمات الاختبار في وحدة التحكم
      
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `حدث خطأ أثناء محاولة الاختبار: ${error.message}`
      });
    } finally {
      setTimeout(() => {
        if (isTesting) {
          setIsTesting(false);
        }
      }, 5000);
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
        <Alert variant={testResult.success === true ? 'default' : testResult.success === false ? 'destructive' : 'default'}>
          {testResult.success === true ? <CheckCircle2 className="h-4 w-4" /> : 
           testResult.success === false ? <AlertCircle className="h-4 w-4" /> : 
           <Settings className="h-4 w-4" />}
          <AlertTitle>{testResult.success === true ? 'نجاح!' : testResult.success === false ? 'فشل!' : 'تعليمات الاختبار'}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{testResult.message}</AlertDescription>
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
