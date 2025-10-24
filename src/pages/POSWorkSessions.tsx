import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, TrendingUp, TrendingDown, User, CheckCircle, XCircle, RefreshCw, Pause } from 'lucide-react';
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
import WorkSessionsTable from '@/components/work-sessions/WorkSessionsTable';
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
        <WorkSessionsTable
          sessions={sessions}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* نافذة التفاصيل المنبثقة */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl">تفاصيل الجلسة</DialogTitle>
            <DialogDescription>
              معلومات كاملة عن جلسة العمل
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 mt-4">
              {/* معلومات الموظف */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات الموظف</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{selectedSession.staff_name}</p>
                      <Badge
                        variant={selectedSession.status === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          selectedSession.status === 'active' && 'bg-green-600',
                          selectedSession.status === 'paused' && 'bg-amber-500'
                        )}
                      >
                        {selectedSession.status === 'active' ? 'نشط' : selectedSession.status === 'paused' ? 'متوقف مؤقتاً' : 'مغلق'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* الأوقات */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الأوقات</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      وقت البداية
                    </p>
                    <p className="text-lg font-semibold">
                      {format(new Date(selectedSession.started_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}
                    </p>
                  </div>

                  {selectedSession.ended_at && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        وقت الإغلاق
                      </p>
                      <p className="text-lg font-semibold">
                        {format(new Date(selectedSession.ended_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        المدة: {formatDuration((new Date(selectedSession.ended_at).getTime() - new Date(selectedSession.started_at).getTime()) / 1000)}
                      </p>
                    </div>
                  )}

                  {selectedSession.paused_at && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        آخر إيقاف مؤقت
                      </p>
                      <p className="text-lg font-semibold">
                        {format(new Date(selectedSession.paused_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}
                      </p>
                    </div>
                  )}

                  {selectedSession.resumed_at && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        آخر استئناف
                      </p>
                      <p className="text-lg font-semibold">
                        {format(new Date(selectedSession.resumed_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* إحصائيات الإيقاف المؤقت */}
              {(selectedSession.pause_count > 0 || selectedSession.total_pause_duration > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">إحصائيات الإيقاف المؤقت</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">عدد مرات الإيقاف</p>
                      <p className="text-2xl font-bold text-amber-600">{selectedSession.pause_count}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">إجمالي وقت الإيقاف</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatDuration(selectedSession.total_pause_duration)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* المعلومات المالية */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">المعلومات المالية</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">رأس المال الأولي</p>
                    <p className="text-2xl font-bold">{formatPrice(selectedSession.opening_cash)}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                    <p className="text-2xl font-bold text-blue-600">{formatPrice(selectedSession.total_sales)}</p>
                    <p className="text-xs text-muted-foreground">{selectedSession.total_orders} طلب</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">المبيعات النقدية</p>
                    <p className="text-xl font-semibold text-green-600">{formatPrice(selectedSession.cash_sales)}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">مبيعات البطاقة</p>
                    <p className="text-xl font-semibold text-purple-600">{formatPrice(selectedSession.card_sales)}</p>
                  </div>

                  {selectedSession.status === 'closed' && (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">رأس المال النهائي</p>
                        <p className="text-2xl font-bold">{formatPrice(selectedSession.closing_cash || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          متوقع: {formatPrice(selectedSession.expected_cash || 0)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">الفرق</p>
                        <p
                          className={cn(
                            'text-2xl font-bold',
                            (selectedSession.cash_difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {(selectedSession.cash_difference || 0) >= 0 ? '+' : ''}
                          {formatPrice(Math.abs(selectedSession.cash_difference || 0))}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* الملاحظات */}
              {(selectedSession.opening_notes || selectedSession.closing_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">الملاحظات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedSession.opening_notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">ملاحظات البداية:</p>
                        <p className="text-base bg-muted p-3 rounded-md">{selectedSession.opening_notes}</p>
                      </div>
                    )}
                    {selectedSession.closing_notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">ملاحظات الإغلاق:</p>
                        <p className="text-base bg-muted p-3 rounded-md">{selectedSession.closing_notes}</p>
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
