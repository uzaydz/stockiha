import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package2, 
  TruckIcon, 
  Package, 
  Truck, 
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase-client';
import ProviderSettingsForm from './ProviderSettingsForm';
import CustomShippingSettings from './CustomShippingSettings';

interface AddDeliveryProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

interface AvailableProvider {
  id: number;
  code: string;
  name: string;
  base_url: string;
  is_active: boolean;
  description?: string;
}

// Provider icons mapping
const providerIcons = {
  yalidine: Package2,
  zrexpress: TruckIcon,
  mayesto: Package,
  ecotrack: Truck,
  // Ecotrack-integrated providers
  anderson_delivery: Truck,
  areex: Package,
  ba_consult: TruckIcon,
  conexlog: Truck,
  coyote_express: Package2,
  dhd: Truck,
  distazero: Package,
  e48hr_livraison: TruckIcon,
  fretdirect: Truck,
  golivri: Package2,
  mono_hub: Package,
  msm_go: TruckIcon,
  negmar_express: Truck,
  packers: Package,
  prest: Package2,
  rb_livraison: TruckIcon,
  rex_livraison: Truck,
  rocket_delivery: Package2,
  salva_delivery: Package,
  speed_delivery: TruckIcon,
  tsl_express: Truck,
  worldexpress: Package2,
  custom: Settings,
  default: Package
};

// Provider descriptions
const providerDescriptions = {
  yalidine: 'شركة توصيل جزائرية رائدة تغطي جميع الولايات مع خدمة التوصيل السريع والموثوق',
  zrexpress: 'خدمة توصيل متطورة تقدم حلول شحن مبتكرة لجميع أنحاء الجزائر',
  mayesto: 'شركة توصيل محلية متخصصة في التوصيل السريع والخدمات اللوجستية',
  ecotrack: 'منصة توصيل صديقة للبيئة تركز على الحلول المستدامة والتوصيل الذكي',
  // Ecotrack-integrated providers descriptions
  anderson_delivery: 'شركة توصيل Anderson متصلة عبر منصة Ecotrack - خدمة توصيل موثوقة ومتطورة',
  areex: 'شركة أريكس للتوصيل متصلة عبر Ecotrack - حلول توصيل سريعة ومرنة',
  ba_consult: 'شركة BA Consult للتوصيل والاستشارات اللوجستية متصلة عبر Ecotrack',
  conexlog: 'شركة كونكسلوغ للحلول اللوجستية متصلة عبر منصة Ecotrack',
  coyote_express: 'شركة Coyote Express للتوصيل السريع متصلة عبر Ecotrack',
  dhd: 'شركة DHD للتوصيل متصلة عبر منصة Ecotrack - خدمة توصيل شاملة',
  distazero: 'شركة ديستازيرو للتوصيل متصلة عبر Ecotrack - تغطية واسعة وخدمة متميزة',
  e48hr_livraison: 'شركة E48HR للتوصيل خلال 48 ساعة متصلة عبر Ecotrack',
  fretdirect: 'شركة فريت دايركت للنقل المباشر متصلة عبر منصة Ecotrack',
  golivri: 'شركة غوليفري للتوصيل متصلة عبر Ecotrack - خدمة توصيل حديثة وسريعة',
  mono_hub: 'شركة Mono Hub للتوصيل والتوزيع متصلة عبر منصة Ecotrack',
  msm_go: 'شركة MSM Go للتوصيل السريع متصلة عبر Ecotrack',
  negmar_express: 'شركة نيغمار إكسبرس للتوصيل السريع متصلة عبر منصة Ecotrack',
  packers: 'شركة باكرز للتعبئة والتوصيل متصلة عبر Ecotrack',
  prest: 'شركة بريست للخدمات اللوجستية متصلة عبر منصة Ecotrack',
  rb_livraison: 'شركة RB للتوصيل متصلة عبر Ecotrack - خدمة توصيل احترافية',
  rex_livraison: 'شركة ريكس ليفريزون للتوصيل متصلة عبر منصة Ecotrack',
  rocket_delivery: 'شركة Rocket Delivery للتوصيل فائق السرعة متصلة عبر Ecotrack',
  salva_delivery: 'شركة سالفا ديليفري للتوصيل متصلة عبر منصة Ecotrack',
  speed_delivery: 'شركة سبيد ديليفري للتوصيل السريع متصلة عبر Ecotrack',
  tsl_express: 'شركة TSL Express للتوصيل السريع متصلة عبر منصة Ecotrack',
  worldexpress: 'شركة ورلد إكسبرس للتوصيل العالمي متصلة عبر Ecotrack',
  custom: 'إعداد طريقة شحن مخصصة مع تحديد أسعار التوصيل لكل ولاية حسب نوع التوصيل (منزل/مكتب)'
};

type Step = 'select' | 'configure';

export default function AddDeliveryProviderDialog({ 
  open, 
  onOpenChange, 
  organizationId 
}: AddDeliveryProviderDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('select');
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AvailableProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available providers
  useEffect(() => {
    if (open) {
      fetchAvailableProviders();
    }
  }, [open, organizationId]);

  const fetchAvailableProviders = async () => {
    try {
      setIsLoading(true);
      
      // Get all active providers
      const { data: allProviders, error: providersError } = await supabase
        .from('shipping_providers')
        .select('*')
        .eq('is_active', true);

      if (providersError) throw providersError;

      // Get already configured providers for this organization
      const { data: configuredProviders, error: configuredError } = await supabase
        .from('shipping_provider_settings')
        .select('provider_id')
        .eq('organization_id', organizationId);

      if (configuredError) throw configuredError;

      // Filter out already configured providers
      const configuredProviderIds = configuredProviders?.map(p => p.provider_id) || [];
      const available = allProviders?.filter(
        provider => !configuredProviderIds.includes(provider.id)
      ) || [];

      // Add custom shipping option only if not already configured
      const hasCustomShipping = configuredProviders?.some(p => 
        p.provider_id === null || (p as any).api_key === 'custom_shipping'
      );
      
      const customShippingOption = {
        id: 0,
        code: 'custom',
        name: 'طريقة شحن مخصصة',
        base_url: '',
        is_active: true,
        description: 'إعداد طريقة شحن مخصصة مع تحديد أسعار التوصيل لكل ولاية حسب نوع التوصيل (منزل/مكتب)'
      };

      const providersWithCustom = hasCustomShipping ? available : [customShippingOption, ...available];
      setAvailableProviders(providersWithCustom);
    } catch (error) {
      console.error('Error fetching available providers:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل شركات التوصيل المتاحة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = (provider: AvailableProvider) => {
    setSelectedProvider(provider);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedProvider(null);
  };

  const handleSuccess = () => {
    toast({
      title: "تم بنجاح",
      description: `تم إضافة ${selectedProvider?.name} بنجاح`,
      variant: "default",
    });
    onOpenChange(false);
    // Reset state
    setStep('select');
    setSelectedProvider(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a short delay to avoid visual glitch
    setTimeout(() => {
      setStep('select');
      setSelectedProvider(null);
    }, 200);
  };

  const getProviderIcon = (providerCode: string) => {
    const IconComponent = providerIcons[providerCode as keyof typeof providerIcons] || providerIcons.default;
    return IconComponent;
  };

  const getProviderDescription = (providerCode: string) => {
    return providerDescriptions[providerCode as keyof typeof providerDescriptions] || 
           'شركة توصيل موثوقة تقدم خدمات شحن عالية الجودة';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 'configure' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="p-1 h-auto"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 'select' ? 'اختيار شركة التوصيل' : 'إعداد شركة التوصيل'}
              </DialogTitle>
              <DialogDescription>
                {step === 'select' 
                  ? 'اختر شركة التوصيل التي تريد إضافتها لمتجرك'
                  : `قم بإعداد إعدادات ${selectedProvider?.name}`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">جاري تحميل شركات التوصيل...</p>
                </div>
              </div>
            ) : availableProviders.length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">تم إضافة جميع الشركات</h3>
                  <p className="text-muted-foreground">
                    لقد قمت بإضافة جميع شركات التوصيل المتاحة لمتجرك.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-3">
                {availableProviders.map((provider) => {
                  const IconComponent = getProviderIcon(provider.code);
                  const description = getProviderDescription(provider.code);
                  
                  return (
                    <Card 
                      key={provider.id} 
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleProviderSelect(provider)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{provider.name}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {provider.code.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {description}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'configure' && selectedProvider && (
          selectedProvider.code === 'custom' ? (
            <CustomShippingSettings
              organizationId={organizationId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
            />
          ) : (
            <ProviderSettingsForm
              provider={selectedProvider}
              organizationId={organizationId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
} 