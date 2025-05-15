// src/pages/super-admin/YalidineSyncPage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoCircledIcon, CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { supabase } from "@/lib/supabase-client";

// استيراد متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchStatus = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setIsAuthenticated(true);
        await fetchSyncStatus(); // استدعاء بدون وسيط
      } else {
        setIsAuthenticated(false);
        setIsLoadingStatus(false);
        setFeedbackMessage({ type: 'error', text: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.' });
      }
    };
    checkAuthAndFetchStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const fetchSyncStatus = async () => {
    setIsLoadingStatus(true);
    setFeedbackMessage(null);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession(); // إعادة التحقق من الجلسة هنا
      const currentAccessToken = currentSession?.access_token;

      // تم تحديث شروط التحقق من المصادقة
      if (!currentSession) {
         setIsAuthenticated(false); 
         setIsLoadingStatus(false);
         setFeedbackMessage({ type: 'error', text: 'يجب تسجيل الدخول لجلب حالة المزامنة.' });
         return;
      }
      // إذا كانت isAuthenticated هي false ولكن لدينا جلسة، قم بتحديثها (قد لا تكون ضرورية إذا كان useEffect يعمل بشكل صحيح)
      if (!isAuthenticated) {
          setIsAuthenticated(true);
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or Anon Key is missing for fetchSyncStatus.", { supabaseUrlExists: !!supabaseUrl, supabaseAnonKeyExists: !!supabaseAnonKey });
        throw new Error("Supabase URL or Anon Key is not configured for fetchSyncStatus.");
      }

      if (!currentAccessToken) {
        // هذا لا ينبغي أن يحدث إذا كانت currentSession موجودة، لكنه فحص إضافي
        setIsAuthenticated(false);
        setIsLoadingStatus(false);
        setFeedbackMessage({ type: 'error', text: 'Access token is missing, cannot fetch status.' });
        throw new Error("Access token is missing, cannot fetch status."); 
      }

      

      const response = await fetch(`${supabaseUrl}/functions/v1/get-global-yalidine-sync-info`, {
        method: 'GET', 
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();
      

      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || `Request failed with status ${response.status}`;
        if (response.status === 401) {
            // قد نعيد تعيين isAuthenticated هنا إذا كان الخطأ 401 يعني أن التوكن لم يعد صالحًا
            // setIsAuthenticated(false);
            throw new Error('خطأ في المصادقة (401) عند جلب حالة المزامنة. قد تكون الجلسة غير صالحة أو التوكن مفقود.');
        }
        throw new Error(errorMessage);
      }
      
      if (responseData && typeof responseData.apiKeysSet !== 'undefined') {
        setSyncStatus(responseData);
        // التأكد من أننا لا نعرض هذه الرسالة إذا كان المستخدم غير مصادق أصلاً
        if (!responseData.apiKeysSet && isAuthenticated) { 
            setFeedbackMessage({ type: 'info', text: 'يرجى إدخال مفتاح ورمز Yalidine API لبدء المزامنة.' });
        }
      } else {
        console.warn("Received no data or unexpected data format from get-global-yalidine-sync-info (fetch)", responseData);
      }

    } catch (error: any) {
      console.error("Error fetching sync status with fetch:", error);
      setSyncStatus(null); 
      if (!feedbackMessage || (feedbackMessage.type !== 'error' && !feedbackMessage.text.includes("401"))) {
         setFeedbackMessage({ type: 'error', text: `فشل في جلب حالة المزامنة: ${error.message}` });
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!isAuthenticated) {
      setFeedbackMessage({ type: 'error', text: 'يجب تسجيل الدخول لحفظ الإعدادات.' });
      return;
    }
    if (!apiKey || !apiToken) {
      setFeedbackMessage({ type: 'error', text: 'يرجى إدخال كل من مفتاح API ورمز API.' });
      return;
    }
    setIsSavingConfig(true);
    setFeedbackMessage(null);
    

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("User not authenticated or access token not found for fetch.");
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or Anon Key is missing from environment variables.", { supabaseUrl, supabaseAnonKeyExists: !!supabaseAnonKey });
        throw new Error("Supabase URL or Anon Key is not configured in environment variables.");
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/save-global-yalidine-config`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, apiToken }),
      });

      const responseData = await response.json(); 
      

      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || `Request failed with status ${response.status}`;
        if (responseData && responseData.received_method === 'GET' && responseData.error === 'Method Not Allowed'){
             throw new Error('فشل حفظ الإعدادات: الخادم رفض الطلب (Method Not Allowed - GET received).');
        } 
        throw new Error(errorMessage);
      }
      
      setFeedbackMessage({ type: 'success', text: responseData.message || 'تم حفظ الإعدادات بنجاح!' });
      await fetchSyncStatus(); 

    } catch (error: any) {
      console.error("Error saving config with fetch (catch block):", error);
      setFeedbackMessage({ type: 'error', text: `فشل في حفظ الإعدادات: ${error.message}` });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSyncNow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!isAuthenticated || !session) {
      setFeedbackMessage({ type: 'error', text: 'يجب تسجيل الدخول لبدء المزامنة.' });
      return;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setFeedbackMessage({ type: 'error', text: 'Access token is missing, cannot start sync.' });
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing for handleSyncNow.", { supabaseUrlExists: !!supabaseUrl, supabaseAnonKeyExists: !!supabaseAnonKey });
      setFeedbackMessage({ type: 'error', text: 'Supabase URL or Anon Key is not configured for sync.' });
      return;
    }

    setIsSyncing(true);
    setFeedbackMessage({ type: 'info', text: 'جاري المزامنة الآن، قد تستغرق هذه العملية بعض الوقت...' });
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-global-yalidine-data`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from sync function" }));
        const errorMessage = errorData?.error || errorData?.message || `Sync request failed with status ${response.status}`;
        if (response.status === 401) {
            setFeedbackMessage({ type: 'error', text: 'خطأ في المصادقة (401) عند بدء المزامنة. قد تكون الجلسة غير صالحة أو التوكن مفقود.' });
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      

      let resultMessage = (data && data.message) || 'اكتملت عملية المزامنة.';
      if (data && data.results) {
        resultMessage += ` الولايات: ${data.results.provinces.synced}, البلديات: ${data.results.municipalities.synced}, المراكز: ${data.results.centers.synced}.`;
        if (data.results.provinces.errors > 0 || data.results.municipalities.errors > 0 || data.results.centers.errors > 0) {
          resultMessage += ` توجد أخطاء في مزامنة بعض البيانات.`;
          setFeedbackMessage({ type: 'error', text: resultMessage });
        } else {
          setFeedbackMessage({ type: 'success', text: resultMessage });
        }
      } else if (data) {
        setFeedbackMessage({ type: 'success', text: resultMessage });
      } else {
        setFeedbackMessage({ type: 'info', text: 'اكتملت المزامنة ولكن لم يتم إرجاع نتائج تفصيلية من الخادم.'});
      }
    } catch (error: any) {
      console.error("Error syncing data:", error);
      if (!feedbackMessage || !(feedbackMessage.type === 'error' && feedbackMessage.text.includes("خطأ في المصادقة"))){
        setFeedbackMessage({ type: 'error', text: `فشل في مزامنة البيانات: ${error.message}` });
      }
    } finally {
      setIsSyncing(false);
      await fetchSyncStatus();
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

  
  
  

  if (!isAuthenticated && !isLoadingStatus) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <AlertTitle>خطأ في المصادقة</AlertTitle>
          <AlertDescription>
            {feedbackMessage?.text || 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {isLoadingStatus && !syncStatus && (
         <p>جاري تحميل حالة المزامنة...</p> 
      )}

      {isAuthenticated && (
        <>
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
                  placeholder={
                    syncStatus?.apiKeysSet 
                      ? "تم الإعداد - أدخل قيمة جديدة للتغيير"
                      : "أدخل مفتاح API الخاص بك"
                  }
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
                  placeholder={
                    syncStatus?.apiKeysSet
                      ? "تم الإعداد - أدخل قيمة جديدة للتغيير"
                      : "أدخل رمز API الخاص بك"
                  }
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  disabled={isSavingConfig || isSyncing}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveConfig} disabled={isSavingConfig || isSyncing || !apiKey || !apiToken || isLoadingStatus}>
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
              {isLoadingStatus && !syncStatus ? ( 
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
                <p>تعذر تحميل حالة المزامنة. حاول تحديث الصفحة أو تأكد من تسجيل الدخول.</p> 
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSyncNow} disabled={isSyncing || isLoadingStatus || !syncStatus?.apiKeysSet}>
                {isSyncing ? 'جاري المزامنة...' : 'بدء المزامنة الآن'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
