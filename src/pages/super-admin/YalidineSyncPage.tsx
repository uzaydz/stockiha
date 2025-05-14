// src/pages/super-admin/YalidineSyncPage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoCircledIcon, CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { supabase } from "@/lib/supabase-client"; // <-- تم تعديل المسار

interface SyncStatus {
  apiKeysSet: boolean;
  lastGlobalProvincesSync: string | null;
  lastGlobalMunicipalitiesSync: string | null;
  lastGlobalCentersSync: string | null;
  message?: string; 
}

export default function YalidineSyncPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const fetchSyncStatus = async () => {
    setIsLoadingStatus(true);
    setFeedbackMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-global-yalidine-sync-info');
      if (error) throw error;
      if (data) {
        setSyncStatus(data);
        if (!data.apiKeysSet) {
            setFeedbackMessage({ type: 'info', text: 'يرجى إدخال مفتاح ورمز Yalidine API لبدء المزامنة.' });
        }
      }
    } catch (error: any) {
      console.error("Error fetching sync status:", error);
      setSyncStatus(null);
      setFeedbackMessage({ type: 'error', text: `فشل في جلب حالة المزامنة: ${error.message}` });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleSaveConfig = async () => {
    if (!apiKey || !apiToken) {
      setFeedbackMessage({ type: 'error', text: 'يرجى إدخال كل من مفتاح API ورمز API.' });
      return;
    }
    setIsSavingConfig(true);
    setFeedbackMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('save-global-yalidine-config', {
        body: { apiKey, apiToken },
      });
      if (error) throw error;
      setFeedbackMessage({ type: 'success', text: data.message || 'تم حفظ الإعدادات بنجاح!' });
      // Optionally clear fields or refresh status
      // setApiKey("");
      // setApiToken("");
      fetchSyncStatus(); // Refresh status to reflect API keys are set
    } catch (error: any) {
      console.error("Error saving config:", error);
      setFeedbackMessage({ type: 'error', text: `فشل في حفظ الإعدادات: ${error.message}` });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedbackMessage({ type: 'info', text: 'جاري المزامنة الآن، قد تستغرق هذه العملية بعض الوقت...' });
    try {
      const { data, error } = await supabase.functions.invoke('sync-global-yalidine-data');
      if (error) throw error;
      
      let resultMessage = data.message || 'اكتملت عملية المزامنة.';
      if (data.results) {
        resultMessage += ` الولايات: ${data.results.provinces.synced}, البلديات: ${data.results.municipalities.synced}, المراكز: ${data.results.centers.synced}.`;
        if (data.results.provinces.errors > 0 || data.results.municipalities.errors > 0 || data.results.centers.errors > 0) {
          resultMessage += ` توجد أخطاء في مزامنة بعض البيانات.`;
          setFeedbackMessage({ type: 'error', text: resultMessage });
        } else {
          setFeedbackMessage({ type: 'success', text: resultMessage });
        }
      } else {
        setFeedbackMessage({ type: 'success', text: resultMessage });
      }
      fetchSyncStatus(); // Refresh sync dates
    } catch (error: any) {
      console.error("Error syncing data:", error);
      setFeedbackMessage({ type: 'error', text: `فشل في مزامنة البيانات: ${error.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "لم تتم المزامنة بعد";
    try {
      return new Date(dateString).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return "تاريخ غير صالح";
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">مزامنة بيانات ياليدين العالمية</h2>
          <p className="text-muted-foreground">
            إدارة إعدادات الاتصال بـ Yalidine API ومزامنة البيانات العالمية (الولايات، البلديات، مراكز التوصيل).
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <Alert variant={feedbackMessage.type === 'error' ? 'destructive' : 'default'}>
          {feedbackMessage.type === 'success' && <CheckCircledIcon className="h-5 w-5" />}
          {feedbackMessage.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
          {feedbackMessage.type === 'info' && <InfoCircledIcon className="h-5 w-5" />}
          <AlertTitle>
            {feedbackMessage.type === 'success' ? 'نجاح' : feedbackMessage.type === 'error' ? 'خطأ' : 'معلومات'}
          </AlertTitle>
          <AlertDescription>{feedbackMessage.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>إعدادات Yalidine API</CardTitle>
          <CardDescription>
            أدخل مفتاح ورمز Yalidine API الخاص بك. هذه المعلومات حساسة وستُحفظ بشكل آمن.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">مفتاح API (API Key)</Label>
            <Input 
              id="apiKey" 
              type="password" 
              placeholder="أدخل مفتاح API الخاص بك"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isSavingConfig || isSyncing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiToken">رمز API (API Token)</Label>
            <Input 
              id="apiToken" 
              type="password" 
              placeholder="أدخل رمز API الخاص بك"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              disabled={isSavingConfig || isSyncing}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveConfig} disabled={isSavingConfig || isSyncing || !apiKey || !apiToken}>
            {isSavingConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>حالة المزامنة العالمية</CardTitle>
          <CardDescription>
            عرض حالة آخر مزامنة للبيانات العالمية من Yalidine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStatus ? (
            <p>جاري تحميل حالة المزامنة...</p>
          ) : syncStatus ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">حالة مفاتيح API:</span>
                <span className={`text-sm ${syncStatus.apiKeysSet ? 'text-green-600' : 'text-red-600'}`}>
                  {syncStatus.apiKeysSet ? 'تم الإعداد' : 'غير مُعدة'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">آخر مزامنة للولايات:</span>
                <span className="text-sm text-muted-foreground">{formatDate(syncStatus.lastGlobalProvincesSync)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">آخر مزامنة للبلديات:</span>
                <span className="text-sm text-muted-foreground">{formatDate(syncStatus.lastGlobalMunicipalitiesSync)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">آخر مزامنة للمراكز:</span>
                <span className="text-sm text-muted-foreground">{formatDate(syncStatus.lastGlobalCentersSync)}</span>
              </div>
              {syncStatus.message && <p className="text-sm text-muted-foreground">رسالة: {syncStatus.message}</p>}
            </>
          ) : (
            <p>تعذر تحميل حالة المزامنة. حاول تحديث الصفحة.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSyncNow} disabled={isSyncing || isLoadingStatus || !syncStatus?.apiKeysSet}>
            {isSyncing ? 'جاري المزامنة...' : 'بدء المزامنة الآن'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
