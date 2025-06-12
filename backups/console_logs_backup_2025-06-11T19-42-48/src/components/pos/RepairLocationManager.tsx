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
import { supabase } from '@/lib/supabase';

// واجهة بيانات مكان التصليح
export interface RepairLocation {
  id: string;
  name: string;
  description?: string;
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
  const [isDefault, setIsDefault] = useState(false);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);

  // جلب أماكن التصليح
  useEffect(() => {
    const fetchLocations = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('repair_locations')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setLocations(data || []);
      } catch (error) {
        console.error('فشل في جلب أماكن التصليح:', error);
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
    setIsDefault(location.is_default || false);
    setIsEditMode(true);
    setIsAddFormVisible(true);
  };

  // حذف مكان
  const handleDelete = async (location: RepairLocation) => {
    if (!confirm(`هل أنت متأكد من حذف "${location.name}"؟`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('repair_locations')
        .update({ is_active: false })
        .eq('id', location.id);
        
      if (error) throw error;
      
      // تحديث القائمة المحلية
      setLocations(locations.filter(loc => loc.id !== location.id));
      toast.success('تم حذف مكان التصليح بنجاح');
    } catch (error) {
      console.error('فشل في حذف مكان التصليح:', error);
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
      // إذا كان المكان الجديد هو المكان الافتراضي، قم بإلغاء تعيين المكان الافتراضي الحالي
      if (isDefault) {
        await supabase
          .from('repair_locations')
          .update({ is_default: false })
          .eq('organization_id', organizationId)
          .eq('is_default', true);
      }
      
      if (isEditMode && currentLocation) {
        // تحديث مكان موجود
        const { error } = await supabase
          .from('repair_locations')
          .update({
            name: locationName,
            description: locationDescription,
            is_default: isDefault,
          })
          .eq('id', currentLocation.id);
          
        if (error) throw error;
        
        // تحديث القائمة المحلية
        setLocations(locations.map(loc => 
          loc.id === currentLocation.id 
            ? { ...loc, name: locationName, description: locationDescription, is_default: isDefault }
            : isDefault ? { ...loc, is_default: false } : loc
        ));
        
        toast.success('تم تحديث مكان التصليح بنجاح');
      } else {
        // إضافة مكان جديد
        const newLocation = {
          id: uuidv4(),
          name: locationName,
          description: locationDescription,
          is_default: isDefault,
          is_active: true,
          organization_id: organizationId,
        };
        
        const { error } = await supabase
          .from('repair_locations')
          .insert(newLocation);
          
        if (error) throw error;
        
        // تحديث القائمة المحلية
        setLocations(isDefault 
          ? [newLocation, ...locations.map(loc => ({ ...loc, is_default: false }))]
          : [newLocation, ...locations]
        );
        
        toast.success('تم إضافة مكان التصليح بنجاح');
      }
      
      // إعادة تعيين النموذج وإغلاقه
      resetForm();
      setIsAddFormVisible(false);
    } catch (error) {
      console.error('فشل في حفظ مكان التصليح:', error);
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
      <DialogContent className="sm:max-w-2xl overflow-hidden">
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
            <div className="space-y-4">
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
                <Label htmlFor="location_description">وصف المكان</Label>
                <Input 
                  id="location_description" 
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="أدخل وصف المكان (اختياري)" 
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
          </div>
        )}
        
        <ScrollArea className="h-[300px]">
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
                  <TableHead>الوصف</TableHead>
                  <TableHead>افتراضي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id} className="cursor-pointer" onClick={() => handleSelectLocation(location)}>
                    <TableCell className="font-medium">{location.name}</TableCell>
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
