/**
 * مكون منع إنشاء الطلبيات عند تجاوز الحد المسموح
 * يُستخدم في صفحات المتجر لمنع الطلبات الجديدة
 */

import React, { useEffect } from 'react';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingCart, CreditCard, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderLimitBlockerProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  showUpgradeButton?: boolean;
}

const OrderLimitBlocker: React.FC<OrderLimitBlockerProps> = ({
  children,
  fallbackMessage = 'عذراً، لا يمكن إنشاء طلبيات جديدة حالياً',
  showUpgradeButton = true
}) => {
  const navigate = useNavigate();
  const { limitInfo, loading, error } = useOnlineOrdersLimit();

  // إذا كان المتجر محظوراً، عرض صفحة الحظر
  if (!loading && limitInfo && limitInfo.isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-600">
              المتجر محظور مؤقتاً
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                لقد تجاوزت الحد المسموح من الطلبيات الإلكترونية هذا الشهر
              </p>

              {/* إحصائيات الاستخدام */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                <div className="p-4 bg-red-50 rounded-lg">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-red-600" />
                  <p className="font-semibold text-lg">{limitInfo.currentOrders}</p>
                  <p className="text-sm text-gray-600">طلبية مُنجزة</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <p className="font-semibold text-lg">{limitInfo.maxOrders}</p>
                  <p className="text-sm text-gray-600">الحد الأقصى</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                  <p className="font-semibold text-lg">0</p>
                  <p className="text-sm text-gray-600">متبقي هذا الشهر</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">خيارات الاستمرار:</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• 100 طلبية إضافية = 1000 دج</p>
                  <p>• 250 طلبية إضافية = 2000 دج</p>
                  <p>• الترقية إلى خطة أعلى للحصول على حدود أكبر</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-gray-600">
                  سيتم إعادة تفعيل المتجر تلقائياً في بداية الشهر القادم،
                  أو يمكنك الترقية الآن للاستمرار فوراً
                </p>

                {limitInfo.message && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {limitInfo.message}
                  </p>
                )}
              </div>
            </div>

            {/* أزرار العمل */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {showUpgradeButton && (
                <Button
                  onClick={() => navigate('/dashboard/subscription')}
                  className="bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  ترقية الخطة الآن
                </Button>
              )}

              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                العودة للوحة التحكم
              </Button>
            </div>

            {/* معلومات إضافية */}
            <div className="text-xs text-gray-500 pt-4 border-t">
              <p>خطة التجار الإلكترونيين المبتدئين - 100 طلبية شهرياً</p>
              <p>للاستفسارات، يرجى التواصل مع الدعم الفني</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا كان هناك خطأ في التحقق، عرض تحذير ولكن السماح بالمتابعة
  if (error) {
    return (
      <div className="w-full">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">تحذير: لا يمكن التحقق من حدود الطلبيات</p>
              <p className="text-sm">قد تكون هناك قيود على الطلبيات - {error}</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // إذا كان التحقق جارياً، عرض تحميل
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-blue-800">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>جاري التحقق من حدود الطلبيات...</span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // إذا كان هناك تحذير (أقل من 10 طلبيات متبقية)
  if (limitInfo && limitInfo.remainingOrders && limitInfo.remainingOrders <= 10 && !limitInfo.isBlocked) {
    return (
      <div className="w-full">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">تحذير: الحد ينتهي قريباً</p>
                <p className="text-sm">متبقي {limitInfo.remainingOrders} طلبية فقط هذا الشهر</p>
              </div>
            </div>
            {showUpgradeButton && (
              <Button
                onClick={() => navigate('/dashboard/subscription')}
                variant="outline"
                size="sm"
              >
                ترقية الخطة
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    );
  }

  // إذا كان كل شيء طبيعي، عرض المحتوى الأصلي
  return <>{children}</>;
};

export default OrderLimitBlocker;
