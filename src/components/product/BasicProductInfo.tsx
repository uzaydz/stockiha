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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState, lazy, Suspense } from "react";
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
  
  // Watch product name to auto-generate slug
  const watchedName = form.watch('name');
  const watchedSlug = form.watch('slug');

  // Auto-generate slug when name changes (only if not manually edited and not from ProductInfoGenerator)
  useEffect(() => {
    if (watchedName && !isSlugManual && !isFromProductInfoGenerator) {
      // فقط إذا كان الـ slug فارغ أو يحتوي على قيمة افتراضية
      const currentSlug = form.getValues('slug');
      
      if (!currentSlug || currentSlug === 'product' || currentSlug === '') {
        const generatedSlug = generateSlugFromText(watchedName);
        form.setValue('slug', generatedSlug, { shouldValidate: true, shouldDirty: true });
        
        // Debug: فحص القيمة بعد الحفظ
        setTimeout(() => {
          const savedSlug = form.getValues('slug');
        }, 100);
      }
    }
  }, [watchedName, isSlugManual, isFromProductInfoGenerator, form]);

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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Basic Information Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Info className="h-4 w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">المعلومات الأساسية</span>
                <Badge variant="destructive" className="text-xs mr-2 shadow-sm">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background">
            {/* AI Product Info Generator */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-2 rounded-lg">
                  <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    توليد معلومات المنتج الشاملة
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    استخدم الذكاء الاصطناعي لإنشاء جميع المعلومات الأساسية
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductInfoGenerator(true)}
                className="gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700 transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                توليد شامل
              </Button>
            </div>

            {/* Product Names Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      اسم المنتج
                      <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center"
                            onClick={(e) => e.preventDefault()}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                          side="top"
                          sideOffset={5}
                        >
                          <p className="text-xs">أدخل اسم المنتج كما سيظهر للعملاء في المتجر. يجب أن يكون واضحاً ووصفياً.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: آيفون 15 برو ماكس"
                        className="h-10 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_for_shipping"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      اسم المنتج للشحن
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center"
                            onClick={(e) => e.preventDefault()}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                          side="top"
                          sideOffset={5}
                        >
                          <p className="text-xs">اسم مختصر للمنتج يظهر في وثائق الشحن والفواتير. اتركه فارغاً لاستخدام الاسم الأساسي.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: آيفون 15 برو"
                        className="h-10 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Slug Row */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      رابط المنتج (Slug)
                      <Badge variant="outline" className="text-xs shadow-sm">SEO</Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center"
                            onClick={(e) => e.preventDefault()}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                          side="top"
                          sideOffset={5}
                        >
                          <p className="text-xs">رابط المنتج الذي سيظهر في شريط العنوان ومحركات البحث. يتم إنشاؤه تلقائياً من اسم المنتج أو يمكنك تخصيصه يدوياً لتحسين SEO.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <div className="flex-1">
                          <div className="relative">
                            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="مثال: iphone-15-pro-max"
                              className="h-10 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 pl-10"
                              value={field.value || ''}
                              onChange={(e) => {
                                handleSlugChange(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              dir="ltr"
                            />
                          </div>
                          {watchedSlug && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground" dir="ltr">
                                  الرابط: /product/{watchedSlug}
                                </p>
                                {isValidSlug(watchedSlug) ? (
                                  <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                    صالح
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    غير صالح
                                  </Badge>
                                )}
                              </div>
                              <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={resetSlugToAuto}
                              className="px-3 h-10 hover:bg-primary/5 hover:border-primary/50"
                            >
                              🔄 تلقائي
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">إعادة تعيين الرابط ليتم إنشاؤه تلقائياً من اسم المنتج</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    العلامة التجارية
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-xs">اسم الشركة المصنعة أو العلامة التجارية للمنتج. يساعد العملاء في التعرف على المنتج.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="مثال: آبل، سامسونغ، هواوي"
                      className="h-10 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    وصف المنتج
                    <span className="text-destructive">*</span>
                    <Badge variant="destructive" className="text-xs shadow-sm">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-xs">وصف تفصيلي للمنتج يشمل المميزات والفوائد. هذا الحقل مطلوب ويساعد العملاء في اتخاذ قرار الشراء.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  
                  {/* AI Description Generator Button */}
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDescriptionGenerator(true)}
                      disabled={!watchedName?.trim()}
                      className="gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700 transition-all duration-300"
                    >
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                      توليد وصف ذكي
                    </Button>
                    {!watchedName?.trim() && (
                      <span className="text-xs text-muted-foreground">
                        (أدخل اسم المنتج أولاً)
                      </span>
                    )}
                  </div>
                  
                  <FormControl>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                      <Textarea 
                        placeholder="اكتب وصفاً مفصلاً للمنتج يشمل المميزات والمواصفات والفوائد..." 
                        className="pl-10 min-h-[120px] resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm" 
                        {...field} 
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      {/* Character Counter */}
                      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                        {field.value?.length || 0} حرف
                        {field.value?.length >= 50 ? (
                          <span className="text-green-600 dark:text-green-400 mr-1">✓</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 mr-1">
                            (ينصح بـ 50 حرف على الأقل)
                          </span>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  
                  {/* Description Tips */}
                  <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">
                      💡 نصائح لكتابة وصف فعال:
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• اذكر المميزات الرئيسية والفوائد</li>
                      <li>• أضف المواصفات التقنية المهمة</li>
                      <li>• استخدم كلمات مفتاحية للبحث</li>
                      <li>• اجعل الوصف واضح ومقنع</li>
                    </ul>
                  </div>
                  
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Advanced Description Builder */}
            <div className="space-y-3 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    الوصف المتقدم
                    <Badge variant="secondary" className="text-xs">جديد</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    قم بإنشاء وصف احترافي مع الصور والسلايد شو وآراء العملاء
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedBuilder(true)}
                  className="gap-2 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20 hover:border-primary/30 transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4" />
                  {advancedDescription ? 'تعديل الوصف المتقدم' : 'إنشاء وصف متقدم'}
                </Button>
              </div>

              {/* Advanced Description Preview */}
              {advancedDescription && advancedDescription.components.length > 0 && (
                <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 p-3 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      تم إنشاء وصف متقدم
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {advancedDescription.components.length} {advancedDescription.components.length === 1 ? 'مكون' : 'مكونات'} • 
                      آخر تحديث: {new Date(advancedDescription.metadata.updatedAt).toLocaleDateString('ar-SA')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdvancedDescription(null)}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
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

        {/* Product Settings Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 p-2.5 rounded-xl shadow-sm">
                <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-foreground text-sm">إعدادات المنتج</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative overflow-hidden group">
                      <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border/60 rounded-xl hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 dark:hover:from-amber-950/20 dark:hover:to-orange-950/10 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 dark:data-[state=checked]:bg-amber-600 dark:data-[state=checked]:border-amber-600 shadow-sm"
                          />
                        </FormControl>
                        <div className="flex items-center space-x-2 space-x-reverse flex-1">
                          <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2 rounded-xl group-hover:from-amber-200 group-hover:to-amber-300 dark:group-hover:from-amber-800/80 dark:group-hover:to-amber-700/80 transition-all duration-300 shadow-sm">
                            <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-foreground">منتج مميز</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-amber-600 transition-colors cursor-help" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                                  side="top"
                                  sideOffset={5}
                                >
                                  <p className="text-xs">سيظهر المنتج في قسم المنتجات المميزة في الصفحة الرئيسية للمتجر.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">يظهر في المنتجات المميزة</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_new"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative overflow-hidden group">
                      <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border/60 rounded-xl hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 dark:hover:from-green-950/20 dark:hover:to-emerald-950/10 hover:border-green-300/50 dark:hover:border-green-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 dark:data-[state=checked]:bg-green-600 dark:data-[state=checked]:border-green-600 shadow-sm"
                          />
                        </FormControl>
                        <div className="flex items-center space-x-2 space-x-reverse flex-1">
                          <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-2 rounded-xl group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-800/80 dark:group-hover:to-green-700/80 transition-all duration-300 shadow-sm">
                            <Gift className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-foreground">منتج جديد</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-green-600 transition-colors cursor-help" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                                  side="top"
                                  sideOffset={5}
                                >
                                  <p className="text-xs">سيتم وضع علامة "جديد" على المنتج وقد يظهر في قسم المنتجات الجديدة.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">يحمل علامة جديد</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="show_price_on_landing"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative overflow-hidden group">
                      <div className="flex items-center space-x-3 space-x-reverse p-4 border border-border/60 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 hover:border-blue-300/50 dark:hover:border-blue-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600 shadow-sm"
                          />
                        </FormControl>
                        <div className="flex items-center space-x-2 space-x-reverse flex-1">
                          <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800/80 dark:group-hover:to-blue-700/80 transition-all duration-300 shadow-sm">
                            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-foreground">إظهار السعر</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                                  side="top"
                                  sideOffset={5}
                                >
                                  <p className="text-xs">تحديد ما إذا كان سعر المنتج سيظهر في صفحة المتجر أم سيتم إخفاؤه (مفيد للمنتجات التي تتطلب استفسار).</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">يظهر السعر في المتجر</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
