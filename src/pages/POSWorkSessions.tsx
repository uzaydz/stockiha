import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, TrendingUp, TrendingDown, User, CheckCircle, XCircle, RefreshCw, Pause, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getTodayWorkSessions } from '@/api/localWorkSessionService';
import type { LocalWorkSession } from '@/database/localDb';
import { useTenant } from '@/context/TenantContext';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import WorkSessionsTableResponsive from '@/components/work-sessions/WorkSessionsTableResponsive';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface POSWorkSessionsProps extends POSSharedLayoutControls {}

const POSWorkSessions: React.FC<POSWorkSessionsProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { currentOrganization } = useTenant();
  const [sessions, setSessions] = useState<LocalWorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<LocalWorkSession | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // جلب جلسات اليوم
  const fetchSessions = async (date: string) => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const sessions = await getTodayWorkSessions(currentOrganization.id, date);
      setSessions(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate]);

  // تسجيل دالة التحديث
  useEffect(() => {
    if (!onRegisterRefresh) return;
    onRegisterRefresh(() => fetchSessions(selectedDate));
    return () => onRegisterRefresh(null);
  }, [onRegisterRefresh, selectedDate]);

  // تحديث حالة الـ Layout
  useEffect(() => {
    if (!onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: isLoading,
      connectionStatus: 'connected'
    });
  }, [onLayoutStateChange, isLoading]);

  // حساب الإحصائيات
  const stats = React.useMemo(() => {
    return {
      total: sessions.length,
      active: sessions.filter((s) => s.status === 'active').length,
      paused: sessions.filter((s) => s.status === 'paused').length,
      closed: sessions.filter((s) => s.status === 'closed').length,
      totalSales: sessions.reduce((sum, s) => sum + (s.total_sales || 0), 0),
      totalOrders: sessions.reduce((sum, s) => sum + (s.total_orders || 0), 0),
      totalDifference: sessions.reduce((sum, s) => sum + (s.cash_difference || 0), 0),
    };
  }, [sessions]);

  // فتح نافذة التفاصيل
  const handleViewDetails = (session: LocalWorkSession) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  };

  // تنسيق المدة الزمنية
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  const renderWithLayout = (children: React.ReactNode) => {
    if (!useStandaloneLayout) {
      return children;
    }
    return (
      <POSPureLayout
        onRefresh={() => fetchSessions(selectedDate)}
        isRefreshing={isLoading}
        connectionStatus="connected"
      >
        {children}
      </POSPureLayout>
    );
  };

  const pageContent = (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">جلسات العمل</h1>
          <p className="text-muted-foreground">عرض وإدارة جلسات عمل الموظفين في نقطة البيع</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" size="icon" onClick={() => fetchSessions(selectedDate)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الجلسات</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} نشط • {stats.paused} متوقف • {stats.closed} مغلق
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalOrders} طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفرق الإجمالي</CardTitle>
            {stats.totalDifference >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                stats.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {stats.totalDifference >= 0 ? '+' : ''}
              {formatPrice(Math.abs(stats.totalDifference))}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDifference >= 0 ? 'زيادة' : 'نقص'} في المبالغ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الطلبات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? (stats.totalOrders / stats.total).toFixed(1) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">طلب لكل جلسة</p>
          </CardContent>
        </Card>
      </div>

      {/* جدول الجلسات */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد جلسات</h3>
              <p className="text-sm text-muted-foreground">
                لم يتم تسجيل أي جلسات عمل في هذا التاريخ
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <WorkSessionsTableResponsive
          sessions={sessions}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* نافذة التفاصيل المنبثقة - محسنة للموبايل */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-3 sm:p-6" dir="rtl">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-2xl flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              تفاصيل الجلسة
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              معلومات كاملة عن جلسة العمل
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-3 sm:space-y-6 mt-2 sm:mt-4">
              {/* رأس معلومات الجلسة - تصميم محسن */}
              <div className={cn(
                "rounded-xl overflow-hidden border",
                selectedSession.status === 'active' ? "border-green-500/30" :
                selectedSession.status === 'paused' ? "border-amber-500/30" :
                "border-border"
              )}>
                {/* شريط الحالة بالتدرج اللوني */}
                <div className={cn(
                  "p-3 sm:p-4 bg-gradient-to-r",
                  selectedSession.status === 'active' ? "from-green-500 to-green-600" :
                  selectedSession.status === 'paused' ? "from-amber-500 to-amber-600" :
                  "from-gray-500 to-gray-600"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        {selectedSession.status === 'active' ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" /> :
                         selectedSession.status === 'paused' ? <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-white" /> :
                         <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-base sm:text-lg">{selectedSession.staff_name}</p>
                        <p className="text-xs text-white/80">#{selectedSession.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-gray-800 hover:bg-white text-xs sm:text-sm"
                    >
                      {selectedSession.status === 'active' ? 'نشط' : selectedSession.status === 'paused' ? 'متوقف' : 'مغلق'}
                    </Badge>
                  </div>
                </div>

                {/* معلومات الوقت - مُدمجة */}
                <div className="p-3 sm:p-4 bg-card">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">البداية</p>
                        <p className="text-xs sm:text-sm font-semibold">
                          {format(new Date(selectedSession.started_at), 'HH:mm dd/MM', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    {selectedSession.ended_at && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">النهاية</p>
                          <p className="text-xs sm:text-sm font-semibold">
                            {format(new Date(selectedSession.ended_at), 'HH:mm dd/MM', { locale: ar })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedSession.ended_at && (
                    <div className="mt-2 pt-2 border-t text-center">
                      <p className="text-xs text-muted-foreground">المدة الكلية</p>
                      <p className="text-sm sm:text-base font-semibold text-primary">
                        {formatDuration((new Date(selectedSession.ended_at).getTime() - new Date(selectedSession.started_at).getTime()) / 1000)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* إحصائيات سريعة - شبكة 2x2 للموبايل */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* الطلبات */}
                <Card className="border-blue-500/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">الطلبات</p>
                        <p className="text-lg sm:text-2xl font-bold">{selectedSession.total_orders}</p>
                      </div>
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* المبيعات */}
                <Card className="border-green-500/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">المبيعات</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600">
                          {formatPrice(selectedSession.total_sales).replace(' ر.س', '')}
                        </p>
                      </div>
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* النقدي */}
                <Card className="border-emerald-500/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">نقدي</p>
                        <p className="text-base sm:text-xl font-semibold text-green-600">
                          {formatPrice(selectedSession.cash_sales).replace(' ر.س', '')}
                        </p>
                      </div>
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* البطاقة */}
                <Card className="border-purple-500/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">بطاقة</p>
                        <p className="text-base sm:text-xl font-semibold text-purple-600">
                          {formatPrice(selectedSession.card_sales).replace(' ر.س', '')}
                        </p>
                      </div>
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* معلومات الإغلاق - إن وجدت */}
              {selectedSession.status === 'closed' && (
                <Card className="border-gray-500/20">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      معلومات الإغلاق
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">رأس المال الأولي</p>
                        <p className="text-base sm:text-lg font-semibold">{formatPrice(selectedSession.opening_cash)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">رأس المال النهائي</p>
                        <p className="text-base sm:text-lg font-semibold">{formatPrice(selectedSession.closing_cash || 0)}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">الفرق</p>
                          <p className={cn(
                            'text-lg sm:text-xl font-bold',
                            (selectedSession.cash_difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {(selectedSession.cash_difference || 0) >= 0 ? '+' : ''}
                            {formatPrice(Math.abs(selectedSession.cash_difference || 0))}
                          </p>
                        </div>
                        <div className={cn(
                          "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center",
                          (selectedSession.cash_difference || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                        )}>
                          {(selectedSession.cash_difference || 0) >= 0 ?
                            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /> :
                            <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                          }
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        المتوقع: {formatPrice(selectedSession.expected_cash || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* إحصائيات الإيقاف المؤقت */}
              {(selectedSession.pause_count > 0 || selectedSession.total_pause_duration > 0) && (
                <Card className="border-amber-500/20">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                      <Pause className="h-4 w-4 text-amber-500" />
                      إحصائيات الإيقاف المؤقت
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 sm:p-3 bg-amber-500/5 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">عدد المرات</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">{selectedSession.pause_count}</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-amber-500/5 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">المدة الكلية</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">
                          {formatDuration(selectedSession.total_pause_duration)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* الملاحظات */}
              {(selectedSession.opening_notes || selectedSession.closing_notes) && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-lg">الملاحظات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedSession.opening_notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">ملاحظات ��لبداية:</p>
                        <p className="text-xs sm:text-sm bg-muted p-2 sm:p-3 rounded-md">{selectedSession.opening_notes}</p>
                      </div>
                    )}
                    {selectedSession.closing_notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">ملاحظات الإغلاق:</p>
                        <p className="text-xs sm:text-sm bg-muted p-2 sm:p-3 rounded-md">{selectedSession.closing_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return renderWithLayout(pageContent);
};

export default POSWorkSessions;
