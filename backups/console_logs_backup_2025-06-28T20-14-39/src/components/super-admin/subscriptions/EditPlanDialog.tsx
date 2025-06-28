import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SubscriptionPlan } from '@/types/subscription';

interface EditPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  onSave: (plan: SubscriptionPlan) => void;
}

export function EditPlanDialog({ open, onOpenChange, plan, onSave }: EditPlanDialogProps) {
  const [editedPlan, setEditedPlan] = useState<SubscriptionPlan | null>(null);
  const [featuresText, setFeaturesText] = useState('');

  // عند تغيير الخطة المحددة، قم بتحديث النموذج
  useEffect(() => {
    if (plan) {
      setEditedPlan({ ...plan });
      
      // تحويل مصفوفة الميزات إلى نص حيث كل ميزة في سطر
      if (Array.isArray(plan.features)) {
        setFeaturesText(plan.features.join('\n'));
      } else {
        setFeaturesText('');
      }
    }
  }, [plan]);

  const handleSave = () => {
    if (editedPlan) {
      // تحويل النص إلى مصفوفة مرة أخرى
      const updatedPlan = {
        ...editedPlan,
        features: featuresText.split('\n').filter(feature => feature.trim() !== ''),
      };
      onSave(updatedPlan);
    }
  };

  const handleInputChange = (field: keyof SubscriptionPlan, value: any) => {
    if (editedPlan) {
      setEditedPlan({ ...editedPlan, [field]: value });
    }
  };

  const handleLimitChange = (field: string, value: string) => {
    if (editedPlan && editedPlan.limits) {
      const parsedValue = value === '' ? null : parseInt(value, 10);
      setEditedPlan({
        ...editedPlan,
        limits: {
          ...editedPlan.limits,
          [field]: parsedValue
        }
      });
    }
  };

  if (!editedPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تعديل خطة الاشتراك</DialogTitle>
          <DialogDescription>
            قم بتعديل تفاصيل وأسعار خطة الاشتراك.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الخطة</Label>
              <Input 
                id="name"
                value={editedPlan.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">رمز الخطة</Label>
              <Input 
                id="code"
                value={editedPlan.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">وصف الخطة</Label>
            <Textarea 
              id="description"
              value={editedPlan.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
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
                  value={editedPlan.monthly_price}
                  onChange={(e) => handleInputChange('monthly_price', parseFloat(e.target.value))}
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
                  value={editedPlan.yearly_price}
                  onChange={(e) => handleInputChange('yearly_price', parseFloat(e.target.value))}
                />
                <span className="absolute left-3 top-2.5 text-muted-foreground">د.ج</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trial_period">فترة التجربة (أيام)</Label>
              <Input 
                id="trial_period"
                type="number"
                value={editedPlan.trial_period_days}
                onChange={(e) => handleInputChange('trial_period_days', parseInt(e.target.value, 10))}
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
                value={editedPlan.limits?.max_users === null ? '' : editedPlan.limits?.max_users}
                onChange={(e) => handleLimitChange('max_users', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_products">الحد الأقصى للمنتجات</Label>
              <Input 
                id="max_products"
                type="number"
                placeholder="غير محدود"
                value={editedPlan.limits?.max_products === null ? '' : editedPlan.limits?.max_products}
                onChange={(e) => handleLimitChange('max_products', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_pos">الحد الأقصى لنقاط البيع</Label>
              <Input 
                id="max_pos"
                type="number"
                placeholder="غير محدود"
                value={editedPlan.limits?.max_pos === null ? '' : editedPlan.limits?.max_pos}
                onChange={(e) => handleLimitChange('max_pos', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_order">ترتيب العرض</Label>
            <Input 
              id="display_order"
              type="number"
              value={editedPlan.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value, 10))}
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
              checked={editedPlan.is_active} 
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
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
              checked={editedPlan.is_popular} 
              onCheckedChange={(checked) => handleInputChange('is_popular', checked)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
