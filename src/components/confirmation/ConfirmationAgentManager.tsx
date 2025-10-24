import { useMemo, useState } from 'react';
import { useConfirmationAgents } from '@/hooks/useConfirmationAgents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  ShieldCheck,
  Phone,
  Mail,
  Settings2,
  Pause,
  Play,
  Loader2,
  Search,
} from 'lucide-react';
import type { ConfirmationAgent, ConfirmationCompensationMode } from '@/types/confirmation';

interface AgentFormState {
  full_name: string;
  email?: string;
  phone?: string;
  password: string;
  compensation_mode: ConfirmationCompensationMode;
  monthly_amount?: number;
  per_order_amount?: number;
  access_scope: ConfirmationAgent['access_scope'];
  notes?: string;
}

const defaultFormState: AgentFormState = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  compensation_mode: 'monthly',
  monthly_amount: 0,
  per_order_amount: 0,
  access_scope: ['orders_v2', 'orders_mobile', 'blocked_customers', 'abandoned_orders'],
  notes: '',
};

const statusBadge: Record<ConfirmationAgent['status'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'نشط', variant: 'default' },
  paused: { label: 'متوقف مؤقتاً', variant: 'secondary' },
  inactive: { label: 'غير نشط', variant: 'outline' },
  invited: { label: 'بانتظار الانضمام', variant: 'secondary' },
  archived: { label: 'مؤرشف', variant: 'outline' },
};

export const ConfirmationAgentManager = () => {
  const { agents, totals, createAgent, toggleAgentStatus, loading, refreshing, missingSchema, error } = useConfirmationAgents();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'invited'>('all');
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<AgentFormState>(defaultFormState);
  const [showPassword, setShowPassword] = useState(false);

  const filteredAgents = useMemo(() => {
    let filtered = [...agents];
    if (activeTab !== 'all') {
      filtered = filtered.filter((agent) => agent.status === activeTab);
    }
    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.full_name.toLowerCase().includes(searchTerm) ||
          (agent.email && agent.email.toLowerCase().includes(searchTerm)) ||
          (agent.phone && agent.phone.includes(searchTerm)),
      );
    }
    return filtered;
  }, [agents, activeTab, search]);

  const handleToggleStatus = async (agent: ConfirmationAgent) => {
    const nextStatus = agent.status === 'active' ? 'paused' : 'active';
    await toggleAgentStatus(agent.id, nextStatus);
    toast({
      title: 'تم تحديث حالة الموظف',
      description: `${agent.full_name} الآن في حالة ${statusBadge[nextStatus].label}`,
    });
  };

  const handleOpenAddDialog = () => {
    setFormState(defaultFormState);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formState.full_name.trim()) {
      toast({
        title: 'يرجى كتابة اسم الموظف',
        variant: 'destructive',
      });
      return;
    }
    if (!formState.email?.trim()) {
      toast({
        title: 'يرجى إدخال البريد الإلكتروني',
        variant: 'destructive',
      });
      return;
    }
    if (formState.password.trim().length < 6) {
      toast({
        title: 'كلمة المرور قصيرة جداً',
        description: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    const result = await createAgent({
      full_name: formState.full_name,
      email: formState.email,
      phone: formState.phone,
      access_scope: formState.access_scope,
      compensation_mode: formState.compensation_mode,
      compensation_settings: {
        currency: 'DZD',
        monthly_amount: formState.monthly_amount ?? 0,
        per_order_amount: formState.per_order_amount ?? 0,
        payment_cycle: formState.compensation_mode === 'per_order' ? 'per_order' : 'monthly',
      },
      notes: formState.notes,
      password: formState.password,
    });
    setIsSubmitting(false);
    if (result?.agent) {
      toast({
        title: 'تم إضافة موظف تأكيد',
        description: result.authFallback
          ? 'تم إنشاء الموظف، لكن يجب تفعيل حسابه أو تعيين كلمة مرور عبر لوحة Supabase Auth.'
          : 'تم إنشاء الحساب ويمكن للموظف تسجيل الدخول باستخدام البريد وكلمة المرور المحددين.',
      });
      setFormState(defaultFormState);
      setShowPassword(false);
      setIsAddDialogOpen(false);
    } else {
      toast({
        title: 'تعذر إنشاء الموظف',
        description: 'حدث خطأ أثناء إنشاء الحساب. حاول مجدداً أو تحقق من الاتصال.',
        variant: 'destructive',
      });
    }
  };

  if (missingSchema) {
    return (
      <Alert variant="destructive" className="border border-destructive/40">
        <AlertTitle>نظام التأكيد غير مهيأ</AlertTitle>
        <AlertDescription>
          يرجى تنفيذ الملف <code className="font-mono text-xs">supabase/confirmation_system.sql</code> ثم إعادة تحميل الصفحة لتفعيل إدارة موظفي
          التأكيد.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">فريق تأكيد الطلبات</h2>
          <p className="text-sm text-muted-foreground">إدارة حسابات الموظفين، توزيع الصلاحيات، وتتبع الأداء اليومي.</p>
        </div>
        <Button onClick={handleOpenAddDialog} className="gap-2">
          <UserPlus className="w-4 h-4" />
          موظف تأكيد جديد
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>حدث خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">إجمالي الفريق</div>
            <div className="text-2xl font-semibold text-foreground">{totals.total}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">نشط</div>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{totals.active}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">متوقف مؤقتاً</div>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{totals.paused}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">بانتظار الانضمام</div>
            <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{totals.invited}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg">قائمة الموظفين</CardTitle>
            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="md:ml-auto">
                <TabsList>
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="active">نشط</TabsTrigger>
                  <TabsTrigger value="paused">متوقف</TabsTrigger>
                  <TabsTrigger value="invited">بانتظار</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>التواصل</TableHead>
                  <TableHead>الوصول</TableHead>
                  <TableHead>نظام الأجر</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري تحميل بيانات الموظفين...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="text-center py-10 text-muted-foreground">
                        لا يوجد موظفون مطابقون للبحث أو الفلتر الحالي.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarFallback>{agent.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-foreground">{agent.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              آخر نشاط: {agent.last_active_at ? new Date(agent.last_active_at).toLocaleString('ar-DZ') : 'لم يسجل الدخول بعد'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {agent.phone && (
                            <div className="inline-flex items-center gap-2 text-sm">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{agent.phone}</span>
                            </div>
                          )}
                          {agent.email && (
                            <div className="inline-flex items-center gap-2 text-sm">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{agent.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {agent.access_scope.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope === 'orders_v2' && 'طلبـات متقدمة'}
                              {scope === 'orders_mobile' && 'تطبيق الهاتف'}
                              {scope === 'blocked_customers' && 'قائمة الحظر'}
                              {scope === 'abandoned_orders' && 'الطلبات المتروكة'}
                              {scope === 'analytics' && 'التحليلات'}
                              {scope === 'settings' && 'إعدادات شخصية'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {agent.compensation_mode === 'monthly' && (
                            <>
                              <div className="font-medium text-foreground">راتب شهري</div>
                              <div className="text-xs text-muted-foreground">
                                {agent.compensation_settings?.monthly_amount?.toLocaleString('ar-DZ')} د.ج / شهر
                              </div>
                            </>
                          )}
                          {agent.compensation_mode === 'per_order' && (
                            <>
                              <div className="font-medium text-foreground">أجر لكل طلب</div>
                              <div className="text-xs text-muted-foreground">
                                {agent.compensation_settings?.per_order_amount?.toLocaleString('ar-DZ')} د.ج / طلب مؤكد
                              </div>
                            </>
                          )}
                          {agent.compensation_mode === 'hybrid' && (
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">نظام مركب</div>
                              <div className="text-xs text-muted-foreground">
                                أساسي: {agent.compensation_settings?.monthly_amount?.toLocaleString('ar-DZ')} د.ج
                              </div>
                              <div className="text-xs text-muted-foreground">
                                لكل طلب: {agent.compensation_settings?.per_order_amount?.toLocaleString('ar-DZ')} د.ج
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusBadge[agent.status].variant}>{statusBadge[agent.status].label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleToggleStatus(agent)}
                            disabled={refreshing}
                          >
                            {agent.status === 'active' ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                إيقاف مؤقت
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                تفعيل
                              </>
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Settings2 className="w-3.5 h-3.5" />
                            إدارة
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setFormState(defaultFormState);
            setShowPassword(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              إنشاء حساب موظف تأكيد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <Input
                placeholder="الاسم الكامل"
                value={formState.full_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, full_name: event.target.value }))}
              />
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  placeholder="البريد الإلكتروني"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                />
                <Input
                  placeholder="رقم الهاتف"
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">كلمة المرور المبدئية</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة مرور قوية"
                    value={formState.password}
                    onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'إخفاء' : 'إظهار'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789@#$%!';
                    let generated = '';
                    for (let i = 0; i < 12; i += 1) {
                      generated += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                    }
                    setFormState((prev) => ({ ...prev, password: generated }));
                    setShowPassword(true);
                  }}
                >
                  توليد كلمة مرور قوية
                </Button>
                <p className="text-xs text-muted-foreground">
                  سيستخدم الموظف هذا البريد وهذه الكلمة لتسجيل الدخول لأول مرة.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">نظام الوصول</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'orders_v2', label: 'لوحة الطلبات' },
                  { value: 'orders_mobile', label: 'تطبيق الهاتف' },
                  { value: 'blocked_customers', label: 'قائمة الحظر' },
                  { value: 'abandoned_orders', label: 'الطلبات المتروكة' },
                  { value: 'analytics', label: 'تحليلات الفريق' },
                  { value: 'settings', label: 'إعدادات الموظف' },
                ].map((scope) => (
                  <label key={scope.value} className="flex items-center gap-2 rounded border border-border/40 p-2 text-sm">
                    <Switch
                      checked={formState.access_scope.includes(scope.value as ConfirmationAgent['access_scope'][number])}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({
                          ...prev,
                          access_scope: checked
                            ? [...prev.access_scope, scope.value as ConfirmationAgent['access_scope'][number]]
                            : prev.access_scope.filter((item) => item !== scope.value),
                        }))
                      }
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">نظام الأجر</div>
              <div className="grid grid-cols-3 gap-2">
                {(['monthly', 'per_order', 'hybrid'] as ConfirmationCompensationMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={formState.compensation_mode === mode ? 'default' : 'outline'}
                    className="text-sm"
                    onClick={() => setFormState((prev) => ({ ...prev, compensation_mode: mode }))}
                  >
                    {mode === 'monthly' && 'راتب شهري'}
                    {mode === 'per_order' && 'أجر لكل طلب'}
                    {mode === 'hybrid' && 'مركب'}
                  </Button>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {(formState.compensation_mode === 'monthly' || formState.compensation_mode === 'hybrid') && (
                  <Input
                    type="number"
                    min={0}
                    placeholder="المبلغ الشهري (د.ج)"
                    value={formState.monthly_amount}
                    onChange={(event) => setFormState((prev) => ({ ...prev, monthly_amount: Number(event.target.value) }))}
                  />
                )}
                {(formState.compensation_mode === 'per_order' || formState.compensation_mode === 'hybrid') && (
                  <Input
                    type="number"
                    min={0}
                    placeholder="أجر الطلب المؤكد (د.ج)"
                    value={formState.per_order_amount}
                    onChange={(event) => setFormState((prev) => ({ ...prev, per_order_amount: Number(event.target.value) }))}
                  />
                )}
              </div>
            </div>

            <Textarea
              placeholder="ملاحظات داخلية (تظهر للمديرين فقط)"
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              حفظ الموظف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfirmationAgentManager;
