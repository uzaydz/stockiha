import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Package,
  Globe,
  Loader2,
  HelpCircle,
  Package2,
  TruckIcon
} from 'lucide-react';

// Import API functions and types
import { getOrganizationTemplates, OrganizationTemplate, getFormSettingTemplatesForProductPage } from '@/lib/api/organizationTemplates';
import { getActiveShippingProvidersForOrg, ActiveShippingProvider } from '@/lib/api/shipping';
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

  const { control, watch, setValue } = form; // Destructure for easier use
  const currentFormTemplateId = watch('form_template_id');
  const shippingMethodType = watch('shipping_method_type');

  // Fetch organization templates and shipping providers
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
                        onValueChange={(value) => {
                          if (value === "" || value === "_NO_PROVIDER_SELECTED_") {
                            field.onChange(null);
                            setValue('shipping_method_type', 'default');
                          } else if (value === "custom") {
                            field.onChange(null);
                            setValue('shipping_method_type', 'custom');
                          } else {
                            field.onChange(Number(value));
                            setValue('shipping_method_type', 'standard');
                          }
                        }} 
                        value={
                          shippingMethodType === 'custom' ? 'custom' : 
                          field.value ? String(field.value) : ""
                        } 
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
                          
                          {/* فصل الطرق المخصصة عن الشركات العادية */}
                          {shippingProviders.filter(p => p.type === 'custom').length > 0 && (
                            <>
                              <Separator className="my-1" />
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                طرق الشحن المخصصة
                              </div>
                              {shippingProviders.filter(p => p.type === 'custom').map(provider => {
                                const IconComponent = Globe;
                                return (
                                  <SelectItem 
                                    key={`custom-${provider.name}`} 
                                    value="custom" 
                                    className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="h-3.5 w-3.5 text-primary dark:text-primary-foreground" />
                                      <span className="text-foreground">{provider.name}</span>
                                      <Badge variant="outline" className="text-xs text-primary border-primary/50">
                                        مخصص
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </>
                          )}

                                                    {/* شركات التوصيل العادية */}
                          {shippingProviders.filter(p => p.type === 'standard').length > 0 && (
                            <>
                              <Separator className="my-1" />
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                شركات التوصيل
                              </div>
                              {shippingProviders.filter(p => p.type === 'standard').map(provider => {
                                // تحديد الأيقونة حسب كود الشركة
                                const getStandardProviderIcon = (code: string) => {
                                  switch (code) {
                                    case 'yalidine': return Package2;
                                    case 'zrexpress': return TruckIcon;
                                    case 'mayesto': return Package;
                                    default: return Truck;
                                  }
                                };

                                const IconComponent = getStandardProviderIcon(provider.code);
                                
                                return (
                                  <SelectItem 
                                    key={`standard-${provider.id}`} 
                                    value={String(provider.id)} 
                                    className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                      <span className="text-foreground">{provider.name}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </>
                          )}
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
            <Alert className="border-blue-200/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-xl shadow-sm">
                      <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <AlertDescription className="flex-1">
                      <div className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
                        خيارات التوصيل المتاحة
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <div>• شركات التوصيل العادية: يالدين، ZR Express، مايستو، وغيرها</div>
                        <div>• طرق الشحن المخصصة: أسعار محددة لكل ولاية حسب نوع التوصيل</div>
                        <div>• إذا لم تختر، سيتم استخدام الإعدادات الافتراضية للمؤسسة</div>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ProductShippingAndTemplates;
