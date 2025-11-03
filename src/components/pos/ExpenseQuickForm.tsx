import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ExpenseQuickFormProps {
  defaults?: {
    title?: string;
    amount?: number | string;
    category?: string;
    date?: string;
    payment_method?: string;
    vendor_name?: string;
    notes?: string;
  };
  categories?: string[];
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    date?: string;
    payment_method?: string;
    vendor_name?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const ExpenseQuickForm: React.FC<ExpenseQuickFormProps> = ({ defaults, categories = [], onSubmit }) => {
  const [title, setTitle] = useState(defaults?.title || '');
  const [amount, setAmount] = useState(String(defaults?.amount || ''));
  const [category, setCategory] = useState(defaults?.category || '');
  const [date, setDate] = useState(defaults?.date || new Date().toISOString().slice(0,10));
  const [paymentMethod, setPaymentMethod] = useState(defaults?.payment_method || 'cash');
  const [vendor, setVendor] = useState(defaults?.vendor_name || '');
  const [notes, setNotes] = useState(defaults?.notes || '');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const a = parseFloat((amount || '').toString().replace(',', '.'));
    return title.trim().length >= 2 && !isNaN(a) && a > 0 && category.trim().length >= 1;
  }, [title, amount, category]);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount: parseFloat((amount || '').toString().replace(',', '.')),
        category: category.trim(),
        date,
        payment_method: paymentMethod,
        vendor_name: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">عنوان</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: توصيل" />
        </div>
        <div>
          <label className="text-xs">المبلغ</label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" type="number" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">الفئة</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="اختر فئة" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs">التاريخ</label>
          <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">طريقة الدفع</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="طريقة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">نقد</SelectItem>
              <SelectItem value="card">بطاقة</SelectItem>
              <SelectItem value="bank">تحويل بنكي</SelectItem>
              <SelectItem value="mobile">محفظة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs">المورد/الجهة</label>
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="اختياري" />
        </div>
      </div>
      <div>
        <label className="text-xs">ملاحظات</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <Button disabled={!canSubmit || loading} onClick={handleSubmit} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تسجيل المصروف'}
      </Button>
    </div>
  );
};

