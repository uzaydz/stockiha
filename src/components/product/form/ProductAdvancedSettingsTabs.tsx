import React, { lazy, Suspense, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Landmark, ShoppingBag, Users, Palette, Link2 } from 'lucide-react'; // Removed LayoutPanelLeft

// Lazy-loaded sub-tab components
const ProductCustomCurrency = lazy(() => import('./advanced-settings/ProductCustomCurrency'));
const ProductPurchaseOptions = lazy(() => import('./advanced-settings/ProductPurchaseOptions'));
const ProductVisitorOptions = lazy(() => import('./advanced-settings/ProductVisitorOptions'));
const ProductCreativeOptions = lazy(() => import('./advanced-settings/ProductCreativeOptions'));
const ProductReferralSettings = lazy(() => import('./advanced-settings/ProductReferralSettings'));
// ProductLandingPage import is already removed

const SubSectionLoader = () => (
  <div className="flex items-center justify-center p-6 min-h-[200px]">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

interface ProductAdvancedSettingsTabsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
  // Add any other necessary props
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
        // Updated default values based on the current productAdvancedSettingsSchema
        use_custom_currency: false,
        custom_currency_code: null,
        skip_cart: true, // Default was updated in schema
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
    <Tabs defaultValue="custom_currency" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-1 bg-muted/50 p-1 rounded-md mb-4 flex-wrap">
        {/* Adjusted xl:grid-cols-6 to xl:grid-cols-5 */}
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
        {/* Removed TabsTrigger for landing_page */}
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
        {/* Removed TabsContent for landing_page */}
        <TabsContent value="creative_options">
          <ProductCreativeOptions form={form} organizationId={organizationId} productId={productId} />
        </TabsContent>
        <TabsContent value="referral_options">
          <ProductReferralSettings form={form} organizationId={organizationId} productId={productId} />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
};

export default ProductAdvancedSettingsTabs; 