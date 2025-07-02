import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin,
  Home,
  Building2,
  Info,
  DollarSign,
  Globe
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase-client';

interface CustomShippingSettingsProps {
  organizationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Province {
  id: number;
  name: string;
  name_ar: string;
  zone: number;
  is_deliverable: boolean;
}

interface ShippingRates {
  [provinceId: string]: {
    home_delivery: number;
    office_delivery: number;
  };
}

const ZONE_COLORS = {
  1: 'bg-green-100 text-green-800 border-green-200',
  2: 'bg-blue-100 text-blue-800 border-blue-200', 
  3: 'bg-orange-100 text-orange-800 border-orange-200',
  4: 'bg-red-100 text-red-800 border-red-200'
};

const ZONE_NAMES = {
  1: 'المنطقة الأولى',
  2: 'المنطقة الثانية',
  3: 'المنطقة الثالثة',
  4: 'المنطقة الرابعة'
};

export default function CustomShippingSettings({ 
  organizationId, 
  onSuccess, 
  onCancel 
}: CustomShippingSettingsProps) {
  const { toast } = useToast();
  
  // إعدادات عامة
  const [serviceName, setServiceName] = useState('طريقة شحن مخصصة');
  const [isEnabled, setIsEnabled] = useState(true);
  
  // إعدادات التوصيل المجاني
  const [freeHomeDelivery, setFreeHomeDelivery] = useState(false);
  const [freeOfficeDelivery, setFreeOfficeDelivery] = useState(false);
  
  // إعدادات الأسعار الموحدة
  const [useUniformRates, setUseUniformRates] = useState(false);
  const [uniformHomeRate, setUniformHomeRate] = useState<number>(0);
  const [uniformOfficeRate, setUniformOfficeRate] = useState<number>(0);
  
  // بيانات الولايات والأسعار
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // جلب الولايات
  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('yalidine_provinces_global')
        .select('*')
        .eq('is_deliverable', true)
        .order('zone, name_ar');

      if (error) throw error;

      setProvinces(data || []);
      
      // إعداد أسعار افتراضية
      const initialRates: ShippingRates = {};
      data?.forEach(province => {
        initialRates[province.id] = {
          home_delivery: 0,
          office_delivery: 0
        };
      });
      setShippingRates(initialRates);

    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الولايات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProvinceRate = (provinceId: number, type: 'home_delivery' | 'office_delivery', value: number) => {
    setShippingRates(prev => ({
      ...prev,
      [provinceId]: {
        ...prev[provinceId],
        [type]: value
      }
    }));
  };

  const applyUniformRates = () => {
    if (!useUniformRates) return;
    
    const updatedRates: ShippingRates = {};
    provinces.forEach(province => {
      updatedRates[province.id] = {
        home_delivery: freeHomeDelivery ? 0 : uniformHomeRate,
        office_delivery: freeOfficeDelivery ? 0 : uniformOfficeRate
      };
    });
    setShippingRates(updatedRates);
  };

  useEffect(() => {
    if (useUniformRates) {
      applyUniformRates();
    }
  }, [useUniformRates, uniformHomeRate, uniformOfficeRate, freeHomeDelivery, freeOfficeDelivery]);

  useEffect(() => {
    if (freeHomeDelivery || freeOfficeDelivery) {
      const updatedRates: ShippingRates = {};
      provinces.forEach(province => {
        updatedRates[province.id] = {
          home_delivery: freeHomeDelivery ? 0 : shippingRates[province.id]?.home_delivery || 0,
          office_delivery: freeOfficeDelivery ? 0 : shippingRates[province.id]?.office_delivery || 0
        };
      });
      setShippingRates(updatedRates);
    }
  }, [freeHomeDelivery, freeOfficeDelivery]);

  const handleSave = async () => {
    if (!serviceName.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال اسم طريقة الشحن",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // إعداد بيانات الإعدادات
      const settings = {
        service_name: serviceName,
        service_type: 'custom',
        free_home_delivery: freeHomeDelivery,
        free_office_delivery: freeOfficeDelivery,
        use_uniform_rates: useUniformRates,
        uniform_home_rate: uniformHomeRate,
        uniform_office_rate: uniformOfficeRate,
        shipping_rates: shippingRates,
        created_at: new Date().toISOString()
      };

      // إدراج إعدادات طريقة الشحن المخصصة
      const { error } = await supabase
        .from('shipping_provider_settings')
        .insert({
          organization_id: organizationId,
          provider_id: null, // null يعني طريقة شحن مخصصة
          api_token: serviceName,
          api_key: 'custom_shipping',
          is_enabled: isEnabled,
          auto_shipping: false,
          track_updates: false,
          settings: settings
        });

      if (error) throw error;

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم إعداد ${serviceName} بنجاح`,
        variant: "default",
      });

      onSuccess();

    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const groupedProvinces = provinces.reduce((acc, province) => {
    if (!acc[province.zone]) {
      acc[province.zone] = [];
    }
    acc[province.zone].push(province);
    return acc;
  }, {} as Record<number, Province[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الولايات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* معلومات طريقة الشحن */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">طريقة شحن مخصصة</CardTitle>
              <CardDescription>
                إعداد أسعار التوصيل المخصصة لكل ولاية
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* الإعدادات الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle>الإعدادات الأساسية</CardTitle>
          <CardDescription>
            تكوين المعلومات الأساسية لطريقة الشحن
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">اسم طريقة الشحن <span className="text-destructive">*</span></Label>
            <Input
              id="service-name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="مثال: شحن سريع، توصيل مجاني"
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>تفعيل طريقة الشحن</Label>
              <p className="text-sm text-muted-foreground">
                جعل طريقة الشحن متاحة للعملاء
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات التوصيل المجاني */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التوصيل المجاني</CardTitle>
          <CardDescription>
            تحديد نوع التوصيل المجاني المتاح
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>التوصيل مجاني للمنزل</Label>
                <p className="text-sm text-muted-foreground">
                  جعل التوصيل للمنزل مجاني لجميع الولايات
                </p>
              </div>
            </div>
            <Switch
              checked={freeHomeDelivery}
              onCheckedChange={setFreeHomeDelivery}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>التوصيل مجاني للمكتب</Label>
                <p className="text-sm text-muted-foreground">
                  جعل التوصيل للمكتب مجاني لجميع الولايات
                </p>
              </div>
            </div>
            <Switch
              checked={freeOfficeDelivery}
              onCheckedChange={setFreeOfficeDelivery}
              disabled={isSaving}
            />
          </div>

          {(freeHomeDelivery || freeOfficeDelivery) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                عند تفعيل التوصيل المجاني، سيتم تعيين الأسعار إلى 0 تلقائياً ولن تتمكن من تعديلها.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* إعدادات الأسعار الموحدة */}
      {!freeHomeDelivery || !freeOfficeDelivery ? (
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الأسعار الموحدة</CardTitle>
            <CardDescription>
              تطبيق نفس السعر على جميع الولايات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>استخدام أسعار موحدة</Label>
                <p className="text-sm text-muted-foreground">
                  تطبيق نفس الأسعار على جميع الولايات
                </p>
              </div>
              <Switch
                checked={useUniformRates}
                onCheckedChange={setUseUniformRates}
                disabled={isSaving}
              />
            </div>

            {useUniformRates && (
              <div className="grid grid-cols-2 gap-4">
                {!freeHomeDelivery && (
                  <div className="space-y-2">
                    <Label htmlFor="uniform-home">سعر التوصيل للمنزل (دج)</Label>
                    <Input
                      id="uniform-home"
                      type="number"
                      min="0"
                      step="50"
                      value={uniformHomeRate}
                      onChange={(e) => setUniformHomeRate(Number(e.target.value))}
                      placeholder="مثال: 300"
                      disabled={isSaving}
                    />
                  </div>
                )}

                {!freeOfficeDelivery && (
                  <div className="space-y-2">
                    <Label htmlFor="uniform-office">سعر التوصيل للمكتب (دج)</Label>
                    <Input
                      id="uniform-office"
                      type="number"
                      min="0"
                      step="50"
                      value={uniformOfficeRate}
                      onChange={(e) => setUniformOfficeRate(Number(e.target.value))}
                      placeholder="مثال: 200"
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* أسعار الولايات */}
      {!useUniformRates && (!freeHomeDelivery || !freeOfficeDelivery) && (
        <Card>
          <CardHeader>
            <CardTitle>أسعار التوصيل حسب الولاية</CardTitle>
            <CardDescription>
              تحديد أسعار مخصصة لكل ولاية حسب نوع التوصيل
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-6">
                {Object.entries(groupedProvinces).map(([zone, zoneProvinces]) => (
                  <div key={zone} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Badge 
                        variant="outline" 
                        className={`${ZONE_COLORS[Number(zone) as keyof typeof ZONE_COLORS]} font-medium`}
                      >
                        {ZONE_NAMES[Number(zone) as keyof typeof ZONE_NAMES]} - {zoneProvinces.length} ولاية
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3">
                      {zoneProvinces.map((province) => (
                        <div key={province.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{province.name_ar}</div>
                            <div className="text-xs text-muted-foreground">{province.name}</div>
                          </div>
                          
                          {!freeHomeDelivery && (
                            <div className="flex items-center gap-2">
                              <Home className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="50"
                                value={shippingRates[province.id]?.home_delivery || 0}
                                onChange={(e) => updateProvinceRate(province.id, 'home_delivery', Number(e.target.value))}
                                className="w-20 h-8 text-xs"
                                placeholder="0"
                                disabled={isSaving}
                              />
                              <span className="text-xs text-muted-foreground">دج</span>
                            </div>
                          )}
                          
                          {!freeOfficeDelivery && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="50"
                                value={shippingRates[province.id]?.office_delivery || 0}
                                onChange={(e) => updateProvinceRate(province.id, 'office_delivery', Number(e.target.value))}
                                className="w-20 h-8 text-xs"
                                placeholder="0"
                                disabled={isSaving}
                              />
                              <span className="text-xs text-muted-foreground">دج</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">ملاحظات هامة:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>قيمة 0 تعني توصيل مجاني لتلك الولاية</li>
                    <li>يمكنك ترك الحقول فارغة للولايات غير المتاحة</li>
                    <li>الأسعار بالدينار الجزائري</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* أزرار الإجراءات */}
      <div className="flex gap-3 justify-end sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 border-t">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving}
        >
          إلغاء
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          حفظ طريقة الشحن
        </Button>
      </div>
    </div>
  );
}
