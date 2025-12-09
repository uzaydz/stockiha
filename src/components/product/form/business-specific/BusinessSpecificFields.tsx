/**
 * 🏪 Business Specific Fields
 *
 * حقول خاصة بنوع النشاط التجاري (صيدلية، مطعم، قطع غيار، مواد بناء)
 */

import { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Pill,
  UtensilsCrossed,
  Car,
  Building2,
  HelpCircle,
  Info,
  Clock,
  Flame,
  AlertTriangle,
  Leaf,
  FileText,
  Hash,
  Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessType } from '@/context/BusinessProfileContext';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface BusinessSpecificFieldsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// =====================================================
// مكون حقول الصيدلية
// =====================================================

const PharmacyFields = memo<{ form: UseFormReturn<ProductFormValues> }>(({ form }) => (
  <div className="space-y-4">
    {/* يحتاج وصفة طبية */}
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50/60 to-pink-50/40 dark:from-red-950/30 dark:to-pink-950/20 rounded-xl border border-red-200/50 dark:border-red-800/30">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 p-2 rounded-lg shadow-sm">
          <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <div className="font-medium text-sm text-foreground">يحتاج وصفة طبية</div>
          <div className="text-xs text-muted-foreground">لا يمكن بيعه بدون وصفة من الطبيب</div>
        </div>
      </div>
      <FormField
        control={form.control}
        name="requires_prescription"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className="data-[state=checked]:bg-red-600"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* المادة الفعالة */}
      <FormField
        control={form.control}
        name="active_ingredient"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
              المادة الفعالة
              <span
                className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                title="اسم المادة الفعالة في الدواء"
              >
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
              </span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: باراسيتامول"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* شكل الجرعة */}
      <FormField
        control={form.control}
        name="dosage_form"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">شكل الجرعة</FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: أقراص، شراب، حقن"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* التركيز */}
      <FormField
        control={form.control}
        name="concentration"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">التركيز</FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: 500 ملغ"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>
  </div>
));

PharmacyFields.displayName = 'PharmacyFields';

// =====================================================
// مكون حقول المطعم
// =====================================================

const RestaurantFields = memo<{ form: UseFormReturn<ProductFormValues> }>(({ form }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* وقت التحضير */}
      <FormField
        control={form.control}
        name="preparation_time_minutes"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              وقت التحضير
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  placeholder="15"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دقيقة</span>
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* السعرات الحرارية */}
      <FormField
        control={form.control}
        name="calories"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              السعرات الحرارية
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  placeholder="250"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">سعرة</span>
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* درجة الحرارة */}
      <FormField
        control={form.control}
        name="spice_level"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">درجة الحرارة (0-5)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                max="5"
                placeholder="0"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>

    {/* مسببات الحساسية */}
    <FormField
      control={form.control}
      name="allergens"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            مسببات الحساسية
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder="مثال: جلوتين، مكسرات، حليب (افصل بفاصلة)"
              className="min-h-[80px] text-sm resize-none"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />

    {/* الخيارات الغذائية */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center justify-between p-3 bg-green-50/60 dark:bg-green-950/30 rounded-lg border border-green-200/50 dark:border-green-800/30">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-foreground">نباتي</span>
        </div>
        <FormField
          control={form.control}
          name="is_vegetarian"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-green-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-foreground">فيجان</span>
        </div>
        <FormField
          control={form.control}
          name="is_vegan"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-foreground">خالي من الجلوتين</span>
        </div>
        <FormField
          control={form.control}
          name="is_gluten_free"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-amber-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
));

RestaurantFields.displayName = 'RestaurantFields';

// =====================================================
// مكون حقول قطع الغيار
// =====================================================

const AutoPartsFields = memo<{ form: UseFormReturn<ProductFormValues> }>(({ form }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* رقم OEM */}
      <FormField
        control={form.control}
        name="oem_number"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" />
              رقم OEM
              <span
                className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                title="رقم القطعة من المصنع الأصلي"
              >
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
              </span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: 90915-10003"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* الشركة المصنعة للسيارة */}
      <FormField
        control={form.control}
        name="vehicle_make"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">الشركة المصنعة</FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: Toyota"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* موديل السيارة */}
      <FormField
        control={form.control}
        name="vehicle_model"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">الموديل</FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: Corolla"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* السنة */}
      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name="year_from"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-foreground">من سنة</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1900"
                  max="2030"
                  placeholder="2015"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year_to"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-foreground">إلى سنة</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1900"
                  max="2030"
                  placeholder="2023"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>

    {/* الموديلات المتوافقة */}
    <FormField
      control={form.control}
      name="compatible_models"
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-medium text-foreground">الموديلات المتوافقة</FormLabel>
          <FormControl>
            <Textarea
              placeholder="مثال: Corolla 2015-2023, Camry 2018-2022 (افصل بفاصلة)"
              className="min-h-[80px] text-sm resize-none"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  </div>
));

AutoPartsFields.displayName = 'AutoPartsFields';

// =====================================================
// مكون حقول مواد البناء
// =====================================================

const ConstructionFields = memo<{ form: UseFormReturn<ProductFormValues> }>(({ form }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* نوع المادة */}
      <FormField
        control={form.control}
        name="material_type"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">نوع المادة</FormLabel>
            <FormControl>
              <Input
                placeholder="مثال: خرسانة، حديد، خشب"
                className="h-10 text-sm"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* الوزن */}
      <FormField
        control={form.control}
        name="weight_kg"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground">الوزن</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">كغ</span>
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* مساحة التغطية */}
      <FormField
        control={form.control}
        name="coverage_area_sqm"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-500" />
              مساحة التغطية
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="h-10 text-sm"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">م²</span>
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>

    {/* الأبعاد */}
    <div>
      <FormLabel className="text-sm font-medium text-foreground mb-2 block">الأبعاد</FormLabel>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="dimension_length"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="الطول"
                    className="h-10 text-sm"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">سم</span>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dimension_width"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="العرض"
                    className="h-10 text-sm"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">سم</span>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dimension_height"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="الارتفاع"
                    className="h-10 text-sm"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">سم</span>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
));

ConstructionFields.displayName = 'ConstructionFields';

// =====================================================
// المكون الرئيسي
// =====================================================

const BusinessSpecificFields = memo<BusinessSpecificFieldsProps>(({ form, className }) => {
  const { type: businessType } = useBusinessType();

  // تحديد الأيقونة والعنوان حسب نوع النشاط
  const getBusinessInfo = () => {
    switch (businessType) {
      case 'pharmacy':
        return { icon: Pill, title: 'حقول الصيدلية', color: 'red', gradient: 'from-red-50/60 via-pink-50/40' };
      case 'restaurant':
      case 'cafe':
      case 'bakery':
        return { icon: UtensilsCrossed, title: 'حقول المطعم', color: 'orange', gradient: 'from-orange-50/60 via-amber-50/40' };
      case 'auto_parts':
        return { icon: Car, title: 'حقول قطع الغيار', color: 'blue', gradient: 'from-blue-50/60 via-indigo-50/40' };
      case 'construction':
        return { icon: Building2, title: 'حقول مواد البناء', color: 'slate', gradient: 'from-slate-50/60 via-gray-50/40' };
      default:
        return null;
    }
  };

  const businessInfo = getBusinessInfo();

  // إذا لم يكن هناك نوع نشاط محدد أو لا توجد حقول خاصة
  if (!businessInfo) {
    return null;
  }

  const BusinessIcon = businessInfo.icon;

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className={cn(
        'pb-4 rounded-t-lg border-b border-border/30',
        `bg-gradient-to-r ${businessInfo.gradient} to-transparent dark:from-${businessInfo.color}-950/30 dark:via-${businessInfo.color}-950/20 dark:to-transparent`
      )}>
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl shadow-sm',
            `bg-gradient-to-br from-${businessInfo.color}-100 to-${businessInfo.color}-200 dark:from-${businessInfo.color}-900/60 dark:to-${businessInfo.color}-800/60`
          )}>
            <BusinessIcon className={cn('h-4 w-4', `text-${businessInfo.color}-600 dark:text-${businessInfo.color}-400`)} />
          </div>
          <div>
            <span className="text-foreground text-sm">{businessInfo.title}</span>
            <Badge variant="outline" className="text-xs mr-2 shadow-sm">خاص بالنشاط</Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
        {businessType === 'pharmacy' && <PharmacyFields form={form} />}
        {(businessType === 'restaurant' || businessType === 'cafe' || businessType === 'bakery') && <RestaurantFields form={form} />}
        {businessType === 'auto_parts' && <AutoPartsFields form={form} />}
        {businessType === 'construction' && <ConstructionFields form={form} />}
      </CardContent>
    </Card>
  );
});

BusinessSpecificFields.displayName = 'BusinessSpecificFields';

export default BusinessSpecificFields;
