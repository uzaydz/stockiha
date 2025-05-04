import { CreditCard, Zap, Clock } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubscriptionAnalytics as SubscriptionAnalyticsType } from '@/types/subscription';

interface SubscriptionAnalyticsProps {
  analytics: SubscriptionAnalyticsType;
}

export function SubscriptionAnalytics({ analytics }: SubscriptionAnalyticsProps) {
  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              إجمالي الاشتراكات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_subscriptions}</div>
            <p className="text-xs text-muted-foreground">
              نشطة: {analytics.active_subscriptions} ({Math.round(analytics.active_subscriptions / analytics.total_subscriptions * 100)}%)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              إيرادات شهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthly_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              متوسط لكل اشتراك: {formatCurrency(analytics.monthly_revenue / analytics.active_subscriptions)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              إيرادات سنوية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.yearly_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              متوسط لكل اشتراك: {formatCurrency(analytics.yearly_revenue / analytics.active_subscriptions)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              متوسط قيمة الاشتراك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency((analytics.monthly_revenue + analytics.yearly_revenue) / analytics.total_subscriptions)}</div>
            <p className="text-xs text-muted-foreground">
              نمو: +5.2% في الشهر الأخير
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* توزيع الاشتراكات */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الاشتراكات</CardTitle>
          <CardDescription>توزيع المؤسسات على خطط الاشتراك المختلفة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.plan_distribution.map((plan) => (
              <div key={plan.plan} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.plan}</span>
                    <Badge variant="outline">{plan.count}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{plan.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${plan.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* أحدث الاشتراكات */}
      <Card>
        <CardHeader>
          <CardTitle>أحدث الاشتراكات</CardTitle>
          <CardDescription>آخر المؤسسات التي اشتركت في النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المؤسسة</TableHead>
                <TableHead>الخطة</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.recent_subscriptions.map((sub, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{sub.organization}</TableCell>
                  <TableCell>
                    {sub.plan === 'أساسي' && <Badge variant="secondary">أساسي</Badge>}
                    {sub.plan === 'متميز' && <Badge variant="default">متميز</Badge>}
                    {sub.plan === 'مؤسسات' && <Badge variant="destructive">مؤسسات</Badge>}
                    {sub.plan === 'تجريبي' && <Badge variant="outline">تجريبي</Badge>}
                  </TableCell>
                  <TableCell>{formatCurrency(sub.amount)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatDate(sub.date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 