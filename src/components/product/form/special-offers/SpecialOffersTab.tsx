import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Eye, 
  Lightbulb,
  TrendingUp,
  Users,
  BarChart3,
  Save,
  RefreshCw,
  Gift,
  HelpCircle,
  Info
} from 'lucide-react';
import SpecialOffersManager from './SpecialOffersManager';
import SpecialOffersPreview from './SpecialOffersPreview';
import { SpecialOffersConfig } from '@/types/specialOffers';
import { updateProductSpecialOffers } from '@/lib/api/products';

interface SpecialOffersTabProps {
  productName: string;
  basePrice: number;
  productId?: string;
  productImage?: string;
  initialConfig?: SpecialOffersConfig;
  onChange?: (config: SpecialOffersConfig) => void;
}

const SpecialOffersTab: React.FC<SpecialOffersTabProps> = ({
  productName,
  basePrice,
  productId,
  productImage,
  initialConfig,
  onChange
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SpecialOffersConfig>(
    initialConfig || {
      enabled: false,
      offers: [],
      displayStyle: 'cards',
      showSavings: true,
      showUnitPrice: true,
      currency: 'دج'
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(!productId);

  const handleConfigChange = (newConfig: SpecialOffersConfig) => {
    setConfig(newConfig);
    setHasUnsavedChanges(true);
    if (onChange) {
      onChange(newConfig);
    }
  };

  const handleSave = async () => {
    if (!productId) {
      toast({
        title: "تنبيه",
        description: "يجب حفظ المنتج أولاً قبل حفظ العروض الخاصة",
        variant: "destructive"
      });
      return;
    }

    // منع الحفظ للمنتجات الجديدة تماماً
    if (isNewProduct) {
      toast({
        title: "تنبيه",
        description: "احفظ المنتج أولاً، ثم يمكنك إضافة العروض الخاصة",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProductSpecialOffers(productId, config);
      setHasUnsavedChanges(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات العروض الخاصة",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "فشل في الحفظ",
        description: error?.message || "حدث خطأ أثناء حفظ العروض الخاصة",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // تحديث حالة المنتج الجديد عند تغيير productId
  useEffect(() => {
    if (productId && isNewProduct) {
      setIsNewProduct(false);
    }
  }, [productId, isNewProduct]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-background/50 border border-border/60 rounded-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <div>
            <h2 className="text-sm sm:text-base font-medium">العروض الخاصة</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground">عروض للكميات المختلفة</p>
          </div>
        </div>
        {productId && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasUnsavedChanges}
            size="sm"
            className="text-xs px-3 py-1.5 h-8"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                <span className="hidden sm:inline">جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">
                  {hasUnsavedChanges ? 'حفظ' : 'محفوظ'}
                </span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Simple Status */}
      {hasUnsavedChanges && (
        <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
            💡 لديك تغييرات غير محفوظة. {
              isNewProduct 
                ? 'احفظ المنتج أولاً لتفعيل العروض الخاصة.' 
                : 'اضغط على زر "حفظ" لحفظ العروض.'
            }
          </p>
        </div>
      )}

      {/* Simple Info */}
      <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">فوائد العروض الخاصة</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">زيادة المبيعات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">جذب العملاء</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">تحسين التحويل</span>
          </div>
        </div>
      </div>

      {/* Simple Tabs */}
      <Tabs defaultValue="manage" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 p-1 gap-1 rounded-lg">
          <TabsTrigger value="manage" className="flex items-center gap-1.5 p-2 text-xs">
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إدارة العروض</span>
            <span className="sm:hidden">إدارة</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1.5 p-2 text-xs">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">معاينة</span>
            <span className="sm:hidden">معاينة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="m-0">
          <div className="p-3 sm:p-4 border border-border/60 rounded-lg bg-background/50">
            <SpecialOffersManager
              config={config}
              basePrice={basePrice}
              productName={productName}
              onChange={handleConfigChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          {config.enabled && config.offers.length > 0 ? (
            <div className="p-3 sm:p-4 border border-border/60 rounded-lg bg-background/50">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium">معاينة للعملاء</h3>
                  <p className="text-[10px] text-muted-foreground">كيف ستظهر العروض للعملاء</p>
                </div>
              </div>
              <div className="border border-border/60 rounded-lg p-3 bg-muted/20">
                <SpecialOffersPreview
                  config={config}
                  productName={productName}
                  productImage={productImage}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-border/60 rounded-lg bg-background/50">
              <div className="flex flex-col items-center justify-center py-6">
                <Eye className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-2">لا توجد عروض للمعاينة</h3>
                <p className="text-[10px] text-muted-foreground text-center mb-4 max-w-sm">
                  {!config.enabled 
                    ? 'يرجى تفعيل العروض الخاصة أولاً لرؤية المعاينة'
                    : 'أضف بعض العروض لرؤية كيف ستظهر للعملاء'
                  }
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const manageTab = document.querySelector('[value="manage"]') as HTMLElement;
                    manageTab?.click();
                  }}
                  className="text-xs px-3 py-1.5 h-8"
                >
                  {!config.enabled ? 'تفعيل العروض' : 'إضافة عروض'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Simple Summary */}
      {config.enabled && config.offers.length > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              عروضك جاهزة! {hasUnsavedChanges && '⚠️ (غير محفوظة)'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <span className="text-[10px] text-green-600 dark:text-green-400">
              {config.offers.length} عروض متاحة - 
              أعلى خصم {Math.max(...config.offers.map(o => o.discountPercentage))}%
            </span>
            <span className="text-[10px] text-green-600 dark:text-green-400">
              أقل سعر: {Math.min(...config.offers.map(o => o.pricePerUnit)).toFixed(0)} {config.currency}/قطعة
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialOffersTab;
