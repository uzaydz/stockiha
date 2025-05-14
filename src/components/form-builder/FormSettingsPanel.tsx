import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Truck, InfoIcon, Home, Building } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Separator } from "@/components/ui/separator";
import { ShippingProviderSelect } from "./ShippingProviderSelect";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FormSettingsPanelProps {
  formName?: string;
  isDefault: boolean;
  setIsDefault: Dispatch<SetStateAction<boolean>>;
  isActive: boolean;
  setIsActive: Dispatch<SetStateAction<boolean>>;
  onFormNameChange?: (value: string) => void;
  version?: number;
  shippingIntegration?: {
    enabled: boolean;
    provider: string | null;
    defaultDeliveryType?: 'home' | 'desk';
  };
  onShippingIntegrationChange?: (settings: {
    enabled: boolean;
    provider: string | null;
    defaultDeliveryType?: 'home' | 'desk';
  }) => void;
}

export function FormSettingsPanel({
  formName,
  isDefault,
  setIsDefault,
  isActive,
  setIsActive,
  onFormNameChange,
  version = 1,
  shippingIntegration = { enabled: false, provider: null, defaultDeliveryType: 'home' },
  onShippingIntegrationChange
}: FormSettingsPanelProps) {
  const { toast } = useToast();
  
  const [shippingEnabled, setShippingEnabled] = useState(shippingIntegration.enabled);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(shippingIntegration.provider);
  const [deliveryType, setDeliveryType] = useState<'home' | 'desk'>(shippingIntegration.defaultDeliveryType || 'home');

  // تحديث الإعدادات عندما يتغير تفعيل الشحن أو مزود الخدمة أو نوع التوصيل
  useEffect(() => {
    if (onShippingIntegrationChange) {
      onShippingIntegrationChange({
        enabled: shippingEnabled,
        provider: selectedProvider,
        defaultDeliveryType: deliveryType
      });
    }
  }, [shippingEnabled, selectedProvider, deliveryType, onShippingIntegrationChange]);

  // معالجة تغيير مزود الشحن
  const handleProviderChange = (providerId: string | null) => {
    setSelectedProvider(providerId);
    
    if (!providerId && shippingEnabled) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار شركة توصيل لتفعيل ربط النموذج مع خدمة التوصيل",
        variant: "default"
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">إعدادات النموذج</h2>
        {version && <Badge variant="outline" className="text-xs">النسخة {version}</Badge>}
      </div>
      
      <div className="space-y-6">
        {onFormNameChange && (
          <div className="space-y-2">
            <Label htmlFor="formName">اسم النموذج</Label>
            <Input
              id="formName"
              value={formName || ''}
              onChange={(e) => onFormNameChange(e.target.value)}
              placeholder="أدخل اسم النموذج"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <Label htmlFor="is-default" className="text-base font-medium">النموذج الافتراضي</Label>
            <p className="text-muted-foreground text-sm mt-1">
              استخدم هذا النموذج للمنتجات التي ليس لديها نماذج مخصصة
            </p>
          </div>
          <Switch
            id="is-default"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>
        
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <Label htmlFor="is-active" className="text-base font-medium">تفعيل النموذج</Label>
            <p className="text-muted-foreground text-sm mt-1">
              عند إلغاء التفعيل، لن يظهر النموذج للزوار
            </p>
          </div>
          <Switch
            id="is-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <Separator className="my-4" />
        
        <div className="space-y-6">
          <div className="flex items-start">
            <Truck className="h-5 w-5 mt-1 ml-2 text-primary" />
            <div>
              <h3 className="text-lg font-medium">ربط مع شركة التوصيل</h3>
              <p className="text-muted-foreground text-sm mt-1">
                ربط النموذج مع شركات التوصيل للحصول على الولايات والبلديات وأسعار التوصيل تلقائياً
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <Label htmlFor="shipping-enabled" className="text-base font-medium">تفعيل ربط التوصيل</Label>
              <p className="text-muted-foreground text-sm mt-1">
                تمكين ربط النموذج مع خدمة التوصيل
              </p>
            </div>
            <Switch
              id="shipping-enabled"
              checked={shippingEnabled}
              onCheckedChange={setShippingEnabled}
            />
          </div>

          {shippingEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="shipping-provider">شركة التوصيل</Label>
                <ShippingProviderSelect
                  value={selectedProvider}
                  onChange={handleProviderChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يجب أن تكون إعدادات شركة التوصيل مكتملة في صفحة إعدادات التوصيل
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <Label className="text-base font-medium">نوع التوصيل الافتراضي</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  حدد نوع التوصيل الافتراضي الذي سيتم استخدامه في النموذج. يمكن إضافة حقل نوع التوصيل الثابت للنموذج لاستخدام هذه القيمة.
                </p>
                <RadioGroup
                  value={deliveryType}
                  onValueChange={(value) => setDeliveryType(value as 'home' | 'desk')}
                  className="flex space-x-4 space-x-reverse"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="home" id="delivery-home" />
                    <Label htmlFor="delivery-home" className="flex items-center">
                      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                      توصيل للمنزل
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="desk" id="delivery-desk" />
                    <Label htmlFor="delivery-desk" className="flex items-center">
                      <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                      استلام من المكتب
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <Alert className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">ملاحظة:</AlertTitle>
          <AlertDescription className="text-xs">
            عند ربط النموذج مع شركة التوصيل، سيتم استخدام حقول الولاية والبلدية من شركة التوصيل تلقائياً وسيتم تحديث سعر التوصيل بناءً على نوع التوصيل (منزل أو مكتب).
            يمكنك إضافة حقل "نوع التوصيل الثابت" للنموذج لاستخدام نوع التوصيل المحدد هنا.
          </AlertDescription>
        </Alert>
        
        {shippingEnabled && selectedProvider && (
          <Alert className="mt-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">تم الربط بنجاح:</AlertTitle>
            <AlertDescription className="text-xs">
              تم ربط النموذج مع شركة التوصيل بنجاح. ستظهر حقول الولاية والبلدية وسيتم استخدام نوع التوصيل الافتراضي "{deliveryType === 'home' ? 'توصيل للمنزل' : 'استلام من المكتب'}" للحسابات.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
} 