import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Truck, AlertTriangle, MapPin, Building, RefreshCw, Info, Home, Navigation } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFormShippingIntegration } from '@/hooks/useFormShippingIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Province, Municipality, DeliveryType } from "@/api/formShippingIntegration";
import { getCentersByCommune } from '@/api/yalidine';

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

  // إضافة حالة لمراكز التوصيل (المكاتب)
  const [centers, setCenters] = useState<any[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [loadingCenters, setLoadingCenters] = useState<boolean>(false);

  // الوظيفة المستدعاة عند تغيير اختيار الولاية
  const handleProvinceChange = async (value: string) => {
    if (value && value !== selectedProvince) {
      // تعيين الولاية المختارة
      setSelectedProvince(value);
      
      // إعادة تعيين البلدية ونوع التوصيل
      setSelectedMunicipality(null);
      setSelectedCenter(null);
      setCenters([]);
      
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
    setSelectedCenter(null);
    setCenters([]);
    setDeliveryPrice(null);
  };

  // جلب مراكز التوصيل عند تغيير البلدية المختارة إذا كان نوع التوصيل هو "مكتب"
  useEffect(() => {
    if (deliveryType === 'desk' && selectedMunicipality && shippingIntegration.enabled) {
      setLoadingCenters(true);
      
      // البحث عن البلدية المختارة في قائمة البلديات
      const selectedMunicipalityObject = municipalities.find(
        m => m.id.toString() === selectedMunicipality
      );
      
      // إذا وجدنا البلدية ولديها مكاتب محفوظة
      if (selectedMunicipalityObject && selectedMunicipalityObject.centers) {
        setCenters(selectedMunicipalityObject.centers);
        setLoadingCenters(false);
      } else {
        // إذا لم تكن المكاتب محفوظة في البلدية، نجلبها من الخادم
        const organizationId = diagnostic.data?.organization_id || '';
        
        getCentersByCommune(organizationId, selectedMunicipality)
          .then(data => {
            setCenters(data);
            setLoadingCenters(false);
          })
          .catch(err => {
            console.error('خطأ في جلب مراكز التوصيل:', err);
            setLoadingCenters(false);
          });
      }
    }
  }, [deliveryType, selectedMunicipality, shippingIntegration.enabled, diagnostic.data, municipalities]);

  // عرض عنصر الولاية في القائمة المنسدلة
  const renderProvinceItem = (province: Province) => (
    <SelectItem key={province.id} value={province.id.toString()}>
      {province.name} {/* استخدام الاسم العربي */}
    </SelectItem>
  );

  // عرض عنصر البلدية في القائمة المنسدلة
  const renderMunicipalityItem = (municipality: Municipality) => (
    <SelectItem key={municipality.id} value={municipality.id.toString()}>
      {municipality.display_name || municipality.name} {/* استخدام الاسم العربي مع معلومات المكاتب إن وجدت */}
    </SelectItem>
  );

  // عرض عنصر مركز التوصيل في القائمة المنسدلة
  const renderCenterItem = (center: any) => (
    <SelectItem key={center.center_id} value={center.center_id.toString()}>
      {center.name} - {center.commune_name}
    </SelectItem>
  );

  // رسالة الحالة
  const renderStatusMessage = () => {
    if (!isEnabled) {
      return (
        <Alert variant="default" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>خدمة التوصيل غير مفعلة</AlertTitle>
          <AlertDescription>
            يرجى تفعيل خدمة التوصيل أولاً من إعدادات النموذج
          </AlertDescription>
        </Alert>
      );
    }

    if (diagnostic.configStatus === 'invalid') {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ في تكوين التوصيل</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{diagnostic.message}</p>
            <Button variant="outline" size="sm" onClick={retryConnection} className="mt-2">
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (diagnostic.configStatus === 'checking') {
      return (
        <Alert variant="default" className="mb-4">
          <div className="flex items-center">
            <div className="border-2 border-primary border-r-transparent rounded-full h-4 w-4 animate-spin ml-2"></div>
            <div>جاري التحقق من تكوين التوصيل...</div>
          </div>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Truck className="h-5 w-5 ml-2 text-primary" />
          خدمة التوصيل
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderStatusMessage()}

        {diagnostic.configStatus === 'valid' && (
          <div className="space-y-4">
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

            {selectedProvince && (
              <div className="space-y-2">
                <Label className="text-md font-medium mr-1">نوع التوصيل</Label>
                <RadioGroup
                  value={deliveryType || 'home'}
                  onValueChange={(value) => handleDeliveryTypeChange(value as DeliveryType)}
                  className="flex space-x-4 space-x-reverse"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="home" id="home-delivery" />
                    <Label htmlFor="home-delivery" className="flex items-center gap-1">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      توصيل للمنزل
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="desk" id="desk-delivery" />
                    <Label htmlFor="desk-delivery" className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      استلام من المكتب
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

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
                    onValueChange={(value) => {
                      setSelectedMunicipality(value);
                      setSelectedCenter(null); // إعادة تعيين المركز المختار عند تغيير البلدية
                    }}
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

            {/* عرض مراكز التوصيل (المكاتب) للبلدية المختارة في حالة اختيار التوصيل للمكتب */}
            {deliveryType === 'desk' && selectedMunicipality && (
              <div className="space-y-2">
                <Label className="text-md font-medium mr-1 flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span>مكتب الاستلام</span>
                </Label>
                
                {loadingCenters ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    dir="rtl"
                    value={selectedCenter || undefined}
                    onValueChange={(value) => setSelectedCenter(value)}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="اختر مكتب الاستلام" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {centers.length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">
                          لا توجد مكاتب متاحة في هذه البلدية
                        </div>
                      ) : (
                        centers.map(renderCenterItem)
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