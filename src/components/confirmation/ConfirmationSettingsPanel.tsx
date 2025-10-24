import { useEffect, useState } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { ConfirmationOrganizationSettings } from '@/types/confirmation';

type SettingsDraft = Omit<ConfirmationOrganizationSettings, 'organization_id' | 'created_at' | 'updated_at'>;

const defaultSettings: SettingsDraft = {
  auto_assignment_enabled: true,
  default_strategy: 'fair_rotation',
  escalation_minutes: 45,
  queue_rebalancing_minutes: 15,
  auto_assignment_windows: {
    weekdays: ['sat', 'sun', 'mon', 'tue', 'wed'],
    hours: { start: '09:00', end: '19:00' },
  },
  segmentation_defaults: {
    product: [],
    priority: ['vip', 'normal'],
    regions: [],
  },
  compensation_defaults: {
    mode: 'monthly',
    monthly_amount: 45000,
    per_order_amount: 200,
  },
  reminders_settings: {
    pending_followups: true,
    bonus_alerts: true,
    queue_threshold: 10,
  },
};

export const ConfirmationSettingsPanel = () => {
  const { organizationSettings, saveOrganizationSettings, missingSchema } = useConfirmation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<SettingsDraft>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (organizationSettings) {
      const { organization_id, created_at, updated_at, ...rest } = organizationSettings;
      setDraft(rest);
    }
  }, [organizationSettings]);

  const toggleWeekday = (day: string) => {
    setDraft((prev) => {
      const current = new Set(prev.auto_assignment_windows.weekdays);
      if (current.has(day)) {
        current.delete(day);
      } else {
        current.add(day);
      }
      return {
        ...prev,
        auto_assignment_windows: {
          ...prev.auto_assignment_windows,
          weekdays: Array.from(current),
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveOrganizationSettings(draft);
    setIsSaving(false);
    if (result) {
      toast({
        title: 'تم حفظ إعدادات نظام التأكيد',
        description: 'سيتم تطبيق التغييرات على جميع الطلبيات الجديدة والتوزيع الآلي.',
      });
    }
  };

  if (missingSchema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>يتعذر تحميل الإعدادات</AlertTitle>
        <AlertDescription>قم بتهيئة جداول نظام التأكيد أولاً.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">إعدادات نظام تأكيد الطلبات</h2>
        <p className="text-sm text-muted-foreground">تحكم في سلوك التوزيع، قواعد الطابور، الإشعارات، وخيارات الدفع الافتراضية.</p>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>التوزيع الآلي والطابور</CardTitle>
          <CardDescription>تفعيل التوزيع العادل وضبط أوقات إعادة التوازن وقواعد التصعيد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={draft.auto_assignment_enabled}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, auto_assignment_enabled: checked }))}
            />
            <div>
              <div className="text-sm font-medium text-foreground">تفعيل التوزيع الآلي</div>
              <div className="text-xs text-muted-foreground">عند الاستلام يقوم النظام بإسناد الطلب للموظف الأنسب تلقائياً.</div>
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الاستراتيجية الافتراضية</label>
              <select
                className="border border-border/50 rounded-md px-3 py-2 text-sm bg-transparent"
                value={draft.default_strategy}
                onChange={(event) => setDraft((prev) => ({ ...prev, default_strategy: event.target.value as SettingsDraft['default_strategy'] }))}
              >
                <option value="fair_rotation">الطابور العادل</option>
                <option value="product">حسب المنتج</option>
                <option value="priority">حسب الأولوية</option>
                <option value="region">حسب المنطقة</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تصعيد بعد (دقيقة)</label>
                <Input
                  type="number"
                  min={10}
                  value={draft.escalation_minutes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, escalation_minutes: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">إعادة توازن الطابور (دقيقة)</label>
                <Input
                  type="number"
                  min={5}
                  value={draft.queue_rebalancing_minutes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, queue_rebalancing_minutes: Number(event.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">أيام العمل المفضلة</label>
            <div className="flex flex-wrap gap-2">
              {['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'].map((day) => (
                <Badge
                  key={day}
                  variant={draft.auto_assignment_windows.weekdays.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleWeekday(day)}
                >
                  {{
                    sat: 'السبت',
                    sun: 'الأحد',
                    mon: 'الإثنين',
                    tue: 'الثلاثاء',
                    wed: 'الأربعاء',
                    thu: 'الخميس',
                    fri: 'الجمعة',
                  }[day]}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">وقت البداية</label>
              <Input
                type="time"
                value={draft.auto_assignment_windows.hours.start}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    auto_assignment_windows: {
                      ...prev.auto_assignment_windows,
                      hours: {
                        ...prev.auto_assignment_windows.hours,
                        start: event.target.value,
                      },
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">وقت النهاية</label>
              <Input
                type="time"
                value={draft.auto_assignment_windows.hours.end}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    auto_assignment_windows: {
                      ...prev.auto_assignment_windows,
                      hours: {
                        ...prev.auto_assignment_windows.hours,
                        end: event.target.value,
                      },
                    },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>التهيئة الافتراضية</CardTitle>
          <CardDescription>اختر كيفية تقسيم الطلبات ومقدار الأجر الافتراضي عند إضافة موظف جديد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">تصنيف المنتجات</label>
              <Textarea
                rows={3}
                value={(draft.segmentation_defaults.product || []).join(', ')}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    segmentation_defaults: {
                      ...prev.segmentation_defaults,
                      product: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                    },
                  }))
                }
                placeholder="أجهزة، اكسسوارات، خدمات..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الأولويات</label>
              <Textarea
                rows={3}
                value={(draft.segmentation_defaults.priority || []).join(', ')}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    segmentation_defaults: {
                      ...prev.segmentation_defaults,
                      priority: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                    },
                  }))
                }
                placeholder="VIP, NORMAL, LOW"
              />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">نظام الأجر الافتراضي</label>
              <select
                className="border border-border/50 rounded-md px-3 py-2 text-sm bg-transparent"
                value={draft.compensation_defaults.mode}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    compensation_defaults: {
                      ...prev.compensation_defaults,
                      mode: event.target.value as SettingsDraft['compensation_defaults']['mode'],
                    },
                  }))
                }
              >
                <option value="monthly">راتب شهري</option>
                <option value="per_order">لكل طلب</option>
                <option value="hybrid">مركب</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">المبلغ الشهري</label>
              <Input
                type="number"
                min={0}
                value={draft.compensation_defaults.monthly_amount ?? 0}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    compensation_defaults: {
                      ...prev.compensation_defaults,
                      monthly_amount: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">أجر الطلب المؤكد</label>
              <Input
                type="number"
                min={0}
                value={draft.compensation_defaults.per_order_amount ?? 0}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    compensation_defaults: {
                      ...prev.compensation_defaults,
                      per_order_amount: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>التنبيهات والمكافآت</CardTitle>
          <CardDescription>أدوات تساعد الموظفين على الالتزام بالمتابعة اليومية وتحفز الإنجاز.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={draft.reminders_settings.pending_followups}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  reminders_settings: {
                    ...prev.reminders_settings,
                    pending_followups: checked,
                  },
                }))
              }
            />
            <div>
              <div className="text-sm font-medium text-foreground">تذكير بالمتابعة للطلبات المعلقة</div>
              <div className="text-xs text-muted-foreground">يصل تنبيه إذا لم يتم تأكيد الطلب خلال 45 دقيقة.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={draft.reminders_settings.bonus_alerts}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  reminders_settings: {
                    ...prev.reminders_settings,
                    bonus_alerts: checked,
                  },
                }))
              }
            />
            <div>
              <div className="text-sm font-medium text-foreground">تنبيه بلوغ مرحلة المكافأة</div>
              <div className="text-xs text-muted-foreground">عندما يصل الموظف للحد المطلوب يحصل على تنبيه للمكافأة.</div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">حد الطابور قبل التنبيه</label>
            <Input
              type="number"
              min={1}
              value={draft.reminders_settings.queue_threshold}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  reminders_settings: {
                    ...prev.reminders_settings,
                    queue_threshold: Number(event.target.value),
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationSettingsPanel;
