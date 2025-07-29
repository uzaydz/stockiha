import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Eye, 
  Lightbulb,
  TrendingUp,
  Users,
  BarChart3,
  Save,
  RefreshCw
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
    <div className="space-y-6">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">العروض الخاصة</h2>
          <p className="text-muted-foreground">
            إنشاء عروض جذابة للكميات المختلفة لزيادة المبيعات
          </p>
        </div>
        {productId && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasUnsavedChanges}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {hasUnsavedChanges ? 'حفظ التغييرات' : 'محفوظ'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Status indicator */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            💡 لديك تغييرات غير محفوظة. {
              isNewProduct 
                ? 'احفظ المنتج أولاً لتفعيل العروض الخاصة. لن يتم الحفظ التلقائي.' 
                : 'اضغط على زر "حفظ التغييرات" لحفظ العروض الخاصة يدوياً.'
            }
          </p>
        </div>
      )}

      {/* مقدمة وإحصائيات */}
      <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-purple-950/20 border-purple-200/50 dark:border-purple-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">العروض الخاصة</h2>
              <p className="text-sm text-muted-foreground font-normal">
                زيد مبيعاتك بعروض جذابة للكميات المختلفة
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* فوائد العروض الخاصة */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">لماذا العروض الخاصة؟</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>زيادة متوسط قيمة الطلب</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>جذب المزيد من العملاء</span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span>تحسين نسب التحويل</span>
                </li>
              </ul>
            </div>

            {/* نصائح */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                نصائح للنجاح
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• اجعل العرض الأوسط هو الموصى به</li>
                <li>• أضف توصيل مجاني للكميات الكبيرة</li>
                <li>• اجعل الخصم متدرج حسب الكمية</li>
                <li>• استخدم كلمات جذابة مثل "الأفضل" و "شائع"</li>
              </ul>
            </div>

            {/* إحصائيات سريعة */}
            <div className="space-y-3">
              <h3 className="font-semibold">إحصائيات العروض</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{config.offers.length}</div>
                  <div className="text-xs text-muted-foreground">إجمالي العروض</div>
                </div>
                <div className="bg-white dark:bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {config.offers.filter(o => o.discountPercentage > 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">عروض بخصم</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التابات الرئيسية */}
      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            إدارة العروض
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            معاينة للعملاء
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SpecialOffersManager
              config={config}
              basePrice={basePrice}
              productName={productName}
              onChange={handleConfigChange}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {config.enabled && config.offers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-bold">معاينة للعملاء</h3>
                      <p className="text-sm text-muted-foreground font-normal">
                        كيف ستظهر العروض للعملاء في صفحة المنتج
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-muted/20">
                    <SpecialOffersPreview
                      config={config}
                      productName={productName}
                      productImage={productImage}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Eye className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عروض للمعاينة</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    {!config.enabled 
                      ? 'يرجى تفعيل العروض الخاصة أولاً لرؤية المعاينة'
                      : 'أضف بعض العروض لرؤية كيف ستظهر للعملاء'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // التبديل إلى تاب الإدارة
                      const manageTab = document.querySelector('[value="manage"]') as HTMLElement;
                      manageTab?.click();
                    }}
                  >
                    {!config.enabled ? 'تفعيل العروض' : 'إضافة عروض'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ملخص سريع */}
      {config.enabled && config.offers.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg text-white">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">
                    عروضك جاهزة! {hasUnsavedChanges && '⚠️ (غير محفوظة)'}
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {config.offers.length} عروض متاحة - 
                    أعلى خصم {Math.max(...config.offers.map(o => o.discountPercentage))}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-600 dark:text-green-300">
                  أقل سعر: {Math.min(...config.offers.map(o => o.pricePerUnit)).toFixed(0)} {config.currency}/قطعة
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpecialOffersTab; 