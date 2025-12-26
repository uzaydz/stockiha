import { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeePermissions } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateEmployee } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import {
  Check,
  X,
  Sparkles,
  Search,
  ChevronLeft,
  CheckCircle2,
  Copy,
  Shield,
  User,
  Mail,
  Phone,
  AlertTriangle
} from 'lucide-react';
import {
  defaultPermissions,
  permissionPresets,
  permissionGroups,
  PermissionGroup,
  PermissionPreset
} from '@/constants/employeePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

interface EditEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated: (employee: Employee) => void;
  existingEmployees?: Employee[];
}

const EditEmployeeDialog = ({
  employee,
  open,
  onOpenChange,
  onEmployeeUpdated,
  existingEmployees = []
}: EditEmployeeDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [searchPermission, setSearchPermission] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['pos']);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [permissions, setPermissions] = useState<EmployeePermissions>(defaultPermissions);

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || ''
      });

      const initialPermissions = { ...defaultPermissions, ...employee.permissions };
      setPermissions(initialPermissions);

      // Try to match with a preset
      const matchedPreset = permissionPresets.find(preset => {
        if (preset.id === 'custom') return false;
        // Check if all permissions in preset match employee permissions
        // This is a naive check, for exact match we need deeper comparison
        // But for UI "selection" state it might be enough if we just default to custom usually
        return false;
      });

      setSelectedPreset(matchedPreset ? matchedPreset.id : 'custom');
    }
  }, [employee, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePermissionChange = (key: keyof EmployeePermissions, checked: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: checked }));
    setSelectedPreset('custom');
  };

  const handlePresetSelect = (preset: PermissionPreset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setPermissions(prev => ({ ...prev, ...preset.permissions }));
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleAllInGroup = (group: PermissionGroup, enable: boolean) => {
    const updates: Partial<EmployeePermissions> = {};
    group.permissions.forEach(p => {
      updates[p.key] = enable;
    });
    setPermissions(prev => ({ ...prev, ...updates }));
    setSelectedPreset('custom');
  };

  const getGroupEnabledCount = (group: PermissionGroup) => {
    return group.permissions.filter(p => permissions[p.key]).length;
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name.trim() === '' ? 'اسم الموظف مطلوب' : '',
      email: !/^\S+@\S+\.\S+$/.test(formData.email) ? 'البريد الإلكتروني غير صالح' : '',
      phone: formData.phone.trim() !== '' && !/^\d{10,15}$/.test(formData.phone.trim()) ? 'رقم الهاتف غير صالح' : ''
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm() || !employee) return;

    setIsSubmitting(true);

    try {
      const updatedEmployee = await updateEmployee(employee.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        permissions
      });

      toast({
        title: 'تمت العملية بنجاح',
        description: `تم تحديث بيانات الموظف ${formData.name} بنجاح`,
      });

      onEmployeeUpdated(updatedEmployee);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث بيانات الموظف',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed
  const enabledPermissionsCount = useMemo(() => {
    return Object.values(permissions).filter(Boolean).length;
  }, [permissions]);

  const totalPermissionsCount = Object.keys(defaultPermissions).length;

  const filteredGroups = useMemo(() => {
    if (!searchPermission.trim()) return permissionGroups;
    const search = searchPermission.toLowerCase();
    return permissionGroups.filter(group =>
      group.title.toLowerCase().includes(search) ||
      group.permissions.some(p => p.label.toLowerCase().includes(search))
    );
  }, [searchPermission]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b flex-shrink-0">
          <DialogTitle>تعديل الموظف: {formData.name}</DialogTitle>
          <DialogDescription>
            تعديل البيانات والصلاحيات
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start h-12 bg-transparent p-0">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none h-full px-6 transition-all"
              >
                المعلومات الأساسية
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none h-full px-6 transition-all"
              >
                الصلاحيات ({enabledPermissionsCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 p-6 overflow-y-auto mt-0">
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="bg-muted/30 p-6 rounded-xl border border-dashed space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    الاسم <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="اسم الموظف الكامل"
                    className={cn("bg-background", errors.name ? 'border-red-500' : '')}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@domain.com"
                    className={cn("bg-background", errors.email ? 'border-red-500' : '')}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0XXXXXXXXX"
                    className={cn("bg-background", errors.phone ? 'border-red-500' : '')}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="flex-1 flex flex-col overflow-hidden mt-0">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b space-y-4 bg-background/50 backdrop-blur-sm z-10">
              {/* Quick Actions Card */}
              <div className="bg-muted/30 p-4 rounded-xl border border-dashed flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-500" />
                      أدوات سريعة
                    </h4>
                    <p className="text-xs text-muted-foreground">نسخ الصلاحيات أو استخدام قوالب جاهزة</p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select
                      onValueChange={(value) => {
                        const emp = existingEmployees.find(e => e.id === value);
                        if (emp && emp.permissions) {
                          setPermissions({ ...defaultPermissions, ...emp.permissions });
                          setSelectedPreset('custom');
                          toast({
                            title: 'تم النسخ',
                            description: `تم نسخ الصلاحيات من ${emp.name}`,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full md:w-[240px] h-9 bg-background">
                        <div className="flex items-center gap-2">
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="نسخ من موظف..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent align="end">
                        {existingEmployees.filter(e => e.id !== employee?.id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {permissionPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all",
                        selectedPreset === preset.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background hover:bg-muted text-muted-foreground border-transparent shadow-sm"
                      )}
                    >
                      {preset.id !== 'custom' && <span className="opacity-70">{preset.icon}</span>}
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Stats */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن صلاحية محددة..."
                    value={searchPermission}
                    onChange={(e) => setSearchPermission(e.target.value)}
                    className="pr-10 h-10"
                  />
                </div>
                <div className="flex flex-col w-full md:w-1/3 gap-1.5">
                  <div className="flex justify-between text-xs px-1">
                    <span className="text-muted-foreground">قوة الصلاحيات</span>
                    <span className="font-medium text-orange-600">
                      {Math.round((enabledPermissionsCount / totalPermissionsCount) * 100)}%
                    </span>
                  </div>
                  <Progress value={(enabledPermissionsCount / totalPermissionsCount) * 100} className="h-2" />
                </div>
              </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 bg-muted/10">
              <div className="p-6 space-y-3">
                <Accordion type="multiple" className="space-y-3" value={expandedGroups} onValueChange={setExpandedGroups}>
                  {filteredGroups.map((group) => {
                    const enabledCount = getGroupEnabledCount(group);
                    const allEnabled = enabledCount === group.permissions.length;
                    const someEnabled = enabledCount > 0 && !allEnabled;
                    const isFullyActive = allEnabled;

                    return (
                      <AccordionItem key={group.id} value={group.id} className="border rounded-xl bg-card overflow-hidden px-0">
                        <div className="flex items-center justify-between p-2 pr-4 relative">
                          <AccordionTrigger className="hover:no-underline py-2 flex-1 group">
                            <div className="flex items-center gap-4 text-right w-full">
                              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border transition-colors",
                                isFullyActive ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {group.icon}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-base group-hover:text-primary transition-colors">{group.title}</div>
                                <div className="text-xs text-muted-foreground">{group.description}</div>
                              </div>
                              <Badge variant={allEnabled ? "default" : someEnabled ? "secondary" : "outline"} className="ml-2">
                                {enabledCount} / {group.permissions.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                        </div>

                        <AccordionContent className="px-4 pb-4 border-t pt-4 bg-muted/5">
                          <div className="flex items-center justify-between mb-4 bg-muted/50 p-2 rounded-lg border border-dashed">
                            <div className="text-sm font-medium text-muted-foreground px-2">خيارات سريعة</div>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs transition-colors", allEnabled ? "text-primary font-medium" : "text-muted-foreground")}>
                                {allEnabled ? 'المجموعة مفعلة بالكامل' : 'تفعيل الكل'}
                              </span>
                              <Switch checked={allEnabled} onCheckedChange={(c) => toggleAllInGroup(group, c)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.permissions.map((permission) => (
                              <div
                                key={permission.key}
                                onClick={() => handlePermissionChange(permission.key, !permissions[permission.key])}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all relative group select-none",
                                  permissions[permission.key]
                                    ? "bg-primary/5 border-primary/30 shadow-sm"
                                    : "bg-background hover:bg-muted/50 hover:border-muted-foreground/30"
                                )}
                              >
                                <Checkbox
                                  checked={!!permissions[permission.key]}
                                  onCheckedChange={(c) => handlePermissionChange(permission.key, !!c)}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="text-sm font-medium flex items-center gap-2">
                                    {permission.label}
                                    {permission.isSensitive && (
                                      <div className="text-orange-500 bg-orange-50 dark:bg-orange-950/30 p-0.5 rounded" title="صلاحية حساسة">
                                        <AlertTriangle className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                  {permission.description && (
                                    <div className="text-[11px] text-muted-foreground leading-tight">{permission.description}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {filteredGroups.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد نتائج بحث مطابقة للصلاحيات</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-4 border-t bg-background flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" className="h-10">
            إلغاء
          </Button>
          <Button onClick={() => handleSubmit()} disabled={isSubmitting} className="h-10 px-8 min-w-[120px]">
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="animate-spin duration-1000">⚪</span>
                <span>جاري الحفظ...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>حفظ التغييرات</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;
