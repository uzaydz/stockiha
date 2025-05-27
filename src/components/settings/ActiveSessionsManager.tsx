import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  MapPin, 
  Clock, 
  LogOut, 
  Shield, 
  AlertTriangle,
  Activity,
  Wifi,
  Chrome,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  getActiveSessions, 
  terminateSession, 
  terminateAllOtherSessions,
  type UserSession 
} from '@/lib/api/security';

interface ActiveSessionsManagerProps {
  onAlert: (type: 'success' | 'error', message: string) => void;
}

export default function ActiveSessionsManager({ onAlert }: ActiveSessionsManagerProps) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch (error) {
      onAlert('error', 'فشل في تحميل الجلسات النشطة');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setTerminating(sessionId);
    try {
      const result = await terminateSession(sessionId);
      if (result.success) {
        await loadSessions();
        onAlert('success', 'تم إنهاء الجلسة بنجاح');
      } else {
        onAlert('error', result.error || 'فشل في إنهاء الجلسة');
      }
    } catch (error) {
      onAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setTerminating(null);
    }
  };

  const handleTerminateAllSessions = async () => {
    setTerminatingAll(true);
    try {
      const result = await terminateAllOtherSessions();
      if (result.success) {
        await loadSessions();
        onAlert('success', `تم إنهاء ${result.terminatedCount || 0} جلسة أخرى`);
      } else {
        onAlert('error', result.error || 'فشل في إنهاء الجلسات');
      }
    } catch (error) {
      onAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setTerminatingAll(false);
    }
  };

  const getDeviceIcon = (deviceType?: string, isTrusted?: boolean) => {
    const iconClass = `h-5 w-5 ${isTrusted ? 'text-green-600' : 'text-gray-500'}`;
    
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className={iconClass} />;
      case 'tablet':
        return <Tablet className={iconClass} />;
      default:
        return <Monitor className={iconClass} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  const getRiskLevel = (session: UserSession) => {
    const lastActivity = new Date(session.last_activity_at);
    const now = new Date();
    const hoursInactive = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursInactive > 24) return 'high';
    if (hoursInactive > 8) return 'medium';
    return 'low';
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">خطر عالي</Badge>;
      case 'medium':
        return <Badge variant="secondary">خطر متوسط</Badge>;
      default:
        return <Badge variant="outline">آمن</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            الجلسات النشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            الجلسات النشطة
            <Badge variant="outline">{sessions.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                onClick={handleTerminateAllSessions}
                disabled={terminatingAll}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {terminatingAll ? 'جاري الإنهاء...' : 'إنهاء الكل'}
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          إدارة الأجهزة المتصلة بحسابك حالياً. يمكنك إنهاء الجلسات المشبوهة أو غير المرغوب فيها.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">لا توجد جلسات نشطة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const riskLevel = getRiskLevel(session);
              const isCurrentSession = index === 0; // افتراض أن الجلسة الأولى هي الحالية
              
              return (
                <div key={session.id} className="relative">
                  <div className={`p-4 border rounded-lg ${isCurrentSession ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    {isCurrentSession && (
                      <Badge className="absolute -top-2 right-4 bg-green-600">
                        الجلسة الحالية
                      </Badge>
                    )}
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getDeviceIcon(session.device_info?.type, session.is_trusted_device)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              {session.device_info?.name || 'جهاز غير معروف'}
                            </h4>
                            {session.is_trusted_device && (
                              <Shield className="h-4 w-4 text-green-600" />
                            )}
                            {getRiskBadge(riskLevel)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{session.ip_address || 'عنوان IP غير معروف'}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>آخر نشاط: {formatDate(session.last_activity_at)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Activity className="h-3 w-3" />
                              <span>طريقة الدخول: {session.login_method || 'email'}</span>
                            </div>
                            
                            {session.user_agent && (
                              <div className="flex items-center gap-2">
                                <Chrome className="h-3 w-3" />
                                <span className="truncate max-w-xs">
                                  {session.user_agent}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {riskLevel === 'high' && (
                            <Alert className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                هذه الجلسة غير نشطة منذ أكثر من 24 ساعة. يُنصح بإنهائها لأسباب أمنية.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {!isCurrentSession && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                            disabled={terminating === session.id}
                            className="flex items-center gap-2"
                          >
                            <LogOut className="h-4 w-4" />
                            {terminating === session.id ? 'جاري الإنهاء...' : 'إنهاء'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < sessions.length - 1 && <Separator className="my-4" />}
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            نصائح أمنية:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• قم بإنهاء الجلسات التي لا تتعرف عليها فوراً</li>
            <li>• الجلسات الموثوقة تظهر برمز الدرع الأخضر</li>
            <li>• تحقق من عناوين IP للتأكد من أنها مألوفة</li>
            <li>• الجلسات غير النشطة لفترة طويلة قد تكون مشبوهة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 