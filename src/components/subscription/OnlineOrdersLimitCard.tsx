/**
 * مكون عرض حالة حدود الطلبيات الإلكترونية
 * لخطة التجار الإلكترونيين المبتدئين
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, Clock, CreditCard } from 'lucide-react';
import { useOnlineOrdersLimit } from '@/hooks/useOnlineOrdersLimit';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface OnlineOrdersLimitCardProps {
  showUpgradeButton?: boolean;
  compact?: boolean;
}

const OnlineOrdersLimitCard: React.FC<OnlineOrdersLimitCardProps> = ({
  showUpgradeButton = true,
  compact = false
}) => {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const { limitInfo, loading, error, refreshLimit } = useOnlineOrdersLimit();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="mr-2">جاري التحقق من الحدود...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>خطأ في التحقق من الحدود: {error}</span>
          </div>
          <Button
            onClick={refreshLimit}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!limitInfo || !limitInfo.maxOrders) {
    // لا توجد حدود - ربما خطة غير محدودة
    return null;
  }

  const getStatusColor = () => {
    if (limitInfo.isBlocked) return 'text-red-600';
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusBadge = () => {
    if (limitInfo.isBlocked) {
      return <Badge variant="destructive">محظور</Badge>;
    }
    if (limitInfo.remainingOrders && limitInfo.remainingOrders <= 10) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">ينتهي قريباً</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">نشط</Badge>;
  };

  const getProgressPercentage = () => {
    if (!limitInfo.maxOrders) return 0;
    return Math.round((limitInfo.currentOrders / limitInfo.maxOrders) * 100);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        <ShoppingCart className={`w-5 h-5 ${getStatusColor()}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">طلبيات هذا الشهر</span>
            {getStatusBadge()}
          </div>
          <div className="text-xs text-muted-foreground">
            {limitInfo.currentOrders} من {limitInfo.maxOrders} طلبية
          </div>
        </div>
        {limitInfo.isBlocked && (
          <Button
            onClick={() => navigate('/dashboard/subscription')}
            size="sm"
            variant="outline"
          >
            ترقية الخطة
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="w-5 h-5" />
          حدود الطلبيات الإلكترونية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* حالة الخطة */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">الحالة الحالية</h3>
            <p className="text-sm text-muted-foreground">
              خطة التجار الإلكترونيين المبتدئين
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* إحصائيات الطلبيات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <ShoppingCart className={`w-6 h-6 mx-auto mb-2 ${getStatusColor()}`} />
            <p className="font-semibold text-lg">{limitInfo.currentOrders}</p>
            <p className="text-sm text-muted-foreground">طلبية مُنجزة</p>
          </div>

          <div className="text-center p-4 bg-muted rounded-lg">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="font-semibold text-lg">{limitInfo.maxOrders}</p>
            <p className="text-sm text-muted-foreground">الحد الأقصى</p>
          </div>

          <div className="text-center p-4 bg-muted rounded-lg">
            <CreditCard className={`w-6 h-6 mx-auto mb-2 ${getStatusColor()}`} />
            <p className="font-semibold text-lg">{limitInfo.remainingOrders || 0}</p>
            <p className="text-sm text-muted-foreground">متبقي هذا الشهر</p>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>الاستخدام الشهري</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                limitInfo.isBlocked
                  ? 'bg-red-600'
                  : limitInfo.remainingOrders && limitInfo.remainingOrders <= 10
                  ? 'bg-orange-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(getProgressPercentage(), 100)}%` }}
            ></div>
          </div>
        </div>

        {/* رسالة التحذير */}
        {limitInfo.isBlocked && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">تم حظر المتجر!</p>
              <p className="text-sm">لقد تجاوزت الحد المسموح من الطلبيات الإلكترونية هذا الشهر</p>
            </div>
          </div>
        )}

        {limitInfo.remainingOrders && limitInfo.remainingOrders <= 10 && !limitInfo.isBlocked && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">تحذير: الحد ينتهي قريباً</p>
              <p className="text-sm">متبقي {limitInfo.remainingOrders} طلبية فقط هذا الشهر</p>
            </div>
          </div>
        )}

        {/* أزرار العمل */}
        {showUpgradeButton && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={refreshLimit}
              variant="outline"
              size="sm"
            >
              تحديث البيانات
            </Button>

            {(limitInfo.isBlocked || (limitInfo.remainingOrders && limitInfo.remainingOrders <= 20)) && (
              <Button
                onClick={() => navigate('/dashboard/subscription')}
                size="sm"
              >
                ترقية الخطة
              </Button>
            )}
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• يتم إعادة تعيين العداد في بداية كل شهر</p>
          <p>• 100 طلبية إضافية = 1000 دج</p>
          <p>• 250 طلبية إضافية = 2000 دج</p>
          <p>• يمكنك الترقية في أي وقت</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnlineOrdersLimitCard;
