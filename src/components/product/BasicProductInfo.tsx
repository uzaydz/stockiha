import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Package, Tag, FileText, Star, Gift, Eye, Info, HelpCircle, Link, Wand2, Sparkles, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// تم تعطيل Tooltip لتجنب حلقات التحديث العميقة في بعض البيئات
// import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { generateSlugFromText, cleanSlug, isValidSlug } from "@/utils/slugUtils";
const AdvancedDescriptionBuilder = lazy(async () => ({
  default: (await import("@/components/advanced-description/AdvancedDescriptionBuilder")).AdvancedDescriptionBuilder,
}));
import { AdvancedDescription } from "@/types/advanced-description";
const DescriptionGeneratorLazy = lazy(async () => ({
  default: (await import("./DescriptionGenerator")).DescriptionGenerator,
}));
const ProductInfoGeneratorLazy = lazy(async () => ({
  default: (await import("./ProductInfoGenerator")).ProductInfoGenerator,
}));

interface BasicProductInfoProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function BasicProductInfo({ form }: BasicProductInfoProps) {
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);
  const [advancedDescription, setAdvancedDescription] = useState<AdvancedDescription | null>(null);
  const [showDescriptionGenerator, setShowDescriptionGenerator] = useState(false);
  const [showProductInfoGenerator, setShowProductInfoGenerator] = useState(false);
  const [isFromProductInfoGenerator, setIsFromProductInfoGenerator] = useState(false);
  
  // Watch product name/slug
  const watchedName = form.watch('name');
  const watchedSlug = form.watch('slug');
  const prevNameRef = useRef<string | undefined>(undefined);

  // Auto-generate slug when name changes (only if not manually edited and not from ProductInfoGenerator)
  useEffect(() => {
    // امنع حلقات التحديث: نفّذ فقط عندما يتغير الاسم فعلياً
    if (watchedName === prevNameRef.current) return;
    prevNameRef.current = watchedName;

    if (watchedName && !isSlugManual && !isFromProductInfoGenerator) {
      const currentSlug = form.getValues('slug');
      if (!currentSlug || currentSlug === 'product' || currentSlug === '') {
        const generatedSlug = generateSlugFromText(watchedName);
        form.setValue('slug', generatedSlug, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedName, isSlugManual, isFromProductInfoGenerator]);

  // Sync advanced description from form data (avoid watch() in deps)
  const watchedAdvancedDescription = form.watch('advanced_description');
  useEffect(() => {
    setAdvancedDescription(watchedAdvancedDescription || null);
  }, [watchedAdvancedDescription]);

  const handleSlugChange = (value: string) => {
    setIsSlugManual(true);
    setIsFromProductInfoGenerator(false); // إعادة تعيين العلم عند التغيير اليدوي
    const cleanedSlug = cleanSlug(value);
    form.setValue('slug', cleanedSlug, { shouldValidate: true, shouldDirty: true });
    
    // Debug: فحص القيمة بعد الحفظ
    setTimeout(() => {
      const savedSlug = form.getValues('slug');
    }, 100);
  };

  const resetSlugToAuto = () => {
    setIsSlugManual(false);
    if (watchedName) {
      const generatedSlug = generateSlugFromText(watchedName);
      form.setValue('slug', generatedSlug, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleDescriptionGenerated = (description: string) => {
    form.setValue('description', description, { shouldValidate: true, shouldDirty: true });
  };

  const handleProductInfoGenerated = (info: {
    name: string;
    description: string;
    brand: string;
    shippingName: string;
    slug: string;
  }) => {
    // تعيين العلم لمنع التوليد التلقائي للـ slug
    setIsFromProductInfoGenerator(true);
    setIsSlugManual(true); // تعيين كـ manual لمنع التوليد التلقائي
    
    form.setValue('name', info.name, { shouldValidate: true, shouldDirty: true });
    form.setValue('description', info.description, { shouldValidate: true, shouldDirty: true });
    form.setValue('brand', info.brand, { shouldValidate: true, shouldDirty: true });
    form.setValue('name_for_shipping', info.shippingName, { shouldValidate: true, shouldDirty: true });
    form.setValue('slug', info.slug, { shouldValidate: true, shouldDirty: true });
    
    // إعادة تعيين العلم بعد فترة قصيرة
    setTimeout(() => {
      setIsFromProductInfoGenerator(false);
    }, 2000); // زيادة الوقت لضمان عدم التداخل
  };

  return (
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Basic Information Section */}
        <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-xs sm:text-sm truncate block">المعلومات الأساسية</span>
                <Badge variant="destructive" className="text-[10px] sm:text-xs mr-0 sm:mr-2 shadow-sm mt-1 sm:mt-0 sm:inline-block">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 bg-gradient-to-b from-background/50 to-background">
            {/* AI Product Info Generator */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                    توليد معلومات المنتج الشاملة
                  </h3>
                  <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 line-clamp-1 sm:line-clamp-none">
                    استخدم الذكاء الاصطناعي لإنشاء جميع المعلومات الأساسية
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductInfoGenerator(true)}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:py-1.5 h-auto bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700 transition-all duration-300 w-full sm:w-auto flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                توليد شامل
              </Button>
            </div>

            {/* Product Names Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 sm:space-y-2">
                    <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                      اسم المنتج
                      <span className="text-destructive">*</span>
                      <span title="أدخل اسم المنتج كما سيظهر للعملاء في المتجر. يجب أن يكون واضحاً ووصفياً.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: آيفون 15 برو ماكس"
                        className="h-10 sm:h-10 text-sm sm:text-base bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // إعادة تعيين العلم عند تغيير الاسم يدوياً
                          setIsFromProductInfoGenerator(false);
                          // إعادة تعيين manual إذا كان الـ slug فارغ
                          const currentSlug = form.getValues('slug');
                          if (!currentSlug || currentSlug === 'product' || currentSlug === '') {
                            setIsSlugManual(false);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_for_shipping"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 sm:space-y-2">
                    <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                      اسم المنتج للشحن
                      <span title="اسم مختصر للمنتج يظهر في وثائق الشحن والفواتير. اتركه فارغاً لاستخدام الاسم الأساسي.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: آيفون 15 برو"
                        className="h-10 sm:h-10 text-sm sm:text-base bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Slug Row */}
            <div className="space-y-1.5 sm:space-y-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 sm:space-y-2">
                    <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>رابط المنتج (Slug)</span>
                      <Badge variant="outline" className="text-[10px] sm:text-xs shadow-sm">SEO</Badge>
                      <span title="رابط المنتج الذي سيظهر في شريط العنوان ومحركات البحث. يتم إنشاؤه تلقائياً من اسم المنتج أو يمكنك تخصيصه يدوياً لتحسين SEO.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <FormControl>
                        <div className="flex-1">
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            <Input
                              placeholder="مثال: iphone-15-pro-max"
                              className="h-10 sm:h-10 text-sm sm:text-base bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 pl-9 sm:pl-10"
                              value={field.value || ''}
                              onChange={(e) => {
                                handleSlugChange(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              dir="ltr"
                            />
                          </div>
                          {watchedSlug && (
                            <div className="mt-1.5 sm:mt-2 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <p className="text-[10px] sm:text-xs text-muted-foreground" dir="ltr">
                                  الرابط: /product/{watchedSlug}
                                </p>
                                {isValidSlug(watchedSlug) ? (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                    صالح
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px] sm:text-xs">
                                    غير صالح
                                  </Badge>
                                )}
                              </div>
                              <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                                <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                                  {isSlugManual ? (
                                    <>📝 تم تخصيص الرابط يدوياً</>
                                  ) : (
                                    <>🤖 تم إنشاء الرابط تلقائياً من اسم المنتج</>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {isSlugManual && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={resetSlugToAuto}
                          title="إعادة تعيين الرابط ليتم إنشاؤه تلقائياً من اسم المنتج"
                          className="px-3 h-10 text-xs sm:text-sm hover:bg-primary/5 hover:border-primary/50 w-full sm:w-auto"
                        >
                          🔄 تلقائي
                        </Button>
                      )}
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem className="space-y-1.5 sm:space-y-2">
                  <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                    العلامة التجارية
                    <span title="اسم الشركة المصنعة أو العلامة التجارية للمنتج. يساعد العملاء في التعرف على المنتج.">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: آبل، سامسونغ، هواوي"
                      className="h-10 sm:h-10 text-sm sm:text-base bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5 sm:space-y-2">
                  <FormLabel className="text-xs sm:text-sm font-medium text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>وصف المنتج</span>
                    <span className="text-destructive">*</span>
                    <Badge variant="destructive" className="text-[10px] sm:text-xs shadow-sm">مطلوب</Badge>
                    <span title="وصف تفصيلي للمنتج يشمل المميزات والفوائد. هذا الحقل مطلوب ويساعد العملاء في اتخاذ قرار الشراء.">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  
                  {/* AI Description Generator Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 sm:mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDescriptionGenerator(true)}
                      disabled={!watchedName?.trim()}
                      className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:py-1.5 h-auto bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700 transition-all duration-300 w-full sm:w-auto"
                    >
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                      <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                      توليد وصف ذكي
                    </Button>
                    {!watchedName?.trim() && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        (أدخل اسم المنتج أولاً)
                      </span>
                    )}
                  </div>
                  
                  <FormControl>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-3 sm:top-4 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                      <Textarea 
                        placeholder="اكتب وصفاً مفصلاً للمنتج يشمل المميزات والمواصفات والفوائد..." 
                        className="pl-9 sm:pl-10 min-h-[100px] sm:min-h-[120px] resize-none text-xs sm:text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm" 
                        {...field} 
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      {/* Character Counter */}
                      <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 text-[10px] sm:text-xs text-muted-foreground">
                        {field.value?.length || 0} حرف
                        {field.value?.length >= 50 ? (
                          <span className="text-green-600 dark:text-green-400 mr-1">✓</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 mr-1 text-[9px] sm:text-[10px]">
                            (ينصح بـ 50 حرف على الأقل)
                          </span>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  
                  {/* Description Tips */}
                  <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2.5 sm:p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2 font-medium">
                      💡 نصائح لكتابة وصف فعال:
                    </p>
                    <ul className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 space-y-0.5 sm:space-y-1">
                      <li>• اذكر المميزات الرئيسية والفوائد</li>
                      <li>• أضف المواصفات التقنية المهمة</li>
                      <li className="hidden sm:list-item">• استخدم كلمات مفتاحية للبحث</li>
                      <li className="hidden sm:list-item">• اجعل الوصف واضح ومقنع</li>
                    </ul>
                  </div>
                  
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Advanced Description Builder */}
            <div className="space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 border-t border-border/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs sm:text-sm font-medium text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span>الوصف المتقدم</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">جديد</Badge>
                  </Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                    قم بإنشاء وصف احترافي مع الصور والسلايد شو وآراء العملاء
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedBuilder(true)}
                  className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-2 sm:py-1.5 h-auto bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20 hover:border-primary/30 transition-all duration-300 w-full sm:w-auto flex-shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {advancedDescription ? 'تعديل' : 'إنشاء'} الوصف المتقدم
                </Button>
              </div>

              {/* Advanced Description Preview */}
              {advancedDescription && advancedDescription.components.length > 0 && (
                <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 p-2.5 sm:p-3 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                      تم إنشاء وصف متقدم
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                      {advancedDescription.components.length} {advancedDescription.components.length === 1 ? 'مكون' : 'مكونات'} • 
                      آخر تحديث: {new Date(advancedDescription.metadata.updatedAt).toLocaleDateString('ar-SA')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdvancedDescription(null)}
                      className="h-7 sm:h-6 px-2 text-[10px] sm:text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Description Builder Dialog */}
        <Suspense fallback={null}>
        <AdvancedDescriptionBuilder
          open={showAdvancedBuilder}
          onOpenChange={setShowAdvancedBuilder}
          initialDescription={advancedDescription}
          onSave={(description) => {
            setAdvancedDescription(description);
            // Update form with advanced description
            form.setValue('advanced_description', description, { 
              shouldValidate: true, 
              shouldDirty: true 
            });
          }}
        />
        </Suspense>

        {/* AI Description Generator Dialog */}
        <Suspense fallback={null}>
        <DescriptionGeneratorLazy
          open={showDescriptionGenerator}
          onOpenChange={setShowDescriptionGenerator}
          productName={watchedName || ''}
          onDescriptionGenerated={handleDescriptionGenerated}
        />
        </Suspense>

        {/* AI Product Info Generator Dialog */}
        <Suspense fallback={null}>
        <ProductInfoGeneratorLazy
          open={showProductInfoGenerator}
          onOpenChange={setShowProductInfoGenerator}
          onInfoGenerated={handleProductInfoGenerated}
        />
        </Suspense>


      </div>
  );
}
