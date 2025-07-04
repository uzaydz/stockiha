import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { 
  getSupabaseDiagnostics, 
  detectMultipleGoTrueClients, 
  diagnoseSupabaseIssues,
  cleanupSupabaseClients,
  SupabaseClientMonitor
} from '@/lib/supabase-unified';

interface SupabaseDebugPanelProps {
  enabled?: boolean;
  autoRefresh?: number; // مدة التحديث التلقائي بالثواني
}

const SupabaseDebugPanel: React.FC<SupabaseDebugPanelProps> = ({ 
  enabled = import.meta.env.DEV, 
  autoRefresh = 5 
}) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshDiagnostics = async () => {
    setIsRefreshing(true);
    try {
      const report = diagnoseSupabaseIssues();
      setDiagnostics(report);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('خطأ في تحديث تشخيص Supabase:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    try {
      cleanupSupabaseClients();
      await refreshDiagnostics();
    } catch (error) {
      console.error('خطأ في تنظيف عملاء Supabase:', error);
    }
  };

  useEffect(() => {
    if (enabled) {
      refreshDiagnostics();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !autoRefresh) return;
    
    const interval = setInterval(refreshDiagnostics, autoRefresh * 1000);
    return () => clearInterval(interval);
  }, [enabled, autoRefresh]);

  if (!enabled || !diagnostics) {
    return null;
  }

  const hasWarnings = diagnostics.goTrueClients.warning || 
                     diagnostics.totalClientsInMonitor > 1 || 
                     !diagnostics.isReady;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-dashed border-orange-200 bg-orange-50/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {hasWarnings ? (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              Supabase Debug
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDiagnostics}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription className="text-xs">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* حالة العملاء */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>العملاء النشطة:</span>
              <Badge variant={diagnostics.totalClientsInMonitor > 1 ? "destructive" : "default"}>
                {diagnostics.totalClientsInMonitor}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>GoTrueClients:</span>
              <Badge variant={diagnostics.goTrueClients.count > 1 ? "destructive" : "default"}>
                {diagnostics.goTrueClients.count}
              </Badge>
            </div>
          </div>

          {/* Storage Keys */}
          {diagnostics.goTrueClients.storageKeys.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Storage Keys:</div>
              <div className="space-y-1">
                {[...new Set(diagnostics.goTrueClients.storageKeys)].map((key: string, index: number) => (
                  <div key={index} className="text-xs p-1 bg-gray-100 rounded text-gray-600 break-all">
                    {key.length > 30 ? `${key.substring(0, 30)}...` : key}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* التحذيرات */}
          {hasWarnings && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {diagnostics.goTrueClients.warning && (
                  <div>⚠️ عدة GoTrueClient instances مكتشفة</div>
                )}
                {diagnostics.totalClientsInMonitor > 1 && (
                  <div>⚠️ عدة عملاء Supabase نشطة</div>
                )}
                {!diagnostics.isReady && (
                  <div>❌ Supabase غير جاهز</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* التوصيات */}
          {diagnostics.recommendations.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium flex items-center gap-1">
                <Info className="h-3 w-3" />
                التوصيات:
              </div>
              <div className="space-y-1">
                {diagnostics.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="text-xs text-blue-600 bg-blue-50 p-1 rounded">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات */}
          {hasWarnings && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                className="text-xs h-7"
              >
                تنظيف العملاء
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs h-7"
              >
                إعادة تحميل
              </Button>
            </div>
          )}

          {/* معلومات إضافية */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium mb-1">تفاصيل تقنية</summary>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseDebugPanel; 