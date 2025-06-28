import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCachedSubscriptionStatus, clearPermissionsCache } from '@/lib/PermissionsCache';
import { useOrganizationSubscriptions } from '@/contexts/OrganizationDataContext';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';

interface SubscriptionDebugInfo {
  organizationData: any;
  activeSubscriptions: any[];
  cachedSubscription: any;
  trialInfo: any;
}

const SubscriptionDebug: React.FC = () => {
  const { organization } = useAuth();
  const { subscriptions, isLoading, error, refetch } = useOrganizationSubscriptions();
  const [debugInfo, setDebugInfo] = useState<SubscriptionDebugInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDebugInfo = async () => {
    if (!organization) return;

    try {
      setIsRefreshing(true);

      // جلب بيانات المؤسسة
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organization.id)
        .single();

      // جلب جميع الاشتراكات
      const { data: allSubs } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:plan_id(*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // جلب البيانات المؤقتة
      const cachedSub = getCachedSubscriptionStatus();

      // حساب معلومات التجربة
      const createdAt = new Date(organization.created_at);
      const now = new Date();
      const trialDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const trialRemaining = Math.max(0, 5 - trialDays);

      setDebugInfo({
        organizationData: orgData,
        activeSubscriptions: allSubs || [],
        cachedSubscription: cachedSub,
        trialInfo: {
          daysUsed: trialDays,
          daysRemaining: trialRemaining,
          isTrialActive: trialRemaining > 0
        }
      });
    } catch (error) {
      console.error('خطأ في جلب معلومات التشخيص:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, [organization?.id]);

  const handleClearCache = () => {
    clearPermissionsCache();
    fetchDebugInfo();
  };

  const handleRefreshData = () => {
    refetch();
    fetchDebugInfo();
  };

  const handleForceReset = async () => {
    if (!organization) return;
    
    try {
      setIsRefreshing(true);
      
      // مسح التخزين المؤقت
      clearPermissionsCache();
      
      // إعادة تحميل بيانات المؤسسة من قاعدة البيانات
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organization.id)
        .single();
      
      if (orgData) {
        console.log('🔄 بيانات المؤسسة الحالية:', orgData);
        
        // التحقق من الاشتراكات النشطة
        const { data: activeSubs } = await supabase
          .from('organization_subscriptions')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString());
          
        if (activeSubs && activeSubs.length > 0) {
          console.log('✅ تم العثور على اشتراك نشط، سيتم إعادة تحميل الصفحة');
          window.location.reload();
        } else {
          console.log('❌ لا يوجد اشتراك نشط');
        }
      }
      
      // إعادة جلب البيانات
      refetch();
      fetchDebugInfo();
    } catch (error) {
      console.error('خطأ في إعادة التعيين:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            تشخيص الاشتراك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>لا توجد بيانات مؤسسة متاحة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          تشخيص الاشتراك
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefreshData} 
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
          <Button 
            onClick={handleClearCache} 
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            مسح التخزين المؤقت
          </Button>
          <Button 
            onClick={handleForceReset} 
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تعيين الاشتراك
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* حالة التحميل */}
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            جاري تحميل بيانات الاشتراك...
          </div>
        )}

        {/* أخطاء التحميل */}
        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            خطأ في تحميل البيانات: {error}
          </div>
        )}

        {/* بيانات المؤسسة */}
        <div>
          <h4 className="font-semibold mb-2">بيانات المؤسسة:</h4>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <div><strong>الاسم:</strong> {organization.name}</div>
            <div><strong>المعرف:</strong> {organization.id}</div>
            <div><strong>حالة الاشتراك:</strong> 
              <Badge variant={
                debugInfo?.organizationData?.subscription_status === 'active' ? 'default' :
                debugInfo?.organizationData?.subscription_status === 'trial' ? 'secondary' : 'destructive'
              } className="ml-2">
                {debugInfo?.organizationData?.subscription_status || 'غير محدد'}
              </Badge>
            </div>
            <div><strong>نوع الخطة:</strong> {debugInfo?.organizationData?.subscription_tier || 'غير محدد'}</div>
            <div><strong>معرف الاشتراك:</strong> {debugInfo?.organizationData?.subscription_id || 'لا يوجد'}</div>
            <div><strong>تاريخ الإنشاء:</strong> {new Date(organization.created_at).toLocaleDateString('ar-DZ')}</div>
          </div>
        </div>

        <Separator />

        {/* الاشتراكات النشطة من السياق */}
        <div>
          <h4 className="font-semibold mb-2">الاشتراكات من السياق:</h4>
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-2">
              {subscriptions.map((sub: any, index: number) => (
                <div key={sub.id} className="bg-green-50 p-3 rounded text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <strong>اشتراك {index + 1}</strong>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div><strong>الخطة:</strong> {sub.plan?.name || 'غير محدد'}</div>
                  <div><strong>تاريخ البداية:</strong> {new Date(sub.start_date).toLocaleDateString('ar-DZ')}</div>
                  <div><strong>تاريخ الانتهاء:</strong> {new Date(sub.end_date).toLocaleDateString('ar-DZ')}</div>
                  <div><strong>الأيام المتبقية:</strong> {Math.ceil((new Date(sub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 p-3 rounded text-sm">
              <XCircle className="h-4 w-4 text-yellow-500 inline mr-2" />
              لا توجد اشتراكات نشطة في السياق
            </div>
          )}
        </div>

        <Separator />

        {/* جميع الاشتراكات من قاعدة البيانات */}
        <div>
          <h4 className="font-semibold mb-2">جميع الاشتراكات من قاعدة البيانات:</h4>
          {debugInfo?.activeSubscriptions && debugInfo.activeSubscriptions.length > 0 ? (
            <div className="space-y-2">
              {debugInfo.activeSubscriptions.map((sub: any, index: number) => {
                const isExpired = new Date(sub.end_date) <= new Date();
                return (
                  <div key={sub.id} className={`p-3 rounded text-sm ${isExpired ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isExpired ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <strong>اشتراك {index + 1}</strong>
                      <Badge variant={
                        sub.status === 'active' && !isExpired ? 'default' :
                        sub.status === 'trial' && !isExpired ? 'secondary' : 'destructive'
                      }>
                        {sub.status} {isExpired ? '(منتهي)' : ''}
                      </Badge>
                    </div>
                    <div><strong>المعرف:</strong> {sub.id}</div>
                    <div><strong>الخطة:</strong> {sub.plan?.name || 'غير محدد'}</div>
                    <div><strong>المبلغ:</strong> {sub.amount_paid} {sub.currency}</div>
                    <div><strong>تاريخ البداية:</strong> {new Date(sub.start_date).toLocaleDateString('ar-DZ')}</div>
                    <div><strong>تاريخ الانتهاء:</strong> {new Date(sub.end_date).toLocaleDateString('ar-DZ')}</div>
                    <div><strong>طريقة الدفع:</strong> {sub.payment_method}</div>
                    {sub.payment_reference && (
                      <div><strong>مرجع الدفع:</strong> {sub.payment_reference}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-red-50 p-3 rounded text-sm">
              <XCircle className="h-4 w-4 text-red-500 inline mr-2" />
              لا توجد اشتراكات في قاعدة البيانات
            </div>
          )}
        </div>

        <Separator />

        {/* معلومات الفترة التجريبية */}
        <div>
          <h4 className="font-semibold mb-2">معلومات الفترة التجريبية:</h4>
          <div className="bg-purple-50 p-3 rounded text-sm space-y-1">
            <div><strong>الأيام المستخدمة:</strong> {debugInfo?.trialInfo?.daysUsed || 0}</div>
            <div><strong>الأيام المتبقية:</strong> {debugInfo?.trialInfo?.daysRemaining || 0}</div>
            <div><strong>حالة التجربة:</strong> 
              <Badge variant={debugInfo?.trialInfo?.isTrialActive ? 'default' : 'destructive'} className="ml-2">
                {debugInfo?.trialInfo?.isTrialActive ? 'نشطة' : 'منتهية'}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* البيانات المؤقتة */}
        <div>
          <h4 className="font-semibold mb-2">البيانات المؤقتة:</h4>
          {debugInfo?.cachedSubscription ? (
            <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
              <div><strong>نشط:</strong> {debugInfo.cachedSubscription.isActive ? 'نعم' : 'لا'}</div>
              <div><strong>الحالة:</strong> {debugInfo.cachedSubscription.status}</div>
              <div><strong>الرسالة:</strong> {debugInfo.cachedSubscription.message}</div>
              {debugInfo.cachedSubscription.endDate && (
                <div><strong>تاريخ الانتهاء:</strong> {new Date(debugInfo.cachedSubscription.endDate).toLocaleDateString('ar-DZ')}</div>
              )}
              {debugInfo.cachedSubscription.daysLeft && (
                <div><strong>الأيام المتبقية:</strong> {debugInfo.cachedSubscription.daysLeft}</div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <AlertCircle className="h-4 w-4 text-gray-500 inline mr-2" />
              لا توجد بيانات مؤقتة محفوظة
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionDebug;
