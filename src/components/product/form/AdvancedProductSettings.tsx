/**
 * 🚀 Advanced Product Settings
 *
 * مكون شامل لجميع الإعدادات المتقدمة للمنتج
 * يشمل: أنواع البيع، التتبع، الضمان، مستويات الأسعار، وحقول النشاط
 */

import { useState, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Scale, Box, Ruler, Calendar, Hash, ShieldCheck, Layers, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessType } from '@/context/BusinessProfileContext';
import type { ProductFormValues } from '@/types/product';

// ⚡ Direct imports بدلاً من lazy loading لتجنب مشاكل re-render
import WeightSellingSettings from './selling-types/WeightSellingSettings';
import BoxSellingSettings from './selling-types/BoxSellingSettings';
import MeterSellingSettings from './selling-types/MeterSellingSettings';
import ExpiryTrackingSettings from './tracking/ExpiryTrackingSettings';
import SerialNumberSettings from './tracking/SerialNumberSettings';
import WarrantySettings from './tracking/WarrantySettings';
import PriceTiersManager from './pricing/PriceTiersManager';
import BusinessSpecificFields from './business-specific/BusinessSpecificFields';

// =====================================================
// الأنواع
// =====================================================

interface AdvancedProductSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// =====================================================
// المكون الرئيسي
// =====================================================

const AdvancedProductSettings = ({ form, className }: AdvancedProductSettingsProps) => {
  const { type: businessType, isLoading: isLoadingType } = useBusinessType();
  const [activeTab, setActiveTab] = useState('weight');

  // ⚡ استخدام useWatch لضمان التحديث الصحيح عند تغيير القيم
  const formValues = useWatch({ control: form.control });

  // الحصول على سعر البيع الأساسي
  const basePrice = formValues?.price || 0;

  // إظهار جميع التبويبات دائماً
  const showBusinessSpecific = !!businessType && ['pharmacy', 'restaurant', 'cafe', 'bakery', 'auto_parts', 'construction'].includes(businessType);

  // تحديد التبويبات المتاحة
  const tabs = useMemo(() => {
    const availableTabs = [
      { value: 'weight', label: 'البيع بالوزن', icon: Scale },
      { value: 'box', label: 'البيع بالكرتون', icon: Box },
      { value: 'meter', label: 'البيع بالمتر', icon: Ruler },
      { value: 'expiry', label: 'الصلاحية', icon: Calendar },
      { value: 'serial', label: 'الأرقام التسلسلية', icon: Hash },
      { value: 'warranty', label: 'الضمان', icon: ShieldCheck },
      { value: 'price_tiers', label: 'مستويات الأسعار', icon: Layers },
    ];

    if (showBusinessSpecific) {
      availableTabs.push({ value: 'business', label: 'حقول النشاط', icon: Building2 });
    }

    return availableTabs;
  }, [showBusinessSpecific]);

  // عرض التحميل أثناء تحميل البيانات
  if (isLoadingType) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* قائمة التبويبات - Custom implementation */}
      <div className="w-full h-auto flex flex-wrap gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border/30">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center gap-1.5 text-xs py-2.5 px-3 rounded-lg transition-all font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* محتوى التبويب - كل المكونات موجودة لكن فقط النشط يظهر */}
      <div className="mt-4">
        <div className={activeTab === 'weight' ? 'block' : 'hidden'}>
          <WeightSellingSettings form={form} />
        </div>
        <div className={activeTab === 'box' ? 'block' : 'hidden'}>
          <BoxSellingSettings form={form} />
        </div>
        <div className={activeTab === 'meter' ? 'block' : 'hidden'}>
          <MeterSellingSettings form={form} />
        </div>
        <div className={activeTab === 'expiry' ? 'block' : 'hidden'}>
          <ExpiryTrackingSettings form={form} />
        </div>
        <div className={activeTab === 'serial' ? 'block' : 'hidden'}>
          <SerialNumberSettings form={form} />
        </div>
        <div className={activeTab === 'warranty' ? 'block' : 'hidden'}>
          <WarrantySettings form={form} />
        </div>
        <div className={activeTab === 'price_tiers' ? 'block' : 'hidden'}>
          <PriceTiersManager form={form} basePrice={basePrice} />
        </div>
        {showBusinessSpecific && (
          <div className={activeTab === 'business' ? 'block' : 'hidden'}>
            <BusinessSpecificFields form={form} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedProductSettings;
