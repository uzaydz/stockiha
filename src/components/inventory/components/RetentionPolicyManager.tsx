import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Clock, 
  Database, 
  AlertTriangle, 
  Calendar,
  Download,
  Trash2,
  Settings as SettingsIcon,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw,
  Archive,
  HardDrive,
  Users,
  BarChart3
} from 'lucide-react';

import { useTenant } from '@/context/TenantContext';
import { fetchRetentionStats, exportInventoryLogs, type RetentionStatsData } from '@/lib/api/retention-stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// أنواع البيانات الأخرى

interface RetentionSettings {
  normal_retention_days: number;
  important_retention_days: number;
  critical_retention_days: number;
  auto_cleanup_enabled: boolean;
}

export const RetentionPolicyManager: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [statsData, setStatsData] = useState<RetentionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [settings, setSettings] = useState<RetentionSettings>({
    normal_retention_days: 180,
    important_retention_days: 365,
    critical_retention_days: 1095,
    auto_cleanup_enabled: true
  });

  // تحميل الإحصائيات
  const fetchStats = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchRetentionStats(currentOrganization.id);
      setStatsData(data);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تغيير المؤسسة
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchStats();
    }
  }, [currentOrganization?.id]);

  // حساب الإحصائيات المشتقة
  const derivedStats = React.useMemo(() => {
    if (!statsData) return null;

    const totalEligibleForDeletion = 
      statsData.records_eligible_for_deletion.normal_180_days +
      statsData.records_eligible_for_deletion.important_365_days +
      statsData.records_eligible_for_deletion.critical_1095_days;

    const retentionRate = statsData.total_records > 0 
      ? ((statsData.total_records - totalEligibleForDeletion) / statsData.total_records) * 100 
      : 0;

    const normalRecords = statsData.total_records - statsData.critical_records - statsData.important_records;

    return {
      totalEligibleForDeletion,
      retentionRate,
      normalRecords,
      spaceSavingPotential: statsData.disk_usage_estimate.archive_potential_mb
    };
  }, [statsData]);

  // تحميل البيانات (تنزيل CSV)
  const downloadData = async (type: 'eligible' | 'all') => {
    try {
      setCleanupLoading(true);
      
      // جلب البيانات من Supabase مباشرة
      const data = await exportInventoryLogs(currentOrganization!.id, type);
      
      // تحويل إلى CSV
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const csvContent = [
          headers,
          ...data.map(row => Object.values(row).map(value => 
            typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          ).join(','))
        ].join('\n');
        
        // تحميل الملف
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-logs-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError('فشل في تحميل البيانات للتصدير');
    } finally {
      setCleanupLoading(false);
    }
  };

  // تنظيف البيانات (dry run أو فعلي)
  const runCleanup = async (dryRun: boolean = true) => {
    try {
      setCleanupLoading(true);
      const response = await fetch('/api/inventory/cleanup-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId: currentOrganization!.id,
          dry_run: dryRun,
          settings
        })
      });
      
      const result = await response.json();
      
      if (result.success && !dryRun) {
        await fetchStats(); // إعادة تحميل الإحصائيات
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setCleanupLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>جاري تحميل سياسة الاحتفاظ...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>خطأ في التحميل</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            إعادة المحاولة
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!statsData || !derivedStats) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>لا توجد بيانات</AlertTitle>
        <AlertDescription>
          لم يتم العثور على سجلات مخزون لهذه المؤسسة
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ملاحظة مهمة حول السياسة */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>سياسة الاحتفاظ بسجلات المخزون</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-semibold text-blue-900 dark:text-blue-100">السجلات العادية</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  تُحذف بعد <Badge variant="outline">180 يوم</Badge>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  مبيعات صغيرة (&lt;25 قطعة)، تعديلات بسيطة
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="font-semibold text-orange-900 dark:text-orange-100">السجلات المهمة</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  تُحذف بعد <Badge variant="outline">365 يوم</Badge>
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  مبيعات متوسطة (25-99 قطعة)، تحويلات
                </p>
              </div>
              
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="font-semibold text-red-900 dark:text-red-100">السجلات الحرجة</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  تُحذف بعد <Badge variant="outline">1095 يوم</Badge>
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  مشتريات، إرجاع، سرقة، خسارة (≥100 قطعة)
                </p>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">
                ⚠️ <strong>تحذير مهم:</strong> يتم أرشفة السجلات قبل الحذف. يمكنك تحميلها لحفظها خارج النظام.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            إدارة التنظيف
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        {/* تبويب النظرة العامة */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* إجمالي السجلات */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.total_records.toLocaleString('ar-SA')}</div>
                <p className="text-xs text-muted-foreground">
                  آخر تحديث: {new Date(statsData.last_updated).toLocaleDateString('ar-SA')}
                </p>
              </CardContent>
            </Card>

            {/* معرض للحذف */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معرض للحذف</CardTitle>
                <Trash2 className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {derivedStats.totalEligibleForDeletion.toLocaleString('ar-SA')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((derivedStats.totalEligibleForDeletion / statsData.total_records) * 100).toFixed(1)}% من المجموع
                </p>
              </CardContent>
            </Card>

            {/* نسبة الاحتفاظ */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">نسبة الاحتفاظ</CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {derivedStats.retentionRate.toFixed(1)}%
                </div>
                <Progress value={derivedStats.retentionRate} className="mt-2" />
              </CardContent>
            </Card>

            {/* توفير المساحة */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">توفير المساحة</CardTitle>
                <HardDrive className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {derivedStats.spaceSavingPotential} MB
                </div>
                <p className="text-xs text-muted-foreground">
                  مساحة قابلة للتوفير
                </p>
              </CardContent>
            </Card>
          </div>

          {/* تفصيل السجلات */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* تصنيف السجلات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  تصنيف السجلات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">عادية</span>
                    <Badge variant="secondary">{derivedStats.normalRecords.toLocaleString('ar-SA')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">مهمة</span>
                    <Badge variant="default">{statsData.important_records.toLocaleString('ar-SA')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">حرجة</span>
                    <Badge variant="destructive">{statsData.critical_records.toLocaleString('ar-SA')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* السجلات حسب المدة */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  توزيع السجلات حسب المدة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">آخر 30 يوم</span>
                    <Badge variant="outline">{statsData.records_last_30_days.toLocaleString('ar-SA')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">آخر 60 يوم</span>
                    <Badge variant="outline">{statsData.records_last_60_days.toLocaleString('ar-SA')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">آخر 90 يوم</span>
                    <Badge variant="outline">{statsData.records_last_90_days.toLocaleString('ar-SA')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">أكثر من سنة</span>
                    <Badge variant="secondary">{statsData.records_older_than_year.toLocaleString('ar-SA')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب إدارة التنظيف */}
        <TabsContent value="cleanup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* معاينة التنظيف */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  معاينة التنظيف
                </CardTitle>
                <CardDescription>
                  السجلات التي ستتم إزالتها حسب السياسة الحالية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">السجلات العادية</p>
                      <p className="text-xs text-muted-foreground">أقدم من 180 يوم</p>
                    </div>
                    <Badge variant="outline">
                      {statsData.records_eligible_for_deletion.normal_180_days.toLocaleString('ar-SA')}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">السجلات المهمة</p>
                      <p className="text-xs text-muted-foreground">أقدم من 365 يوم</p>
                    </div>
                    <Badge variant="outline">
                      {statsData.records_eligible_for_deletion.important_365_days.toLocaleString('ar-SA')}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">السجلات الحرجة</p>
                      <p className="text-xs text-muted-foreground">أقدم من 1095 يوم</p>
                    </div>
                    <Badge variant="outline">
                      {statsData.records_eligible_for_deletion.critical_1095_days.toLocaleString('ar-SA')}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center font-semibold">
                  <span>المجموع</span>
                  <Badge variant="destructive">
                    {derivedStats.totalEligibleForDeletion.toLocaleString('ar-SA')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* إجراءات التنظيف */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  إجراءات التنظيف
                </CardTitle>
                <CardDescription>
                  تحميل البيانات أو تنفيذ التنظيف
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* تحميل البيانات */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">تحميل البيانات</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadData('eligible')}
                        disabled={cleanupLoading}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        السجلات المعرضة للحذف
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadData('all')}
                        disabled={cleanupLoading}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        جميع السجلات
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* تنفيذ التنظيف */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">تنفيذ التنظيف</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => runCleanup(true)}
                        disabled={cleanupLoading}
                        className="w-full"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        معاينة التنظيف (Dry Run)
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => runCleanup(false)}
                        disabled={cleanupLoading || derivedStats.totalEligibleForDeletion === 0}
                        className="w-full"
                      >
                        {cleanupLoading ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        {cleanupLoading ? 'جاري التنظيف...' : 'تنفيذ التنظيف النهائي'}
                      </Button>
                    </div>
                  </div>

                  {derivedStats.totalEligibleForDeletion === 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        لا توجد سجلات معرضة للحذف في الوقت الحالي
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب الإعدادات */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                إعدادات الاحتفاظ
              </CardTitle>
              <CardDescription>
                تخصيص مدد الاحتفاظ لكل نوع من السجلات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="normal-days">السجلات العادية (أيام)</Label>
                  <Input
                    id="normal-days"
                    type="number"
                    value={settings.normal_retention_days}
                    onChange={(e) => setSettings({...settings, normal_retention_days: parseInt(e.target.value)})}
                    min="30"
                    max="365"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="important-days">السجلات المهمة (أيام)</Label>
                  <Input
                    id="important-days"
                    type="number"
                    value={settings.important_retention_days}
                    onChange={(e) => setSettings({...settings, important_retention_days: parseInt(e.target.value)})}
                    min="180"
                    max="730"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="critical-days">السجلات الحرجة (أيام)</Label>
                  <Input
                    id="critical-days"
                    type="number"
                    value={settings.critical_retention_days}
                    onChange={(e) => setSettings({...settings, critical_retention_days: parseInt(e.target.value)})}
                    min="365"
                    max="2190"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Switch
                  id="auto-cleanup"
                  checked={settings.auto_cleanup_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, auto_cleanup_enabled: checked})}
                />
                <Label htmlFor="auto-cleanup" className="text-sm">
                  تفعيل التنظيف التلقائي
                </Label>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  هذه الإعدادات تؤثر على السياسات المستقبلية فقط. السجلات الموجودة حالياً تتبع السياسة الافتراضية.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
