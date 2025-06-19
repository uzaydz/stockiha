import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * مثال توضيحي لاستخدام مبدل اللغة المحسن
 * يعرض جميع الأنماط والأحجام المتاحة
 */
const LanguageSwitcherDemo: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">مبدل اللغة المحسن</h1>
        <p className="text-muted-foreground text-lg">
          نظام متقدم لتبديل اللغات مع دعم إعدادات المتجر
        </p>
      </div>

      {/* النمط الافتراضي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            النمط الافتراضي (Dropdown)
            <Badge variant="secondary">الموصى به</Badge>
          </CardTitle>
          <CardDescription>
            نمط كامل مع عرض تفاصيل اللغات والمؤشرات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم صغير</p>
              <LanguageSwitcher variant="dropdown" size="sm" />
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم افتراضي</p>
              <LanguageSwitcher variant="dropdown" size="default" />
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم كبير</p>
              <LanguageSwitcher variant="dropdown" size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* النمط المضغوط */}
      <Card>
        <CardHeader>
          <CardTitle>النمط المضغوط (Compact)</CardTitle>
          <CardDescription>
            نمط مبسط يعرض العلم فقط مع قائمة منسدلة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم صغير</p>
              <LanguageSwitcher variant="compact" size="sm" />
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم افتراضي</p>
              <LanguageSwitcher variant="compact" size="default" />
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="space-y-2">
              <p className="text-sm font-medium">حجم كبير</p>
              <LanguageSwitcher variant="compact" size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* النمط المدمج */}
      <Card>
        <CardHeader>
          <CardTitle>النمط المدمج (Inline)</CardTitle>
          <CardDescription>
            عرض جميع اللغات كأزرار منفصلة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">مع النص</p>
              <LanguageSwitcher variant="inline" showText={true} />
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">الأعلام فقط</p>
              <LanguageSwitcher variant="inline" showText={false} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* خيارات المحاذاة */}
      <Card>
        <CardHeader>
          <CardTitle>خيارات المحاذاة</CardTitle>
          <CardDescription>
            تحكم في محاذاة القائمة المنسدلة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">محاذاة للبداية</p>
              <LanguageSwitcher align="start" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">محاذاة للوسط</p>
              <LanguageSwitcher align="center" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">محاذاة للنهاية</p>
              <LanguageSwitcher align="end" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الميزات الجديدة */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✨ الميزات الجديدة
          </CardTitle>
          <CardDescription>
            تحسينات متقدمة لتجربة المستخدم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">🎯 اللغة الافتراضية من الإعدادات</h4>
              <p className="text-sm text-muted-foreground">
                يتم تحديد اللغة الافتراضية من إعدادات المتجر في قاعدة البيانات
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">🎨 مؤشرات بصرية محسنة</h4>
              <p className="text-sm text-muted-foreground">
                مؤشرات لللغة الحالية واللغة الافتراضية مع تأثيرات حديثة
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">💾 حفظ تلقائي للتفضيلات</h4>
              <p className="text-sm text-muted-foreground">
                حفظ اختيار المستخدم في localStorage مع استعادة تلقائية
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">♿ دعم إمكانية الوصول</h4>
              <p className="text-sm text-muted-foreground">
                تحسينات للتركيز والتنقل بلوحة المفاتيح والقارئات الشاشة
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">🌙 دعم الوضع المظلم</h4>
              <p className="text-sm text-muted-foreground">
                تصميم متجاوب مع الوضع المظلم والفاتح تلقائياً
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">📱 تجربة محسنة للجوال</h4>
              <p className="text-sm text-muted-foreground">
                تأثيرات لمسية (haptic feedback) وتصميم متجاوب
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* مثال كود الاستخدام */}
      <Card>
        <CardHeader>
          <CardTitle>مثال على الاستخدام</CardTitle>
          <CardDescription>
            طرق مختلفة لاستخدام مبدل اللغة في مشروعك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto" dir="ltr">
{`// الاستخدام الأساسي
<LanguageSwitcher />

// نمط مضغوط للشريط العلوي
<LanguageSwitcher variant="compact" size="sm" />

// نمط مدمج للإعدادات
<LanguageSwitcher variant="inline" showText={true} />

// تخصيص المحاذاة
<LanguageSwitcher align="start" className="my-custom-class" />`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LanguageSwitcherDemo; 