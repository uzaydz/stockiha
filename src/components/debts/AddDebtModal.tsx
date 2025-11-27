import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PlusCircle, UserPlus } from 'lucide-react';
import { Customer } from '@/types/customer';
import { createCustomer } from '@/lib/api/customers';
import { createDebt, CreateDebtData } from '@/lib/api/debts';
import { useTenant } from '@/context/TenantContext';
import { getLocalCustomers } from '@/api/localCustomerService';

interface AddDebtModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDebtAdded?: () => void;
}

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
}

const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onOpenChange,
  onDebtAdded
}) => {
  const { currentOrganization } = useTenant();
  
  // حالة النموذج الرئيسي
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  // حالة العملاء
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // حالة إنشاء عميل جديد
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: '',
    email: '',
    phone: ''
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  // حالة إرسال النموذج
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحميل العملاء عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      resetForm();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const customersData = await getLocalCustomers({ organizationId: currentOrganization?.id });
      setCustomers(customersData as unknown as Customer[]);
    } catch (error) {
      toast.error('فشل في تحميل العملاء');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setAmount('');
    setDescription('');
    setDueDate('');
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', email: '', phone: '' });
  };

  // معالج إنشاء عميل جديد
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('اسم العميل مطلوب');
      return;
    }

    if (!currentOrganization?.id) {
      toast.error('معرف المؤسسة غير متوفر');
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const customerData = {
        name: newCustomer.name,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
        organization_id: currentOrganization.id
      };

      const createdCustomer = await createCustomer(customerData);
      
      // إضافة العميل الجديد إلى القائمة وتحديده
      setCustomers(prev => [createdCustomer, ...prev]);
      setSelectedCustomerId(createdCustomer.id);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', email: '', phone: '' });
      
      toast.success('تم إنشاء العميل بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء العميل');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // معالج إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('يجب اختيار عميل');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يجب إدخال مبلغ صحيح');
      return;
    }

    if (!description.trim()) {
      toast.error('يجب إدخال وصف للدين');
      return;
    }

    if (!currentOrganization?.id) {
      toast.error('معرف المؤسسة غير متوفر');
      return;
    }

    setIsSubmitting(true);
    try {
      const debtData: CreateDebtData = {
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        description: description.trim(),
        dueDate: dueDate || undefined,
        organizationId: currentOrganization.id
      };

      await createDebt(debtData);
      
      toast.success('تم إضافة الدين بنجاح');
      onOpenChange(false);
      onDebtAdded?.();
    } catch (error) {
      toast.error('فشل في إضافة الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            إضافة دين جديد
          </DialogTitle>
          <DialogDescription>
            قم بإضافة دين جديد للعميل. يمكنك اختيار عميل موجود أو إنشاء عميل جديد.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* اختيار العميل */}
          <div className="space-y-2">
            <Label htmlFor="customer-select">العميل *</Label>
            {!showNewCustomerForm ? (
              <div className="flex gap-2">
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                  disabled={loadingCustomers}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر عميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCustomerForm(true)}
                  className="flex items-center gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">إنشاء عميل جديد</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomerForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-customer-name" className="text-sm">
                    اسم العميل *
                  </Label>
                  <Input
                    id="new-customer-name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="أدخل اسم العميل"
                    disabled={isCreatingCustomer}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-customer-phone" className="text-sm">
                    رقم الهاتف
                  </Label>
                  <Input
                    id="new-customer-phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="رقم الهاتف"
                    disabled={isCreatingCustomer}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-customer-email" className="text-sm">
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="new-customer-email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="البريد الإلكتروني"
                    disabled={isCreatingCustomer}
                  />
                </div>
                
                <Button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={isCreatingCustomer || !newCustomer.name.trim()}
                  className="w-full"
                >
                  {isCreatingCustomer ? 'جاري الإنشاء...' : 'إنشاء العميل'}
                </Button>
              </div>
            )}
          </div>

          {/* مبلغ الدين */}
          <div className="space-y-2">
            <Label htmlFor="debt-amount">مبلغ الدين *</Label>
            <Input
              id="debt-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          {/* وصف الدين */}
          <div className="space-y-2">
            <Label htmlFor="debt-description">وصف الدين *</Label>
            <Textarea
              id="debt-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أدخل وصف الدين أو السبب"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* تاريخ الاستحقاق */}
          <div className="space-y-2">
            <Label htmlFor="due-date">تاريخ الاستحقاق (اختياري)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCustomerId || !amount || !description.trim()}
          >
            {isSubmitting ? 'جاري الإضافة...' : 'إضافة الدين'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDebtModal;
