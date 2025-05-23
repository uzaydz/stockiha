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
import { 
  Truck, 
  FileText, 
  Settings, 
  Copy, 
  CheckCircle,
  Package,
  Globe,
  Loader2,
  AlertTriangle 
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
    <div className="space-y-6">
      {/* Product Display Template Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            نموذج عرض المنتج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="form_template_id"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <FormLabel className="text-sm font-medium">نموذج عرض صفحة المنتج</FormLabel>
                  </div>
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
                      <SelectTrigger className="h-11 bg-background border-border">
                        <SelectValue 
                          placeholder={isLoadingTemplates ? "جار التحميل..." : "اختر نموذجاً..."} 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_NO_TEMPLATE_SELECTED_">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">الافتراضي العام للمؤسسة</span>
                        </div>
                      </SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>{template.name}</span>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">افتراضي</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-muted-foreground">
                    اختر النموذج الذي سيتم استخدامه لعرض تفاصيل هذا المنتج للعملاء
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Shipping Settings Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
            إعدادات التوصيل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shipping Clone Toggle */}
          <FormField
            control={control}
            name="use_shipping_clone"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <Copy className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <FormLabel className="font-medium">استخدام نسخة توصيل مستنسخة</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        تطبيق إعدادات توصيل محفوظة مسبقاً
                      </div>
                    </div>
                  </div>
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          {/* Shipping Clone Selection */}
          {useShippingClone && (
            <FormField
              control={control}
              name="shipping_clone_id"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-muted-foreground" />
                      <FormLabel className="text-sm font-medium">نسخة الشحن</FormLabel>
                    </div>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                      value={field.value?.toString()} 
                      disabled={isLoadingShippingClones}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue placeholder="اختر نسخة شحن..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingShippingClones ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>جاري التحميل...</span>
                            </div>
                          </SelectItem>
                        ) : shippingClones.length > 0 ? (
                          shippingClones.map((clone) => (
                            <SelectItem key={clone.id} value={clone.id.toString()}>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{clone.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-clones" disabled>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span>لا توجد نسخ متاحة</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-muted-foreground">
                      اختر النسخة المحفوظة من إعدادات التوصيل
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Standard Shipping Provider */}
          {!useShippingClone && (
            <FormField
              control={control}
              name="shipping_provider_id"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <FormLabel className="text-sm font-medium">شركة التوصيل</FormLabel>
                    </div>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "" ? null : Number(value))} 
                      value={field.value ? String(field.value) : ""} 
                      disabled={isLoadingShippingProviders}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue 
                            placeholder={isLoadingShippingProviders ? "جار التحميل..." : "اختر شركة التوصيل..."} 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_NO_PROVIDER_SELECTED_">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">توصيل سطوكيها الافتراضي</span>
                          </div>
                        </SelectItem>
                        {shippingProviders.map(provider => (
                          <SelectItem key={provider.id} value={String(provider.id)}>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-blue-500" />
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-muted-foreground">
                      اختر شركة التوصيل المفضلة لهذا المنتج
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* Information Alert */}
          {!useShippingClone && (
            <Alert className="border-blue-200 bg-blue-50/50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-full">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="font-medium">
                    إذا لم تختر شركة توصيل، سيتم استخدام الإعدادات الافتراضية للمؤسسة
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductShippingAndTemplates; 