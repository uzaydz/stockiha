import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Monitor, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  LogOut,
  Trash2,
  Plus,
  Activity,
  Clock,
  MapPin,
  Wifi,
  Key,
  Mail,
  Phone,
  MessageSquare,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  getSecuritySettings,
  updateSecuritySettings,
  getPrivacySettings,
  updatePrivacySettings,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  getSecurityLogs,
  getTrustedDevices,
  removeTrustedDevice,
  createCurrentUserSession,
  type SecuritySettings,
  type PrivacySettings,
  type UserSession,
  type SecurityLog,
  type TrustedDevice
} from '@/lib/api/security';
import PasswordSettings from './PasswordSettings';
import TwoFactorAuthSetup from '@/components/TwoFactorAuthSetup';
import ActiveSessionsManager from './ActiveSessionsManager';
import TrustedDevicesManager from './TrustedDevicesManager';

// Extended interfaces to include missing properties
interface ExtendedSecuritySettings extends SecuritySettings {
  two_factor_enabled?: boolean;
  backup_codes?: string[];
  google_account_linked?: boolean;
}

interface ExtendedPrivacySettings extends PrivacySettings {
  show_online_status?: boolean;
  allow_product_updates?: boolean;
  allow_organization_invites?: boolean;
}

interface ExtendedUserSession extends UserSession {
  domain?: string;
  subdomain?: string;
}

interface ExtendedSecurityLog extends SecurityLog {
  domain?: string;
  subdomain?: string;
}

export function SecurityPrivacySettings() {
  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<ExtendedSecuritySettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<ExtendedPrivacySettings | null>(null);
  const [activeSessions, setActiveSessions] = useState<ExtendedUserSession[]>([]);
  const [securityLogs, setSecurityLogs] = useState<ExtendedSecurityLog[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  
  // UI State
  const [alerts, setAlerts] = useState<Array<{type: 'success' | 'error', message: string}>>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [security, privacy, sessions, logs, devices] = await Promise.all([
        getSecuritySettings(),
        getPrivacySettings(),
        getActiveSessions(),
        getSecurityLogs(20),
        getTrustedDevices()
      ]);
      
      setSecuritySettings(security as ExtendedSecuritySettings);
      setPrivacySettings(privacy as ExtendedPrivacySettings);
      setActiveSessions(sessions);
      setSecurityLogs(logs);
      setTrustedDevices(devices);
    } catch (error) {
      addAlert('error', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const addAlert = (type: 'success' | 'error', message: string) => {
    const alert = { type, message };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a !== alert));
    }, 5000);
  };

  const handleSecurityUpdate = async (updates: Partial<ExtendedSecuritySettings>) => {
    if (!securitySettings) return;
    
    setSaving(true);
    try {
      const result = await updateSecuritySettings(updates as Partial<SecuritySettings>);
      if (result.success && result.data) {
        setSecuritySettings(result.data as ExtendedSecuritySettings);
        addAlert('success', 'تم تحديث إعدادات الأمان بنجاح');
      } else {
        addAlert('error', result.error || 'فشل في تحديث إعدادات الأمان');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacyUpdate = async (updates: Partial<ExtendedPrivacySettings>) => {
    if (!privacySettings) return;
    
    setSaving(true);
    try {
      const result = await updatePrivacySettings(updates as Partial<PrivacySettings>);
      if (result.success && result.data) {
        setPrivacySettings(result.data as ExtendedPrivacySettings);
        addAlert('success', 'تم تحديث إعدادات الخصوصية بنجاح');
      } else {
        addAlert('error', result.error || 'فشل في تحديث إعدادات الخصوصية');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const result = await terminateSession(sessionId);
      if (result.success) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        addAlert('success', 'تم إنهاء الجلسة بنجاح');
      } else {
        addAlert('error', result.error || 'فشل في إنهاء الجلسة');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const result = await terminateAllOtherSessions();
      if (result.success) {
        await loadAllData(); // إعادة تحميل البيانات
        addAlert('success', `تم إنهاء ${result.terminatedCount || 0} جلسة أخرى`);
      } else {
        addAlert('error', result.error || 'فشل في إنهاء الجلسات');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    }
  };

  const handleRemoveTrustedDevice = async (deviceId: string) => {
    try {
      const result = await removeTrustedDevice(deviceId);
      if (result.success) {
        setTrustedDevices(prev => prev.filter(d => d.id !== deviceId));
        addAlert('success', 'تم إزالة الجهاز الموثوق بنجاح');
      } else {
        addAlert('error', result.error || 'فشل في إزالة الجهاز الموثوق');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    }
  };

  const handleCreateSession = async () => {
    try {
      setSaving(true);
      const result = await createCurrentUserSession();
      if (result.success) {
        await loadAllData(); // إعادة تحميل البيانات
        addAlert('success', 'تم إنشاء الجلسة والجهاز بنجاح');
      } else {
        addAlert('error', result.error || 'فشل في إنشاء الجلسة');
      }
    } catch (error) {
      addAlert('error', 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Smartphone className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.map((alert, index) => (
        <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            الأمان
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            الخصوصية
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            الجلسات
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            الأجهزة
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            النشاط
          </TabsTrigger>
        </TabsList>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Password Settings */}
          <PasswordSettings />

          {/* Two-Factor Authentication */}
          <TwoFactorAuthSetup 
            onStatusChange={(enabled) => {
              addAlert('success', enabled ? 'تم تفعيل المصادقة الثنائية' : 'تم إلغاء تفعيل المصادقة الثنائية');
              // إعادة تحميل البيانات لتحديث الحالة
              loadAllData();
            }}
          />

          {/* Security Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                تفضيلات الأمان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">تنبيهات تسجيل الدخول</h4>
                    <p className="text-sm text-muted-foreground">
                      احصل على تنبيه عند تسجيل الدخول من جهاز جديد
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings?.login_notification_enabled || false}
                    onCheckedChange={(checked) => 
                      handleSecurityUpdate({ login_notification_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">تنبيهات النشاط المشبوه</h4>
                    <p className="text-sm text-muted-foreground">
                      احصل على تنبيه عند اكتشاف نشاط مشبوه في حسابك
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings?.suspicious_activity_alerts || false}
                    onCheckedChange={(checked) => 
                      handleSecurityUpdate({ suspicious_activity_alerts: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">تتبع الأجهزة</h4>
                    <p className="text-sm text-muted-foreground">
                      تتبع الأجهزة المستخدمة لتسجيل الدخول
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings?.device_tracking_enabled || false}
                    onCheckedChange={(checked) => 
                      handleSecurityUpdate({ device_tracking_enabled: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">إعادة المصادقة للعمليات الحساسة</h4>
                    <p className="text-sm text-muted-foreground">
                      يتطلب إعادة إدخال كلمة المرور للعمليات الحساسة
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings?.require_reauth_for_sensitive || false}
                    onCheckedChange={(checked) => 
                      handleSecurityUpdate({ require_reauth_for_sensitive: checked })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                إعدادات الرؤية
              </CardTitle>
              <CardDescription>
                تحكم في من يمكنه رؤية معلوماتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">رؤية الملف الشخصي</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={privacySettings?.profile_visibility === 'public' ? 'default' : 'outline'}
                      onClick={() => handlePrivacyUpdate({ profile_visibility: 'public' })}
                      size="sm"
                    >
                      عام
                    </Button>
                    <Button
                      variant={privacySettings?.profile_visibility === 'organization' ? 'default' : 'outline'}
                      onClick={() => handlePrivacyUpdate({ profile_visibility: 'organization' })}
                      size="sm"
                    >
                      المؤسسة
                    </Button>
                    <Button
                      variant={privacySettings?.profile_visibility === 'private' ? 'default' : 'outline'}
                      onClick={() => handlePrivacyUpdate({ profile_visibility: 'private' })}
                      size="sm"
                    >
                      خاص
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">إظهار البريد الإلكتروني</h4>
                    <p className="text-sm text-muted-foreground">
                      السماح للآخرين برؤية بريدك الإلكتروني
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings?.show_email || false}
                    onCheckedChange={(checked) => 
                      handlePrivacyUpdate({ show_email: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">إظهار رقم الهاتف</h4>
                    <p className="text-sm text-muted-foreground">
                      السماح للآخرين برؤية رقم هاتفك
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings?.show_phone || false}
                    onCheckedChange={(checked) => 
                      handlePrivacyUpdate({ show_phone: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">إظهار آخر نشاط</h4>
                    <p className="text-sm text-muted-foreground">
                      السماح للآخرين برؤية وقت آخر نشاط لك
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings?.show_last_activity || false}
                    onCheckedChange={(checked) => 
                      handlePrivacyUpdate({ show_last_activity: checked })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">إظهار الحالة الحالية</h4>
                    <p className="text-sm text-muted-foreground">
                      السماح للآخرين برؤية حالتك (متصل/غير متصل)
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings?.show_online_status || false}
                    onCheckedChange={(checked) => 
                      handlePrivacyUpdate({ show_online_status: checked })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إعدادات البيانات</CardTitle>
              <CardDescription>
                تحكم في كيفية استخدام بياناتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">السماح بجمع البيانات</h4>
                  <p className="text-sm text-muted-foreground">
                    السماح بجمع البيانات لتحسين الخدمة
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_data_collection || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_data_collection: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">السماح بالتحليلات</h4>
                  <p className="text-sm text-muted-foreground">
                    السماح بتحليل استخدامك لتحسين التطبيق
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_analytics || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_analytics: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">رسائل التسويق</h4>
                  <p className="text-sm text-muted-foreground">
                    تلقي رسائل تسويقية وعروض خاصة
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_marketing_emails || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_marketing_emails: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">تحديثات المنتج</h4>
                  <p className="text-sm text-muted-foreground">
                    تلقي إشعارات حول التحديثات والميزات الجديدة
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_product_updates || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_product_updates: checked })
                  }
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إعدادات التفاعل</CardTitle>
              <CardDescription>
                تحكم في كيفية تفاعل الآخرين معك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">السماح بالتواصل</h4>
                  <p className="text-sm text-muted-foreground">
                    السماح للآخرين بالتواصل معك
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_contact_from_others || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_contact_from_others: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">طلبات الصداقة</h4>
                  <p className="text-sm text-muted-foreground">
                    السماح بتلقي طلبات الصداقة
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_friend_requests || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_friend_requests: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">دعوات المؤسسات</h4>
                  <p className="text-sm text-muted-foreground">
                    السماح بتلقي دعوات للانضمام للمؤسسات
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.allow_organization_invites || false}
                  onCheckedChange={(checked) => 
                    handlePrivacyUpdate({ allow_organization_invites: checked })
                  }
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          {/* زر إنشاء جلسة للاختبار */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                إنشاء جلسة (للاختبار)
              </CardTitle>
              <CardDescription>
                إنشاء جلسة وجهاز موثوق للمستخدم الحالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateSession}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'جاري الإنشاء...' : 'إنشاء جلسة وجهاز'}
              </Button>
            </CardContent>
          </Card>
          
          <ActiveSessionsManager onAlert={addAlert} />
        </TabsContent>

        {/* Trusted Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          {/* زر إنشاء جلسة للاختبار */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                إنشاء جلسة وجهاز (للاختبار)
              </CardTitle>
              <CardDescription>
                إنشاء جلسة وجهاز موثوق للمستخدم الحالي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateSession}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'جاري الإنشاء...' : 'إنشاء جلسة وجهاز'}
              </Button>
            </CardContent>
          </Card>
          
          <TrustedDevicesManager onAlert={addAlert} />
        </TabsContent>

        {/* Security Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                سجل الأنشطة الأمنية
              </CardTitle>
              <CardDescription>
                تتبع جميع الأنشطة المتعلقة بأمان حسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد أنشطة مسجلة
                  </p>
                ) : (
                  securityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="mt-1">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : log.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{log.activity_description || log.activity_type}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRiskLevelColor(log.risk_level)}>
                              {log.risk_level}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                          {log.ip_address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {log.ip_address}
                            </div>
                          )}
                          {log.domain && (
                            <div className="flex items-center gap-2">
                              <Monitor className="h-3 w-3" />
                              {log.subdomain ? `${log.subdomain}.` : ''}{log.domain}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
