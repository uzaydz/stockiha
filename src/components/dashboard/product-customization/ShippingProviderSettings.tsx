import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Tag, 
  Settings, 
  Eye, 
  Info, 
  Check, 
  X, 
  RefreshCcw, 
  Building, 
  Home, 
  LocateFixed 
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  getShippingClones, 
  ShippingProviderClone, 
  getShippingClonePrices, 
  getProvinces,
  ShippingClonePrice,
  Province
} from '@/api/shippingCloneService';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShippingProviderSettingsProps {
  productId: string;
  selectedCloneId: number | null;
  onChange: (cloneId: number | null) => void;
}

export default function ShippingProviderSettings({
  productId,
  selectedCloneId,
  onChange
}: ShippingProviderSettingsProps) {
  const [clones, setClones] = useState<ShippingProviderClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [prices, setPrices] = useState<ShippingClonePrice[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
  const { organization } = useOrganization();

  // تحميل نسخ مزودي التوصيل عند تحميل المكون
  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization?.id]);

  // تحميل أسعار مزود التوصيل المحدد
  useEffect(() => {
    if (selectedCloneId) {
      loadPricesForClone(selectedCloneId);
    } else {
      setPrices([]);
    }
  }, [selectedCloneId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clonesData, provincesData] = await Promise.all([
        getShippingClones(organization?.id || ''),
        getProvinces()
      ]);
      setClones(clonesData);
      setProvinces(provincesData);
    } catch (err) {
      console.error('خطأ في تحميل بيانات التوصيل:', err);
      setError('حدث خطأ أثناء تحميل خيارات التوصيل المتاحة');
    } finally {
      setLoading(false);
    }
  };

  const loadPricesForClone = async (cloneId: number) => {
    try {
      const pricesData = await getShippingClonePrices(cloneId);
      setPrices(pricesData);
      
      // تحديد المحافظة الافتراضية (الجزائر العاصمة مثلاً)
      if (pricesData.length > 0 && !selectedProvince) {
        const defaultProvince = pricesData.find(p => p.province_name.includes('الجزائر'));
        setSelectedProvince(defaultProvince?.province_id || pricesData[0].province_id);
      }
    } catch (err) {
      console.error('خطأ في تحميل أسعار التوصيل:', err);
    }
  };

  const handleShippingCloneChange = (value: string) => {
    const cloneId = value === 'default' ? null : parseInt(value);
    onChange(cloneId);
    setSelectedProvince(null); // إعادة تعيين المحافظة المختارة
  };

  // الحصول على تفاصيل النسخة المختارة
  const selectedClone = clones.find(clone => clone.id === selectedCloneId);

  // الحصول على أسعار المحافظة المحددة
  const selectedProvinceData = selectedProvince 
    ? prices.find(p => p.province_id === selectedProvince) 
    : null;

  // رسم قائمة المحافظات
  const renderProvinceList = () => {
    return (
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {provinces
            .filter(p => p.is_deliverable)
            .map(province => {
              const provincePrice = prices.find(p => p.province_id === province.id);
              const isSelected = selectedProvince === province.id;
              return (
                <div
                  key={province.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer",
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedProvince(province.id)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{province.name}</span>
                  </div>
                  {provincePrice && (
                    <div className="text-sm">
                      {selectedClone?.is_free_delivery_home ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          توصيل مجاني
                        </Badge>
                      ) : selectedClone?.use_unified_price ? (
                        <span>{selectedClone.unified_home_price?.toLocaleString()} د.ج</span>
                      ) : (
                        <span>{provincePrice.home_price?.toLocaleString()} د.ج</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    );
  };

  // التأكد من عرض المحافظات فقط في المحافظات القابلة للتوصيل
  const renderProvinceSelector = () => {
    return (
      <div className="mt-4">
        <Select
          value={selectedProvince?.toString() || ''}
          onValueChange={value => setSelectedProvince(parseInt(value))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر محافظة للاطلاع على سعر التوصيل" />
          </SelectTrigger>
          <SelectContent>
            {provinces
              .filter(p => p.is_deliverable)
              .map(province => (
                <SelectItem key={province.id} value={province.id.toString()}>
                  {province.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // رسم كارت المعاينة
  const renderPreviewCard = () => {
    if (!selectedClone) {
      return (
        <div className="text-center p-10 bg-muted/20 rounded-md border border-dashed">
          <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">يتم استخدام مزود التوصيل الافتراضي</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            تغيير مزود التوصيل
          </Button>
        </div>
      );
    }

    const deliveryPrice = selectedProvinceData
      ? (selectedClone.is_free_delivery_home
        ? 0
        : selectedClone.use_unified_price
          ? selectedClone.unified_home_price
          : selectedProvinceData.home_price)
      : null;
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{selectedClone.name}</CardTitle>
            </div>
            {selectedClone.is_free_delivery_home && (
              <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-none">
                توصيل مجاني
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-medium mb-2 block text-muted-foreground">محافظة التوصيل</Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedProvinceData 
                    ? provinces.find(p => p.id === selectedProvince)?.name 
                    : 'لم يتم اختيار محافظة'}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-muted-foreground">سعر التوصيل</Label>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {deliveryPrice !== null 
                    ? (deliveryPrice === 0 
                      ? 'مجاني' 
                      : `${deliveryPrice?.toLocaleString() || '-'} د.ج`)
                    : 'غير متوفر'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-md">
              <Home className="h-4 w-4 text-primary" />
              <span className="text-sm">
                توصيل للمنزل: {' '}
                {selectedClone.is_home_delivery_enabled 
                  ? <span className="text-green-600">متاح</span> 
                  : <span className="text-red-600">غير متاح</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-md">
              <Building className="h-4 w-4 text-primary" />
              <span className="text-sm">
                توصيل للمكتب: {' '}
                {selectedClone.is_desk_delivery_enabled 
                  ? <span className="text-green-600">متاح</span> 
                  : <span className="text-red-600">غير متاح</span>}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // رسم كارت المعلومات
  const renderInfoCard = () => {
    return (
      <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base text-blue-600">معلومات عن مزودي التوصيل</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-blue-500" />
              <span>يمكنك تخصيص مزود توصيل محدد لهذا المنتج</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-blue-500" />
              <span>يمكن استخدام أسعار مختلفة للمحافظات المختلفة لكل مزود</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-blue-500" />
              <span>إذا تم اختيار المزود الافتراضي، سيتم استخدام مزود التوصيل العام للمتجر</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="settings" className="w-1/2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>الإعدادات</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="w-1/2 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>معاينة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">اختيار مزود التوصيل</CardTitle>
              </div>
              <CardDescription>
                حدد مزود التوصيل الذي سيتم استخدامه لهذا المنتج
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedCloneId?.toString() || 'default'} 
                onValueChange={handleShippingCloneChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر مزود التوصيل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>المزود الافتراضي للمتجر</span>
                    </div>
                  </SelectItem>
                  {clones.map(clone => (
                    <SelectItem key={clone.id} value={clone.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span>{clone.name}</span>
                        {clone.is_free_delivery_home && (
                          <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                            مجاني
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedClone && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <LocateFixed className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">تفاصيل أسعار التوصيل حسب المحافظة</CardTitle>
                </div>
                <CardDescription>
                  اختر محافظة للاطلاع على تفاصيل وأسعار التوصيل
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      المحافظات المتاحة للتوصيل
                    </h3>
                    {renderProvinceList()}
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      معلومات التوصيل
                    </h3>

                    {!selectedProvinceData ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                        <p>اختر محافظة من القائمة لعرض تفاصيل التوصيل</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-primary/5 p-3 rounded-md">
                          <h4 className="font-medium mb-2">
                            {provinces.find(p => p.id === selectedProvince)?.name}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                <Home className="h-3.5 w-3.5" />
                                <span>توصيل للمنزل:</span>
                              </div>
                              <span className="font-medium">
                                {selectedClone.is_free_delivery_home ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                    مجاني
                                  </Badge>
                                ) : selectedClone.use_unified_price ? (
                                  `${selectedClone.unified_home_price?.toLocaleString() || '-'} د.ج`
                                ) : (
                                  `${selectedProvinceData.home_price?.toLocaleString() || '-'} د.ج`
                                )}
                              </span>
                            </div>
                            {selectedClone.is_desk_delivery_enabled && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1">
                                  <Building className="h-3.5 w-3.5" />
                                  <span>توصيل للمكتب:</span>
                                </div>
                                <span className="font-medium">
                                  {selectedClone.is_free_delivery_desk ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                      مجاني
                                    </Badge>
                                  ) : selectedClone.use_unified_price ? (
                                    `${selectedClone.unified_desk_price?.toLocaleString() || '-'} د.ج`
                                  ) : (
                                    `${selectedProvinceData.desk_price?.toLocaleString() || '-'} د.ج`
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {selectedClone.use_unified_price && (
                            <div className="flex items-center gap-1 mt-1">
                              <Info className="h-3.5 w-3.5" />
                              <span>هذا المزود يستخدم سعر موحد لجميع المحافظات</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {renderInfoCard()}
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">معاينة طريقة عرض التوصيل</CardTitle>
                  </div>
                  {selectedClone && provinces.length > 0 && (
                    <div className="w-[220px]">
                      <Select
                        value={selectedProvince?.toString() || ''}
                        onValueChange={value => setSelectedProvince(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر محافظة" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces
                            .filter(p => p.is_deliverable)
                            .map(province => (
                              <SelectItem key={province.id} value={province.id.toString()}>
                                {province.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <CardDescription>
                  هذا ما سيراه العميل عند اختيار المحافظة في صفحة المنتج وعند تأكيد الطلب
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                {renderPreviewCard()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}