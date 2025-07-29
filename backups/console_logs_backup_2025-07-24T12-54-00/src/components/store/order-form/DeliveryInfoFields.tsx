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
import { useTranslation } from 'react-i18next';
import React, { useEffect } from "react";

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
  const { t } = useTranslation();
  
  // +++ Log Entry Point +++
  
  // إضافة مراقبة للتغييرات في إعدادات مزود الشحن
  useEffect(() => {
    if (shippingProviderSettings?.provider_code === 'zrexpress') {
      
      // تحديث البيانات إذا كان على وضع الاستلام من المكتب
      const currentDeliveryOption = form.getValues('deliveryOption');
      const currentProvinceValue = form.getValues('province');
      
      if (currentDeliveryOption === 'desk' && currentProvinceValue && onWilayaChange) {
        setTimeout(() => {
          onWilayaChange(currentProvinceValue);
        }, 100);
      }
    }
  }, [shippingProviderSettings?.provider_code, form, onWilayaChange]);

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
    
    setTimeout(() => {
      // +++ Log Inside setTimeout +++
      
      form.setValue('deliveryOption', availableDeliveryOptions[0].id, { shouldValidate: true, shouldDirty: true });
      
    }, 0);
  }
  
  // +++ Log Watched Values before return +++
  const watchedDeliveryOptionForRender = form.watch('deliveryOption');
  const watchedProvinceForRender = form.watch('province');

  // حقول معلومات التوصيل
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">{t('orderForm.deliveryInfo')}</h3>
      
      {/* حقل خيار التوصيل - تم تقديمه للأعلى */}
      <FormField
        control={form.control}
        name="deliveryOption"
        render={({ field }) => {
          // +++ Log in deliveryOption render +++
          
          return (
            <FormItem className="space-y-2">
              <FormLabel>{t('orderForm.deliveryOption')} {t('orderForm.required')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    const currentDeliveryOption = value as 'home' | 'desk';
                    const currentProvinceValue = form.watch('province');

                    // إذا كان العنصر الحالي هو ZRExpress ويحاول المستخدم التغيير إلى "desk"،
                    // تأكد من تجهيز القائمة المناسبة (البلديات)
                    if (currentDeliveryOption === 'desk' && 
                        shippingProviderSettings?.provider_code === 'zrexpress' && 
                        currentProvinceValue) {
                      // إعادة تعيين حقل stopDeskId حيث لا يتم استخدامه مع ZRExpress
                      form.setValue('stopDeskId', '', { shouldValidate: false }); 
                    } else if (currentDeliveryOption === 'desk' && 
                               shippingProviderSettings?.provider_code !== 'zrexpress' && 
                               currentProvinceValue) {
                      // إعادة تعيين حقل municipality حيث يتم استخدام stopDeskId بدلاً منه
                      form.setValue('municipality', '', { shouldValidate: false }); 
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
          
          return (
            <FormItem className="space-y-2">
              <FormLabel>{t('orderForm.province')} {t('orderForm.required')}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // +++ Log in province onValueChange +++
                  
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
                    <SelectValue placeholder={t('orderForm.selectProvince')} />
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
        
        if (currentDeliveryOption === 'home') {
          
          return (
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('orderForm.municipality')} {t('orderForm.required')}</FormLabel>
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
                              ? t('orderForm.loadingMunicipalities')
                              : (municipalities && municipalities.length > 0 
                                ? t('orderForm.selectMunicipality')
                                : t('orderForm.noMunicipalitiesAvailable'))
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
                            {t('orderForm.noMunicipalitiesAvailable')}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input
                        placeholder={t('orderForm.enterMunicipalityName')}
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
        
        // دائمًا عرض حقل البلدية في حالة الاستلام من المكتب بغض النظر عن شركة التوصيل
        if (currentDeliveryOption === 'desk') {
          return (
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('orderForm.municipalityForPickup')} {t('orderForm.required')}</FormLabel>
                  {form.watch('province') ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={isLoadingCommunes || !form.watch('province') || !municipalities || municipalities.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingCommunes
                              ? t('orderForm.loadingMunicipalities')
                              : (municipalities && municipalities.length > 0
                                ? t('orderForm.selectMunicipalityForPickup')
                                : t('orderForm.noMunicipalitiesForProvince'))
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
                          municipalities.map((municipality) => (
                            <SelectItem key={municipality.id} value={municipality.id.toString()}>
                              {municipality.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem disabled value="no_municipalities_available">
                            {t('orderForm.noMunicipalitiesAvailable')}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('orderForm.selectProvinceFirst')}
                    </p>
                  )}
                  <FormMessage>
                    {!field.value && form.formState.isSubmitted && t('orderForm.pleaseSelectMunicipality')}
                  </FormMessage>
                  <p className="text-xs text-muted-foreground">
                    <AlertCircle className="inline-block w-3 h-3 ml-1" />
                    {t('orderForm.importantSelectMunicipality')}
                  </p>
                </FormItem>
              )}
            />
          );
        }
        
        return null; // Return null if conditions are not met for this block
      })()}

      {/* حقل العنوان - يعرض إذا كان التوصيل للمنزل أو للمكتب (لأن yalidine قد تطلبه لمكتب الاستلام أيضاً) */}
      {((form.watch('deliveryOption') === 'home') || (form.watch('deliveryOption') === 'desk' && hasShippingIntegration)) && (
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>
                {form.watch('deliveryOption') === 'home' ? 'العنوان التفصيلي *' : 'العنوان التفصيلي'}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    form.watch('deliveryOption') === 'home' 
                      ? "أدخل العنوان التفصيلي (الشارع، الحي، الخ)" 
                      : "أدخل العنوان التفصيلي (اختياري)"
                  }
                  {...field}
                  className="rtl:text-right dark:border-border"
                />
              </FormControl>
              <FormMessage />
              {form.watch('deliveryOption') === 'desk' && hasShippingIntegration && (
                <p className="text-xs text-muted-foreground">
                  العنوان اختياري عند الاستلام من المكتب
                </p>
              )}
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
                // اضافة سجل للتأكد أن تغيير شركة التوصيل يعمل
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
