import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  DollarSign
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

  // عروض افتراضية مبسطة
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
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-2 bg-background/50 border border-border/60 rounded-lg">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-xs font-medium">إدارة العروض</h3>
            <p className="text-[10px] text-muted-foreground">إنشاء عروض جذابة</p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => {
            onChange({ ...config, enabled });
          }}
        />
      </div>

      {/* Compact Buttons */}
      {config.enabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              generateSmartOffers();
            }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 h-7"
          >
            <Zap className="w-3 h-3" />
            عروض ذكية
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              createNewOffer();
            }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 h-7"
          >
            <Plus className="w-3 h-3" />
            إضافة عرض
          </Button>
        </div>
      )}

      {/* Compact Offers List */}
      {config.enabled && (
        <div className="space-y-2">
          {config.offers.length === 0 ? (
            <div className="p-3 border border-dashed border-border/60 rounded-lg bg-background/50">
              <div className="flex flex-col items-center justify-center py-4">
                <Package className="w-6 h-6 text-muted-foreground mb-2" />
                <h3 className="text-xs font-semibold mb-1">لا توجد عروض بعد</h3>
                <p className="text-[10px] text-muted-foreground text-center mb-3 max-w-xs">
                  ابدأ بإنشاء عروض جذابة
                </p>
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    generateSmartOffers();
                  }} 
                  size="sm" 
                  className="text-[10px] px-2 py-1 h-6"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  عروض ذكية
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
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
        </div>
      )}
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
    <div className={cn(
      "relative border border-border/60 rounded-lg bg-background/50 transition-all duration-300",
      offer.isRecommended && "ring-1 ring-green-500/50",
      offer.isPopular && "ring-1 ring-orange-500/50"
    )}>
      {/* Compact Badges */}
      <div className="absolute top-1 left-1 z-10 flex gap-0.5">
        {offer.isRecommended && (
          <Badge className="bg-green-500 text-white text-[9px] px-1 py-0.5">
            <Crown className="w-2 h-2 mr-0.5" />
            الأفضل
          </Badge>
        )}
        {offer.isPopular && (
          <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0.5">
            <Star className="w-2 h-2 mr-0.5" />
            شائع
          </Badge>
        )}
        {offer.badgeText && (
          <Badge variant={offer.badgeColor as any} className="text-[9px] px-1 py-0.5">
            {offer.badgeText}
          </Badge>
        )}
      </div>

      <div className="p-2">
        {isEditing ? (
          // Compact Edit Mode
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">اسم العرض</Label>
                <Input
                  value={localOffer.name}
                  onChange={(e) => setLocalOffer({ ...localOffer, name: e.target.value })}
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px]">الوصف</Label>
                <Input
                  value={localOffer.description || ''}
                  onChange={(e) => setLocalOffer({ ...localOffer, description: e.target.value })}
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px]">الكمية</Label>
                <Input
                  type="number"
                  value={localOffer.quantity}
                  onChange={(e) => setLocalOffer({ ...localOffer, quantity: parseInt(e.target.value) || 1 })}
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px]">مجاني</Label>
                <Input
                  type="number"
                  value={localOffer.bonusQuantity || 0}
                  onChange={(e) => setLocalOffer({ ...localOffer, bonusQuantity: parseInt(e.target.value) || 0 })}
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px]">السعر الأصلي</Label>
                <Input
                  type="number"
                  value={localOffer.originalPrice}
                  onChange={(e) => setLocalOffer({ ...localOffer, originalPrice: parseFloat(e.target.value) || 0 })}
                  className="h-6 text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px]">السعر الجديد</Label>
                <Input
                  type="number"
                  value={localOffer.discountedPrice}
                  onChange={(e) => setLocalOffer({ ...localOffer, discountedPrice: parseFloat(e.target.value) || 0 })}
                  className="h-6 text-[10px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Switch
                  checked={localOffer.freeShipping}
                  onCheckedChange={(checked) => {
                    setLocalOffer({ ...localOffer, freeShipping: checked });
                  }}
                />
                <Label className="text-[10px]">توصيل مجاني</Label>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={localOffer.isRecommended}
                  onCheckedChange={(checked) => {
                    setLocalOffer({ ...localOffer, isRecommended: checked });
                  }}
                />
                <Label className="text-[10px]">موصى به</Label>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={localOffer.isPopular}
                  onCheckedChange={(checked) => {
                    setLocalOffer({ ...localOffer, isPopular: checked });
                  }}
                />
                <Label className="text-[10px]">شائع</Label>
              </div>
            </div>

            <div className="flex gap-1 pt-1">
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }} 
                size="sm" 
                className="text-[10px] px-2 py-1 h-6"
              >
                حفظ
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancel();
                }} 
                size="sm" 
                className="text-[10px] px-2 py-1 h-6"
              >
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          // Compact Display Mode
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold">{offer.name}</h3>
                {offer.description && (
                  <p className="text-[10px] text-muted-foreground">{offer.description}</p>
                )}
              </div>
              <div className="flex gap-0.5">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit();
                  }} 
                  className="h-5 w-5 p-0"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                  }} 
                  className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* الكمية والسعر */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium">الكمية:</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-bold">{offer.quantity}</span>
                    {offer.bonusQuantity && offer.bonusQuantity > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">+</span>
                        <span className="text-xs font-semibold text-green-600">{offer.bonusQuantity}</span>
                      </>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {offer.bonusQuantity && offer.bonusQuantity > 0 ? 'مجاني' : 'قطع'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium">السعر:</span>
                  <div className="text-right">
                    {offer.originalPrice !== offer.discountedPrice && (
                      <div className="text-[9px] text-muted-foreground line-through">
                        {offer.originalPrice.toLocaleString()} {currency}
                      </div>
                    )}
                    <div className="text-sm font-bold text-green-600">
                      {offer.discountedPrice.toLocaleString()} {currency}
                    </div>
                    {offer.discountPercentage > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0.5">
                        -{offer.discountPercentage}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* الميزات والتوفير */}
              <div className="space-y-1">
                {offer.freeShipping && (
                  <div className="flex items-center gap-1 text-[10px] text-green-600">
                    <Truck className="w-2.5 h-2.5" />
                    <span>توصيل مجاني</span>
                  </div>
                )}
                {offer.savings > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-600">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>توفير {offer.savings.toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <DollarSign className="w-2.5 h-2.5" />
                  <span>{offer.pricePerUnit.toLocaleString()} {currency}/قطعة</span>
                </div>
              </div>
            </div>

            {offer.features.length > 0 && (
              <div className="mt-2 pt-1 border-t border-border/60">
                <div className="flex flex-wrap gap-0.5">
                  {offer.features.map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[9px] px-1 py-0.5">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialOffersManager;
