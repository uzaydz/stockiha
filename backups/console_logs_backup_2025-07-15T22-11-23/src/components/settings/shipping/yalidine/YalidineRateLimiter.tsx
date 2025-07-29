import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Activity } from 'lucide-react';
import { YalidineProviderProps, RateLimiterStatsType } from './types';
import { yalidineRateLimiter } from '@/api/yalidine/rate-limiter';

export default function YalidineRateLimiter({
  isEnabled
}: YalidineProviderProps) {
  const [rateLimiterStats, setRateLimiterStats] = useState<RateLimiterStatsType>({
    perSecond: 0,
    perMinute: 0,
    perHour: 0,
    perDay: 0
  });

  const [remainingRequests, setRemainingRequests] = useState<RateLimiterStatsType>({
    perSecond: 5,
    perMinute: 50,
    perHour: 1000,
    perDay: 10000
  });

  // Actualizar estadísticas de rate-limiter periódicamente
  useEffect(() => {
    if (!isEnabled) return;
    
    const updateStats = () => {
      const stats = yalidineRateLimiter.getStats();
      const remaining = yalidineRateLimiter.getRemainingRequests();
      setRateLimiterStats(stats);
      setRemainingRequests(remaining);
    };
    
    // Actualizar estadísticas inmediatamente
    updateStats();
    
    // Actualizar cada 3 segundos
    const interval = setInterval(updateStats, 3000);
    
    return () => clearInterval(interval);
  }, [isEnabled]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>نظام تحديد معدل الطلبات</CardTitle>
          <CardDescription>
            عرض إحصائيات استخدام API ياليدين والطلبات المتبقية ضمن الحدود المسموح بها
          </CardDescription>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">الطلبات في الثانية</Label>
              <Badge variant="outline">{rateLimiterStats.perSecond} / 5</Badge>
            </div>
            <Progress value={(rateLimiterStats.perSecond / 5) * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">الطلبات في الدقيقة</Label>
              <Badge variant="outline">{rateLimiterStats.perMinute} / 50</Badge>
            </div>
            <Progress value={(rateLimiterStats.perMinute / 50) * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">الطلبات في الساعة</Label>
              <Badge variant="outline">{rateLimiterStats.perHour} / 1000</Badge>
            </div>
            <Progress value={(rateLimiterStats.perHour / 1000) * 100} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">الطلبات في اليوم</Label>
              <Badge variant="outline">{rateLimiterStats.perDay} / 10000</Badge>
            </div>
            <Progress value={(rateLimiterStats.perDay / 10000) * 100} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4 p-3 rounded-md bg-muted/50">
          <h4 className="font-medium text-sm mb-2">معلومات نظام تحديد المعدل:</h4>
          <p className="text-sm text-muted-foreground">
            تم تطبيق نظام تحديد معدل الطلبات تلقائيًا على جميع استدعاءات API ياليدين للالتزام بحدود API:
          </p>
          <ul className="list-disc list-inside text-sm mt-1 text-muted-foreground">
            <li>5 طلبات في الثانية (متبقي: {remainingRequests.perSecond})</li>
            <li>50 طلباً في الدقيقة (متبقي: {remainingRequests.perMinute})</li>
            <li>1000 طلب في الساعة (متبقي: {remainingRequests.perHour})</li>
            <li>10000 طلب في اليوم (متبقي: {remainingRequests.perDay})</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            في حالة الوصول إلى الحد الأقصى، سيتم وضع الطلبات في قائمة انتظار ومعالجتها عندما يسمح المعدل بذلك.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
