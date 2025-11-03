import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface RepairQuickFormProps {
  defaults?: {
    customer_name?: string;
    customer_phone?: string;
    device_type?: string;
    issue_description?: string;
    repair_location?: string;
    total_price?: number | string | null;
    paid_amount?: number | string | null;
    payment_method?: string;
    price_to_be_determined_later?: boolean;
  };
  locations?: string[];
  onSubmit: (data: {
    customer_name: string;
    customer_phone: string;
    device_type: string;
    issue_description?: string;
    repair_location?: string;
    total_price?: number | null;
    paid_amount?: number | null;
    payment_method?: string;
    price_to_be_determined_later?: boolean;
  }) => Promise<void> | void;
}

export const RepairQuickForm: React.FC<RepairQuickFormProps> = ({ defaults, locations = [], onSubmit }) => {
  const [customerName, setCustomerName] = useState(defaults?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(defaults?.customer_phone || '');
  const [deviceType, setDeviceType] = useState(defaults?.device_type || '');
  const [issue, setIssue] = useState(defaults?.issue_description || '');
  const [location, setLocation] = useState(defaults?.repair_location || '');
  const [totalPrice, setTotalPrice] = useState(String(defaults?.total_price ?? ''));
  const [paidAmount, setPaidAmount] = useState(String(defaults?.paid_amount ?? ''));
  const [paymentMethod, setPaymentMethod] = useState(defaults?.payment_method || 'cash');
  const [priceTBD, setPriceTBD] = useState(!!defaults?.price_to_be_determined_later);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const phoneOk = /\d{8,}/.test((customerPhone || '').replace(/\D+/g, ''));
    return customerName.trim().length >= 2 && phoneOk && deviceType.trim().length >= 2;
  }, [customerName, customerPhone, deviceType]);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const tp = parseFloat((totalPrice || '').toString().replace(',', '.'));
      const pd = parseFloat((paidAmount || '').toString().replace(',', '.'));
      await onSubmit({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        device_type: deviceType.trim(),
        issue_description: issue.trim() || undefined,
        repair_location: location || undefined,
        total_price: priceTBD ? null : (isNaN(tp) ? undefined : tp),
        paid_amount: priceTBD ? 0 : (isNaN(pd) ? undefined : pd),
        payment_method: paymentMethod,
        price_to_be_determined_later: priceTBD,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">اسم العميل</label>
          <Input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="الاسم الكامل" />
        </div>
        <div>
          <label className="text-xs">رقم الهاتف</label>
          <Input value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} placeholder="05xxxxxxxx" />
        </div>
      </div>
      <div>
        <label className="text-xs">نوع الجهاز</label>
        <Input value={deviceType} onChange={(e)=>setDeviceType(e.target.value)} placeholder="مثال: آيفون 13" />
      </div>
      <div>
        <label className="text-xs">وصف المشكلة</label>
        <Textarea value={issue} onChange={(e)=>setIssue(e.target.value)} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">مكان التصليح</label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger>
              <SelectValue placeholder="اختر مكان التصليح (اختياري)" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <Checkbox checked={priceTBD} onCheckedChange={(v)=>setPriceTBD(!!v)} />
          <span className="text-xs">السعر يحدد لاحقاً</span>
        </div>
      </div>
      {!priceTBD && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">السعر الكلي</label>
            <Input value={totalPrice} onChange={(e)=>setTotalPrice(e.target.value)} placeholder="0" type="number" />
          </div>
          <div>
            <label className="text-xs">المبلغ المدفوع الآن</label>
            <Input value={paidAmount} onChange={(e)=>setPaidAmount(e.target.value)} placeholder="0" type="number" />
          </div>
        </div>
      )}
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
      <Button disabled={!canSubmit || loading} onClick={handleSubmit} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تسجيل طلبية تصليح'}
      </Button>
    </div>
  );
};

