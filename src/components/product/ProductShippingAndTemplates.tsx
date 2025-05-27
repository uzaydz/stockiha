import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ProductFormValues } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Truck, 
  FileText, 
  Settings, 
  Copy, 
  CheckCircle,
  Package,
  Globe,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Layers
} from 'lucide-react';

// Import API functions and types
import { getOrganizationTemplates, OrganizationTemplate, getFormSettingTemplatesForProductPage } from '@/lib/api/organizationTemplates';
import { getActiveShippingProvidersForOrg, ActiveShippingProvider, getActiveShippingClonesForOrg } from '@/lib/api/shipping';
import { toast } from 'sonner'; // For error notifications

interface ProductShippingAndTemplatesProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string; // Useful for determining if it's a new product
}

const ProductShippingAndTemplates: React.FC<ProductShippingAndTemplatesProps> = ({ form, organizationId, productId }) => {
  const [templates, setTemplates] = useState<OrganizationTemplate[]>([]);
  const [shippingProviders, setShippingProviders] = useState<ActiveShippingProvider[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingShippingProviders, setIsLoadingShippingProviders] = useState(false);
  const [shippingClones, setShippingClones] = useState<{ id: number; name: string }[]>([]);
  const [isLoadingShippingClones, setIsLoadingShippingClones] = useState(false);

  const { control, watch, setValue } = form; // Destructure for easier use
  const useShippingClone = watch('use_shipping_clone');
  const currentFormTemplateId = watch('form_template_id');

  // Fetch organization templates
  useEffect(() => {
    if (organizationId) {
      setIsLoadingTemplates(true);
      getFormSettingTemplatesForProductPage(organizationId)
        .then(data => {
          setTemplates(data);
          if (!productId && !currentFormTemplateId && data.length > 0) {
            const defaultTemplate = data.find(t => t.is_default);
            if (defaultTemplate) {
              setValue('form_template_id', defaultTemplate.id, { shouldValidate: true });
            }
          }
        })
        .catch(() => toast.error('فشل تحميل نماذج عرض الصفحة.'))
        .finally(() => setIsLoadingTemplates(false));

      setIsLoadingShippingProviders(true);
      getActiveShippingProvidersForOrg(organizationId)
        .then(setShippingProviders)
        .catch(() => toast.error('فشل تحميل مزودي الشحن.'))
        .finally(() => setIsLoadingShippingProviders(false));

      // Fetch shipping clones
      setIsLoadingShippingClones(true);
      getActiveShippingClonesForOrg(organizationId)
        .then(setShippingClones)
        .catch(() => toast.error('فشل تحميل كلونات الشحن.'))
        .finally(() => setIsLoadingShippingClones(false));
    }
  }, [organizationId, setValue, productId, currentFormTemplateId]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Product Display Template Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <FileText className="h-4 w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">نموذج عرض المنتج</span>
                <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 bg-gradient-to-b from-background/50 to-background">
            <FormField
              control={control}
              name="form_template_id"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    نموذج عرض صفحة المنتج
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
                        <p className="text-xs">اختر النموذج الذي سيتم استخدامه لعرض تفاصيل هذا المنتج للعملاء في المتجر.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      if (value === "_NO_TEMPLATE_SELECTED_") {
                        field.onChange(null);
                      } else {
                        field.onChange(value);
                      }
                    }}
                    value={field.value || ""} 
                    disabled={isLoadingTemplates}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
                        <SelectValue 
                          placeholder={isLoadingTemplates ? "جار التحميل..." : "اختر نموذجاً..."} 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                      <SelectItem value="_NO_TEMPLATE_SELECTED_" className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                        <div className="flex items-center gap-2">
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">الافتراضي العام للمؤسسة</span>
                        </div>
                      </SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            <span className="text-foreground">{template.name}</span>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs shadow-sm">افتراضي</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-muted-foreground">
                    اختر النموذج الذي سيتم استخدامه لعرض تفاصيل هذا المنتج للعملاء
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Shipping Settings Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">إعدادات التوصيل</span>
                <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 bg-gradient-to-b from-background/50 to-background">
            {/* Shipping Clone Toggle */}
            <FormField
              control={control}
              name="use_shipping_clone"
              render={({ field }) => (
                <FormItem>
                  <div className="relative overflow-hidden group">
                    <div className="flex items-center justify-between p-4 border border-border/60 rounded-xl hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 dark:hover:from-amber-950/20 dark:hover:to-orange-950/10 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2.5 rounded-xl shadow-sm">
                          <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FormLabel className="font-medium text-sm text-foreground">استخدام نسخة توصيل مستنسخة</FormLabel>
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
                                <p className="text-xs">استخدم إعدادات توصيل محفوظة مسبقاً بدلاً من إعداد شركة توصيل منفردة.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            تطبيق إعدادات توصيل محفوظة مسبقاً
                          </div>
                        </div>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-amber-600 dark:data-[state=checked]:bg-amber-500 shadow-sm"
                        />
                      </FormControl>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
                  </div>
                </FormItem>
              )}
            />

            {/* Shipping Clone Selection */}
            {useShippingClone && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <FormField
                  control={control}
                  name="shipping_clone_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        نسخة الشحن
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">اختر النسخة المحفوظة من إعدادات التوصيل التي تريد تطبيقها على هذا المنتج.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                        value={field.value?.toString()} 
                        disabled={isLoadingShippingClones}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
                            <SelectValue placeholder="اختر نسخة شحن..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                          {isLoadingShippingClones ? (
                            <SelectItem value="loading" disabled className="text-sm">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                <span>جاري التحميل...</span>
                              </div>
                            </SelectItem>
                          ) : shippingClones.length > 0 ? (
                            shippingClones.map((clone) => (
                              <SelectItem key={clone.id} value={clone.id.toString()} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                                  <span className="text-foreground">{clone.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-clones" disabled className="text-sm">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                                <span>لا توجد نسخ متاحة</span>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        اختر النسخة المحفوظة من إعدادات التوصيل
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Standard Shipping Provider */}
            {!useShippingClone && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <FormField
                  control={control}
                  name="shipping_provider_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        شركة التوصيل
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">اختر شركة التوصيل المفضلة لهذا المنتج. إذا لم تختر، سيتم استخدام الإعدادات الافتراضية.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "" ? null : Number(value))} 
                        value={field.value ? String(field.value) : ""} 
                        disabled={isLoadingShippingProviders}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
                            <SelectValue 
                              placeholder={isLoadingShippingProviders ? "جار التحميل..." : "اختر شركة التوصيل..."} 
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                          <SelectItem value="_NO_PROVIDER_SELECTED_" className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                            <div className="flex items-center gap-2">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">توصيل سطوكيها الافتراضي</span>
                            </div>
                          </SelectItem>
                          {shippingProviders.map(provider => (
                            <SelectItem key={provider.id} value={String(provider.id)} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                              <div className="flex items-center gap-2">
                                <Truck className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                <span className="text-foreground">{provider.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        اختر شركة التوصيل المفضلة لهذا المنتج
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Information Alert */}
                <Alert className="border-blue-200/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-sm backdrop-blur-sm mt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-xl shadow-sm">
                      <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <AlertDescription className="flex-1">
                      <div className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
                        إعدادات افتراضية
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        إذا لم تختر شركة توصيل، سيتم استخدام الإعدادات الافتراضية للمؤسسة
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ProductShippingAndTemplates;
