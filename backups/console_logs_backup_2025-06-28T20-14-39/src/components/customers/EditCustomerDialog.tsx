import { useEffect, useState } from 'react';
import { Customer } from '@/types/customer';
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
import { updateCustomer } from '@/lib/api/customers';
import { useToast } from '@/components/ui/use-toast';

interface EditCustomerDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}

const EditCustomerDialog = ({ customer, open, onClose }: EditCustomerDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || ''
      });
    }
  }, [customer]);

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
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateCustomer(customer.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() === '' ? null : formData.phone
      });
      
      toast({
        title: 'تمت العملية بنجاح',
        description: 'تم تحديث بيانات العميل',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث بيانات العميل. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات العميل. اضغط على زر حفظ عند الانتهاء.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-left col-span-4">
                الاسم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
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
              <Label htmlFor="edit-email" className="text-left col-span-4">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
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
              <Label htmlFor="edit-phone" className="text-left col-span-4">
                رقم الهاتف
              </Label>
              <Input
                id="edit-phone"
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
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerDialog;
