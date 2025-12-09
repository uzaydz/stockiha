/**
 * AddDebtModal - Simplified Apple-Inspired Design
 * ============================================================
 * Clean and minimal debt creation dialog
 * Matches the table and details design style
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserPlus, X } from 'lucide-react';
import { Customer } from '@/types/customer';
import { createLocalDebt, CreateDebtData } from '@/lib/api/debts';
import { useTenant } from '@/context/TenantContext';
import { getLocalCustomers, createLocalCustomer } from '@/api/localCustomerService';
import { cn } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

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

// ===============================================================================
// Simple Input Row
// ===============================================================================

interface InputRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
  multiline?: boolean;
  rows?: number;
}

const InputRow = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  error,
  disabled,
  dir,
  multiline,
  rows = 2
}: InputRowProps) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
    <span className="w-24 shrink-0 text-sm text-zinc-500 dark:text-zinc-400 pt-2">
      {label}
      {required && <span className="text-orange-500 mr-1">*</span>}
    </span>
    {multiline ? (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        rows={rows}
        className={cn(
          "flex-1 border-0 bg-transparent px-0 resize-none",
          "text-sm font-medium text-zinc-900 dark:text-zinc-100",
          "placeholder:text-zinc-300 dark:placeholder:text-zinc-600",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          error && "text-red-500"
        )}
      />
    ) : (
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        className={cn(
          "flex-1 h-9 border-0 bg-transparent px-0",
          "text-sm font-medium text-zinc-900 dark:text-zinc-100",
          "placeholder:text-zinc-300 dark:placeholder:text-zinc-600",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          error && "text-red-500"
        )}
      />
    )}
  </div>
);

// ===============================================================================
// Main Component
// ===============================================================================

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const customersData = await getLocalCustomers(currentOrganization?.id);
      setCustomers(customersData as unknown as Customer[]);
    } catch (error) {
      console.error('[AddDebtModal] Error loading customers:', error);
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
    setErrors({});
  };

  const updateField = (field: string, value: string) => {
    if (field === 'amount') setAmount(value);
    else if (field === 'description') setDescription(value);
    else if (field === 'dueDate') setDueDate(value);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCustomerId) newErrors.customer = 'مطلوب';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'مطلوب';
    if (!description.trim()) newErrors.description = 'مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      const createdCustomer = await createLocalCustomer(customerData);
      setCustomers(prev => [createdCustomer as unknown as Customer, ...prev]);
      setSelectedCustomerId(createdCustomer.id);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', email: '', phone: '' });
      toast.success('تم إنشاء العميل بنجاح');
    } catch (error) {
      console.error('[AddDebtModal] Error creating customer:', error);
      toast.error('فشل في إنشاء العميل');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // معالج إرسال النموذج
  const handleSubmit = async () => {
    if (!validateForm()) return;

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

      await createLocalDebt(debtData);
      toast.success('تم إضافة الدين بنجاح');
      onOpenChange(false);
      onDebtAdded?.();
    } catch (error) {
      console.error('[AddDebtModal] Error creating debt:', error);
      toast.error('فشل في إضافة الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            إضافة دين جديد
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            قم بتسجيل دين جديد لأحد العملاء
          </p>
        </div>

        {/* Form */}
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
          {/* اختيار العميل */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              العميل <span className="text-orange-500">*</span>
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2">
              {!showNewCustomerForm ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={loadingCustomers || isSubmitting}
                  >
                    <SelectTrigger className="flex-1 h-9 border-0 bg-transparent shadow-none focus:ring-0">
                      <SelectValue placeholder={loadingCustomers ? "جاري التحميل..." : "اختر عميل"} />
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
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomerForm(true)}
                    disabled={isSubmitting}
                    className="h-8 px-2 rounded-lg gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="text-xs">جديد</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      إنشاء عميل جديد
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewCustomerForm(false)}
                      disabled={isCreatingCustomer}
                      className="h-6 w-6 p-0 rounded-full"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="اسم العميل *"
                    disabled={isCreatingCustomer}
                    className="h-9 rounded-lg text-sm"
                  />
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="رقم الهاتف"
                    disabled={isCreatingCustomer}
                    dir="ltr"
                    className="h-9 rounded-lg text-sm"
                  />

                  <Button
                    type="button"
                    onClick={handleCreateCustomer}
                    disabled={isCreatingCustomer || !newCustomer.name.trim()}
                    className="w-full h-9 rounded-lg text-xs bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isCreatingCustomer ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      'إنشاء العميل'
                    )}
                  </Button>
                </div>
              )}
            </div>
            {errors.customer && (
              <p className="text-xs text-red-500 mt-1">{errors.customer}</p>
            )}
          </div>

          {/* تفاصيل الدين */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              تفاصيل الدين
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3">
              <InputRow
                label="المبلغ"
                value={amount}
                onChange={(v) => updateField('amount', v)}
                placeholder="0.00"
                type="number"
                required
                error={errors.amount}
                disabled={isSubmitting}
                dir="ltr"
              />
              <InputRow
                label="الوصف"
                value={description}
                onChange={(v) => updateField('description', v)}
                placeholder="سبب الدين أو تفاصيله"
                required
                error={errors.description}
                disabled={isSubmitting}
                multiline
                rows={2}
              />
              <InputRow
                label="الاستحقاق"
                value={dueDate}
                onChange={(v) => updateField('dueDate', v)}
                placeholder="اختياري"
                type="date"
                disabled={isSubmitting}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCustomerId || !amount || !description.trim()}
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإضافة...
              </>
            ) : (
              'إضافة الدين'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddDebtModal;
