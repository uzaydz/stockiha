import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Store,
  Clock,
  Star,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useCreateCallCenterAgent, CreateAgentData } from '@/hooks/useCreateCallCenterAgent';
import { useAlgerianProvinces } from '@/hooks/useAlgerianProvinces';

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddAgentDialog: React.FC<AddAgentDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { createAgent, loading, error } = useCreateCallCenterAgent();
  const { provinces, loading: provincesLoading } = useAlgerianProvinces();
  const [showPassword, setShowPassword] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  
  const [formData, setFormData] = useState<CreateAgentData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'call_center_agent',
    first_name: '',
    last_name: '',
    job_title: 'وكيل مركز اتصال',
    assigned_regions: [],
    assigned_stores: [],
    max_daily_orders: 50,
    specializations: [],
    work_schedule: {
      sunday: { start: '09:00', end: '17:00', active: true },
      monday: { start: '09:00', end: '17:00', active: true },
      tuesday: { start: '09:00', end: '17:00', active: true },
      wednesday: { start: '09:00', end: '17:00', active: true },
      thursday: { start: '09:00', end: '17:00', active: true },
      friday: { start: '09:00', end: '17:00', active: false },
      saturday: { start: '09:00', end: '17:00', active: false }
    }
  });

  const [newRegion, setNewRegion] = useState('');
  const [newStore, setNewStore] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');

  // استخدام الولايات الجزائرية من قاعدة البيانات
  const availableRegions = provinces.map(province => province.name_ar);
  const stores = ['المتجر الرئيسي', 'فرع الشمال', 'فرع الجنوب', 'فرع الشرق', 'فرع الغرب'];
  const commonSpecializations = ['خدمة العملاء', 'المبيعات', 'الدعم التقني', 'الشكاوى', 'المتابعة'];

  const handleSubmit = async () => {
    // التحقق من صحة البيانات
    if (!formData.email || !formData.password || !formData.name) {
      return;
    }

    const result = await createAgent(formData);
    
    if (result.success) {
      // إعادة تعيين النموذج
      setFormData({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'call_center_agent',
        first_name: '',
        last_name: '',
        job_title: 'وكيل مركز اتصال',
        assigned_regions: [],
        assigned_stores: [],
        max_daily_orders: 50,
        specializations: [],
        work_schedule: {
          sunday: { start: '09:00', end: '17:00', active: true },
          monday: { start: '09:00', end: '17:00', active: true },
          tuesday: { start: '09:00', end: '17:00', active: true },
          wednesday: { start: '09:00', end: '17:00', active: true },
          thursday: { start: '09:00', end: '17:00', active: true },
          friday: { start: '09:00', end: '17:00', active: false },
          saturday: { start: '09:00', end: '17:00', active: false }
        }
      });
      setCurrentTab('basic');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const addRegion = () => {
    if (newRegion && !formData.assigned_regions.includes(newRegion)) {
      setFormData(prev => ({
        ...prev,
        assigned_regions: [...prev.assigned_regions, newRegion]
      }));
      setNewRegion('');
    }
  };

  const removeRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_regions: prev.assigned_regions.filter(r => r !== region)
    }));
  };

  const addStore = () => {
    if (newStore && !formData.assigned_stores.includes(newStore)) {
      setFormData(prev => ({
        ...prev,
        assigned_stores: [...prev.assigned_stores, newStore]
      }));
      setNewStore('');
    }
  };

  const removeStore = (store: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_stores: prev.assigned_stores.filter(s => s !== store)
    }));
  };

  const addSpecialization = () => {
    if (newSpecialization && !formData.specializations.includes(newSpecialization)) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization]
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const updateWorkSchedule = (day: string, field: 'start' | 'end' | 'active', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      work_schedule: {
        ...prev.work_schedule,
        [day]: {
          ...prev.work_schedule![day],
          [field]: value
        }
      }
    }));
  };

  const isFormValid = formData.email && formData.password && formData.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            إضافة وكيل جديد
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="assignment">التخصيص</TabsTrigger>
            <TabsTrigger value="schedule">جدول العمل</TabsTrigger>
            <TabsTrigger value="specializations">التخصصات</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  معلومات الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="agent@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">كلمة المرور *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="كلمة مرور قوية"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">نوع المستخدم</Label>
                  <Select value={formData.role} onValueChange={(value: 'call_center_agent' | 'employee' | 'admin') => 
                    setFormData(prev => ({ ...prev, role: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call_center_agent">وكيل مركز اتصال</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="الاسم الكامل"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">الاسم الأول</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="الاسم الأول"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">اسم العائلة</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="اسم العائلة"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966501234567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">المسمى الوظيفي</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="وكيل مركز اتصال"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="max_daily_orders">الحد الأقصى للطلبات اليومية</Label>
                  <Input
                    id="max_daily_orders"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.max_daily_orders}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_daily_orders: parseInt(e.target.value) }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  الولايات المخصصة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {provincesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">جاري تحميل الولايات الجزائرية...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={newRegion} onValueChange={setNewRegion}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر ولاية جزائرية" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces
                          .filter(province => !formData.assigned_regions.includes(province.name_ar))
                          .map(province => (
                            <SelectItem 
                              key={province.id} 
                              value={province.name_ar}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{province.name_ar}</span>
                                <span className="text-xs text-gray-500 mr-2">منطقة {province.zone}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addRegion} disabled={!newRegion}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {formData.assigned_regions.map(region => {
                    const provinceInfo = provinces.find(p => p.name_ar === region);
                    return (
                      <Badge key={region} variant="secondary" className="flex items-center gap-1">
                        <span>{region}</span>
                        {provinceInfo && (
                          <span className="text-xs opacity-70">({provinceInfo.zone})</span>
                        )}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeRegion(region)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  المتاجر المخصصة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={newStore} onValueChange={setNewStore}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر متجر" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.filter(s => !formData.assigned_stores.includes(s)).map(store => (
                        <SelectItem key={store} value={store}>{store}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addStore} disabled={!newStore}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.assigned_stores.map(store => (
                    <Badge key={store} variant="secondary" className="flex items-center gap-1">
                      {store}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeStore(store)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  جدول العمل الأسبوعي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(formData.work_schedule || {}).map(([day, schedule]) => (
                  <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-20">
                      <span className="font-medium">
                        {day === 'monday' ? 'الاثنين' :
                         day === 'tuesday' ? 'الثلاثاء' :
                         day === 'wednesday' ? 'الأربعاء' :
                         day === 'thursday' ? 'الخميس' :
                         day === 'friday' ? 'الجمعة' :
                         day === 'saturday' ? 'السبت' : 'الأحد'}
                      </span>
                    </div>
                    
                    <Switch
                      checked={schedule.active}
                      onCheckedChange={(checked) => updateWorkSchedule(day, 'active', checked)}
                    />
                    
                    {schedule.active && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label>من</Label>
                          <Input
                            type="time"
                            value={schedule.start}
                            onChange={(e) => updateWorkSchedule(day, 'start', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label>إلى</Label>
                          <Input
                            type="time"
                            value={schedule.end}
                            onChange={(e) => updateWorkSchedule(day, 'end', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specializations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  التخصصات والمهارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={newSpecialization} onValueChange={setNewSpecialization}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر تخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonSpecializations.filter(s => !formData.specializations.includes(s)).map(spec => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addSpecialization} disabled={!newSpecialization}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.specializations.map(spec => (
                    <Badge key={spec} variant="secondary" className="flex items-center gap-1">
                      {spec}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeSpecialization(spec)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isFormValid}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الوكيل'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAgentDialog;
