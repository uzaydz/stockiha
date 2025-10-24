import { useState } from 'react';
import { useConfirmationAnalytics } from '@/hooks/useConfirmationAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, TrendingUp, Target } from 'lucide-react';
import { format } from 'date-fns';

export const ConfirmationAnalyticsDashboard = () => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const { loading, totals, leaderboard, snapshots, agents } = useConfirmationAnalytics({
    period,
  });

  const renderSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">تحليلات فريق التأكيد</h2>
          <p className="text-sm text-muted-foreground">راقب الأداء اليومي، ترتيب الموظفين، ومستوى الإنجاز حسب الفترات.</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <TabsList>
              <TabsTrigger value="today">اليوم</TabsTrigger>
              <TabsTrigger value="week">أسبوع</TabsTrigger>
              <TabsTrigger value="month">شهر</TabsTrigger>
            </TabsList>
          </Tabs>
          <DateRangePicker onUpdate={() => {}} />
        </div>
      </div>

      {loading ? (
        renderSkeleton()
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4 text-amber-500" />
                الطلبات المؤكدة
              </div>
              <div className="text-3xl font-semibold text-foreground mt-3">{totals.confirmed}</div>
              <div className="text-xs text-muted-foreground mt-1">من أصل {totals.assigned} طلب مخصص</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                معدل التحويل
              </div>
              <div className="text-3xl font-semibold text-emerald-600 mt-3">
                {(totals.conversionRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">نسبة النجاح من الطلبات المعالجة</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="w-4 h-4 text-orange-500" />
                سفير الأسبوع
              </div>
              {leaderboard[0] ? (
                <div className="mt-3">
                  <div className="text-lg font-semibold text-foreground">{leaderboard[0].agent?.full_name}</div>
                  <div className="text-xs text-muted-foreground">طلبات مؤكدة: {leaderboard[0].confirmed}</div>
                </div>
              ) : (
                <div className="text-muted-foreground mt-3 text-sm">ليس بعد</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-primary" />
                طلبات قيد المتابعة
              </div>
              <div className="text-3xl font-semibold text-primary mt-3">{totals.pending}</div>
              <div className="text-xs text-muted-foreground mt-1">طلبيات لا تزال في الطابور</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>لوحة الترتيب (Leaderboard)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[360px]">
              <div className="divide-y divide-border/40">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">لا توجد بيانات كافية لعرض الترتيب.</div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.agentId} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="font-medium text-foreground">{entry.agent?.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            معدل التحويل {entry.conversion.toFixed(2)} | الإنتاجية {entry.productivity.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-600">{entry.confirmed} طلب</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>سجل الأداء اليومي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshots.slice(0, 8).map((snapshot) => {
              const agent = agents.find((agentItem) => agentItem.id === snapshot.agent_id);
              return (
                <div
                  key={`${snapshot.agent_id}-${snapshot.snapshot_date}`}
                  className="border border-border/40 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{agent?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(snapshot.snapshot_date), 'yyyy-MM-dd')} • تأكيد {snapshot.total_confirmed} من {snapshot.total_assigned}
                    </div>
                  </div>
                  <Badge variant="outline">{(snapshot.conversion_rate * 100).toFixed(1)}%</Badge>
                </div>
              );
            })}
            {snapshots.length === 0 && <div className="text-sm text-muted-foreground">لا توجد بيانات تحليلية حتى الآن.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmationAnalyticsDashboard;
