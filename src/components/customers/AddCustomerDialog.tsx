import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCustomer } from '@/lib/api/customers';
import { createLocalCustomer } from '@/api/localCustomerService';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';

interface AddCustomerDialogProps {
  onCustomerAdded: (customer: Customer) => void;
}

const AddCustomerDialog = ({ onCustomerAdded }: AddCustomerDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nif: '',
    rc: '',
    nis: '',
    rib: '',
    address: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    nif: '',
    rc: ''
  });

  // التحقق من صلاحيات المستخدم
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;
      
      try {
        const canManageCustomers = await checkUserPermissions(user, 'manageCustomers' as any);
        setHasPermission(canManageCustomers);
      } catch (error) {
        setHasPermission(false);
      } finally {
        setPermissionChecked(true);
      }
    };
    
    checkPermission();
  }, [user]);

  const handleOpenChange = (isOpen: boolean) => {
    // منع فتح الحوار إذا لم يكن لدى المستخدم صلاحية
    if (isOpen && !hasPermission && permissionChecked) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لإضافة عملاء جدد',
        variant: 'destructive'
      });
      return;
    }
    
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name.trim() === '' ? 'اسم العميل مطلوب' : '',
      email: !/^\S+@\S+\.\S+$/.test(formData.email) ? 'البريد الإلكتروني غير صالح' : '',
      phone: formData.phone.trim() !== '' && !/^\d{10,15}$/.test(formData.phone.trim()) ? 'رقم الهاتف غير صالح' : '',
      nif: formData.nif.trim() !== '' && formData.nif.length !== 15 ? 'NIF يجب أن يكون 15 رقم' : '',
      rc: formData.rc.trim() !== '' && !/^\d+$/.test(formData.rc.trim()) ? 'RC يجب أن يحتوي على أرقام فقط' : ''
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من الصلاحية قبل المتابعة
    if (!hasPermission) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لإضافة عملاء جدد',
        variant: 'destructive'
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // الحصول على organization_id من localStorage
      const organizationId = localStorage.getItem('bazaar_organization_id');
      
      if (!organizationId) {
        throw new Error('لم يتم العثور على معرف المؤسسة');
      }
      
      const offlineMode = typeof navigator !== 'undefined' && navigator.onLine === false;
      let newCustomer: Customer;
      if (offlineMode) {
        const local = await createLocalCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone.trim() === '' ? null : formData.phone,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // الحقول الإضافية اختيارية
          nif: formData.nif.trim() === '' ? null : formData.nif,
          rc: formData.rc.trim() === '' ? null : formData.rc,
          nis: formData.nis.trim() === '' ? null : formData.nis,
          rib: formData.rib.trim() === '' ? null : formData.rib,
          address: formData.address.trim() === '' ? null : formData.address
        } as any);
        newCustomer = {
          id: local.id,
          name: local.name,
          email: local.email || '',
          phone: local.phone || null,
          organization_id: local.organization_id,
          created_at: local.created_at,
          updated_at: local.updated_at,
          nif: (local as any).nif ?? null,
          rc: (local as any).rc ?? null,
          nis: (local as any).nis ?? null,
          rib: (local as any).rib ?? null,
          address: (local as any).address ?? null,
        };
      } else {
        newCustomer = await createCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone.trim() === '' ? null : formData.phone,
          organization_id: organizationId,
          nif: formData.nif.trim() === '' ? null : formData.nif,
          rc: formData.rc.trim() === '' ? null : formData.rc,
          nis: formData.nis.trim() === '' ? null : formData.nis,
          rib: formData.rib.trim() === '' ? null : formData.rib,
          address: formData.address.trim() === '' ? null : formData.address
        } as any);
      }
      
      toast({
        title: 'تمت العملية بنجاح',
        description: 'تم إضافة العميل الجديد',
      });
      
      onCustomerAdded(newCustomer);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      try {
        // محاولة حفظ محلياً كـ fallback في حالة أخطاء الشبكة
        const isNetworkError = String(error?.message || '').toLowerCase().includes('network');
        const organizationId = localStorage.getItem('bazaar_organization_id');
        if (isNetworkError && organizationId) {
          const local = await createLocalCustomer({
            name: formData.name,
            email: formData.email,
            phone: formData.phone.trim() === '' ? null : formData.phone,
            organization_id: organizationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            nif: formData.nif.trim() === '' ? null : formData.nif,
            rc: formData.rc.trim() === '' ? null : formData.rc,
            nis: formData.nis.trim() === '' ? null : formData.nis,
            rib: formData.rib.trim() === '' ? null : formData.rib,
            address: formData.address.trim() === '' ? null : formData.address
          } as any);
          const newCustomer: Customer = {
            id: local.id,
            name: local.name,
            email: local.email || '',
            phone: local.phone || null,
            organization_id: local.organization_id,
            created_at: local.created_at,
            updated_at: local.updated_at,
            nif: (local as any).nif ?? null,
            rc: (local as any).rc ?? null,
            nis: (local as any).nis ?? null,
            rib: (local as any).rib ?? null,
            address: (local as any).address ?? null,
          };
          toast({ title: 'وضع الأوفلاين', description: 'تم حفظ العميل محلياً وسيتم مزامنته لاحقاً.' });
          onCustomerAdded(newCustomer);
          setOpen(false);
          resetForm();
          return;
        }
      } catch {}
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة العميل. الرجاء المحاولة مرة أخرى.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      nif: '',
      rc: '',
      nis: '',
      rib: '',
      address: ''
    });
    setErrors({
      name: '',
      email: '',
      phone: '',
      nif: '',
      rc: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          إضافة عميل جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات العميل الجديد. اضغط على زر حفظ عند الانتهاء.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-left col-span-4">
                الاسم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-4"
                placeholder="أدخل اسم العميل"
              />
              {errors.name && (
                <p className="text-red-500 text-sm col-span-4 -mt-3">{errors.name}</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-left col-span-4">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="col-span-4"
                placeholder="مثال: customer@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm col-span-4 -mt-3">{errors.email}</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-left col-span-4">
                رقم الهاتف
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="col-span-4"
                placeholder="أدخل رقم الهاتف (اختياري)"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm col-span-4 -mt-3">{errors.phone}</p>
              )}
            </div>

            {/* قسم المعلومات الضريبية (اختياري) */}
            <div className="col-span-4 border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-gray-700">معلومات ضريبية (اختياري)</h4>
              
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nif" className="text-left col-span-4 text-sm">
                    رقم التعريف الجبائي (NIF)
                  </Label>
                  <Input
                    id="nif"
                    name="nif"
                    value={formData.nif}
                    onChange={handleChange}
                    className="col-span-4"
                    placeholder="15 رقم"
                    maxLength={15}
                  />
                  {errors.nif && (
                    <p className="text-red-500 text-sm col-span-4 -mt-3">{errors.nif}</p>
                  )}
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rc" className="text-left col-span-4 text-sm">
                    رقم السجل التجاري (RC)
                  </Label>
                  <Input
                    id="rc"
                    name="rc"
                    value={formData.rc}
                    onChange={handleChange}
                    className="col-span-4"
                    placeholder="أرقام فقط"
                  />
                  {errors.rc && (
                    <p className="text-red-500 text-sm col-span-4 -mt-3">{errors.rc}</p>
                  )}
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nis" className="text-left col-span-4 text-sm">
                    رقم التعريف الإحصائي (NIS)
                  </Label>
                  <Input
                    id="nis"
                    name="nis"
                    value={formData.nis}
                    onChange={handleChange}
                    className="col-span-4"
                    placeholder="NIS"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rib" className="text-left col-span-4 text-sm">
                    الهوية البنكية (RIB)
                  </Label>
                  <Input
                    id="rib"
                    name="rib"
                    value={formData.rib}
                    onChange={handleChange}
                    className="col-span-4"
                    placeholder="RIB"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-left col-span-4 text-sm">
                    العنوان الكامل
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="col-span-4"
                    placeholder="العنوان الكامل"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasPermission}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ العميل'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
