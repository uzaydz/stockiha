import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  MapPin, 
  Store, 
  Users, 
  Clock, 
  Target,
  AlertCircle,
  CheckCircle,
  Sliders,
  Calendar,
  TrendingUp,
  Zap,
  Shield,
  Trash2,
  RefreshCw,
  Plus,
  Edit2,
  Activity,
  Timer,
  Star,
  UserCheck,
  Phone,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCallCenterDistribution } from '@/hooks/useCallCenterDistribution';
import { toast } from 'sonner';

const CallCenterDistributionSettings: React.FC = () => {
  const { 
    rules, 
    settings, 
    loading, 
    saving, 
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    updateSettings
  } = useCallCenterDistribution();

  const [success, setSuccess] = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');

  // إحصائيات سريعة
  const stats = [
    {
      title: 'التوزيع التلقائي',
      value: settings?.auto_assignment ? 'مفعل' : 'معطل',
      icon: Zap,
      color: settings?.auto_assignment ? 'text-green-600' : 'text-gray-600'
    },
    {
      title: 'الحد الأقصى للطلبات',
      value: `${settings?.max_orders_per_agent || 10} طلب/وكيل`,
      icon: Target,
      color: 'text-blue-600'
    },
    {
      title: 'ساعات العمل',
      value: `${settings?.working_hours?.start || '09:00'} - ${settings?.working_hours?.end || '17:00'}`,
      icon: Clock,
      color: 'text-purple-600'
    },
    {
      title: 'العمل في نهاية الأسبوع',
      value: settings?.weekend_enabled ? 'مفعل' : 'معطل',
      icon: Shield,
      color: settings?.weekend_enabled ? 'text-green-600' : 'text-gray-600'
    }
  ];

  const handleSaveSettings = async (newSettings: any) => {
    const success = await updateSettings(newSettings);
    if (success) {
      setSuccess('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    await toggleRule(ruleId);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
      await deleteRule(ruleId);
    }
  };

  const AddRuleDialog = () => {
    const [newRule, setNewRule] = useState({
      name: '',
      description: '',
      rule_type: 'region' as any,
      priority_order: 1,
      is_active: true,
      conditions: {},
      actions: {}
    });

    const handleSubmit = async () => {
      if (!newRule.name.trim()) {
        toast.error('يرجى إدخال اسم القاعدة');
        return;
      }

      const success = await createRule(newRule);
      if (success) {
        setShowAddRule(false);
        setNewRule({
          name: '',
          description: '',
          rule_type: 'region',
          priority_order: 1,
          is_active: true,
          conditions: {},
          actions: {}
        });
      }
    };

    return (
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة قاعدة توزيع جديدة</DialogTitle>
            <DialogDescription>
              إنشاء قاعدة جديدة لتوزيع الطلبات على وكلاء مركز الاتصالات
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* معلومات أساسية */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">اسم القاعدة</Label>
                <Input
                  id="rule-name"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثل: توزيع حسب المنطقة"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-type">نوع القاعدة</Label>
                <Select value={newRule.rule_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="region">حسب المنطقة الجغرافية</SelectItem>
                    <SelectItem value="workload">حسب عبء العمل</SelectItem>
                    <SelectItem value="performance">حسب الأداء</SelectItem>
                    <SelectItem value="availability">حسب التوفر</SelectItem>
                    <SelectItem value="order_value">حسب قيمة الطلب</SelectItem>
                    <SelectItem value="time_based">حسب الوقت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">الوصف (اختياري)</Label>
              <Input
                id="rule-description"
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف مختصر للقاعدة"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-priority">ترتيب الأولوية</Label>
                <Input
                  id="rule-priority"
                  type="number"
                  min="1"
                  value={newRule.priority_order}
                  onChange={(e) => setNewRule(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="rule-active"
                  checked={newRule.is_active}
                  onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="rule-active">قاعدة نشطة</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddRule(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'إضافة القاعدة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">خطأ في تحميل الإعدادات</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* إشعار النجاح */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="rules">قواعد التوزيع</TabsTrigger>
          <TabsTrigger value="priority">إعدادات الأولوية</TabsTrigger>
          <TabsTrigger value="escalation">التصعيد والإنذار</TabsTrigger>
        </TabsList>

        {/* الإعدادات العامة */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                الإعدادات الأساسية
              </CardTitle>
              <CardDescription>
                إعدادات عامة لنظام توزيع الطلبات على مركز الاتصالات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* التوزيع التلقائي */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">التوزيع التلقائي</Label>
                  <p className="text-sm text-muted-foreground">
                    تفعيل التوزيع التلقائي للطلبات الجديدة على الوكلاء المتاحين
                  </p>
                </div>
                <Switch
                  checked={settings?.auto_assignment || false}
                  onCheckedChange={(checked) => handleSaveSettings({ auto_assignment: checked })}
                />
              </div>

              <Separator />

              {/* الحد الأقصى للطلبات */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">الحد الأقصى للطلبات لكل وكيل</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings?.max_orders_per_agent || 10} طلب
                  </span>
                </div>
                <Slider
                  value={[settings?.max_orders_per_agent || 10]}
                  onValueChange={([value]) => handleSaveSettings({ max_orders_per_agent: value })}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* ساعات العمل */}
              <div className="space-y-4">
                <Label className="text-base">ساعات العمل</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">وقت البداية</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={settings?.working_hours?.start || '09:00'}
                      onChange={(e) => handleSaveSettings({
                        working_hours: {
                          ...settings?.working_hours,
                          start: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">وقت النهاية</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={settings?.working_hours?.end || '17:00'}
                      onChange={(e) => handleSaveSettings({
                        working_hours: {
                          ...settings?.working_hours,
                          end: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* العمل في نهاية الأسبوع */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">العمل في نهاية الأسبوع</Label>
                  <p className="text-sm text-muted-foreground">
                    السماح بتوزيع الطلبات في أيام الجمعة والسبت
                  </p>
                </div>
                <Switch
                  checked={settings?.weekend_enabled || false}
                  onCheckedChange={(checked) => handleSaveSettings({ weekend_enabled: checked })}
                />
              </div>

              <Separator />

              {/* إعدادات المكالمات */}
              <div className="space-y-4">
                <Label className="text-base">إعدادات المحاولات</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">الحد الأقصى للمحاولات</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      min="1"
                      max="10"
                      value={settings?.max_retry_attempts || 3}
                      onChange={(e) => handleSaveSettings({ max_retry_attempts: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retry-interval">الفاصل الزمني بين المحاولات (دقيقة)</Label>
                    <Input
                      id="retry-interval"
                      type="number"
                      min="5"
                      max="120"
                      value={settings?.call_retry_interval || 30}
                      onChange={(e) => handleSaveSettings({ call_retry_interval: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* قواعد التوزيع */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    قواعد التوزيع
                  </CardTitle>
                  <CardDescription>
                    إدارة قواعد توزيع الطلبات على الوكلاء
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة قاعدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد قواعد توزيع محددة</p>
                  <p className="text-sm">قم بإضافة قاعدة جديدة لبدء التوزيع التلقائي</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? 'نشطة' : 'معطلة'}
                          </Badge>
                          <h3 className="font-medium">{rule.name}</h3>
                          <Badge variant="outline">
                            {rule.rule_type === 'region' && 'منطقة جغرافية'}
                            {rule.rule_type === 'workload' && 'عبء العمل'}
                            {rule.rule_type === 'performance' && 'الأداء'}
                            {rule.rule_type === 'availability' && 'التوفر'}
                            {rule.rule_type === 'order_value' && 'قيمة الطلب'}
                            {rule.rule_type === 'time_based' && 'زمني'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRule(rule.id)}
                          >
                            {rule.is_active ? 'إيقاف' : 'تفعيل'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>الأولوية: {rule.priority_order}</span>
                        <span className="mx-2">•</span>
                        <span>استخدمت {rule.usage_count} مرة</span>
                        <span className="mx-2">•</span>
                        <span>معدل النجاح: {rule.success_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* إعدادات الأولوية */}
        <TabsContent value="priority" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                إعدادات الأولوية
              </CardTitle>
              <CardDescription>
                تحديد معايير أولوية الطلبات والوكلاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* حد القيمة العالية */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">حد الطلبات عالية القيمة</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings?.priority_rules?.high_value_threshold || 1000} ريال
                  </span>
                </div>
                <Slider
                  value={[settings?.priority_rules?.high_value_threshold || 1000]}
                  onValueChange={([value]) => handleSaveSettings({
                    priority_rules: {
                      ...settings?.priority_rules,
                      high_value_threshold: value
                    }
                  })}
                  max={10000}
                  min={100}
                  step={100}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* أولوية العملاء المهمين */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">أولوية العملاء المهمين (VIP)</Label>
                  <p className="text-sm text-muted-foreground">
                    إعطاء أولوية أعلى لطلبات العملاء المهمين
                  </p>
                </div>
                <Switch
                  checked={settings?.priority_rules?.vip_customer_priority || false}
                  onCheckedChange={(checked) => handleSaveSettings({
                    priority_rules: {
                      ...settings?.priority_rules,
                      vip_customer_priority: checked
                    }
                  })}
                />
              </div>

              <Separator />

              {/* أولوية الطلبات العاجلة */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">أولوية الطلبات العاجلة</Label>
                  <p className="text-sm text-muted-foreground">
                    إعطاء أولوية أعلى للطلبات المعلمة كعاجلة
                  </p>
                </div>
                <Switch
                  checked={settings?.priority_rules?.urgent_order_priority || false}
                  onCheckedChange={(checked) => handleSaveSettings({
                    priority_rules: {
                      ...settings?.priority_rules,
                      urgent_order_priority: checked
                    }
                  })}
                />
              </div>

              <Separator />

              {/* أوزان الأداء */}
              <div className="space-y-4">
                <Label className="text-base">أوزان تقييم الوكلاء</Label>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>التوفر</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((settings?.performance_weights?.availability || 0.3) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(settings?.performance_weights?.availability || 0.3) * 100]}
                      onValueChange={([value]) => handleSaveSettings({
                        performance_weights: {
                          ...settings?.performance_weights,
                          availability: value / 100
                        }
                      })}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>معدل النجاح</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((settings?.performance_weights?.success_rate || 0.4) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(settings?.performance_weights?.success_rate || 0.4) * 100]}
                      onValueChange={([value]) => handleSaveSettings({
                        performance_weights: {
                          ...settings?.performance_weights,
                          success_rate: value / 100
                        }
                      })}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>رضا العملاء</Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((settings?.performance_weights?.customer_satisfaction || 0.3) * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[(settings?.performance_weights?.customer_satisfaction || 0.3) * 100]}
                      onValueChange={([value]) => handleSaveSettings({
                        performance_weights: {
                          ...settings?.performance_weights,
                          customer_satisfaction: value / 100
                        }
                      })}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* التصعيد والإنذار */}
        <TabsContent value="escalation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                إعدادات التصعيد والإنذار
              </CardTitle>
              <CardDescription>
                تحديد متى وكيف يتم تصعيد المشاكل أو إرسال الإنذارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* تصعيد عدم الرد */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">تصعيد بعد عدم الرد</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings?.escalation_rules?.no_answer_escalate_after || 2} محاولة
                  </span>
                </div>
                <Slider
                  value={[settings?.escalation_rules?.no_answer_escalate_after || 2]}
                  onValueChange={([value]) => handleSaveSettings({
                    escalation_rules: {
                      ...settings?.escalation_rules,
                      no_answer_escalate_after: value
                    }
                  })}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* تصعيد فشل المكالمة */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">تصعيد بعد فشل المكالمة</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings?.escalation_rules?.failed_call_escalate_after || 3} محاولة
                  </span>
                </div>
                <Slider
                  value={[settings?.escalation_rules?.failed_call_escalate_after || 3]}
                  onValueChange={([value]) => handleSaveSettings({
                    escalation_rules: {
                      ...settings?.escalation_rules,
                      failed_call_escalate_after: value
                    }
                  })}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* تصعيد للمشرف */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">التصعيد التلقائي للمشرف</Label>
                  <p className="text-sm text-muted-foreground">
                    تصعيد الحالات المعقدة تلقائياً للمشرف
                  </p>
                </div>
                <Switch
                  checked={settings?.escalation_rules?.escalate_to_supervisor || false}
                  onCheckedChange={(checked) => handleSaveSettings({
                    escalation_rules: {
                      ...settings?.escalation_rules,
                      escalate_to_supervisor: checked
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* أزرار الحفظ والإعادة تعيين */}
      <div className="flex items-center justify-end space-x-4">
        <Button variant="outline" disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          إعادة تعيين
        </Button>
        <Button disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
        </Button>
      </div>

      {/* حوار إضافة قاعدة */}
      <AddRuleDialog />
    </div>
  );
};

export default CallCenterDistributionSettings;
