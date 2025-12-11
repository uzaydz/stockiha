/**
 * 🏪 Business Profile Settings
 *
 * صفحة إعدادات نوع التجارة في قسم الإعدادات
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Store,
  Sparkles,
  ChevronRight,
  Edit3,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useBusinessProfile, useBusinessType } from '@/context/BusinessProfileContext';
import { getBusinessTypeInfo } from '@/lib/business/presets';
import { BusinessTypeSelector } from '@/components/business-profile/BusinessTypeSelector';
import { BusinessFeatureCustomizer } from '@/components/business-profile/BusinessFeatureCustomizer';

// =====================================================
// المكون الرئيسي
// =====================================================

const BusinessProfileSettings: React.FC = () => {
  const { profile, isLoading, isSelected } = useBusinessProfile();
  const { type } = useBusinessType();
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // معلومات النوع الحالي
  const typeInfo = type ? getBusinessTypeInfo(type) : null;

  // معالجة تغيير النوع
  const handleChangeType = useCallback(() => {
    setShowTypeSelector(true);
  }, []);

  const handleTypeSelected = useCallback(() => {
    setShowTypeSelector(false);
  }, []);

  // =====================================================
  // عرض صفحة اختيار النوع
  // =====================================================

  if (showTypeSelector) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          onClick={() => setShowTypeSelector(false)}
          className="absolute top-4 right-4 z-10"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          رجوع
        </Button>
        <BusinessTypeSelector
          onComplete={handleTypeSelected}
          showSkip={false}
        />
      </div>
    );
  }

  // =====================================================
  // عرض التحميل
  // =====================================================

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل إعدادات نوع التجارة...</p>
        </CardContent>
      </Card>
    );
  }

  // =====================================================
  // العرض الرئيسي
  // =====================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* بطاقة النوع الحالي */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">نوع التجارة</CardTitle>
                <CardDescription className="mt-1">
                  تخصيص النظام حسب نوع عملك التجاري
                </CardDescription>
              </div>
            </div>
            {isSelected && (
              <Badge className="bg-green-100 text-green-700">
                <Check className="w-3 h-3 ml-1" />
                محدد
              </Badge>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          {typeInfo ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* الأيقونة والمعلومات */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={cn(
                    'w-20 h-20 rounded-2xl flex items-center justify-center',
                    `bg-gradient-to-br ${typeInfo.gradient}`
                  )}
                >
                  <span className="text-4xl">{typeInfo.emoji}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {typeInfo.label}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {typeInfo.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {typeInfo.features.slice(0, 3).map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                    {typeInfo.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{typeInfo.features.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* زر تغيير النوع */}
              <Button
                variant="outline"
                onClick={handleChangeType}
                className="shrink-0"
              >
                <Edit3 className="w-4 h-4 ml-2" />
                تغيير النوع
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Store className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                لم يتم تحديد نوع التجارة
              </h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                حدد نوع تجارتك ليتم تخصيص النظام تلقائياً ليناسب احتياجاتك
              </p>
              <Button onClick={handleChangeType}>
                <Sparkles className="w-4 h-4 ml-2" />
                اختر نوع التجارة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مخصص الميزات */}
      {isSelected && profile && (
        <BusinessFeatureCustomizer showHeader={true} />
      )}
    </motion.div>
  );
};

export default BusinessProfileSettings;
