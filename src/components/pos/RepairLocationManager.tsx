import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from '@/components/ui/switch';
import { Building, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
// import { supabase } from '@/lib/supabase';
import { listLocalRepairLocations, createLocalRepairLocation, updateLocalRepairLocation, softDeleteLocalRepairLocation } from '@/api/localRepairService';

// واجهة بيانات مكان التصليح
export interface RepairLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  organization_id?: string;
}

interface RepairLocationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (location: RepairLocation) => void;
}

const RepairLocationManager = ({ isOpen, onClose, onSelectLocation }: RepairLocationManagerProps) => {
  const { organizationId } = useUser();
  
  const [locations, setLocations] = useState<RepairLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالة إضافة/تحرير مكان
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<RepairLocation | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPhone, setLocationPhone] = useState('');
  const [locationEmail, setLocationEmail] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);

  // جلب أماكن التصليح
  useEffect(() => {
    const fetchLocations = async () => {
      if (!organizationId) return;
      setIsLoading(true);
      try {
        const data = await listLocalRepairLocations(organizationId);
        setLocations(data as any);
      } catch (error) {
        toast.error('فشل في جلب أماكن التصليح');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchLocations();
    }
  }, [organizationId, isOpen]);

  // إعادة تعيين نموذج الإضافة/التحرير
  const resetForm = () => {
    setLocationName('');
    setLocationDescription('');
    setLocationAddress('');
    setLocationPhone('');
    setLocationEmail('');
    setIsDefault(false);
    setCurrentLocation(null);
    setIsEditMode(false);
  };

  // تبديل نموذج الإضافة
  const toggleAddForm = () => {
    setIsAddFormVisible(!isAddFormVisible);
    resetForm();
  };

  // بدء تحرير مكان
  const handleEdit = (location: RepairLocation) => {
    setCurrentLocation(location);
    setLocationName(location.name);
    setLocationDescription(location.description || '');
    setLocationAddress(location.address || '');
    setLocationPhone(location.phone || '');
    setLocationEmail(location.email || '');
    setIsDefault(location.is_default || false);
    setIsEditMode(true);
    setIsAddFormVisible(true);
  };

  // حذف مكان
  const handleDelete = async (location: RepairLocation) => {
    if (!confirm(`هل أنت متأكد من حذف "${location.name}"؟`)) return;
    try {
      const ok = await softDeleteLocalRepairLocation(location.id);
      if (ok) {
        setLocations(locations.filter(loc => loc.id !== location.id));
        toast.success('تم حذف مكان التصليح بنجاح');
      } else {
        toast.error('تعذر حذف مكان التصليح');
      }
    } catch (error) {
      toast.error('فشل في حذف مكان التصليح');
    }
  };

  // حفظ مكان جديد أو تحديث مكان موجود
  const handleSave = async () => {
    if (!locationName.trim()) {
      toast.error('اسم المكان مطلوب');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditMode && currentLocation) {
        const updated = await updateLocalRepairLocation(currentLocation.id, {
          name: locationName,
          description: locationDescription,
          address: locationAddress,
          phone: locationPhone,
          email: locationEmail,
          is_default: isDefault,
          is_active: true,
        });
        if (!updated) throw new Error('تعذر تحديث المكان محلياً');
        setLocations(locations.map(loc => loc.id === currentLocation.id ? { ...loc, ...updated } as any : (isDefault ? { ...loc, is_default: false } : loc)));
        toast.success('تم تحديث مكان التصليح بنجاح');
      } else {
        const newLoc = await createLocalRepairLocation({
          name: locationName,
          description: locationDescription,
          address: locationAddress,
          phone: locationPhone,
          email: locationEmail,
          is_default: isDefault,
        });
        setLocations(isDefault ? [newLoc as any, ...locations.map(loc => ({ ...loc, is_default: false }))] : [newLoc as any, ...locations]);
        toast.success('تم إضافة مكان التصليح بنجاح');
      }
      resetForm();
      setIsAddFormVisible(false);
    } catch (error) {
      toast.error('فشل في حفظ مكان التصليح');
    } finally {
      setIsSubmitting(false);
    }
  };

  // اختيار مكان تصليح
  const handleSelectLocation = (location: RepairLocation) => {
    if (onSelectLocation) {
      onSelectLocation(location);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building className="h-5 w-5" />
            إدارة أماكن التصليح
          </DialogTitle>
          <DialogDescription>
            أضف وعدّل أماكن التصليح في مؤسستك
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">قائمة الأماكن</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleAddForm}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {isAddFormVisible ? 'إلغاء' : 'إضافة مكان جديد'}
          </Button>
        </div>
        
        {isAddFormVisible && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h4 className="font-medium">{isEditMode ? 'تعديل مكان' : 'إضافة مكان جديد'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_name">اسم المكان <span className="text-red-500">*</span></Label>
                <Input 
                  id="location_name" 
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="أدخل اسم المكان" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_phone">رقم الهاتف</Label>
                <Input 
                  id="location_phone" 
                  value={locationPhone}
                  onChange={(e) => setLocationPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف" 
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location_description">وصف المكان</Label>
                <Input 
                  id="location_description" 
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="أدخل وصف المكان (اختياري)" 
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location_address">العنوان</Label>
                <Input 
                  id="location_address" 
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="أدخل عنوان المكان" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location_email">البريد الإلكتروني</Label>
                <Input 
                  id="location_email" 
                  type="email"
                  value={locationEmail}
                  onChange={(e) => setLocationEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني" 
                />
              </div>
              
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Switch 
                  id="is_default" 
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="is_default">تعيين كمكان افتراضي</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={toggleAddForm}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex gap-2 items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    حفظ
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin opacity-50" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              لا توجد أماكن تصليح. قم بإضافة مكان جديد.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>افتراضي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id} className="cursor-pointer" onClick={() => handleSelectLocation(location)}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>{location.address || '-'}</TableCell>
                    <TableCell>{location.phone || '-'}</TableCell>
                    <TableCell>{location.description || '-'}</TableCell>
                    <TableCell>{location.is_default ? 'نعم' : 'لا'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(location);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(location);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepairLocationManager;
