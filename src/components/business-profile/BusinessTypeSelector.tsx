/**
 * 🏪 Business Type Selector
 *
 * صفحة اختيار نوع التجارة - تُعرض مرة واحدة عند البداية
 * تصميم مثالي وجذاب مع بطاقات تفاعلية
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart,
  Shirt,
  Smartphone,
  Pill,
  UtensilsCrossed,
  Building2,
  Sparkles,
  Gem,
  Sofa,
  Car,
  BookOpen,
  Blocks,
  Dumbbell,
  PawPrint,
  Store,
  Warehouse,
  Settings2,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { BusinessType, BusinessTypeInfo } from '@/lib/business/types';
import { BUSINESS_TYPES_INFO } from '@/lib/business/presets';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

// =====================================================
// خريطة الأيقونات
// =====================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Shirt,
  Smartphone,
  Pill,
  UtensilsCrossed,
  Building2,
  Sparkles,
  Gem,
  Sofa,
  Car,
  BookOpen,
  Blocks,
  Dumbbell,
  PawPrint,
  Store,
  Warehouse,
  Settings2,
};

// =====================================================
// خريطة الألوان
// =====================================================

const COLOR_MAP: Record<string, {
  bg: string;
  bgHover: string;
  bgSelected: string;
  border: string;
  text: string;
  badge: string;
}> = {
  emerald: {
    bg: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-100',
    bgSelected: 'bg-emerald-100 ring-2 ring-emerald-500',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  purple: {
    bg: 'bg-purple-50',
    bgHover: 'hover:bg-purple-100',
    bgSelected: 'bg-purple-100 ring-2 ring-purple-500',
    border: 'border-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  blue: {
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    bgSelected: 'bg-blue-100 ring-2 ring-blue-500',
    border: 'border-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  red: {
    bg: 'bg-red-50',
    bgHover: 'hover:bg-red-100',
    bgSelected: 'bg-red-100 ring-2 ring-red-500',
    border: 'border-red-200',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  orange: {
    bg: 'bg-orange-50',
    bgHover: 'hover:bg-orange-100',
    bgSelected: 'bg-orange-100 ring-2 ring-orange-500',
    border: 'border-orange-200',
    text: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  amber: {
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    bgSelected: 'bg-amber-100 ring-2 ring-amber-500',
    border: 'border-amber-200',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  pink: {
    bg: 'bg-pink-50',
    bgHover: 'hover:bg-pink-100',
    bgSelected: 'bg-pink-100 ring-2 ring-pink-500',
    border: 'border-pink-200',
    text: 'text-pink-600',
    badge: 'bg-pink-100 text-pink-700',
  },
  yellow: {
    bg: 'bg-yellow-50',
    bgHover: 'hover:bg-yellow-100',
    bgSelected: 'bg-yellow-100 ring-2 ring-yellow-500',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  stone: {
    bg: 'bg-stone-50',
    bgHover: 'hover:bg-stone-100',
    bgSelected: 'bg-stone-100 ring-2 ring-stone-500',
    border: 'border-stone-200',
    text: 'text-stone-600',
    badge: 'bg-stone-100 text-stone-700',
  },
  slate: {
    bg: 'bg-slate-50',
    bgHover: 'hover:bg-slate-100',
    bgSelected: 'bg-slate-100 ring-2 ring-slate-500',
    border: 'border-slate-200',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    bgHover: 'hover:bg-indigo-100',
    bgSelected: 'bg-indigo-100 ring-2 ring-indigo-500',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  cyan: {
    bg: 'bg-cyan-50',
    bgHover: 'hover:bg-cyan-100',
    bgSelected: 'bg-cyan-100 ring-2 ring-cyan-500',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  lime: {
    bg: 'bg-lime-50',
    bgHover: 'hover:bg-lime-100',
    bgSelected: 'bg-lime-100 ring-2 ring-lime-500',
    border: 'border-lime-200',
    text: 'text-lime-600',
    badge: 'bg-lime-100 text-lime-700',
  },
  teal: {
    bg: 'bg-teal-50',
    bgHover: 'hover:bg-teal-100',
    bgSelected: 'bg-teal-100 ring-2 ring-teal-500',
    border: 'border-teal-200',
    text: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-700',
  },
  violet: {
    bg: 'bg-violet-50',
    bgHover: 'hover:bg-violet-100',
    bgSelected: 'bg-violet-100 ring-2 ring-violet-500',
    border: 'border-violet-200',
    text: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
  },
  sky: {
    bg: 'bg-sky-50',
    bgHover: 'hover:bg-sky-100',
    bgSelected: 'bg-sky-100 ring-2 ring-sky-500',
    border: 'border-sky-200',
    text: 'text-sky-600',
    badge: 'bg-sky-100 text-sky-700',
  },
  gray: {
    bg: 'bg-gray-50',
    bgHover: 'hover:bg-gray-100',
    bgSelected: 'bg-gray-100 ring-2 ring-gray-500',
    border: 'border-gray-200',
    text: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700',
  },
};

// =====================================================
// Props
// =====================================================

interface BusinessTypeSelectorProps {
  onComplete?: () => void;
  showSkip?: boolean;
  className?: string;
}

// =====================================================
// المكون الرئيسي
// =====================================================

export const BusinessTypeSelector: React.FC<BusinessTypeSelectorProps> = ({
  onComplete,
  showSkip = false,
  className,
}) => {
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { setBusinessType, isLoading } = useBusinessProfile();

  // =====================================================
  // فلترة أنواع التجارة
  // =====================================================

  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return BUSINESS_TYPES_INFO;

    const query = searchQuery.toLowerCase().trim();

    return BUSINESS_TYPES_INFO.filter((info) => {
      return (
        info.label.includes(query) ||
        info.labelEn.toLowerCase().includes(query) ||
        info.description.includes(query) ||
        info.examples.some((ex) => ex.includes(query))
      );
    });
  }, [searchQuery]);

  // =====================================================
  // معالجة الاختيار
  // =====================================================

  const handleSelect = useCallback((type: BusinessType) => {
    setSelectedType(type);
    setStep('confirm');
  }, []);

  const handleBack = useCallback(() => {
    setStep('select');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      await setBusinessType(selectedType);
      onComplete?.();
    } catch (error) {
      console.error('[BusinessTypeSelector] خطأ:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, setBusinessType, onComplete]);

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await setBusinessType('general_retail');
      onComplete?.();
    } catch (error) {
      console.error('[BusinessTypeSelector] خطأ:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [setBusinessType, onComplete]);

  // =====================================================
  // الحصول على معلومات النوع المختار
  // =====================================================

  const selectedTypeInfo = useMemo(() => {
    if (!selectedType) return null;
    return BUSINESS_TYPES_INFO.find((info) => info.type === selectedType);
  }, [selectedType]);

  // =====================================================
  // عرض صفحة الاختيار
  // =====================================================

  if (step === 'select') {
    return (
      <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50', className)}>
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          {/* الترويسة */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              خطوة واحدة فقط للبدء
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ما نوع تجارتك؟
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              اختر نوع عملك وسنقوم بتخصيص النظام تلقائياً ليناسب احتياجاتك
              <br />
              <span className="text-sm text-gray-500">
                (يمكنك تغيير هذا لاحقاً من الإعدادات)
              </span>
            </p>
          </motion.div>

          {/* البحث */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="ابحث عن نوع تجارتك..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 text-base"
              />
            </div>
          </motion.div>

          {/* شبكة الأنواع */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredTypes.map((info, index) => {
                const Icon = ICON_MAP[info.icon] || Store;
                const colors = COLOR_MAP[info.color] || COLOR_MAP.gray;
                const isSelected = selectedType === info.type;

                return (
                  <motion.div
                    key={info.type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                    layout
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-200 h-full',
                        'border-2',
                        isSelected
                          ? colors.bgSelected
                          : `${colors.bg} ${colors.bgHover} border-transparent hover:border-gray-200`
                      )}
                      onClick={() => handleSelect(info.type)}
                    >
                      <CardContent className="p-4 sm:p-6 text-center">
                        {/* الأيقونة */}
                        <div
                          className={cn(
                            'w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center',
                            colors.bg
                          )}
                        >
                          <span className="text-3xl sm:text-4xl">{info.emoji}</span>
                        </div>

                        {/* الاسم */}
                        <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">
                          {info.label}
                        </h3>

                        {/* الوصف */}
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {info.description}
                        </p>

                        {/* علامة الاختيار */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn(
                              'w-6 h-6 mx-auto rounded-full flex items-center justify-center',
                              colors.text,
                              'bg-white shadow-sm'
                            )}
                          >
                            <Check className="w-4 h-4" />
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* لا توجد نتائج */}
          {filteredTypes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لم نجد نتائج
              </h3>
              <p className="text-gray-500 mb-4">
                جرب البحث بكلمات أخرى أو اختر "مخصص"
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  handleSelect('custom');
                }}
              >
                <Settings2 className="w-4 h-4 ml-2" />
                اختر مخصص
              </Button>
            </motion.div>
          )}

          {/* زر التخطي */}
          {showSkip && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8"
            >
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="text-gray-500"
              >
                تخطي واختر لاحقاً
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // عرض صفحة التأكيد
  // =====================================================

  if (step === 'confirm' && selectedTypeInfo) {
    const colors = COLOR_MAP[selectedTypeInfo.color] || COLOR_MAP.gray;
    const Icon = ICON_MAP[selectedTypeInfo.icon] || Store;

    return (
      <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50', className)}>
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* زر الرجوع */}
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              رجوع للاختيار
            </Button>

            {/* بطاقة التأكيد */}
            <Card className="overflow-hidden">
              {/* الخلفية المتدرجة */}
              <div className={cn('h-32 sm:h-40 bg-gradient-to-br', selectedTypeInfo.gradient)} />

              <CardContent className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative">
                {/* الأيقونة */}
                <div
                  className={cn(
                    'w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 rounded-3xl flex items-center justify-center',
                    'bg-white shadow-xl border-4 border-white'
                  )}
                >
                  <span className="text-5xl sm:text-6xl">{selectedTypeInfo.emoji}</span>
                </div>

                {/* العنوان */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {selectedTypeInfo.label}
                  </h2>
                  <p className="text-gray-600">
                    {selectedTypeInfo.description}
                  </p>
                </div>

                {/* الميزات */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    الميزات المفعّلة تلقائياً:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTypeInfo.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className={cn(colors.badge)}
                      >
                        <Check className="w-3 h-3 ml-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* الأمثلة */}
                <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    أمثلة على هذا النوع:
                  </h4>
                  <p className="text-gray-600">
                    {selectedTypeInfo.examples.join(' • ')}
                  </p>
                </div>

                {/* الأزرار */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                    className="flex-1 h-12 text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">◌</span>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        تأكيد الاختيار
                        <ArrowRight className="w-5 h-5 mr-2" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="sm:w-auto"
                  >
                    اختيار آخر
                  </Button>
                </div>

                {/* ملاحظة */}
                <p className="text-xs text-gray-500 text-center mt-4">
                  يمكنك تخصيص الميزات أو تغيير النوع لاحقاً من الإعدادات
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
};

export default BusinessTypeSelector;
