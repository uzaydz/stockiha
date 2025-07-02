import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Package, Tag, FileText, Star, Gift, Eye, Info, HelpCircle, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { generateSlugFromText, cleanSlug, isValidSlug } from "@/utils/slugUtils";

interface BasicProductInfoProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function BasicProductInfo({ form }: BasicProductInfoProps) {
  const [isSlugManual, setIsSlugManual] = useState(false);
  
  // Watch product name to auto-generate slug
  const watchedName = form.watch('name');
  const watchedSlug = form.watch('slug');

  // Auto-generate slug when name changes (only if not manually edited)
  useEffect(() => {
    if (watchedName && !isSlugManual) {
      const generatedSlug = generateSlugFromText(watchedName);
      form.setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [watchedName, isSlugManual, form]);

  const handleSlugChange = (value: string) => {
    setIsSlugManual(true);
    const cleanedSlug = cleanSlug(value);
    form.setValue('slug', cleanedSlug, { shouldValidate: true });
  };

  const resetSlugToAuto = () => {
    setIsSlugManual(false);
    if (watchedName) {
      const generatedSlug = generateSlugFromText(watchedName);
      form.setValue('slug', generatedSlug, { shouldValidate: true });
    }
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
                          <p className="text-xs">رابط المنتج الذي سيظهر في شريط العنوان. يتم إنشاؤه تلقائياً من اسم المنتج أو يمكنك تخصيصه يدوياً.</p>
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
                              onChange={(e) => handleSlugChange(e.target.value)}
                              dir="ltr"
                            />
                          </div>
                          {watchedSlug && (
                            <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                              الرابط: /product/{watchedSlug}
                            </p>
                          )}
                        </div>
                      </FormControl>
                      {isSlugManual && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={resetSlugToAuto}
                          className="px-3 h-10"
                        >
                          تلقائي
                        </Button>
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
                        <p className="text-xs">وصف تفصيلي للمنتج يشمل المميزات والفوائد. يساعد العملاء في اتخاذ قرار الشراء.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                      <Textarea 
                        placeholder="اكتب وصفاً مفصلاً للمنتج يشمل المميزات والمواصفات..." 
                        className="pl-10 min-h-[100px] resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm" 
                        {...field} 
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

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
