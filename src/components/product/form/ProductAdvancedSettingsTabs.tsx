import React, { lazy, Suspense, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Landmark, 
  ShoppingBag, 
  Users, 
  Palette, 
  Link2, 
  Settings, 
  Clock, 
  Sparkles, 
  Wrench 
} from 'lucide-react';

// Lazy-loaded sub-tab components (keeping imports for potential future use)
const ProductCustomCurrency = lazy(() => import('./advanced-settings/ProductCustomCurrency'));
const ProductPurchaseOptions = lazy(() => import('./advanced-settings/ProductPurchaseOptions'));
const ProductVisitorOptions = lazy(() => import('./advanced-settings/ProductVisitorOptions'));
const ProductCreativeOptions = lazy(() => import('./advanced-settings/ProductCreativeOptions'));
const ProductReferralSettings = lazy(() => import('./advanced-settings/ProductReferralSettings'));

const SubSectionLoader = () => (
  <div className="flex items-center justify-center p-6 min-h-[200px]">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

interface ProductAdvancedSettingsTabsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductAdvancedSettingsTabs: React.FC<ProductAdvancedSettingsTabsProps> = ({
  form,
  organizationId,
  productId,
}) => {
  // Initialize advancedSettings if it doesn't exist
  useEffect(() => {
    const currentAdvancedSettings = form.getValues('advancedSettings');
    if (!currentAdvancedSettings) {
      form.setValue('advancedSettings', {
        use_custom_currency: false,
        custom_currency_code: null,
        skip_cart: true,
        enable_stock_notification: false,
        show_fake_visitor_counter: false,
        min_fake_visitors: 5,
        max_fake_visitors: 25,
        enable_fake_low_stock: false,
        min_fake_stock_threshold: 1,
        max_fake_stock_threshold: 5,
        show_stock_countdown: false,
        stock_countdown_duration_hours: 24,
        reset_stock_countdown_on_zero: false,
        prevent_exit_popup: false,
        show_popularity_badge: false,
        popularity_badge_text: null,
        enable_gift_wrapping: false,
        enable_referral_program: false,
        referral_commission_type: null,
        referral_commission_value: null,
        referral_cookie_duration_days: null,
        enable_buyer_discount: false, 
        buyer_discount_percentage: 5,
      });
    }
  }, [form]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-6 w-6" />
          إعدادات متقدمة
        </CardTitle>
        <CardDescription>
          إعدادات متقدمة وخيارات إضافية لتخصيص تجربة المنتج بشكل أكثر تفصيلاً.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* رسالة قريبا سيتم الإطلاق */}
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center mb-4 mx-auto border-2 border-blue-200 dark:border-blue-700">
              <div className="relative">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-blue-300/20 rounded-full animate-ping opacity-75" />
          </div>
          
          <h3 className="text-2xl font-bold text-foreground mb-3">
            قريباً سيتم إطلاق هذا القسم
          </h3>
          
          <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
            نحن نعمل على تطوير مجموعة شاملة من الإعدادات المتقدمة لتمنحك مرونة أكبر في تخصيص منتجاتك.
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700/50 max-w-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              ما يمكنك توقعه:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2 text-right">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                عملات مخصصة لمنتجاتك
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                خيارات شراء متقدمة ومرنة
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                أدوات تفاعل الزوار والعملاء
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                خيارات إبداعية لتحسين التجربة
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                نظام إحالة متطور ومجزي
              </li>
            </ul>
          </div>
        </div>

        {/* المحتوى الأصلي مخفي */}
        {false && (
          <Tabs defaultValue="custom_currency" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-1 bg-muted/50 p-1 rounded-md mb-4 flex-wrap">
              <TabsTrigger value="custom_currency" className="text-xs px-2 py-1.5 flex-grow min-w-0">
                <Landmark className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">عملة مخصصة</span>
                <span className="sm:hidden truncate">العملة</span>
              </TabsTrigger>
              <TabsTrigger value="purchase_options" className="text-xs px-2 py-1.5 flex-grow min-w-0">
                <ShoppingBag className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">خيارات الشراء</span>
                <span className="sm:hidden truncate">الشراء</span>
              </TabsTrigger>
              <TabsTrigger value="visitor_options" className="text-xs px-2 py-1.5 flex-grow min-w-0">
                <Users className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">خيارات الزوار</span>
                <span className="sm:hidden truncate">الزوار</span>
              </TabsTrigger>
              <TabsTrigger value="creative_options" className="text-xs px-2 py-1.5 flex-grow min-w-0">
                <Palette className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">خيارات إبداعية</span>
                <span className="sm:hidden truncate">إبداعية</span>
              </TabsTrigger>
              <TabsTrigger value="referral_options" className="text-xs px-2 py-1.5 flex-grow min-w-0">
                <Link2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline truncate">الإحالة</span>
                <span className="sm:hidden truncate">الإحالة</span>
              </TabsTrigger>
            </TabsList>

            <Suspense fallback={<SubSectionLoader />}>
              <TabsContent value="custom_currency">
                <ProductCustomCurrency form={form} organizationId={organizationId} productId={productId} />
              </TabsContent>
              <TabsContent value="purchase_options">
                <ProductPurchaseOptions form={form} organizationId={organizationId} productId={productId} />
              </TabsContent>
              <TabsContent value="visitor_options">
                <ProductVisitorOptions form={form} organizationId={organizationId} productId={productId} />
              </TabsContent>
              <TabsContent value="creative_options">
                <ProductCreativeOptions form={form} organizationId={organizationId} productId={productId} />
              </TabsContent>
              <TabsContent value="referral_options">
                <ProductReferralSettings form={form} organizationId={organizationId} productId={productId} />
              </TabsContent>
            </Suspense>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductAdvancedSettingsTabs; 