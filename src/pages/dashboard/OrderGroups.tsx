import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import orderGroupsApi, { type OrderGroup as LocalOrderGroup, type OrderGroupRule as LocalOrderGroupRule, type OrderGroupMember as LocalOrderGroupMember } from '@/services/orderGroupsApi';
import { Plus, Save, Trash2, RefreshCw, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

const strategies = [
  { value: 'claim_only', label: 'تعيين يدوي (Claim)' },
  { value: 'round_robin', label: 'توزيع دائري' },
  { value: 'least_busy', label: 'الأقل انشغالاً' },
  { value: 'weighted', label: 'بالأوزان' },
  { value: 'manual', label: 'توزيع يدوي' },
];

const OrderGroupsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organization_id as string | undefined;
  const perms = usePermissions();
  const [groups, setGroups] = useState<LocalOrderGroup[]>([]);
  const [selected, setSelected] = useState<LocalOrderGroup | null>(null);
  const [rules, setRules] = useState<LocalOrderGroupRule[]>([]);
  const [productIds, setProductIds] = useState('');
  const [members, setMembers] = useState<LocalOrderGroupMember[]>([]);
  const [newMember, setNewMember] = useState<{ staffId: string; weight: number; maxOpen: number }>({ staffId: '', weight: 1, maxOpen: 20 });

  const [orgStaff, setOrgStaff] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [openCounts, setOpenCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      await orderGroupsApi.ensureDefault(orgId);
      const list = await orderGroupsApi.list(orgId);
      setGroups(list);
      if (list.length > 0) {
        setSelected(list[0]);
        const r = await orderGroupsApi.getRules(list[0].id);
        setRules(r);
        const prodRule = r.find(x => x.type === 'product_ids' && x.include);
        setProductIds(Array.isArray(prodRule?.values) ? (prodRule!.values as any[]).join(',') : '');
        const ms = await orderGroupsApi.listMembers(list[0].id);
        setMembers(ms);
        const counts = await orderGroupsApi.getOpenAssignmentCounts(orgId, list[0].id);
        setOpenCounts(counts);
      }
      const staff = await orderGroupsApi.listOrgStaff(orgId);
      setOrgStaff(staff);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [orgId]);

  const handleSelect = async (id: string) => {
    const g = groups.find(x => x.id === id) || null;
    setSelected(g);
    if (g) {
      const r = await orderGroupsApi.getRules(g.id);
      setRules(r);
      const prodRule = r.find(x => x.type === 'product_ids' && x.include);
      setProductIds(Array.isArray(prodRule?.values) ? (prodRule!.values as any[]).join(',') : '');
      const ms = await orderGroupsApi.listMembers(g.id);
      setMembers(ms);
      if (orgId) {
        const counts = await orderGroupsApi.getOpenAssignmentCounts(orgId, g.id);
        setOpenCounts(counts);
      }
    } else {
      setRules([]);
      setProductIds('');
      setMembers([]);
    }
  };

  const handleNew = async () => {
    if (!orgId) return;
    const draft: Partial<LocalOrderGroup> = {
      organization_id: orgId,
      name: 'مجموعة جديدة',
      enabled: true,
      strategy: 'claim_only',
      priority: 1,
    } as any;
    const saved = await orderGroupsApi.saveGroupWithRules(draft as any, [{ group_id: '', type: 'all', include: true, values: [] } as any]);
    await load();
    await handleSelect(saved.id);
  };

  const handleSave = async () => {
    if (!orgId || !selected) return;
    const prodIds = productIds.split(',').map(s => s.trim()).filter(Boolean);
    const newRules: Array<Omit<LocalOrderGroupRule, 'id' | 'organization_id' | 'created_at'>> = [] as any;
    if (prodIds.length > 0) {
      newRules.push({ group_id: selected.id, type: 'product_ids', include: true, values: prodIds as any } as any);
    } else {
      newRules.push({ group_id: selected.id, type: 'all', include: true, values: [] as any } as any);
    }
    await orderGroupsApi.saveGroupWithRules({
      id: selected.id,
      organization_id: selected.organization_id,
      name: selected.name,
      strategy: selected.strategy,
      enabled: selected.enabled,
      priority: selected.priority,
    }, newRules);
    toast.success('تم حفظ المجموعة');
    await load();
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (selected.name === 'المجموعة الافتراضية (كل المنتجات)') {
      toast.error('لا يمكن حذف المجموعة الافتراضية');
      return;
    }
    await orderGroupsApi.removeGroup(selected.id);
    toast.success('تم حذف المجموعة');
    setSelected(null);
    await load();
  };

  if (perms.ready && !perms.anyOf(['canManageOnlineOrderGroups'])) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية إدارة مجموعات الطلبات.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">مجموعات الطلبات الإلكترونية</h2>
          <p className="text-sm text-muted-foreground mt-1">تحديد توزيع وفلترة الطلبات حسب المنتجات والموظفين</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> مجموعة جديدة
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> تحديث
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Groups List */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">قائمة المجموعات</CardTitle>
            </div>
            <CardDescription>اختر مجموعة للتعديل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelect(g.id)}
                  className={`w-full text-right px-4 py-3 rounded-lg border transition-all ${
                    selected?.id === g.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card hover:bg-accent border-border/50'
                  }`}
                >
                  <div className="font-medium text-sm">{g.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {strategies.find(s => s.value === g.strategy)?.label} • {g.enabled ? 'مفعلة' : 'معطلة'}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Group Details */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">تفاصيل المجموعة</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">اختر مجموعة من القائمة أو أنشئ مجموعة جديدة</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">اسم المجموعة</Label>
                    <Input
                      id="group-name"
                      value={selected.name}
                      onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                      className="border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy">استراتيجية التوزيع</Label>
                    <Select value={selected.strategy} onValueChange={(v) => setSelected({ ...selected, strategy: v as any })}>
                      <SelectTrigger id="strategy" className="border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">الأولوية</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={selected.priority}
                      onChange={(e) => setSelected({ ...selected, priority: Number(e.target.value || 1) })}
                      className="border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enabled">الحالة</Label>
                    <Select value={selected.enabled ? '1' : '0'} onValueChange={(v) => setSelected({ ...selected, enabled: v === '1' })}>
                      <SelectTrigger id="enabled" className="border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">مفعلة</SelectItem>
                        <SelectItem value="0">معطلة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product Filter */}
                <div className="space-y-2">
                  <Label htmlFor="products">تصفية بالمنتجات</Label>
                  <Input
                    id="products"
                    placeholder="أدخل معرفات المنتجات مفصولة بفواصل (اتركها فارغة لتشمل كل المنتجات)"
                    value={productIds}
                    onChange={(e) => setProductIds(e.target.value)}
                    className="border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">مثال: prod-1, prod-2, prod-3</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" /> حفظ التغييرات
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} className="gap-2">
                    <Trash2 className="h-4 w-4" /> حذف المجموعة
                  </Button>
                </div>

                {/* Members Section */}
                <div className="pt-4 border-t border-border/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    أعضاء المجموعة ({members.length})
                  </h3>

                  {/* Members List */}
                  <div className="space-y-3 mb-4">
                    {members.map(m => (
                      <div key={m.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-lg border border-border/50 bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">الموظف</Label>
                          <div className="font-medium text-sm">{orgStaff.find(s => s.id === m.staff_id)?.name || m.staff_id}</div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`weight-${m.id}`} className="text-xs text-muted-foreground">الوزن</Label>
                          <Input
                            id={`weight-${m.id}`}
                            type="number"
                            value={m.weight ?? 1}
                            onChange={(e) => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, weight: Number(e.target.value || 1) } : x))}
                            className="h-8 border-border/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`max-${m.id}`} className="text-xs text-muted-foreground">الحد الأقصى</Label>
                          <Input
                            id={`max-${m.id}`}
                            type="number"
                            value={m.max_open ?? 20}
                            onChange={(e) => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, max_open: Number(e.target.value || 0) } : x))}
                            className="h-8 border-border/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">مفتوحة حالياً</Label>
                          <div className="text-sm font-medium py-1">{openCounts[m.staff_id] || 0}</div>
                        </div>
                        <div className="flex gap-2 items-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await orderGroupsApi.updateMember(m);
                              toast.success('تم تحديث العضو');
                              if (orgId && selected) setOpenCounts(await orderGroupsApi.getOpenAssignmentCounts(orgId, selected.id));
                            }}
                          >
                            حفظ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              await orderGroupsApi.removeMember(m.id);
                              setMembers(prev => prev.filter(x => x.id !== m.id));
                              toast.success('تم حذف العضو');
                              if (orgId && selected) setOpenCounts(await orderGroupsApi.getOpenAssignmentCounts(orgId, selected.id));
                            }}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Member */}
                  <div className="p-4 rounded-lg border border-dashed border-border/50 bg-muted/10">
                    <p className="text-sm font-medium mb-3">إضافة عضو جديد</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="new-staff" className="text-xs">الموظف</Label>
                        <Select value={newMember.staffId} onValueChange={(v) => setNewMember(prev => ({ ...prev, staffId: v }))}>
                          <SelectTrigger id="new-staff" className="h-8 border-border/50">
                            <SelectValue placeholder="اختر موظف" />
                          </SelectTrigger>
                          <SelectContent>
                            {orgStaff.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name || s.email || s.id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-weight" className="text-xs">الوزن</Label>
                        <Input
                          id="new-weight"
                          type="number"
                          value={newMember.weight}
                          onChange={(e) => setNewMember(prev => ({ ...prev, weight: Number(e.target.value || 1) }))}
                          className="h-8 border-border/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-max" className="text-xs">الحد الأقصى</Label>
                        <Input
                          id="new-max"
                          type="number"
                          value={newMember.maxOpen}
                          onChange={(e) => setNewMember(prev => ({ ...prev, maxOpen: Number(e.target.value || 0) }))}
                          className="h-8 border-border/50"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!selected || !orgId || !newMember.staffId) return;
                            const rec = await orderGroupsApi.addMember(orgId, selected.id, newMember.staffId, newMember.weight, newMember.maxOpen);
                            setMembers(prev => [rec, ...prev]);
                            setNewMember({ staffId: '', weight: 1, maxOpen: 20 });
                            toast.success('تم إضافة العضو');
                            if (orgId && selected) setOpenCounts(await orderGroupsApi.getOpenAssignmentCounts(orgId, selected.id));
                          }}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" /> إضافة
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderGroupsPage;
