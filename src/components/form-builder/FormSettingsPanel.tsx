import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Truck } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Separator } from "@/components/ui/separator";
import { ShippingProviderSelect } from "./ShippingProviderSelect";
import { useToast } from "@/components/ui/use-toast";

interface FormSettingsPanelProps {
  formName?: string;
  isDefault: boolean;
  setIsDefault: Dispatch<SetStateAction<boolean>>;
  isActive: boolean;
  setIsActive: Dispatch<SetStateAction<boolean>>;
  onFormNameChange?: (value: string) => void;
  shippingIntegration?: {
    enabled: boolean;
    provider: string | null;
  };
  onShippingIntegrationChange?: (settings: {
    enabled: boolean;
    provider: string | null;
  }) => void;
}

export function FormSettingsPanel({
  formName,
  isDefault,
  setIsDefault,
  isActive,
  setIsActive,
  onFormNameChange,
  shippingIntegration = { enabled: false, provider: null },
  onShippingIntegrationChange
}: FormSettingsPanelProps) {
  const { toast } = useToast();
  
  const [shippingEnabled, setShippingEnabled] = useState(shippingIntegration.enabled);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(shippingIntegration.provider);

  // تحديث الإعدادات عندما يتغير تفعيل الشحن أو مزود الخدمة
  useEffect(() => {
    if (onShippingIntegrationChange) {
      onShippingIntegrationChange({
        enabled: shippingEnabled,
        provider: selectedProvider
      });
    }
  }, [shippingEnabled, selectedProvider, onShippingIntegrationChange]);

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
      <h2 className="text-xl font-semibold mb-4">إعدادات النموذج</h2>
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
            </div>
          )}
        </div>

        <Alert className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">ملاحظة:</AlertTitle>
          <AlertDescription className="text-xs">
            عند ربط النموذج مع شركة التوصيل، سيتم استخدام حقول الولاية والبلدية من شركة التوصيل تلقائياً وسيتم تحديث سعر التوصيل بناءً على نوع التوصيل (منزل أو مكتب).
          </AlertDescription>
        </Alert>
      </div>
    </Card>
  );
} 