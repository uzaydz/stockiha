/**
 * 🎛️ Business Feature Customizer
 *
 * صفحة تخصيص الميزات - للتحكم الدقيق في الميزات المفعّلة
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette,
  ShoppingBag,
  DollarSign,
  PackageSearch,
  RotateCcw,
  Save,
  Check,
  Info,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { BusinessType, AnyFeatureKey } from '@/lib/business/types';
import {
  FEATURE_CATEGORIES,
  getBusinessTypeInfo,
  getRecommendedFeatures,
} from '@/lib/business/presets';
import {
  useBusinessProfile,
  useBusinessFeature,
} from '@/context/BusinessProfileContext';

// =====================================================
// خريطة الأيقونات للفئات
// =====================================================

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  variants: Palette,
  selling: ShoppingBag,
  pricing: DollarSign,
  tracking: PackageSearch,
};

// =====================================================
// Props
// =====================================================

interface BusinessFeatureCustomizerProps {
  className?: string;
  showHeader?: boolean;
}

// =====================================================
// مكون عنصر الميزة
// =====================================================

interface FeatureItemProps {
  featureKey: string;
  label: string;
  description: string;
  isRecommended: boolean;
  isEnabled: boolean;
  onToggle: (key: string, value: boolean) => void;
  isLoading?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  featureKey,
  label,
  description,
  isRecommended,
  isEnabled,
  onToggle,
  isLoading,
}) => {
  const handleToggle = useCallback(() => {
    onToggle(featureKey, !isEnabled);
  }, [featureKey, isEnabled, onToggle]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        isEnabled
          ? 'bg-blue-50/50 border-blue-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      )}
    >
      <div className="flex-1 min-w-0 ml-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900">{label}</h4>
          {isRecommended && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              <Sparkles className="w-3 h-3 ml-1" />
              موصى به
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        className="shrink-0"
      />
    </motion.div>
  );
};

// =====================================================
// المكون الرئيسي
// =====================================================

export const BusinessFeatureCustomizer: React.FC<BusinessFeatureCustomizerProps> = ({
  className,
  showHeader = true,
}) => {
  const {
    profile,
    isLoading,
    updateFeature,
    updateFeatures,
    resetToDefaults,
  } = useBusinessProfile();

  const [activeTab, setActiveTab] = useState('variants');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // معلومات النوع الحالي
  const typeInfo = useMemo(() => {
    if (!profile?.business_type) return null;
    return getBusinessTypeInfo(profile.business_type);
  }, [profile?.business_type]);

  // الميزات الموصى بها
  const recommendedFeatures = useMemo(() => {
    if (!profile?.business_type) return [];
    return getRecommendedFeatures(profile.business_type);
  }, [profile?.business_type]);

  // =====================================================
  // الحصول على قيمة الميزة
  // =====================================================

  const getFeatureValue = useCallback((key: string): boolean => {
    // التحقق من التغييرات المعلقة أولاً
    if (key in pendingChanges) {
      return pendingChanges[key];
    }

    if (!profile) return false;

    // البحث في ميزات المنتج
    if (key in profile.product_features) {
      return profile.product_features[key as keyof typeof profile.product_features];
    }

    // البحث في ميزات نقطة البيع
    if (key in profile.pos_features) {
      return profile.pos_features[key as keyof typeof profile.pos_features];
    }

    // البحث في ميزات المشتريات
    if (key in profile.purchase_features) {
      return profile.purchase_features[key as keyof typeof profile.purchase_features];
    }

    return false;
  }, [profile, pendingChanges]);

  // =====================================================
  // معالجة تغيير الميزة
  // =====================================================

  const handleFeatureToggle = useCallback((key: string, value: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  }, []);

  // =====================================================
  // حفظ التغييرات
  // =====================================================

  const handleSave = useCallback(async () => {
    if (!hasChanges || Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    try {
      await updateFeatures(pendingChanges as Record<AnyFeatureKey, boolean>);
      setPendingChanges({});
      setHasChanges(false);
    } catch (error) {
      console.error('[FeatureCustomizer] خطأ في الحفظ:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, pendingChanges, updateFeatures]);

  // =====================================================
  // إعادة التعيين
  // =====================================================

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    try {
      await resetToDefaults();
      setPendingChanges({});
      setHasChanges(false);
    } catch (error) {
      console.error('[FeatureCustomizer] خطأ في إعادة التعيين:', error);
    } finally {
      setIsSaving(false);
    }
  }, [resetToDefaults]);

  // =====================================================
  // إلغاء التغييرات
  // =====================================================

  const handleCancel = useCallback(() => {
    setPendingChanges({});
    setHasChanges(false);
  }, []);

  // =====================================================
  // العرض أثناء التحميل
  // =====================================================

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="font-medium text-gray-900 mb-2">لم يتم تحديد نوع التجارة</h3>
          <p className="text-gray-500">يرجى اختيار نوع تجارتك أولاً</p>
        </CardContent>
      </Card>
    );
  }

  // =====================================================
  // العرض الرئيسي
  // =====================================================

  return (
    <Card className={cn('overflow-hidden', className)}>
      {showHeader && (
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                تخصيص الميزات
              </CardTitle>
              <CardDescription className="mt-1">
                {typeInfo ? (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{typeInfo.emoji}</span>
                    {typeInfo.label}
                  </span>
                ) : (
                  'تحكم في الميزات المفعّلة لعملك'
                )}
              </CardDescription>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                تغييرات غير محفوظة
              </Badge>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* التبويبات */}
          <TabsList className="w-full justify-start rounded-none border-b bg-gray-50/50 p-0 h-auto">
            {FEATURE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id] || Palette;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className={cn(
                    'flex-1 sm:flex-none px-4 py-3 rounded-none border-b-2 border-transparent',
                    'data-[state=active]:border-blue-600 data-[state=active]:bg-white'
                  )}
                >
                  <Icon className="w-4 h-4 ml-2" />
                  {category.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* محتوى التبويبات */}
          {FEATURE_CATEGORIES.map((category) => (
            <TabsContent
              key={category.id}
              value={category.id}
              className="p-4 sm:p-6 m-0"
            >
              {/* وصف الفئة */}
              <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">{category.label}</h4>
                  <p className="text-sm text-blue-700">{category.description}</p>
                </div>
              </div>

              {/* قائمة الميزات */}
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {category.features.map((feature, index) => (
                    <motion.div
                      key={feature.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <FeatureItem
                        featureKey={feature.key}
                        label={feature.label}
                        description={feature.description}
                        isRecommended={recommendedFeatures.includes(feature.key)}
                        isEnabled={getFeatureValue(feature.key)}
                        onToggle={handleFeatureToggle}
                        isLoading={isSaving}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t bg-gray-50/50">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة للافتراضي
          </Button>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                إلغاء
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessFeatureCustomizer;
