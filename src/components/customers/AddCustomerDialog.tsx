/**
 * AddCustomerDialog - Simplified Apple-Inspired Design
 * ============================================================
 * Clean and minimal customer creation dialog
 * Matches the table and details design style
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { checkUserPermissions } from '@/lib/api/permissions';
import { cn } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

interface AddCustomerDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCustomerAdded: (customer: Customer) => void;
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
  dir
}: InputRowProps) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
    <span className="w-24 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
      {label}
      {required && <span className="text-orange-500 mr-1">*</span>}
    </span>
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
  </div>
);

// ===============================================================================
// Main Component
// ===============================================================================

const AddCustomerDialog = ({
  open: controlledOpen,
  onOpenChange,
  onCustomerAdded
}: AddCustomerDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nif: '',
    rc: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;
      try {
        const canManageCustomers = await checkUserPermissions(user, 'manageCustomers' as any);
        setHasPermission(canManageCustomers);
      } catch {
        setHasPermission(false);
      } finally {
        setPermissionChecked(true);
      }
    };
    checkPermission();
  }, [user]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !hasPermission && permissionChecked) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لإضافة عملاء جدد',
        variant: 'destructive'
      });
      return;
    }

    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }

    if (!newOpen) {
      resetForm();
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'مطلوب';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!hasPermission) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لإضافة عملاء جدد',
        variant: 'destructive'
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const organizationId = localStorage.getItem('bazaar_organization_id');
      if (!organizationId) throw new Error('لم يتم العثور على معرف المؤسسة');

      unifiedCustomerService.setOrganizationId(organizationId);
      const local = await unifiedCustomerService.createCustomer({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone.trim() || undefined,
        nif: formData.nif.trim() || undefined,
        rc: formData.rc.trim() || undefined,
        address: formData.address.trim() || undefined
      });

      const newCustomer: Customer = {
        id: local.id,
        name: local.name,
        email: local.email || '',
        phone: local.phone || null,
        organization_id: local.organization_id,
        created_at: local.created_at || '',
        updated_at: local.updated_at || '',
        nif: local.nif ?? null,
        rc: local.rc ?? null,
        nis: local.nis ?? null,
        rib: local.rib ?? null,
        address: local.address ?? null,
      };

      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة العميل',
      });

      onCustomerAdded(newCustomer);
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error?.message || 'حدث خطأ',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', nif: '', rc: '' });
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            إضافة عميل جديد
          </DialogTitle>
        </div>

        {/* Form */}
        <div className="px-5 py-3">
          {/* Basic Info */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              المعلومات الأساسية
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3">
              <InputRow
                label="الاسم"
                value={formData.name}
                onChange={(v) => updateField('name', v)}
                placeholder="اسم العميل"
                required
                error={errors.name}
                disabled={isSubmitting}
              />
              <InputRow
                label="الهاتف"
                value={formData.phone}
                onChange={(v) => updateField('phone', v)}
                placeholder="0555 123 456"
                type="tel"
                dir="ltr"
                disabled={isSubmitting}
              />
              <InputRow
                label="البريد"
                value={formData.email}
                onChange={(v) => updateField('email', v)}
                placeholder="email@example.com"
                type="email"
                dir="ltr"
                disabled={isSubmitting}
              />
              <InputRow
                label="العنوان"
                value={formData.address}
                onChange={(v) => updateField('address', v)}
                placeholder="العنوان الكامل"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Tax Info */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              المعلومات الضريبية <span className="font-normal">(اختياري)</span>
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3">
              <InputRow
                label="NIF"
                value={formData.nif}
                onChange={(v) => updateField('nif', v)}
                placeholder="الرقم الجبائي"
                dir="ltr"
                disabled={isSubmitting}
              />
              <InputRow
                label="RC"
                value={formData.rc}
                onChange={(v) => updateField('rc', v)}
                placeholder="السجل التجاري"
                dir="ltr"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasPermission}
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
