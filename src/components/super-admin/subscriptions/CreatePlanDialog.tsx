import { useState } from 'react';
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
import { SubscriptionPlan } from '@/types/subscription';
import { Plus } from 'lucide-react';

interface CreatePlanDialogProps {
  onCreatePlan: (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function CreatePlanDialog({ onCreatePlan }: CreatePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(3999);
  const [yearlyPrice, setYearlyPrice] = useState(39990);
  const [trialPeriodDays, setTrialPeriodDays] = useState(5);
  const [maxUsers, setMaxUsers] = useState<number | null>(3);
  const [maxProducts, setMaxProducts] = useState<number | null>(100);
  const [maxPos, setMaxPos] = useState<number | null>(1);
  const [isActive, setIsActive] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  const handleCreate = () => {
    const newPlan = {
      name,
      code,
      description,
      features: featuresText.split('\n').filter(f => f.trim() !== ''),
      monthly_price: monthlyPrice,
      yearly_price: yearlyPrice,
      trial_period_days: trialPeriodDays,
      limits: {
        max_users: maxUsers,
        max_products: maxProducts,
        max_pos: maxPos
      },
      is_active: isActive,
      is_popular: isPopular,
      display_order: displayOrder,
    };

    onCreatePlan(newPlan);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setFeaturesText('');
    setMonthlyPrice(3999);
    setYearlyPrice(39990);
    setTrialPeriodDays(5);
    setMaxUsers(3);
    setMaxProducts(100);
    setMaxPos(1);
    setIsActive(true);
    setIsPopular(false);
    setDisplayOrder(0);
  };

  const handleNumberOrNull = (value: string, setter: (value: number | null) => void) => {
    if (value.trim() === '') {
      setter(null);
    } else {
      setter(parseInt(value, 10));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          <span>خطة جديدة</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>إضافة خطة اشتراك جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل خطة الاشتراك الجديدة وأسعارها.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الخطة</Label>
              <Input 
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أساسي، متميز، مؤسسات"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">رمز الخطة</Label>
              <Input 
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: basic, premium, enterprise"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">وصف الخطة</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف موجز للخطة"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="features">مميزات الخطة (كل سطر ميزة)</Label>
            <Textarea 
              id="features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="أضف كل ميزة في سطر منفصل"
              className="min-h-[120px]"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_price">السعر الشهري</Label>
              <div className="relative">
                <Input 
                  id="monthly_price"
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(parseFloat(e.target.value))}
                />
                <span className="absolute left-3 top-2.5 text-muted-foreground">د.ج</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yearly_price">السعر السنوي</Label>
              <div className="relative">
                <Input 
                  id="yearly_price"
                  type="number"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(parseFloat(e.target.value))}
                />
                <span className="absolute left-3 top-2.5 text-muted-foreground">د.ج</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trial_period">فترة التجربة (أيام)</Label>
              <Input 
                id="trial_period"
                type="number"
                value={trialPeriodDays}
                onChange={(e) => setTrialPeriodDays(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_users">الحد الأقصى للمستخدمين</Label>
              <Input 
                id="max_users"
                type="number"
                placeholder="غير محدود"
                value={maxUsers === null ? '' : maxUsers}
                onChange={(e) => handleNumberOrNull(e.target.value, setMaxUsers)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_products">الحد الأقصى للمنتجات</Label>
              <Input 
                id="max_products"
                type="number"
                placeholder="غير محدود"
                value={maxProducts === null ? '' : maxProducts}
                onChange={(e) => handleNumberOrNull(e.target.value, setMaxProducts)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_pos">الحد الأقصى لنقاط البيع</Label>
              <Input 
                id="max_pos"
                type="number"
                placeholder="غير محدود"
                value={maxPos === null ? '' : maxPos}
                onChange={(e) => handleNumberOrNull(e.target.value, setMaxPos)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_order">ترتيب العرض</Label>
            <Input 
              id="display_order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <Label htmlFor="is_active" className="ml-2">تفعيل الخطة</Label>
                <span className="text-xs text-muted-foreground mr-1">(متاحة للاشتراك)</span>
              </div>
            </div>
            <Switch 
              id="is_active" 
              checked={isActive} 
              onCheckedChange={setIsActive}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <Label htmlFor="is_popular" className="ml-2">الخطة الأكثر شيوعاً</Label>
                <span className="text-xs text-muted-foreground mr-1">(سيتم عرضها بشكل مميز)</span>
              </div>
            </div>
            <Switch 
              id="is_popular" 
              checked={isPopular} 
              onCheckedChange={setIsPopular}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetForm();
            setOpen(false);
          }}>إلغاء</Button>
          <Button onClick={handleCreate} disabled={!name || !code}>إضافة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 