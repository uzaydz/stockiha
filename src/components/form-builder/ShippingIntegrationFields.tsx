import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Truck, AlertTriangle, MapPin, Building, RefreshCw, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFormShippingIntegration } from '@/hooks/useFormShippingIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Province, Municipality, DeliveryType } from "@/api/formShippingIntegration";

interface ShippingIntegrationFieldsProps {
  shippingIntegration: {
    enabled: boolean;
    provider: string | null;
  };
}

export function ShippingIntegrationFields({ shippingIntegration }: ShippingIntegrationFieldsProps) {
  const {
    provinces,
    municipalities,
    selectedProvince,
    setSelectedProvince,
    selectedMunicipality,
    setSelectedMunicipality,
    deliveryType,
    setDeliveryType,
    deliveryPrice,
    setDeliveryPrice,
    loading,
    diagnostic,
    retryConnection,
    getMunicipalitiesForProvince,
    setFieldValue,
    isEnabled
  } = useFormShippingIntegration({
    enabled: shippingIntegration.enabled,
    provider: shippingIntegration.provider,
  });

  // الوظيفة المستدعاة عند تغيير اختيار الولاية
  const handleProvinceChange = async (value: string) => {
    if (value && value !== selectedProvince) {
      // تعيين الولاية المختارة
      setSelectedProvince(value);
      
      // إعادة تعيين البلدية ونوع التوصيل
      setSelectedMunicipality(null);
      
      // إعادة تعيين نوع التوصيل للمنزل افتراضياً
      if (!deliveryType) {
        setDeliveryType('home');
      }
    }
  };

  // الوظيفة المستدعاة عند تغيير نوع التوصيل
  const handleDeliveryTypeChange = (value: DeliveryType) => {
    setDeliveryType(value);
    setSelectedMunicipality(null);
    setDeliveryPrice(null);
  };

  // تخزين القيم في النموذج عند تغييرها
  useEffect(() => {
    if (isEnabled) {
      // تخزين البيانات المختارة في النموذج
      if (selectedProvince) {
        setFieldValue('shipping.province', selectedProvince);
      }
      
      if (selectedMunicipality) {
        setFieldValue('shipping.municipality', selectedMunicipality);
      }
      
      if (deliveryType) {
        setFieldValue('shipping.deliveryType', deliveryType);
      }
      
      if (deliveryPrice !== null) {
        setFieldValue('shipping.deliveryPrice', deliveryPrice);
      }
      
      // إذا كانت كل البيانات متوفرة، نقوم بتعيين isShippingComplete = true
      if (selectedProvince && selectedMunicipality && deliveryType && deliveryPrice !== null) {
        setFieldValue('shipping.isComplete', true);
      } else {
        setFieldValue('shipping.isComplete', false);
      }
    }
  }, [selectedProvince, selectedMunicipality, deliveryType, deliveryPrice, isEnabled, setFieldValue]);

  // وظيفة لعرض عنصر الولاية في القائمة
  const renderProvinceItem = (province: Province) => {
    return (
      <SelectItem 
        key={province.id.toString()} 
        value={province.id.toString()}
        className="my-1 p-2 text-right text-black dark:text-white rounded hover:bg-primary/10"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-base">{province.name || `ولاية ${province.id}`}</span>
        </div>
      </SelectItem>
    );
  };

  // وظيفة لعرض عنصر البلدية في القائمة
  const renderMunicipalityItem = (municipality: Municipality) => {
    return (
      <SelectItem 
        key={municipality.id.toString()} 
        value={municipality.id.toString()}
        className="my-1 p-2 text-right text-black dark:text-white rounded hover:bg-primary/10"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-base">{municipality.name}</span>
          {municipality.has_stop_desk === 1 && (
            <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              مكتب
            </span>
          )}
        </div>
      </SelectItem>
    );
  };

  // عرض حالة التكوين
  const renderConfigStatus = () => {
    if (!isEnabled) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خدمة الشحن غير متوفرة</AlertTitle>
          <AlertDescription>
            لم يتم تكوين خدمة الشحن أو تفعيلها. يرجى التواصل مع مسؤول النظام.
          </AlertDescription>
        </Alert>
      );
    }

    if (diagnostic.configStatus === 'checking') {
      return (
        <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4" />
          <AlertTitle>جاري التحقق من الإعدادات</AlertTitle>
          <AlertDescription>
            يتم الآن التحقق من إعدادات خدمة الشحن ياليدين...
          </AlertDescription>
        </Alert>
      );
    }

    if (diagnostic.configStatus === 'invalid') {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ في إعدادات خدمة الشحن</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{diagnostic.message}</span>
            {diagnostic.message?.includes('CORS') && (
              <span className="text-xs">
                قد تكون المشكلة بسبب سياسات حماية CORS في متصفحك عند التطوير المحلي. في بيئة الإنتاج قد لا تظهر هذه المشكلة.
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-fit flex items-center gap-1"
              onClick={retryConnection}
            >
              <RefreshCw className="h-3 w-3" />
              <span>إعادة المحاولة</span>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (diagnostic.message && diagnostic.configStatus === 'valid') {
      return (
        <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4" />
          <AlertTitle>معلومات</AlertTitle>
          <AlertDescription>
            {diagnostic.message}
            {diagnostic.message?.includes('CORS') && (
              <div className="text-xs mt-1">
                قد تكون المشكلة بسبب سياسات حماية CORS في متصفحك عند التطوير المحلي. في بيئة الإنتاج قد لا تظهر هذه المشكلة.
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span>معلومات التوصيل</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {renderConfigStatus()}

        {isEnabled && diagnostic.configStatus === 'valid' && (
          <div className="space-y-6">
            {/* اختيار الولاية */}
            <div className="space-y-2">
              <Label className="text-md font-medium mr-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>الولاية</span>
              </Label>
              
              {loading && provinces.length === 0 ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select 
                  dir="rtl"
                  value={selectedProvince || undefined}
                  onValueChange={handleProvinceChange}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="اختر الولاية" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {provinces.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        لا توجد ولايات متاحة
                      </div>
                    ) : (
                      provinces.map(renderProvinceItem)
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* اختيار نوع التوصيل */}
            {selectedProvince && (
              <div className="space-y-2">
                <Label className="text-md font-medium mr-1 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>نوع التوصيل</span>
                </Label>
                
                <RadioGroup
                  dir="rtl"
                  value={deliveryType || undefined}
                  onValueChange={(value) => handleDeliveryTypeChange(value as DeliveryType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="home" id="home" />
                    <Label htmlFor="home" className="cursor-pointer">توصيل للمنزل</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="desk" id="desk" />
                    <Label htmlFor="desk" className="cursor-pointer">استلام من المكتب</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* اختيار البلدية */}
            {selectedProvince && deliveryType && (
              <div className="space-y-2">
                <Label className="text-md font-medium mr-1 flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>البلدية</span>
                </Label>
                
                {loading && municipalities.length === 0 ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    dir="rtl"
                    value={selectedMunicipality || undefined}
                    onValueChange={(value) => setSelectedMunicipality(value)}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="اختر البلدية" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {municipalities.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          لا توجد بلديات متاحة لهذه الولاية ونوع التوصيل
                        </div>
                      ) : (
                        municipalities.map(renderMunicipalityItem)
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* عرض سعر التوصيل */}
            {deliveryPrice !== null && (
              <div className="mt-6 p-4 border rounded-md flex justify-between items-center bg-muted/50">
                <span className="font-semibold">سعر التوصيل:</span>
                <span className="text-lg font-bold text-primary">{deliveryPrice} دج</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 