import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  Activity, 
  Wifi, 
  MapPin, 
  Trash2, 
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  getTrustedDevices, 
  trustDevice, 
  untrustDevice,
  type TrustedDevice 
} from '@/lib/api/security';

interface TrustedDevicesManagerProps {
  onAlert: (type: 'success' | 'error', message: string) => void;
}

export default function TrustedDevicesManager({ onAlert }: TrustedDevicesManagerProps) {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await getTrustedDevices();
      setDevices(data);
    } catch (error) {
      onAlert('error', 'فشل في تحميل الأجهزة الموثوقة');
    } finally {
      setLoading(false);
    }
  };

  const handleTrustDevice = async (deviceId: string) => {
    setProcessing(deviceId);
    try {
      const result = await trustDevice(deviceId);
      if (result.success) {
        await loadDevices();
        onAlert('success', 'تم تعيين الجهاز كموثوق بنجاح');
      } else {
        onAlert('error', result.error || 'فشل في تعيين الجهاز كموثوق');
      }
    } catch (error) {
      onAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setProcessing(null);
    }
  };

  const handleUntrustDevice = async (deviceId: string) => {
    setProcessing(deviceId);
    try {
      const result = await untrustDevice(deviceId);
      if (result.success) {
        await loadDevices();
        onAlert('success', 'تم إزالة الثقة من الجهاز بنجاح');
      } else {
        onAlert('error', result.error || 'فشل في إزالة الثقة من الجهاز');
      }
    } catch (error) {
      onAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setProcessing(null);
    }
  };

  const getDeviceIcon = (deviceType?: string, trustLevel: number = 0) => {
    const getIconColor = () => {
      if (trustLevel >= 75) return 'text-green-600';
      if (trustLevel >= 50) return 'text-yellow-600';
      if (trustLevel >= 25) return 'text-orange-600';
      return 'text-red-600';
    };

    const iconClass = `h-5 w-5 ${getIconColor()}`;
    
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
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'اليوم';
    if (diffInDays === 1) return 'أمس';
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
    if (diffInDays < 30) return `منذ ${Math.floor(diffInDays / 7)} أسابيع`;
    return `منذ ${Math.floor(diffInDays / 30)} شهور`;
  };

  const getTrustLevelBadge = (trustLevel: number, isTrusted: boolean) => {
    if (!isTrusted) {
      return <Badge variant="destructive">غير موثوق</Badge>;
    }
    
    if (trustLevel >= 90) return <Badge className="bg-green-600">موثوق جداً</Badge>;
    if (trustLevel >= 75) return <Badge className="bg-green-500">موثوق</Badge>;
    if (trustLevel >= 50) return <Badge variant="secondary">موثوق جزئياً</Badge>;
    return <Badge variant="outline">ثقة منخفضة</Badge>;
  };

  const getTrustLevelColor = (trustLevel: number) => {
    if (trustLevel >= 75) return 'bg-green-500';
    if (trustLevel >= 50) return 'bg-yellow-500';
    if (trustLevel >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDeviceRisk = (device: TrustedDevice) => {
    const daysSinceLastUse = Math.floor(
      (new Date().getTime() - new Date(device.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (!device.is_trusted) return 'high';
    if (daysSinceLastUse > 30) return 'medium';
    if (device.trust_level < 50) return 'medium';
    return 'low';
  };

  const trustedDevices = devices.filter(d => d.is_trusted);
  const untrustedDevices = devices.filter(d => !d.is_trusted);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأجهزة الموثوقة
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
            <Shield className="h-5 w-5" />
            الأجهزة الموثوقة
            <Badge variant="outline">{trustedDevices.length}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDevices}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          إدارة الأجهزة التي تثق بها. الأجهزة الموثوقة لا تحتاج لتأكيد إضافي عند تسجيل الدخول.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* الأجهزة الموثوقة */}
        {trustedDevices.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              الأجهزة الموثوقة ({trustedDevices.length})
            </h3>
            <div className="space-y-4">
              {trustedDevices.map((device, index) => {
                const risk = getDeviceRisk(device);
                
                return (
                  <div key={device.id} className="relative">
                    <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getDeviceIcon(device.device_type, device.trust_level)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {device.device_name || 'جهاز غير معروف'}
                              </h4>
                              {getTrustLevelBadge(device.trust_level, device.is_trusted)}
                              {device.trust_level >= 90 && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            
                            {/* شريط مستوى الثقة */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>مستوى الثقة</span>
                                <span>{device.trust_level}%</span>
                              </div>
                              <Progress 
                                value={device.trust_level} 
                                className="h-2"
                                style={{
                                  background: `linear-gradient(to right, ${getTrustLevelColor(device.trust_level)} ${device.trust_level}%, #e5e7eb ${device.trust_level}%)`
                                }}
                              />
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>آخر استخدام: {formatDate(device.last_used_at)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                <span>استخدم {device.usage_count} مرة</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>آخر IP: {device.last_seen_ip || 'غير معروف'}</span>
                              </div>
                              
                              {device.browser_info && (
                                <div className="flex items-center gap-2">
                                  <Wifi className="h-3 w-3" />
                                  <span>
                                    {device.browser_info.browser} {device.browser_info.version} على {device.browser_info.os}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {risk === 'medium' && (
                              <Alert className="mt-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  هذا الجهاز لم يُستخدم منذ فترة طويلة. تحقق من أنه لا يزال في حوزتك.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUntrustDevice(device.id)}
                            disabled={processing === device.id}
                            className="flex items-center gap-2"
                          >
                            <ShieldX className="h-4 w-4" />
                            {processing === device.id ? 'جاري الإزالة...' : 'إزالة الثقة'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {index < trustedDevices.length - 1 && <Separator className="my-4" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* الأجهزة غير الموثوقة */}
        {untrustedDevices.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-red-600" />
              الأجهزة غير الموثوقة ({untrustedDevices.length})
            </h3>
            <div className="space-y-4">
              {untrustedDevices.map((device, index) => (
                <div key={device.id} className="relative">
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getDeviceIcon(device.device_type, device.trust_level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              {device.device_name || 'جهاز غير معروف'}
                            </h4>
                            {getTrustLevelBadge(device.trust_level, device.is_trusted)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>آخر استخدام: {formatDate(device.last_used_at)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Activity className="h-3 w-3" />
                              <span>استخدم {device.usage_count} مرة</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>آخر IP: {device.last_seen_ip || 'غير معروف'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrustDevice(device.id)}
                          disabled={processing === device.id}
                          className="flex items-center gap-2"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {processing === device.id ? 'جاري التعيين...' : 'تعيين كموثوق'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {index < untrustedDevices.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {devices.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">لا توجد أجهزة مسجلة</p>
            <p className="text-sm text-muted-foreground mt-2">
              ستظهر الأجهزة هنا عند تسجيل الدخول من أجهزة جديدة
            </p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            حول الأجهزة الموثوقة:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• الأجهزة الموثوقة لا تحتاج لتأكيد إضافي عند تسجيل الدخول</li>
            <li>• مستوى الثقة يزيد مع الاستخدام المتكرر والآمن</li>
            <li>• يمكنك إزالة الثقة من أي جهاز في أي وقت</li>
            <li>• الأجهزة غير المستخدمة لفترة طويلة قد تفقد الثقة تلقائياً</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 