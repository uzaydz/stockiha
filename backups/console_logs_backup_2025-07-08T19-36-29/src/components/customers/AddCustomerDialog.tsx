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
    phone: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
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
      phone: formData.phone.trim() !== '' && !/^\d{10,15}$/.test(formData.phone.trim()) ? 'رقم الهاتف غير صالح' : ''
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
      const newCustomer = await createCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() === '' ? null : formData.phone
      });
      
      toast({
        title: 'تمت العملية بنجاح',
        description: 'تم إضافة العميل الجديد',
      });
      
      onCustomerAdded(newCustomer);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة العميل. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
    setErrors({
      name: '',
      email: '',
      phone: ''
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
