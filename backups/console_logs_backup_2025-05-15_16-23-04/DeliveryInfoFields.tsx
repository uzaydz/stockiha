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
  yalidineCenters = [],
  isLoadingYalidineCenters = false,
}: DeliveryInfoFieldsProps) {
  // +++ Log Entry Point +++
  console.log(`[DeliveryInfoFields] Component Rendering. Initial form.deliveryOption: ${form.getValues().deliveryOption}, Watched deliveryOption: ${form.watch('deliveryOption')}`);

  const isHomeDeliveryEnabled = !shippingProviderSettings || shippingProviderSettings.is_home_delivery_enabled;
  const isDeskDeliveryEnabled = !shippingProviderSettings || shippingProviderSettings.is_desk_delivery_enabled;
  
  const availableDeliveryOptions = DELIVERY_OPTIONS.filter(option => {
    if (option.id === 'home') {
      return isHomeDeliveryEnabled;
    } else if (option.id === 'desk') {
      return isDeskDeliveryEnabled;
    }
    return true;
  });
  
  if (availableDeliveryOptions.length === 1 && form) {
    // +++ Log Before setTimeout +++
    console.log(`[DeliveryInfoFields] Single delivery option available: ${availableDeliveryOptions[0].id}. Scheduling setValue.`);
    setTimeout(() => {
      // +++ Log Inside setTimeout +++
      console.log(`[DeliveryInfoFields] Inside setTimeout: Setting deliveryOption to ${availableDeliveryOptions[0].id}. Previous form value: ${form.getValues().deliveryOption}`);
      form.setValue('deliveryOption', availableDeliveryOptions[0].id, { shouldValidate: true, shouldDirty: true });
      console.log(`[DeliveryInfoFields] Inside setTimeout: deliveryOption set. New form value: ${form.getValues().deliveryOption}. Watched value: ${form.watch('deliveryOption')}`);
    }, 0);
  }
  
  // +++ Log Watched Values before return +++
  const watchedDeliveryOptionForRender = form.watch('deliveryOption');
  const watchedProvinceForRender = form.watch('province');
  console.log(`[DeliveryInfoFields] Values for render logic: watchedDeliveryOptionForRender: ${watchedDeliveryOptionForRender}, watchedProvinceForRender: ${watchedProvinceForRender}, hasShippingIntegration: ${hasShippingIntegration}`);

  // حقول معلومات التوصيل
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">معلومات التوصيل</h3>
      
      {/* حقل خيار التوصيل - تم تقديمه للأعلى */}
      <FormField
        control={form.control}
        name="deliveryOption"
        render={({ field }) => {
          // +++ Log in deliveryOption render +++
          console.log(`[DeliveryInfoFields] Rendering deliveryOption RadioGroup. Field value: ${field.value}, Form's current deliveryOption: ${form.getValues().deliveryOption}`);
          return (
            <FormItem className="space-y-2">
              <FormLabel>خيار التوصيل *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    const currentDeliveryOption = value as 'home' | 'desk';
                    const currentProvinceValue = form.watch('province');
                    // +++ Log in deliveryOption onValueChange +++
                    console.log(`[DeliveryInfoFields] deliveryOption changed to: ${currentDeliveryOption}. Current province: ${currentProvinceValue}`);

                    if (currentDeliveryOption === 'desk') {
                      form.setValue('municipality', '', { shouldValidate: false }); 
                      console.log("[DeliveryInfoFields] Cleared municipality because deliveryOption is desk.");
                    } else if (currentDeliveryOption === 'home') {
                      form.setValue('stopDeskId', '', { shouldValidate: false }); 
                      console.log("[DeliveryInfoFields] Cleared stopDeskId because deliveryOption is home.");
                    }

                    // إذا كانت الولاية محددة، قم بإعادة تشغيل منطق تحميل القائمة
                    if (currentProvinceValue && hasShippingIntegration && onWilayaChange) {
                      onWilayaChange(currentProvinceValue); 
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
          );
        }}
      />
      
      {/* حقل اختيار الولاية */}
      <FormField
        control={form.control}
        name="province"
        render={({ field }) => {
          // +++ Log in province render +++
          console.log(`[DeliveryInfoFields] Rendering province Select. Field value: ${field.value}, Form's current province: ${form.getValues().province}`);
          return (
            <FormItem className="space-y-2">
              <FormLabel>الولاية *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // +++ Log in province onValueChange +++
                  console.log(`[DeliveryInfoFields] Province changed to: ${value}. Clearing municipality and stopDeskId.`);
                  form.setValue('municipality', '', { shouldValidate: false });
                  form.setValue('stopDeskId', '', { shouldValidate: false });

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
          );
        }}
      />

      {/* حقل البلدية - يعرض فقط إذا كان التوصيل للمنزل */}
      {(() => {
        const currentDeliveryOption = form.watch('deliveryOption');
        console.log(`[DeliveryInfoFields] Conditional Block: currentDeliveryOption for Muni/StopDesk is '${currentDeliveryOption}'`);
        if (currentDeliveryOption === 'home') {
          console.log("[DeliveryInfoFields] Conditional Block: Rendering Municipality field.");
          return (
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>البلدية *</FormLabel>
                  {hasShippingIntegration && form.watch('province') ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingCommunes || !form.watch('province')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingCommunes 
                              ? "جاري تحميل البلديات..." 
                              : (municipalities && municipalities.length > 0 
                                ? "اختر البلدية" 
                                : "لا توجد بلديات متاحة للتوصيل المنزلي")
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
                        ) : municipalities && municipalities.length > 0 ? (
                          municipalities.map((commune) => (
                            <SelectItem key={commune.id} value={commune.id.toString()}>
                              {commune.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem disabled value="no_municipalities">
                            لا توجد بلديات متاحة للتوصيل المنزلي
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
          );
        }
        return null; // Return null if conditions are not met for this block
      })()}

      {/* حقل مكتب الاستلام (Yalidine Center) - يعرض فقط إذا كان التوصيل للمكتب */}
      {(() => {
        const currentDeliveryOption = form.watch('deliveryOption');
        console.log(`[DeliveryInfoFields] Conditional Block (StopDesk): currentDeliveryOption is '${currentDeliveryOption}', hasShippingIntegration is ${hasShippingIntegration}`);
        if (currentDeliveryOption === 'desk' && hasShippingIntegration) {
          console.log("[DeliveryInfoFields] Conditional Block: Rendering StopDesk (Yalidine Center) field.");
          return (
            <FormField
              control={form.control}
              name="stopDeskId"
              render={({ field }) => {
                // +++ Log in stopDeskId render +++
                console.log(`[DeliveryInfoFields] Rendering StopDesk field. Field value: ${field.value}, Form's current stopDeskId: ${form.getValues().stopDeskId}`);
                return (
                  <FormItem className="space-y-2">
                    <FormLabel>مكتب الاستلام *</FormLabel>
                    {form.watch('province') ? (
                      <Select
                        onValueChange={(selectedValue) => {
                          // +++ Log in stopDeskId onValueChange +++
                          console.log(`[DeliveryInfoFields] StopDesk selected. Raw value: ${selectedValue}. Type: ${typeof selectedValue}`);
                          field.onChange(selectedValue);
                          console.log(`[DeliveryInfoFields] Called field.onChange for stopDeskId with ${selectedValue}. Form value for stopDeskId now: ${form.getValues().stopDeskId}`);
                          form.trigger('stopDeskId');
                        }}
                        value={field.value || ""}
                        disabled={isLoadingYalidineCenters || !form.watch('province') || yalidineCenters.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isLoadingYalidineCenters
                                ? "جاري تحميل مكاتب الاستلام..."
                                : (yalidineCenters && yalidineCenters.length > 0
                                  ? "اختر مكتب الاستلام"
                                  : "لا توجد مكاتب استلام لهذه الولاية")
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingYalidineCenters ? (
                            <div className="p-2">
                              <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                              <Skeleton className="h-8 w-full mb-2 dark:bg-muted" />
                              <Skeleton className="h-8 w-full dark:bg-muted" />
                            </div>
                          ) : yalidineCenters && yalidineCenters.length > 0 ? (
                            yalidineCenters.map((center) => (
                              <SelectItem key={center.center_id} value={center.center_id.toString()}>
                                {center.name} ({center.commune_name})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="no_centers_available">
                             لا توجد مكاتب استلام متاحة
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        الرجاء اختيار الولاية أولاً لعرض مكاتب الاستلام.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          );
        }
        return null; // Return null if conditions are not met for this block
      })()}

      {/* حقل العنوان - يعرض إذا كان التوصيل للمنزل أو للمكتب (لأن yalidine قد تطلبه لمكتب الاستلام أيضاً) */}
      {((form.watch('deliveryOption') === 'home' && hasShippingIntegration) || (form.watch('deliveryOption') === 'desk' && hasShippingIntegration)) && (
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
      )}

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