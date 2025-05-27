import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RepairLocation } from '@/types';
import { MapPin, Phone, Mail, Settings, Plus, Edit, Trash2, Building, Clock, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { getActiveRepairLocations, upsertRepairLocation, deleteRepairLocation } from '@/lib/api/repairLocations';

interface RepairLocationManagerProps {
  organizationId: string;
  onLocationSelect: (location: RepairLocation) => void;
  selectedLocationId?: string;
}

export default function RepairLocationManager({ 
  organizationId, 
  onLocationSelect, 
  selectedLocationId 
}: RepairLocationManagerProps) {
  const [locations, setLocations] = useState<RepairLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<RepairLocation | null>(null);
  const [saving, setSaving] = useState(false);
  
  // بيانات النموذج
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
    is_default: false,
    capacity: 10,
    manager_name: '',
    specialties: [] as string[]
  });

  // تحميل أماكن التصليح
  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await getActiveRepairLocations(organizationId);
      setLocations(data);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل أماكن التصليح');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadLocations();
    }
  }, [organizationId]);

  // فتح نافذة إضافة مكان جديد
  const handleAddNew = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      is_active: true,
      is_default: false,
      capacity: 10,
      manager_name: '',
      specialties: []
    });
    setIsDialogOpen(true);
  };

  // فتح نافذة تحرير مكان موجود
  const handleEdit = (location: RepairLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || '',
      address: location.address || '',
      phone: location.phone || '',
      email: location.email || '',
      is_active: location.is_active,
      is_default: location.is_default,
      capacity: location.capacity,
      manager_name: location.manager_name || '',
      specialties: location.specialties || []
    });
    setIsDialogOpen(true);
  };

  // حفظ مكان التصليح
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('اسم مكان التصليح مطلوب');
      return;
    }

    try {
      setSaving(true);
      
      const locationData = {
        ...formData,
        organization_id: organizationId,
        id: editingLocation?.id
      };

      await upsertRepairLocation(locationData);
      
      toast.success(editingLocation ? 'تم تحديث مكان التصليح بنجاح' : 'تم إضافة مكان التصليح بنجاح');
      
      setIsDialogOpen(false);
      await loadLocations();
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ مكان التصليح');
    } finally {
      setSaving(false);
    }
  };

  // حذف مكان التصليح
  const handleDelete = async (location: RepairLocation) => {
    if (location.is_default) {
      toast.error('لا يمكن حذف المكان الافتراضي');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا المكان؟')) {
      return;
    }

    try {
      await deleteRepairLocation(organizationId, location.id);
      toast.success('تم حذف مكان التصليح بنجاح');
      await loadLocations();
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف مكان التصليح');
    }
  };

  // إضافة تخصص جديد
  const addSpecialty = () => {
    const specialty = prompt('أدخل التخصص الجديد:');
    if (specialty && specialty.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }));
    }
  };

  // حذف تخصص
  const removeSpecialty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">جاري تحميل أماكن التصليح...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-background rounded-lg border shadow-md overflow-hidden">
      <div className="px-4 py-3 space-y-1.5 bg-card/80 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            أماكن التصليح
          </h2>
          <Button onClick={handleAddNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة مكان جديد
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          اختر مكان التصليح للخدمة
        </p>
      </div>

      <Separator className="opacity-50" />

      <ScrollArea className="flex-1">
        {locations.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
            <Building className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-base">لا توجد أماكن تصليح</p>
            <p className="text-xs mt-1 text-muted-foreground">أضف مكان تصليح جديد للبدء</p>
            <Button 
              variant="link" 
              onClick={handleAddNew}
              className="mt-2"
            >
              إضافة مكان جديد
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4">
            {locations.map(location => (
              <Card
                key={location.id}
                className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden bg-card group hover:translate-y-[-2px] ${
                  selectedLocationId === location.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => onLocationSelect(location)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-base">{location.name}</h3>
                        {location.is_default && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            افتراضي
                          </Badge>
                        )}
                      </div>
                      {location.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {location.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(location);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!location.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(location);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {location.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{location.address}</span>
                      </div>
                    )}
                    {location.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{location.phone}</span>
                      </div>
                    )}
                    {location.manager_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>المدير: {location.manager_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>السعة: {location.capacity}</span>
                      </div>
                      {location.specialties && location.specialties.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          <span>{location.specialties.length} تخصص</span>
                        </div>
                      )}
                    </div>
                    {selectedLocationId === location.id && (
                      <Badge className="bg-primary text-white">
                        مختار
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* نافذة إضافة/تحرير مكان التصليح */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'تحرير مكان التصليح' : 'إضافة مكان تصليح جديد'}
            </DialogTitle>
            <DialogDescription>
              أدخل معلومات مكان التصليح
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المكان *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم مكان التصليح"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_name">اسم المدير</Label>
                <Input
                  id="manager_name"
                  value={formData.manager_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, manager_name: e.target.value }))}
                  placeholder="اسم مدير المكان"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف مكان التصليح"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="عنوان مكان التصليح"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="رقم هاتف المكان"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">السعة القصوى</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 10 }))}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">مكان نشط</Label>
                </div>
                {!editingLocation?.is_default && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <Label htmlFor="is_default">مكان افتراضي</Label>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>التخصصات</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpecialty}>
                  <Plus className="h-4 w-4 mr-1" />
                  إضافة تخصص
                </Button>
              </div>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {specialty}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 w-4 h-4"
                        onClick={() => removeSpecialty(index)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : (editingLocation ? 'تحديث' : 'إضافة')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
