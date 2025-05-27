import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash, Plus, Users } from 'lucide-react';
import { WholesaleTier } from '@/lib/api/products';
import { getWholesaleTiers, createWholesaleTier, updateWholesaleTier, deleteWholesaleTier } from '@/lib/api/products';
import { toast } from 'sonner';

interface WholesaleTierManagerProps {
  productId: string;
  organizationId: string;
  defaultPrice?: number;
  onChange?: (tiers: WholesaleTier[]) => void;
  readOnly?: boolean;
}

export default function WholesaleTierManager({
  productId,
  organizationId,
  defaultPrice = 0,
  onChange,
  readOnly = false
}: WholesaleTierManagerProps) {
  const [tiers, setTiers] = useState<WholesaleTier[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      loadTiers();
    }
  }, [productId]);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      
      const tiersData = await getWholesaleTiers(productId);
      
      setTiers(tiersData);
      onChange?.(tiersData);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل مراحل أسعار الجملة');
    } finally {
      setIsLoading(false);
    }
  };

  const addTier = async () => {
    if (readOnly) return;
    
    // Validate required IDs
    if (!productId) {
      toast.error('تعذر إضافة مرحلة سعرية: يجب حفظ المنتج أولاً');
      return;
    }
    
    // التأكد من وجود معرف المؤسسة
    if (!organizationId) {
      toast.error('تعذر إضافة مرحلة سعرية: معرف المؤسسة غير متوفر');
      return;
    }
    
    // Find max quantity from existing tiers to suggest the next tier
    const maxQuantity = tiers.length > 0 
      ? Math.max(...tiers.map(t => t.min_quantity)) + 5
      : 10;
    
    try {
      // For new product without ID, just update the local state
      if (!productId.startsWith('temp-') && !productId.includes('new')) {

        try {
          // إنشاء مرحلة سعرية جديدة للجملة
          const newTierData = {
            product_id: productId,
            min_quantity: maxQuantity,
            price: defaultPrice * 0.9, // تخفيض 10% كاقتراح
            organization_id: organizationId
          };
          
          const newTier = await createWholesaleTier(newTierData);
          
          if (newTier) {
            
            const updatedTiers = [...tiers, newTier];
            setTiers(updatedTiers);
            onChange?.(updatedTiers);
            toast.success('تمت إضافة مرحلة سعرية جديدة');
            return;
          } else {
            throw new Error('فشل إنشاء المرحلة السعرية');
          }
        } catch (apiError) {
          throw apiError;
        }
      }
      
      // If we're in product creation mode or API call failed, use a temp ID

      // حل مشكلة TypeScript باستخدام نوع بيانات متوافق مع الواجهة
      const tempTier: WholesaleTier = {
        id: `temp-${Date.now()}`,
        product_id: productId,
        min_quantity: maxQuantity,
        price: defaultPrice * 0.9
      };
      
      // إضافة معرف المؤسسة إذا كان متاحاً (اختياري في الواجهة)
      if (organizationId) {
        (tempTier as any).organization_id = organizationId;
      }
      
      const updatedTiers = [...tiers, tempTier];
      setTiers(updatedTiers);
      onChange?.(updatedTiers);
      toast.success('تمت إضافة مرحلة سعرية جديدة (وضع مؤقت)');
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة مرحلة سعرية جديدة');
    }
  };

  const updateTier = async (index: number, field: 'min_quantity' | 'price', value: number) => {
    if (readOnly) return;
    
    try {
      const updatedTiers = [...tiers];
      updatedTiers[index] = {
        ...updatedTiers[index],
        [field]: value
      };
      
      // Update the local state first
      setTiers(updatedTiers);
      onChange?.(updatedTiers);
      
      // If tier exists in the database, update it
      const tier = tiers[index];
      if (tier.id && !tier.id.startsWith('temp-') && !tier.id.includes('new')) {
        
        try {
          const updated = await updateWholesaleTier(tier.id, { [field]: value });
          
        } catch (updateError) {
          toast.error('حدث خطأ أثناء تحديث المرحلة السعرية');
          // Don't call loadTiers here to avoid unexpected state changes while editing
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث المرحلة السعرية');
    }
  };

  const removeTier = async (index: number) => {
    if (readOnly) return;
    
    try {
      const tier = tiers[index];
      const updatedTiers = [...tiers];
      updatedTiers.splice(index, 1);
      
      // Update local state first
      setTiers(updatedTiers);
      onChange?.(updatedTiers);
      
      // If tier exists in the database, delete it
      if (tier.id && !tier.id.startsWith('temp-') && !tier.id.includes('new')) {
        
        try {
          const result = await deleteWholesaleTier(tier.id);
          if (result) {
            
            toast.success('تم حذف المرحلة السعرية بنجاح');
          }
        } catch (deleteError) {
          toast.error('حدث خطأ أثناء حذف المرحلة السعرية');
          // Don't call loadTiers here to avoid UI confusion
        }
      } else {
        
        toast.success('تم حذف المرحلة السعرية');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المرحلة السعرية');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">مراحل أسعار الجملة</h3>
        </div>
        {!readOnly && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={addTier}
            disabled={isLoading || !productId || !organizationId}
            title={!productId ? 'يجب حفظ المنتج أولاً' : !organizationId ? 'بيانات المؤسسة غير متوفرة' : 'إضافة مرحلة جملة جديدة'}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة مرحلة
          </Button>
        )}
      </div>
      
      {tiers.length > 0 ? (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="flex items-end gap-3 bg-muted/30 p-3 rounded-md">
              <div className="flex-1">
                <Label htmlFor={`tier-quantity-${index}`}>الكمية</Label>
                <Input
                  id={`tier-quantity-${index}`}
                  type="number"
                  min="1"
                  value={tier.min_quantity}
                  onChange={(e) => updateTier(index, 'min_quantity', parseInt(e.target.value))}
                  disabled={readOnly}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`tier-price-${index}`}>السعر (دج)</Label>
                <Input
                  id={`tier-price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.price}
                  onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value))}
                  disabled={readOnly}
                />
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTier(index)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm bg-muted/20 rounded-md border border-dashed">
          لم يتم إضافة أي مراحل سعرية للجملة بعد
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        تتيح مراحل الأسعار تحديد أسعار مختلفة بناءً على الكمية المطلوبة.
        مثال: 1-9 بسعر 100 دج، 10-49 بسعر 90 دج، 50+ بسعر 80 دج.
      </div>
    </div>
  );
}
