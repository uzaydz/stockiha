import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Gift, 
  Star, 
  Truck, 
  TrendingUp,
  Zap,
  Crown,
  Package,
  Edit3,
  DollarSign,
  Percent
} from 'lucide-react';
import { SpecialOffer, SpecialOffersConfig } from '@/types/specialOffers';
import { cn } from '@/lib/utils';

interface SpecialOffersManagerProps {
  config: SpecialOffersConfig;
  basePrice: number;
  productName: string;
  onChange: (config: SpecialOffersConfig) => void;
}

const SpecialOffersManager: React.FC<SpecialOffersManagerProps> = ({
  config,
  basePrice,
  productName,
  onChange
}) => {
  const [editingOffer, setEditingOffer] = useState<string | null>(null);

  // إنشاء عرض جديد
  const createNewOffer = useCallback(() => {
    const newOffer: SpecialOffer = {
      id: `offer_${Date.now()}`,
      name: `عرض ${config.offers.length + 1}`,
      quantity: 2,
      originalPrice: basePrice * 2,
      discountedPrice: basePrice * 1.8,
      discountPercentage: 10,
      freeShipping: false,
      isRecommended: false,
      isPopular: false,
      savings: basePrice * 0.2,
      pricePerUnit: basePrice * 0.9,
      features: [],
      badgeColor: 'primary'
    };

    onChange({
      ...config,
      offers: [...config.offers, newOffer]
    });
  }, [config, basePrice, onChange]);

  // حذف عرض
  const deleteOffer = useCallback((offerId: string) => {
    onChange({
      ...config,
      offers: config.offers.filter(offer => offer.id !== offerId)
    });
  }, [config, onChange]);

  // تحديث عرض
  const updateOffer = useCallback((offerId: string, updates: Partial<SpecialOffer>) => {
    onChange({
      ...config,
      offers: config.offers.map(offer => 
        offer.id === offerId 
          ? { 
              ...offer, 
              ...updates,
              savings: (updates.originalPrice || offer.originalPrice) - (updates.discountedPrice || offer.discountedPrice),
              pricePerUnit: (updates.discountedPrice || offer.discountedPrice) / (updates.quantity || offer.quantity),
              discountPercentage: Math.round(((updates.originalPrice || offer.originalPrice) - (updates.discountedPrice || offer.discountedPrice)) / (updates.originalPrice || offer.originalPrice) * 100)
            }
          : offer
      )
    });
  }, [config, onChange]);

  // عروض افتراضية ذكية
  const generateSmartOffers = useCallback(() => {
    const smartOffers: SpecialOffer[] = [
      {
        id: 'smart_1',
        name: 'علبة واحدة',
        description: 'العرض الأساسي',
        quantity: 1,
        originalPrice: basePrice,
        discountedPrice: basePrice,
        discountPercentage: 0,
        freeShipping: false,
        isRecommended: false,
        isPopular: false,
        savings: 0,
        pricePerUnit: basePrice,
        features: [],
        badgeColor: 'default'
      },
      {
        id: 'smart_2',
        name: 'علبتين',
        description: 'توفير أكثر',
        quantity: 2,
        originalPrice: basePrice * 2,
        discountedPrice: basePrice * 1.9,
        discountPercentage: 5,
        freeShipping: false,
        isRecommended: false,
        isPopular: true,
        savings: basePrice * 0.1,
        pricePerUnit: basePrice * 0.95,
        features: ['توفير 5%'],
        badgeText: 'شائع',
        badgeColor: 'warning'
      },
      {
        id: 'smart_3',
        name: 'ثلاث علب',
        description: 'الأكثر توفيراً',
        quantity: 3,
        originalPrice: basePrice * 3,
        discountedPrice: basePrice * 2.7,
        discountPercentage: 10,
        freeShipping: true,
        isRecommended: true,
        isPopular: false,
        savings: basePrice * 0.3,
        pricePerUnit: basePrice * 0.9,
        features: ['توفير 10%', 'التوصيل مجاني'],
        badgeText: 'الأفضل',
        badgeColor: 'success'
      },
      {
        id: 'smart_4',
        name: 'أربعة علب + الخامس هدية',
        description: 'العرض الحصري',
        quantity: 4,
        bonusQuantity: 1,
        originalPrice: basePrice * 5,
        discountedPrice: basePrice * 3.8,
        discountPercentage: 24,
        freeShipping: true,
        isRecommended: false,
        isPopular: false,
        savings: basePrice * 1.2,
        pricePerUnit: basePrice * 0.76,
        features: ['توفير 24%', 'التوصيل مجاني', 'علبة إضافية مجاناً'],
        badgeText: 'عرض حصري',
        badgeColor: 'danger'
      }
    ];

    onChange({
      ...config,
      offers: smartOffers
    });
  }, [basePrice, config, onChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">العروض الخاصة</h3>
              <p className="text-sm text-muted-foreground font-normal">
                إنشاء عروض جذابة لزيادة المبيعات
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* تفعيل العروض */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-base font-semibold">تفعيل العروض الخاصة</Label>
              <p className="text-sm text-muted-foreground">
                عرض خيارات كميات مختلفة بأسعار مخفضة
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onChange({ ...config, enabled })}
            />
          </div>

          {/* أزرار سريعة */}
          {config.enabled && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={generateSmartOffers}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                عروض ذكية
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={createNewOffer}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة عرض
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة العروض */}
      <AnimatePresence>
        {config.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {config.offers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عروض بعد</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    ابدأ بإنشاء عروض جذابة لزيادة مبيعاتك
                  </p>
                  <Button onClick={generateSmartOffers} className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    إنشاء عروض ذكية
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {config.offers.map((offer, index) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    index={index}
                    isEditing={editingOffer === offer.id}
                    onEdit={() => setEditingOffer(offer.id)}
                    onSave={() => setEditingOffer(null)}
                    onCancel={() => setEditingOffer(null)}
                    onUpdate={(updates) => updateOffer(offer.id, updates)}
                    onDelete={() => deleteOffer(offer.id)}
                    currency={config.currency}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// مكون بطاقة العرض
interface OfferCardProps {
  offer: SpecialOffer;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUpdate: (updates: Partial<SpecialOffer>) => void;
  onDelete: () => void;
  currency: string;
}

const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onUpdate,
  onDelete,
  currency
}) => {
  const [localOffer, setLocalOffer] = useState(offer);

  const handleSave = () => {
    onUpdate(localOffer);
    onSave();
  };

  const handleCancel = () => {
    setLocalOffer(offer);
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        offer.isRecommended && "ring-2 ring-green-500/50",
        offer.isPopular && "ring-2 ring-orange-500/50"
      )}>
        {/* شارات */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {offer.isRecommended && (
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <Crown className="w-3 h-3" />
              الأفضل
            </Badge>
          )}
          {offer.isPopular && (
            <Badge className="bg-orange-500 text-white flex items-center gap-1">
              <Star className="w-3 h-3" />
              شائع
            </Badge>
          )}
          {offer.badgeText && (
            <Badge variant={offer.badgeColor as any} className="flex items-center gap-1">
              {offer.badgeText}
            </Badge>
          )}
        </div>

        <CardContent className="p-6">
          {isEditing ? (
            // وضع التحرير
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>اسم العرض</Label>
                  <Input
                    value={localOffer.name}
                    onChange={(e) => setLocalOffer({ ...localOffer, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Input
                    value={localOffer.description || ''}
                    onChange={(e) => setLocalOffer({ ...localOffer, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={localOffer.quantity}
                    onChange={(e) => setLocalOffer({ ...localOffer, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>الكمية المجانية</Label>
                  <Input
                    type="number"
                    value={localOffer.bonusQuantity || 0}
                    onChange={(e) => setLocalOffer({ ...localOffer, bonusQuantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>السعر الأصلي</Label>
                  <Input
                    type="number"
                    value={localOffer.originalPrice}
                    onChange={(e) => setLocalOffer({ ...localOffer, originalPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>السعر بعد الخصم</Label>
                  <Input
                    type="number"
                    value={localOffer.discountedPrice}
                    onChange={(e) => setLocalOffer({ ...localOffer, discountedPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={localOffer.freeShipping}
                    onCheckedChange={(checked) => setLocalOffer({ ...localOffer, freeShipping: checked })}
                  />
                  <Label>التوصيل مجاني</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={localOffer.isRecommended}
                    onCheckedChange={(checked) => setLocalOffer({ ...localOffer, isRecommended: checked })}
                  />
                  <Label>عرض موصى به</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={localOffer.isPopular}
                    onCheckedChange={(checked) => setLocalOffer({ ...localOffer, isPopular: checked })}
                  />
                  <Label>عرض شائع</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} size="sm">حفظ</Button>
                <Button variant="outline" onClick={handleCancel} size="sm">إلغاء</Button>
              </div>
            </div>
          ) : (
            // وضع العرض
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{offer.name}</h3>
                  {offer.description && (
                    <p className="text-sm text-muted-foreground">{offer.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* الكمية */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold">{offer.quantity}</span>
                    {offer.bonusQuantity && offer.bonusQuantity > 0 && (
                      <>
                        <span className="text-lg text-muted-foreground">+</span>
                        <span className="text-lg font-semibold text-green-600">{offer.bonusQuantity}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {offer.bonusQuantity && offer.bonusQuantity > 0 ? 'قطع + مجاني' : 'قطع'}
                  </p>
                </div>

                {/* السعر */}
                <div className="text-center">
                  <div className="space-y-1">
                    {offer.originalPrice !== offer.discountedPrice && (
                      <div className="text-sm text-muted-foreground line-through">
                        {offer.originalPrice.toLocaleString()} {currency}
                      </div>
                    )}
                    <div className="text-2xl font-bold text-green-600">
                      {offer.discountedPrice.toLocaleString()} {currency}
                    </div>
                    {offer.discountPercentage > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        -{offer.discountPercentage}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* الميزات */}
                <div className="space-y-2">
                  {offer.freeShipping && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Truck className="w-4 h-4" />
                      <span>التوصيل مجاني</span>
                    </div>
                  )}
                  {offer.savings > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>توفير {offer.savings.toLocaleString()} {currency}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>{offer.pricePerUnit.toLocaleString()} {currency}/قطعة</span>
                  </div>
                </div>
              </div>

              {offer.features.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {offer.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SpecialOffersManager;
