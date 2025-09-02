import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle } from 'lucide-react';

// استيراد الـ Hook المحسن
import { useOptimizedProductPurchase } from '@/hooks/useOptimizedProductPurchase';

// استيراد المكونات
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import ProductBreadcrumb from '@/components/store/product/ProductBreadcrumb';
import ProductGallery from '@/components/store/product/ProductGallery';
import ProductInfo from '@/components/store/product/ProductInfo';
import ProductOptions from '@/components/store/product/ProductOptions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { sanitizeHTML } from '@/utils/security';

/**
 * مكون محسّن لصفحة شراء المنتج
 * يستخدم RPC موحد واحد بدلاً من 35+ استدعاء منفصل
 */
const OptimizedProductPurchase: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // حالة محلية للمنتج
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedWilaya, setSelectedWilaya] = useState<number | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<'home' | 'desk'>('home');

  // جلب بيانات المنتج المحسنة (5 استدعاءات متوازية بدلاً من 35+)
  const {
    product,
    provinces,
    categories,
    services,
    organization,
    organizationSettings,
    isLoading,
    error,
    isReady
  } = useOptimizedProductPurchase(slug);

  // البيانات جاهزة من الـ Hook

  // تأثير لتعيين اللون الافتراضي
  useEffect(() => {
    if (product?.product_colors && product.product_colors.length > 0 && !selectedColor) {
      setSelectedColor(product.product_colors[0]);
    }
  }, [product?.product_colors, selectedColor]);

  // تأثير لتعيين الحجم الافتراضي
  useEffect(() => {
    if (selectedColor?.product_sizes && selectedColor.product_sizes.length > 0 && !selectedSize) {
      setSelectedSize(selectedColor.product_sizes[0]);
    }
  }, [selectedColor?.product_sizes, selectedSize]);

  // معالجة تغيير الولاية (مبسط)
  const handleWilayaChange = useCallback((wilayaId: number) => {
    setSelectedWilaya(wilayaId);
    setSelectedMunicipality(null);
    // يمكن إضافة جلب البلديات لاحقاً
  }, []);

  // معالجة تغيير البلدية (مبسط)
  const handleMunicipalityChange = useCallback((municipalityId: number) => {
    setSelectedMunicipality(municipalityId);
    // يمكن إضافة حساب الشحن لاحقاً
  }, []);

  // معالجة تغيير نوع التوصيل (مبسط)
  const handleDeliveryTypeChange = useCallback((type: 'home' | 'desk') => {
    setDeliveryType(type);
    // يمكن إضافة إعادة حساب الشحن لاحقاً
  }, []);

  // حساب السعر الفعال
  const effectivePrice = useMemo(() => {
    if (selectedSize?.price) return selectedSize.price;
    if (selectedColor?.price) return selectedColor.price;
    return product?.price || 0;
  }, [selectedSize?.price, selectedColor?.price, product?.price]);

  // حساب المجموع (مبسط بدون حساب الشحن المعقد)
  const subtotal = effectivePrice * quantity;
  const shippingFee = 500; // رسوم شحن ثابتة مؤقتاً
  const total = subtotal + shippingFee;

  // حالات التحميل والأخطاء
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-semibold">{t('common.loading')}</p>
          <p className="text-muted-foreground">{t('productPurchase.loadingProduct')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || t('common.error')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('productPurchase.productNotFound')}</h2>
          <Button onClick={() => navigate('/')}>
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* شريط التنقل */}
      <Navbar />

      {/* المحتوى الرئيسي */}
      <div className="container mx-auto px-4 py-6">
        {/* مسار التنقل */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ProductBreadcrumb
            productName={product.name}
            categoryName={product.category?.name || 'المنتجات'}
            categorySlug={product.category?.slug || 'products'}
          />
        </motion.div>

        {/* محتوى المنتج */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* معرض الصور */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ProductGallery
              mainImage={selectedColor?.image_url || product.thumbnail_image}
              additionalImages={product.additional_images || []}
              productName={product.name}
            />
          </motion.div>

          {/* معلومات المنتج */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* معلومات أساسية */}
            <ProductInfo
              product={product}
              currentPrice={effectivePrice}
            />

            {/* خيارات المنتج */}
            <ProductOptions
              colors={product.product_colors || []}
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
              sizes={selectedColor?.product_sizes || []}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              quantity={quantity}
              onQuantityChange={setQuantity}
              maxQuantity={selectedSize?.stock_quantity || product.stock_quantity || 0}
              useSizes={product.use_sizes}
            />

            {/* اختيار منطقة التوصيل */}
            <div className="bg-card rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">{t('shipping.deliveryArea')}</h3>
              
              {/* اختيار الولاية */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('shipping.province')}
                </label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedWilaya || ''}
                  onChange={(e) => handleWilayaChange(Number(e.target.value))}
                >
                  <option value="">{t('shipping.selectProvince')}</option>
                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* البلدية - سيتم إضافتها لاحقاً */}

              {/* نوع التوصيل */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('shipping.deliveryType')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="home"
                      checked={deliveryType === 'home'}
                      onChange={(e) => handleDeliveryTypeChange(e.target.value as 'home')}
                      className="mr-2"
                    />
                    {t('shipping.homeDelivery')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="desk"
                      checked={deliveryType === 'desk'}
                      onChange={(e) => handleDeliveryTypeChange(e.target.value as 'desk')}
                      className="mr-2"
                    />
                    {t('shipping.deskDelivery')}
                  </label>
                </div>
              </div>
            </div>

            {/* ملخص الطلب */}
            <div className="bg-card rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{t('order.summary')}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('order.subtotal')}</span>
                  <span>{subtotal.toLocaleString()} {t('common.currency')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>{t('order.shipping')}</span>
                  <span>{shippingFee.toLocaleString()} {t('common.currency')}</span>
                </div>
                
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>{t('order.total')}</span>
                  <span>{total.toLocaleString()} {t('common.currency')}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                disabled={!selectedWilaya}
              >
                {t('order.addToCart')}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* وصف المنتج */}
        {product.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4">{t('product.description')}</h2>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
            />
          </motion.div>
        )}
      </div>

      {/* الفوتر */}
      <CustomizableStoreFooter
        storeName={organization?.name || 'متجرنا'}
        logoUrl={organization?.logo_url}
        description={organization?.description}
      />
    </div>
  );
};

export default OptimizedProductPurchase;
