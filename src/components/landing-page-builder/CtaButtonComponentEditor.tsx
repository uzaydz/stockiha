import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/color-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { LandingPageComponent } from './types';
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  MousePointer, 
  ShoppingCart, 
  DollarSign, 
  CreditCard, 
  Gift, 
  Zap, 
  Eye, 
  Clock, 
  Check, 
  Heart, 
  Star, 
  Download, 
  LucideIcon
} from 'lucide-react';

// تعريف واجهة خصائص المحرر
interface ComponentEditorProps {
  component: LandingPageComponent;
  onSave: (component: LandingPageComponent) => void;
  availableComponents?: LandingPageComponent[];
}

const FormSchema = z.object({
  text: z.string().min(1, { message: 'نص الزر مطلوب' }),
  variant: z.enum(['default', 'secondary', 'destructive', 'outline', 'ghost', 'link', 'gradient', 'glass', 'neon', 'soft', 'vibrant']),
  size: z.enum(['xs', 'sm', 'default', 'lg', 'xl', 'xxl']),
  roundness: z.enum(['none', 'sm', 'default', 'lg', 'xl', 'full', 'pill']),
  shadow: z.enum(['none', 'sm', 'default', 'md', 'lg', 'xl', 'layered', 'glow', 'sharp']),
  animation: z.enum(['none', 'pulse', 'bounce', 'shake', 'glow', 'scale', 'breathe', 'spin', 'wiggle']),
  effect: z.enum(['none', 'ripple', 'shine', 'float', 'elevate', 'morphing', 'movingGradient', 'growShrink', 'tilt']),
  borderStyle: z.enum(['none', 'solid', 'dashed', 'dotted', 'double', 'outset', 'gradient', 'animated']),
  fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold', 'extrabold']),
  scrollToId: z.string().transform(val => val === '' ? 'none' : val),
  hasRipple: z.boolean().default(false),
  hasPulsingBorder: z.boolean().default(false),
  isGlowingText: z.boolean().default(false),
  hasDoubleText: z.boolean().default(false),
  secondaryText: z.string().optional(),
  customTextColor: z.string().optional(),
  customBgColor: z.string().optional(),
  customBorderColor: z.string().optional(),
  hoverTextColor: z.string().optional(),
  iconPosition: z.enum(['left', 'right']).default('right'),
  iconType: z.enum(['none', 'arrowRight', 'arrowLeft', 'chevronRight', 'chevronLeft', 'mousePointer', 'shoppingCart', 'dollarSign', 'creditCard', 'gift', 'zap', 'eye', 'clock', 'check', 'heart', 'star', 'download']).default('none'),
  iconSpacing: z.enum(['close', 'normal', 'far']).default('normal'),
  useCustomColors: z.boolean().default(false),
});

// قائمة الأيقونات وتسمياتها بالعربية
const ICON_OPTIONS = [
  { value: 'none', label: 'بدون', icon: null },
  { value: 'arrowRight', label: 'سهم لليمين', icon: ArrowRight },
  { value: 'arrowLeft', label: 'سهم لليسار', icon: ArrowLeft },
  { value: 'chevronRight', label: 'شيفرون لليمين', icon: ChevronRight },
  { value: 'chevronLeft', label: 'شيفرون لليسار', icon: ChevronLeft },
  { value: 'mousePointer', label: 'مؤشر', icon: MousePointer },
  { value: 'shoppingCart', label: 'سلة تسوق', icon: ShoppingCart },
  { value: 'dollarSign', label: 'علامة الدولار', icon: DollarSign },
  { value: 'creditCard', label: 'بطاقة ائتمان', icon: CreditCard },
  { value: 'gift', label: 'هدية', icon: Gift },
  { value: 'zap', label: 'برق', icon: Zap },
  { value: 'eye', label: 'عين', icon: Eye },
  { value: 'clock', label: 'ساعة', icon: Clock },
  { value: 'check', label: 'صح', icon: Check },
  { value: 'heart', label: 'قلب', icon: Heart },
  { value: 'star', label: 'نجمة', icon: Star },
  { value: 'download', label: 'تنزيل', icon: Download },
];

// الأهداف الافتراضية للتمرير
const DEFAULT_SCROLL_TARGETS = [
  { id: 'form-section', name: 'نموذج الاتصال' },
  { id: 'form-section-main', name: 'النموذج الرئيسي' },
  { id: 'header', name: 'رأس الصفحة' },
  { id: 'footer', name: 'تذييل الصفحة' },
  { id: 'about', name: 'من نحن' },
  { id: 'services', name: 'خدماتنا' },
  { id: 'products', name: 'منتجاتنا' },
  { id: 'contact', name: 'اتصل بنا' },
  { id: 'testimonials-section', name: 'آراء العملاء' },
  { id: 'gallery', name: 'معرض الصور' },
  { id: 'pricing', name: 'الأسعار' },
  { id: 'faq', name: 'الأسئلة الشائعة' },
  { id: 'top', name: 'أعلى الصفحة' },
];

// دالة للحصول على مكون الأيقونة بناءً على نوعها
export const getIconComponent = (iconType: string): React.ReactNode => {
  const iconOption = ICON_OPTIONS.find(option => option.value === iconType);
  if (!iconOption || !iconOption.icon) return null;
  
  const IconComponent = iconOption.icon;
  return <IconComponent size={16} />;
};

export type CtaButtonFormValues = z.infer<typeof FormSchema>;

// دالة مساعدة للتأخير (debounce)
function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
  
  return debouncedCallback;
}

export function CtaButtonComponentEditor({ 
  component, 
  onSave,
  availableComponents = [] 
}: ComponentEditorProps) {
  const form = useForm<CtaButtonFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      text: component.settings?.text || 'اضغط هنا',
      variant: (component.settings?.variant as any) || 'default',
      size: (component.settings?.size as any) || 'default',
      roundness: (component.settings?.roundness as any) || 'default',
      shadow: (component.settings?.shadow as any) || 'none',
      animation: (component.settings?.animation as any) || 'none',
      effect: (component.settings?.effect as any) || 'none',
      borderStyle: (component.settings?.borderStyle as any) || 'none',
      fontWeight: (component.settings?.fontWeight as any) || 'medium',
      scrollToId: component.settings?.scrollToId || 'none',
      hasRipple: component.settings?.hasRipple || false,
      hasPulsingBorder: component.settings?.hasPulsingBorder || false,
      isGlowingText: component.settings?.isGlowingText || false,
      hasDoubleText: component.settings?.hasDoubleText || false,
      secondaryText: component.settings?.secondaryText || '',
      customTextColor: component.settings?.customTextColor || '#ffffff',
      customBgColor: component.settings?.customBgColor || '#3b82f6',
      customBorderColor: component.settings?.customBorderColor || '#3b82f6',
      hoverTextColor: component.settings?.hoverTextColor || '',
      iconPosition: (component.settings?.iconPosition as any) || 'right',
      iconType: (component.settings?.iconType as any) || 'none',
      iconSpacing: (component.settings?.iconSpacing as any) || 'normal',
      useCustomColors: component.settings?.useCustomColors || false,
    },
  });

  const watchVariant = form.watch('variant');
  const watchUseCustomColors = form.watch('useCustomColors');
  const watchHasDoubleText = form.watch('hasDoubleText');
  const watchIconType = form.watch('iconType');
  
  // دالة معالجة التغييرات مع تأخير
  const debouncedSave = useDebounce((values: CtaButtonFormValues) => {
    const formValuesToSave = { ...values };
    
    // تحويل قيمة "none" إلى قيمة فارغة للحفظ
    if (formValuesToSave.scrollToId === 'none') {
      formValuesToSave.scrollToId = '';
    }
    
    // التحقق من وجود تغيرات فعلية قبل الحفظ لتجنب التحديثات المتكررة
    const currentSettings = component.settings || {};
    let hasChanges = false;
    
    for (const key in formValuesToSave) {
      const newValue = formValuesToSave[key];
      const currentValue = currentSettings[key];
      
      // للتبسيط، نستخدم مقارنة سلسلة JSON
      if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
        hasChanges = true;
        break;
      }
    }
    
    // إجراء الحفظ فقط عند وجود تغييرات فعلية
    if (hasChanges) {
      // console.log("تم العثور على تغييرات، يتم التحديث...");
      onSave({
        ...component,
        settings: {
          ...component.settings,
          ...formValuesToSave,
        },
      });
    }
  }, 300);
  
  // ربط دالة الحفظ المؤجلة بالمكون ووظيفة الحفظ الرئيسية
  const saveWithCurrentComponent = useRef(debouncedSave);
  
  useEffect(() => {
    saveWithCurrentComponent.current = (values: CtaButtonFormValues) => {
      debouncedSave(values);
    };
  }, [component, onSave, debouncedSave]);
  
  // إضافة مراقب لجميع حقول النموذج باستخدام الدالة المؤجلة
  const formValues = form.watch();
  useEffect(() => {
    saveWithCurrentComponent.current(formValues);
  }, [formValues]);
  
  // إعداد قائمة الأهداف للتمرير
  const getScrollTargets = () => {
    // جمع المكونات المتاحة من الصفحة مع ترجمة أنواعها
    const componentTargets = availableComponents
      .filter(comp => comp.id !== component.id) // استبعاد هذا المكون نفسه
      .map(comp => ({
        id: comp.id,
        name: getComponentDisplayName(comp)
      }));
    
    // دمج المكونات المخصصة مع العناصر الافتراضية
    return [...componentTargets, ...DEFAULT_SCROLL_TARGETS];
  };

  // الحصول على اسم عرض مترجم للمكون
  const getComponentDisplayName = (comp: LandingPageComponent): string => {
    const componentTypeMap: Record<string, string> = {
      'hero': 'البطل الرئيسي',
      'text': 'نص',
      'image': 'صورة',
      'form': 'نموذج',
      'cta-button': 'زر دعوة للعمل',
      'testimonials': 'شهادات العملاء',
      'product-hero': 'بطل المنتج',
      'product-benefits': 'فوائد المنتج',
      'guarantees': 'ضمانات',
      'before-after': 'قبل وبعد',
      'problem-solution': 'المشكلة والحل',
      'why-choose-us': 'لماذا تختارنا',
    };

    const typeName = componentTypeMap[comp.type] || comp.type;
    return `${typeName} ${comp.id}`;
  };

  const scrollTargets = getScrollTargets();

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <h3 className="text-lg font-medium text-right">تعديل زر الدعوة للعمل</h3>
      <Separator className="my-2" />
      
      <Form {...form}>
        <div className="space-y-6">
          <Accordion type="single" collapsible defaultValue="content" className="w-full">
            <AccordionItem value="content">
              <AccordionTrigger className="text-right">المحتوى</AccordionTrigger>
              <AccordionContent>
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>نص الزر</FormLabel>
                      <FormControl>
                        <Input placeholder="اضغط هنا" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="scrollToId"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>التمرير إلى عنصر (اختياري)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value === '' ? 'none' : field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر عنصراً للتمرير إليه" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-80">
                          <SelectItem value="none">بدون تمرير</SelectItem>
                          {scrollTargets.map((target) => (
                            <SelectItem 
                              key={target.id} 
                              value={target.id}
                            >
                              {target.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-right">
                        العنصر الذي سيتم التمرير إليه عند النقر على الزر
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasDoubleText"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-3 mt-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 text-right">
                        <FormLabel>نص مزدوج</FormLabel>
                        <FormDescription>
                          عرض نص ثانوي عند تحويم المؤشر فوق الزر
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchHasDoubleText && (
                  <FormField
                    control={form.control}
                    name="secondaryText"
                    render={({ field }) => (
                      <FormItem className="mt-4 text-right">
                        <FormLabel>النص الثانوي</FormLabel>
                        <FormControl>
                          <Input placeholder="انقر الآن" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="iconType"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>الأيقونة</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الأيقونة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-80">
                          {ICON_OPTIONS.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              className="flex items-center gap-2"
                            >
                              <div className="flex items-center gap-2">
                                {option.icon && <option.icon size={16} />}
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {watchIconType !== 'none' && (
                  <>
                    <FormField
                      control={form.control}
                      name="iconPosition"
                      render={({ field }) => (
                        <FormItem className="mt-4 text-right">
                          <FormLabel>موضع الأيقونة</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر موضع الأيقونة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="right">يمين</SelectItem>
                              <SelectItem value="left">يسار</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iconSpacing"
                      render={({ field }) => (
                        <FormItem className="mt-4 text-right">
                          <FormLabel>المسافة بين الأيقونة والنص</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المسافة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="close">قريبة</SelectItem>
                              <SelectItem value="normal">عادية</SelectItem>
                              <SelectItem value="far">بعيدة</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="style">
              <AccordionTrigger className="text-right">المظهر</AccordionTrigger>
              <AccordionContent>
                <FormField
                  control={form.control}
                  name="variant"
                  render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>النمط</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نمط الزر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">افتراضي</SelectItem>
                          <SelectItem value="secondary">ثانوي</SelectItem>
                          <SelectItem value="destructive">تحذيري</SelectItem>
                          <SelectItem value="outline">إطار</SelectItem>
                          <SelectItem value="ghost">شفاف</SelectItem>
                          <SelectItem value="link">رابط</SelectItem>
                          <SelectItem value="gradient">تدرج</SelectItem>
                          <SelectItem value="glass">زجاجي</SelectItem>
                          <SelectItem value="neon">نيون</SelectItem>
                          <SelectItem value="soft">ناعم</SelectItem>
                          <SelectItem value="vibrant">نابض بالحياة</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>الحجم</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حجم الزر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="xs">صغير جداً</SelectItem>
                          <SelectItem value="sm">صغير</SelectItem>
                          <SelectItem value="default">متوسط</SelectItem>
                          <SelectItem value="lg">كبير</SelectItem>
                          <SelectItem value="xl">كبير جداً</SelectItem>
                          <SelectItem value="xxl">ضخم</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roundness"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>استدارة الحواف</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر استدارة الحواف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون</SelectItem>
                          <SelectItem value="sm">قليلة</SelectItem>
                          <SelectItem value="default">متوسطة</SelectItem>
                          <SelectItem value="lg">كبيرة</SelectItem>
                          <SelectItem value="xl">كبيرة جداً</SelectItem>
                          <SelectItem value="full">دائرية</SelectItem>
                          <SelectItem value="pill">كبسولية</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fontWeight"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>سمك الخط</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر سمك الخط" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">عادي</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="semibold">شبه سميك</SelectItem>
                          <SelectItem value="bold">سميك</SelectItem>
                          <SelectItem value="extrabold">سميك جداً</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="borderStyle"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>نمط الحدود</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نمط الحدود" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون</SelectItem>
                          <SelectItem value="solid">صلب</SelectItem>
                          <SelectItem value="dashed">متقطع</SelectItem>
                          <SelectItem value="dotted">منقط</SelectItem>
                          <SelectItem value="double">مزدوج</SelectItem>
                          <SelectItem value="outset">بارز</SelectItem>
                          <SelectItem value="gradient">تدرج</SelectItem>
                          <SelectItem value="animated">متحرك</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shadow"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>الظل</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الظل" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون</SelectItem>
                          <SelectItem value="sm">خفيف</SelectItem>
                          <SelectItem value="default">متوسط</SelectItem>
                          <SelectItem value="md">متوسط+</SelectItem>
                          <SelectItem value="lg">كبير</SelectItem>
                          <SelectItem value="xl">كبير جداً</SelectItem>
                          <SelectItem value="layered">متعدد الطبقات</SelectItem>
                          <SelectItem value="glow">متوهج</SelectItem>
                          <SelectItem value="sharp">حاد</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useCustomColors"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-3 mt-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 text-right">
                        <FormLabel>استخدام ألوان مخصصة</FormLabel>
                        <FormDescription>
                          استبدال ألوان النمط بألوان مخصصة
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchUseCustomColors && (
                  <div className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="customBgColor"
                      render={({ field }) => (
                        <FormItem className="text-right">
                          <FormLabel>لون الخلفية</FormLabel>
                          <FormControl>
                            <ColorPicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTextColor"
                      render={({ field }) => (
                        <FormItem className="text-right">
                          <FormLabel>لون النص</FormLabel>
                          <FormControl>
                            <ColorPicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hoverTextColor"
                      render={({ field }) => (
                        <FormItem className="text-right">
                          <FormLabel>لون النص عند التحويم</FormLabel>
                          <FormControl>
                            <ColorPicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customBorderColor"
                      render={({ field }) => (
                        <FormItem className="text-right">
                          <FormLabel>لون الحدود</FormLabel>
                          <FormControl>
                            <ColorPicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="effects">
              <AccordionTrigger className="text-right">التأثيرات والحركة</AccordionTrigger>
              <AccordionContent>
                <FormField
                  control={form.control}
                  name="animation"
                  render={({ field }) => (
                    <FormItem className="text-right">
                      <FormLabel>الحركة</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحركة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون</SelectItem>
                          <SelectItem value="pulse">نبض</SelectItem>
                          <SelectItem value="bounce">قفز</SelectItem>
                          <SelectItem value="shake">اهتزاز</SelectItem>
                          <SelectItem value="glow">توهج</SelectItem>
                          <SelectItem value="scale">تكبير عند التحويم</SelectItem>
                          <SelectItem value="breathe">تنفس</SelectItem>
                          <SelectItem value="spin">دوران</SelectItem>
                          <SelectItem value="wiggle">تمايل</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effect"
                  render={({ field }) => (
                    <FormItem className="mt-4 text-right">
                      <FormLabel>التأثير</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر التأثير" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون</SelectItem>
                          <SelectItem value="ripple">تموج</SelectItem>
                          <SelectItem value="shine">لمعان</SelectItem>
                          <SelectItem value="float">طفو عند التحويم</SelectItem>
                          <SelectItem value="elevate">ارتفاع عند التحويم</SelectItem>
                          <SelectItem value="morphing">تغير الشكل</SelectItem>
                          <SelectItem value="movingGradient">تدرج متحرك</SelectItem>
                          <SelectItem value="growShrink">تكبير وتصغير</SelectItem>
                          <SelectItem value="tilt">ميلان</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasRipple"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-3 mt-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 text-right">
                        <FormLabel>تأثير التموج عند النقر</FormLabel>
                        <FormDescription>
                          إظهار حركة تموج عند النقر على الزر
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasPulsingBorder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-3 mt-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 text-right">
                        <FormLabel>إطار نابض</FormLabel>
                        <FormDescription>
                          إضافة إطار نابض لجذب الانتباه
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isGlowingText"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-between rounded-lg border p-3 mt-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5 text-right">
                        <FormLabel>نص متوهج</FormLabel>
                        <FormDescription>
                          إضافة تأثير توهج للنص
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Form>
    </div>
  );
} 