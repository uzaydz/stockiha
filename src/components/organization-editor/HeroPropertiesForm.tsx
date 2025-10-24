import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ComponentEditorProps } from './types';

const HeroPropertiesForm: React.FC<ComponentEditorProps> = ({
  settings,
  onChange,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const handleFieldChange = useCallback(
    (field: keyof typeof settings) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        onChange({ [field]: value } as Partial<typeof settings>);
      },
    [onChange]
  );

  const handleButtonChange = useCallback(
    (button: 'primaryButton' | 'secondaryButton', key: 'text' | 'link') =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const currentButton = settings[button] || { text: '', link: '' };
        onChange({
          [button]: {
            ...currentButton,
            [key]: event.target.value
          }
        });
      },
    [onChange, settings]
  );

  const formattedTrustBadges = settings.trustBadges || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Basic Info Section */}
      <section className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="hero-title" className="text-xs sm:text-sm">عنوان القسم</Label>
          <Input
            id="hero-title"
            value={settings.title}
            onChange={handleFieldChange('title')}
            placeholder="ادخل عنواناً جذاباً للبانر الرئيسي"
            className="mt-1 text-xs sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="hero-description" className="text-xs sm:text-sm">الوصف</Label>
          <Textarea
            id="hero-description"
            value={settings.description}
            onChange={handleFieldChange('description')}
            rows={3}
            placeholder="اكتب وصفاً قصيراً يقنع الزوار بالتحرك"
            className="mt-1 text-xs sm:text-sm"
          />
        </div>
        <div>
          <Label htmlFor="hero-image" className="text-xs sm:text-sm">رابط الصورة الرئيسية</Label>
          <Input
            id="hero-image"
            value={settings.imageUrl}
            onChange={handleFieldChange('imageUrl')}
            placeholder="https://"
            className="mt-1 text-xs sm:text-sm"
          />
        </div>
      </section>

      <Separator />

      {/* Buttons Section - محسن للهاتف */}
      <section className={cn(
        "grid gap-4",
        isMobile && "grid-cols-1",
        isTablet && "grid-cols-2 gap-6",
        isDesktop && "grid-cols-2 gap-6"
      )}>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">زر رئيسي</Label>
              <p className="text-[10px] text-muted-foreground sm:text-xs">زر دعوة لزيارة صفحة معينة</p>
            </div>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
              {settings.primaryButtonStyle === 'primary' ? 'أساسي' : 'ثانوي'}
            </Badge>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <Input
              value={settings.primaryButton?.text || settings.primaryButtonText || ''}
              onChange={handleButtonChange('primaryButton', 'text')}
              placeholder="نص الزر"
              className="text-xs sm:text-sm"
            />
            <Input
              value={settings.primaryButton?.link || settings.primaryButtonLink || ''}
              onChange={handleButtonChange('primaryButton', 'link')}
              placeholder="الرابط"
              className="text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">زر ثانوي</Label>
              <p className="text-[10px] text-muted-foreground sm:text-xs">زر إضافي لترويج عرض أو صفحة أخرى</p>
            </div>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
              {settings.secondaryButtonStyle === 'primary' ? 'أساسي' : 'ثانوي'}
            </Badge>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <Input
              value={settings.secondaryButton?.text || settings.secondaryButtonText || ''}
              onChange={handleButtonChange('secondaryButton', 'text')}
              placeholder="نص الزر"
              className="text-xs sm:text-sm"
            />
            <Input
              value={settings.secondaryButton?.link || settings.secondaryButtonLink || ''}
              onChange={handleButtonChange('secondaryButton', 'link')}
              placeholder="الرابط"
              className="text-xs sm:text-sm"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Trust Badges Section - محسن للهاتف */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">شارات الثقة</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              عناصر صغيرة تعزز ثقة العميل مثل التوصيل السريع أو الضمان.
            </p>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {formattedTrustBadges.length} شارة
          </Badge>
        </div>

        <div className={cn(
          "grid gap-3",
          isMobile && "grid-cols-1",
          isTablet && "grid-cols-2 gap-4",
          isDesktop && "grid-cols-2 gap-4"
        )}>
          {formattedTrustBadges.map((badge, index) => (
            <Card key={badge.id} className="bg-muted/40">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
                  <span>شارة {index + 1}</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1">
                    {badge.icon}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  اضبط النص والأيقونة بما يناسب نشاط المؤسسة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4 pt-0">
                <div>
                  <Label className="text-[10px] text-muted-foreground sm:text-xs">النص</Label>
                  <Input
                    value={badge.text}
                    onChange={(event) => {
                      const updated = [...formattedTrustBadges];
                      updated[index] = {
                        ...badge,
                        text: event.target.value
                      };
                      onChange({ trustBadges: updated });
                    }}
                    className="mt-1 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground sm:text-xs">الأيقونة</Label>
                  <Input
                    value={badge.icon}
                    onChange={(event) => {
                      const updated = [...formattedTrustBadges];
                      updated[index] = {
                        ...badge,
                        icon: event.target.value
                      };
                      onChange({ trustBadges: updated });
                    }}
                    className="mt-1 text-xs sm:text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Products Section - قسم المنتجات الجديد */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">عرض المنتجات</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              إعدادات عرض المنتجات في قسم البانر الرئيسي.
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {settings.showProducts ? 'مفعل' : 'معطل'}
          </Badge>
        </div>

        <div className={cn(
          "grid gap-3",
          isMobile && "grid-cols-1",
          isTablet && "grid-cols-2 gap-4",
          isDesktop && "grid-cols-2 gap-4"
        )}>
          {/* إعدادات أساسية للمنتجات */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار المنتجات</Label>
              <Switch
                checked={settings.showProducts || false}
                onCheckedChange={(checked) => onChange({ showProducts: checked })}
                className="scale-90 sm:scale-100"
              />
            </div>
            
            <div>
              <Label className="text-xs sm:text-sm">نوع المنتجات</Label>
              <select
                value={settings.productsType || 'featured'}
                onChange={(e) => onChange({ productsType: e.target.value as any })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
              >
                <option value="featured">مميزة</option>
                <option value="selected">محددة</option>
                <option value="latest">أحدث</option>
                <option value="new">جديدة</option>
              </select>
            </div>

            <div>
              <Label className="text-xs sm:text-sm">طريقة العرض</Label>
              <select
                value={settings.productsDisplay || 'grid'}
                onChange={(e) => onChange({ productsDisplay: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm"
              >
                <option value="grid">شبكة</option>
                <option value="list">قائمة</option>
                <option value="carousel">دوار</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs sm:text-sm">عدد المنتجات</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={settings.productsLimit || 4}
                onChange={(e) => onChange({ productsLimit: parseInt(e.target.value) || 4 })}
                className="mt-1 text-xs sm:text-sm"
                placeholder="4"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">معرف المؤسسة</Label>
              <Input
                value={settings.organization_id || ''}
                onChange={(e) => onChange({ organization_id: e.target.value })}
                className="mt-1 text-xs sm:text-sm"
                placeholder="معرف المؤسسة"
              />
            </div>

            {settings.productsType === 'selected' && (
              <div className={cn(
                "col-span-full",
                isMobile && "mt-3",
                isTablet && "mt-4",
                isDesktop && "mt-4"
              )}>
                <Label className="text-xs sm:text-sm">المنتجات المحددة (IDs مفصولة بفواصل)</Label>
                <Textarea
                  value={(settings.selectedProducts || []).join(', ')}
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                    onChange({ selectedProducts: ids });
                  }}
                  rows={2}
                  className="mt-1 text-xs sm:text-sm"
                  placeholder="1, 2, 3, 4"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default React.memo(HeroPropertiesForm);
