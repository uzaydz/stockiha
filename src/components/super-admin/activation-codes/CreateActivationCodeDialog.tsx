import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { CalendarIcon, ListPlus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

import { CreateActivationCodeBatchDto } from '@/types/activation';
import { ActivationService } from '@/lib/activation-service';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billing_period: string;
}

interface Props {
  onSuccess?: (batchId: string, count: number) => void;
}

export default function CreateActivationCodeDialog({ onSuccess }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  
  const [formData, setFormData] = useState<CreateActivationCodeBatchDto>({
    name: '',
    plan_id: '',
    count: 10,
    billing_cycle: 'yearly',
    expires_at: undefined,
    notes: ''
  });
  
  // تاريخ انتهاء الصلاحية
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  
  // جلب خطط الاشتراك
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('monthly_price', { ascending: true });
        
        if (error) throw error;
        
        setPlans(data as SubscriptionPlan[]);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في جلب خطط الاشتراك",
          description: "تعذر جلب خطط الاشتراك، يرجى المحاولة مرة أخرى",
        });
      } finally {
        setLoadingPlans(false);
      }
    };
    
    if (open) {
      fetchPlans();
    }
  }, [open, toast]);
  
  // تحديث تاريخ انتهاء الصلاحية في النموذج عند تغييره
  useEffect(() => {
    if (expiryDate) {
      setFormData({ ...formData, expires_at: expiryDate.toISOString() });
    } else {
      setFormData({ ...formData, expires_at: undefined });
    }
  }, [expiryDate]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'count') {
      // التأكد من أن العدد صحيح وإيجابي
      const count = parseInt(value);
      if (isNaN(count) || count < 1) return;
      if (count > 1000) return; // حد أقصى للعدد
      
      setFormData({ ...formData, count });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // التحقق من البيانات
      if (!formData.name.trim()) {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "يرجى إدخال اسم للدفعة",
        });
        return;
      }
      
      if (!formData.plan_id) {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "يرجى اختيار خطة الاشتراك",
        });
        return;
      }
      
      // إنشاء الدفعة وأكواد التفعيل
      const result = await ActivationService.createActivationCodeBatch(formData);
      
      toast({
        title: "تم إنشاء أكواد التفعيل بنجاح",
        description: `تم إنشاء ${result.codesCount} كود تفعيل جديد`,
      });
      
      // إعادة ضبط النموذج
      setFormData({
        name: '',
        plan_id: '',
        count: 10,
        billing_cycle: 'yearly',
        expires_at: undefined,
        notes: ''
      });
      setExpiryDate(undefined);
      
      // إغلاق النافذة وتنفيذ callback
      setOpen(false);
      if (onSuccess) {
        onSuccess(result.batchId, result.codesCount);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء أكواد التفعيل",
        description: error.message || "حدث خطأ أثناء إنشاء أكواد التفعيل",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      plan_id: '',
      count: 10,
      billing_cycle: 'yearly',
      expires_at: undefined,
      notes: ''
    });
    setExpiryDate(undefined);
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إنشاء أكواد تفعيل
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>إنشاء أكواد تفعيل جديدة</DialogTitle>
          <DialogDescription>
            قم بإنشاء دفعة جديدة من أكواد التفعيل لخطة اشتراك معينة
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="name">اسم الدفعة</Label>
            <Input
              id="name"
              name="name"
              placeholder="مثال: أكواد الإشتراكات السنوية - يوليو 2023"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="plan_id">خطة الاشتراك</Label>
            <Select 
              value={formData.plan_id} 
              onValueChange={(value) => handleSelectChange('plan_id', value)}
              disabled={loadingPlans}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPlans ? "جاري تحميل الخطط..." : "اختر خطة الاشتراك"} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex flex-col">
                      <span>{plan.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.price} دج - {
                          plan.billing_period === 'monthly' ? 'شهري' : 
                          plan.billing_period === 'quarterly' ? 'ربع سنوي' : 
                          plan.billing_period === 'semi_annual' ? 'نصف سنوي' : 
                          plan.billing_period === 'annual' ? 'سنوي' : plan.billing_period
                        }
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="billing_cycle">نوع الإشتراك</Label>
            <Select 
              value={formData.billing_cycle} 
              onValueChange={(value) => handleSelectChange('billing_cycle', value as 'monthly' | 'yearly')}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الإشتراك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">شهري</SelectItem>
                <SelectItem value="yearly">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="count">عدد الأكواد</Label>
              <Input
                id="count"
                name="count"
                type="number"
                min={1}
                max={1000}
                value={formData.count}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="expires_at">تاريخ انتهاء الصلاحية</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-right font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "yyyy/MM/dd") : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date() || date > new Date(new Date().setFullYear(new Date().getFullYear() + 3))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {expiryDate && (
                <Button 
                  variant="ghost" 
                  className="mt-1 h-6 text-xs" 
                  onClick={() => setExpiryDate(undefined)}
                >
                  إلغاء التاريخ
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="ملاحظات إضافية عن دفعة الأكواد (اختياري)"
              value={formData.notes}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.name || !formData.plan_id || formData.count < 1}
          >
            {loading ? (
              <>
                <span className="animate-spin ml-2">&#9696;</span>
                جاري الإنشاء...
              </>
            ) : (
              <>
                <ListPlus className="ml-2 h-4 w-4" />
                إنشاء الأكواد
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
