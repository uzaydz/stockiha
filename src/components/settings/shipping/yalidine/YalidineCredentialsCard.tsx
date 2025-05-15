import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createShippingService, ShippingProvider } from '@/api/shippingService';
import { TestResultType, YalidineProviderProps } from './types';

export default function YalidineCredentialsCard({
  isEnabled,
  apiToken,
  apiKey,
  setIsEnabled,
  setApiToken,
  setApiKey,
  saveSettings,
  refetch,
  toast
}: YalidineProviderProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  // Handle enable/disable toggle with immediate feedback
  const handleToggleEnabled = async (checked: boolean) => {
    setIsTogglingEnabled(true);
    setIsEnabled(checked);
    
    try {
      
      
      // Always save the new enabled state
      await saveSettings({
        is_enabled: checked,
        api_token: apiToken,
        api_key: apiKey
      });
      
      // Show success message
      toast({
        title: checked ? "تم التفعيل" : "تم التعطيل",
        description: checked 
          ? "تم تفعيل خدمة ياليدين بنجاح، أدخل بيانات API الآن" 
          : "تم تعطيل خدمة ياليدين بنجاح",
        variant: "default",
      });
      
      // Refresh settings data
      refetch();
    } catch (error) {
      console.error('Error toggling enabled state:', error);
      
      // Revert state on error
      setIsEnabled(!checked);
      
      // Show error message
      toast({
        title: "خطأ في التفعيل",
        description: "حدث خطأ أثناء تغيير حالة التفعيل: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      
      
      // Create an instance of the shipping service with Yalidine provider
      const shippingService = createShippingService(
        ShippingProvider.YALIDINE, 
        { token: apiToken, key: apiKey }
      );
      
      // Test the credentials
      const result = await shippingService.testCredentials();
      
      setTestResult({
        success: result.success,
        message: result.message
      });
      
      // If the test was successful, automatically save the settings
      if (result.success) {
        handleSaveSettings();
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({
        success: false,
        message: 'حدث خطأ أثناء الاتصال بالخدمة: ' + ((error as Error)?.message || 'خطأ غير معروف')
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      
      
      await saveSettings({
        is_enabled: isEnabled,
        api_token: apiToken,
        api_key: apiKey
      });
      
      // Show success message
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات ياليدين بنجاح",
        variant: "default",
      });
      
      // Refresh settings data
      refetch();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={isEnabled ? "border-primary border-2" : ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl">ياليدين</CardTitle>
            <Badge 
              variant={isEnabled ? "default" : "secondary"} 
              className={cn(
                "px-2 py-0.5", 
                isEnabled && "bg-green-100 text-green-800 hover:bg-green-100"
              )}
            >
              {isEnabled ? 'مفعّل' : 'غير مفعّل'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 border rounded-md p-1.5 bg-muted/20">
            {isTogglingEnabled ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Switch 
                id="yalidine-enabled" 
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
                className="data-[state=checked]:bg-primary"
              />
            )}
            <Label htmlFor="yalidine-enabled" className="cursor-pointer select-none">
              {isEnabled ? (
                <div className="flex items-center gap-1 text-primary font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  <span>تفعيل</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ShieldOff className="h-4 w-4" />
                  <span>تعطيل</span>
                </div>
              )}
            </Label>
          </div>
        </div>
        <CardDescription>
          قم بإعداد التكامل مع خدمة توصيل ياليدين - Yalidine
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"} className="mb-4">
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

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="api-token" className={!isEnabled ? "text-muted-foreground" : ""}>
              رمز API (API Token) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="api-token"
              placeholder="أدخل رمز API الخاص بك"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              disabled={!isEnabled}
              className={!isEnabled ? "bg-muted/50" : ""}
            />
            <p className="text-sm text-muted-foreground">
              يمكنك الحصول على رمز API من لوحة تحكم ياليدين
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api-key" className={!isEnabled ? "text-muted-foreground" : ""}>
              مفتاح API (API Key) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="أدخل مفتاح API الخاص بك"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!isEnabled}
              className={!isEnabled ? "bg-muted/50" : ""}
            />
          </div>
        </div>

        <div className="mt-6 bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">كيفية الحصول على بيانات الاعتماد:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>قم بتسجيل الدخول إلى <a href="https://yalidine.app/app/dev/index.php" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">منصة مطوري ياليدين</a></li>
            <li>انتقل إلى صفحة الإعدادات أو API</li>
            <li>قم بنسخ كل من رمز API ومفتاح API</li>
            <li>ألصق القيم في الحقول أعلاه واختبر الاتصال</li>
          </ol>
          
          <div className="mt-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
            <h4 className="font-medium mb-1 flex items-center">
              <AlertCircle className="h-4 mr-1" />
              ملاحظة مهمة
            </h4>
            <p className="text-sm">
              تأكد من إدخال بيانات API بشكل صحيح وفي الحقول المناسبة:
            </p>
            <ul className="list-disc list-inside text-sm mt-1">
              <li>في حقل <strong>رمز API (API Token)</strong>: أدخل <strong>رمز API الطويل (API Token)</strong></li>
              <li>في حقل <strong>مفتاح API (API Key)</strong>: أدخل <strong>معرف API الرقمي (API ID)</strong></li>
            </ul>
            <p className="text-sm mt-1">
              إذا استمرت مشكلة الاتصال، جرب تبديل القيم بين الحقلين.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          onClick={testConnection} 
          disabled={!isEnabled || isTesting || !apiToken || !apiKey || isSaving}
          className="min-w-[140px]"
        >
          {isTesting ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الاختبار...
            </>
          ) : 'اختبار الاتصال'}
        </Button>
        <Button 
          onClick={handleSaveSettings} 
          disabled={!isEnabled || !apiToken || !apiKey || isSaving}
          className="min-w-[140px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : 'حفظ الإعدادات'}
        </Button>
      </CardFooter>
    </Card>
  );
} 