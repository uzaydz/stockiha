import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DELIVERY_COMPANIES, DELIVERY_OPTIONS, PAYMENT_METHODS, DeliveryInfoFieldsProps, PROVINCES } from "./OrderFormTypes";
import { Home, Building, Truck, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShippingProviderSettings } from "./types";

export function DeliveryInfoFields({ 
  form, 
  onDeliveryCompanyChange,
  provinces = [],
  municipalities = [],
  onWilayaChange,
  hasShippingIntegration = false,
  isLoadingWilayas = false,
  isLoadingCommunes = false,
  shippingProviderSettings,
}: DeliveryInfoFieldsProps) {
  // التحقق من خيارات التوصيل المتاحة بناءً على إعدادات مزود الشحن
  const isHomeDeliveryEnabled = !shippingProviderSettings || shippingProviderSettings.is_home_delivery_enabled;
  const isDeskDeliveryEnabled = !shippingProviderSettings || shippingProviderSettings.is_desk_delivery_enabled;
  
  // تحديد خيارات التوصيل المتاحة
  const availableDeliveryOptions = DELIVERY_OPTIONS.filter(option => {
    if (option.id === 'home') {
      return isHomeDeliveryEnabled;
    } else if (option.id === 'desk') {
      return isDeskDeliveryEnabled;
    }
    return true;
  });
  
  // إذا كان هناك خيار واحد فقط متاح، نعيين القيمة الافتراضية
  if (availableDeliveryOptions.length === 1 && form) {
    setTimeout(() => {
      form.setValue('deliveryOption', availableDeliveryOptions[0].id);
    }, 0);
  }
  
  // حقول معلومات التوصيل
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">معلومات التوصيل</h3>
      
      {/* حقل خيار التوصيل - تم تقديمه للأعلى */}
      <FormField
        control={form.control}
        name="deliveryOption"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>خيار التوصيل *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value);
                  console.log(`تغيير خيار التوصيل إلى: ${value}`);
                  
                  // إذا تم تغيير خيار التوصيل وكان هناك ولاية محددة، نقوم بإعادة تحميل البلديات
                  if (form.watch('province') && hasShippingIntegration) {
                    // إعادة تعيين البلدية المحددة
                    form.setValue('municipality', '');
                    
                    // إعادة استدعاء تغيير الولاية لتحميل البلديات الجديدة المتوافقة مع نوع التوصيل الجديد
                    if (onWilayaChange) {
                      onWilayaChange(form.watch('province'));
                    }
                  }
                }}
                defaultValue={field.value}
                className="flex flex-col space-y-2"
              >
                {availableDeliveryOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3 space-x-reverse">
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} className="border-input dark:border-border" />
                    <Label htmlFor={`option-${option.id}`} className="flex items-center">
                      {option.id === 'home' ? (
                        <Home className="ml-2 h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Building className="ml-2 h-5 w-5 text-muted-foreground" />
                      )}
                      {option.name}
                      {hasShippingIntegration && (
                        <span className="mr-1 text-xs text-muted-foreground">
                          {option.id === 'home' ? ' (رسوم أعلى)' : ' (رسوم أقل)'}
                        </span>
                      )}
                      {(option.id === 'home' && shippingProviderSettings?.is_free_delivery_home) && (
                        <span className="mr-1 text-xs text-green-600 font-medium">
                          (مجاني!)
                        </span>
                      )}
                      {(option.id === 'desk' && shippingProviderSettings?.is_free_delivery_desk) && (
                        <span className="mr-1 text-xs text-green-600 font-medium">
                          (مجاني!)
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
            {shippingProviderSettings && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {isHomeDeliveryEnabled && isDeskDeliveryEnabled 
                  ? "تتوفر خيارات التوصيل للمنزل والاستلام من المكتب"
                  : isHomeDeliveryEnabled 
                    ? "يتوفر التوصيل للمنزل فقط" 
                    : isDeskDeliveryEnabled 
                      ? "يتوفر الاستلام من المكتب فقط"
                      : "لا تتوفر خيارات توصيل حاليًا"
                }
              </div>
            )}
          </FormItem>
        )}
      />
      
      {/* حقل اختيار الولاية */}
      <FormField
        control={form.control}
        name="province"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>الولاية *</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                // استدعاء دالة تغيير الولاية إذا كانت متوفرة
                if (onWilayaChange) {
                  onWilayaChange(value);
                }
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger disabled={isLoadingWilayas}>
                  <SelectValue placeholder="اختر الولاية" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoadingWilayas ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                    <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                    <Skeleton className="h-8 w-full dark:bg-muted" />
                  </div>
                ) : provinces.length > 0 ? (
                  provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id.toString()}>
                      {province.name}
                        </SelectItem>
                      ))
                    ) : (
                  PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* حقل البلدية */}
      <FormField
        control={form.control}
        name="municipality"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>البلدية *</FormLabel>
            {hasShippingIntegration && form.watch('province') ? (
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoadingCommunes || !form.watch('province')}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isLoadingCommunes 
                        ? "جاري تحميل البلديات..." 
                        : (municipalities.length > 0 
                          ? "اختر البلدية" 
                          : form.watch('deliveryOption') === 'home'
                            ? "لا توجد بلديات متاحة للتوصيل المنزلي"
                            : "لا توجد مكاتب متاحة في هذه الولاية")
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingCommunes ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                      <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                      <Skeleton className="h-8 w-full dark:bg-muted" />
                    </div>
                  ) : municipalities.length > 0 ? (
                    municipalities.map((commune) => (
                      <SelectItem key={commune.id} value={commune.id.toString()}>
                        {commune.name}
                        {form.watch('deliveryOption') === 'office' && (
                          <span className="mr-2 text-xs text-muted-foreground">
                            (مكتب متاح)
                          </span>
                        )}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="no_municipalities">
                      {form.watch('deliveryOption') === 'home'
                        ? "لا توجد بلديات متاحة للتوصيل المنزلي"
                        : "لا توجد مكاتب متاحة في هذه الولاية"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <FormControl>
                <Input
                  placeholder="أدخل اسم البلدية"
                  {...field}
                  className="rtl:text-right"
                />
              </FormControl>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* حقل العنوان */}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>العنوان التفصيلي *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="أدخل العنوان التفصيلي (الشارع، الحي، الخ)"
                {...field}
                className="rtl:text-right dark:border-border"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* حقل شركة التوصيل */}
      <FormField
        control={form.control}
        name="deliveryCompany"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>شركة التوصيل *</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                // استدعاء دالة تغيير شركة التوصيل إذا كانت متوفرة
                if (onDeliveryCompanyChange) {
                  onDeliveryCompanyChange(value);
                }
              }}
              defaultValue={field.value}
              disabled={hasShippingIntegration}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="اختر شركة التوصيل" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DELIVERY_COMPANIES.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center">
                      <Truck className="ml-2 h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
            {hasShippingIntegration && (
              <div className="text-xs text-muted-foreground">
                <AlertCircle className="inline-block w-3 h-3 ml-1" />
                تم تعيين شركة التوصيل تلقائيًا وفقًا لإعدادات المتجر
              </div>
            )}
          </FormItem>
        )}
      />
      
      {/* حقل طريقة الدفع */}
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>طريقة الدفع *</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* حقل الملاحظات */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>ملاحظات إضافية</FormLabel>
            <FormControl>
              <Textarea
                placeholder="أضف أي ملاحظات إضافية خاصة بالطلب (اختياري)"
                {...field}
                className="rtl:text-right dark:border-border"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Add default export
export default DeliveryInfoFields; 