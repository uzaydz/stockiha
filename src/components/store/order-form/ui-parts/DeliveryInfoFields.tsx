import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { OrderFormValues, Wilaya, Commune } from '../OrderFormTypes';
import { ShippingProviderSettings } from '../types';
import { ZRExpressShippingCalculator } from '../custom-form-fields/ZRExpressShippingCalculator';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, Building, Truck, AlertCircle } from "lucide-react";

interface DeliveryInfoFieldsProps {
  form: UseFormReturn<OrderFormValues, any, OrderFormValues>;
  provinces?: Wilaya[];
  municipalities?: Commune[];
  yalidineCenters?: any[];
  isLoadingYalidineCenters?: boolean;
  onWilayaChange: (wilayaId: string) => void;
  hasShippingIntegration?: boolean;
  isLoadingWilayas?: boolean;
  isLoadingCommunes?: boolean;
  shippingProviderSettings?: ShippingProviderSettings;
  onDeliveryPriceCalculated?: (price: number) => void;
  onDeliveryCompanyChange?: (value: string) => void;
}

export const DeliveryInfoFields: React.FC<DeliveryInfoFieldsProps> = ({
  form,
  provinces,
  municipalities,
  yalidineCenters,
  isLoadingYalidineCenters,
  onWilayaChange,
  hasShippingIntegration,
  isLoadingWilayas,
  isLoadingCommunes,
  shippingProviderSettings,
  onDeliveryPriceCalculated,
  onDeliveryCompanyChange
}) => {
  const deliveryType = form.watch('deliveryOption');
  const selectedWilaya = form.watch('province');

  // إذا كان مزود الشحن هو ZR Express، نستخدم حاسبة السعر الخاصة به
  const isZRExpress = shippingProviderSettings?.provider_code === 'zrexpress';

  // تسجيل لتتبع حالة المكون
  useEffect(() => {
    console.log('DeliveryInfoFields (ui-parts) - حالة المكون:', {
      deliveryType,
      selectedWilaya,
      isZRExpress,
      municipalitiesCount: municipalities?.length || 0
    });
  }, [deliveryType, selectedWilaya, isZRExpress, municipalities]);

  return (
    <div className="space-y-6">
      {/* حقل اختيار الولاية */}
      <FormField
        control={form.control}
        name="province"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الولاية *</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                onWilayaChange(value);
              }}
              value={field.value}
              disabled={isLoadingWilayas}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingWilayas ? "جاري التحميل..." : "اختر الولاية"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {provinces?.map((province) => (
                  <SelectItem key={province.id} value={province.id.toString()}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* حقل اختيار البلدية - يعرض في جميع الحالات */}
      <FormField
        control={form.control}
        name="municipality"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {deliveryType === 'home' ? 'البلدية *' : 'البلدية للاستلام منها *'}
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isLoadingCommunes || !selectedWilaya}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingCommunes ? "جاري التحميل..." :
                    !selectedWilaya ? "اختر الولاية أولاً" :
                    deliveryType === 'home' ? "اختر البلدية" : "اختر البلدية للاستلام منها"
                  } />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {municipalities?.map((municipality) => (
                  <SelectItem key={municipality.id} value={municipality.id.toString()}>
                    {municipality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
            {deliveryType === 'desk' && (
              <p className="text-xs text-muted-foreground">
                <AlertCircle className="inline-block w-3 h-3 ml-1" />
                مهم: اختر البلدية المناسبة للاستلام منها
              </p>
            )}
          </FormItem>
        )}
      />

      {/* حقل العنوان */}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>العنوان *</FormLabel>
            <FormControl>
              <Input placeholder="أدخل العنوان بالتفصيل" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* نوع التوصيل */}
      <FormField
        control={form.control}
        name="deliveryOption"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>نوع التوصيل *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value);
                  console.log('تغيير نوع التوصيل إلى:', value);
                  
                  // إذا كان العنصر الحالي هو ZRExpress ويحاول المستخدم التغيير إلى "desk"،
                  // تأكد من تجهيز قائمة البلديات
                  const currentDeliveryOption = value as 'home' | 'desk';
                  const currentProvinceValue = form.watch('province');
                  
                  if (currentProvinceValue && onWilayaChange) {
                    // تأكد من تحميل البلديات المناسبة
                    console.log('إعادة تحميل البلديات بعد تغيير نوع التوصيل');
                    onWilayaChange(currentProvinceValue);
                  }
                }}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <RadioGroupItem value="home" id="home" />
                  <Label htmlFor="home" className="flex items-center">
                    <Home className="ml-2 h-4 w-4" />
                    توصيل للمنزل
                  </Label>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <RadioGroupItem value="desk" id="desk" />
                  <Label htmlFor="desk" className="flex items-center">
                    <Building className="ml-2 h-4 w-4" />
                    استلام من المكتب
                  </Label>
                </div>
              </RadioGroup>
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
                // اضافة سجل للتأكد أن تغيير شركة التوصيل يعمل
                console.log('تم تغيير شركة التوصيل إلى:', value);
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
                {[
                  { id: "yalidine", name: "Yalidine" },
                  { id: "zrexpress", name: "ZRExpress" }
                ].map((company) => (
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

      {/* حاسبة سعر الشحن لـ ZR Express */}
      {isZRExpress && selectedWilaya && (
        <ZRExpressShippingCalculator
          wilayaId={selectedWilaya}
          isHomeDelivery={deliveryType === 'home'}
          onPriceCalculated={onDeliveryPriceCalculated || (() => {})}
        />
      )}
    </div>
  );
}; 