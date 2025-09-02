import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BannerImageProps } from './types';
import OptimizedImage from './OptimizedImage';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Star, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase-unified';

/**
 * مكون صورة البانر المحسن مع سلايد شو بسيط وجميل
 */
const BannerImage = React.memo<BannerImageProps>(({
  imageUrl,
  title,
  isRTL = false,
  onImageLoad,
  fit = 'contain',
  objectPosition = 'top',
  containerSize = 'medium',
  blurLevel = 'medium',
  isPreview = false,
  // خصائص المنتجات
  selectedProducts,
  showProducts = false,
  productsDisplay = 'grid',
  productsLimit = 4,
  productsType = 'featured', // نوع المنتجات الافتراضي
  organizationId
}) => {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  // جلب المنتجات حسب النوع المحدد
  const [dynamicProductsData, setDynamicProductsData] = useState<any[]>([]);
  const [loadingDynamicProducts, setLoadingDynamicProducts] = useState(false);

  // جلب المنتجات عند تغيير النوع أو المؤسسة
  useEffect(() => {
    const fetchProducts = async () => {

      if (!isPreview || !showProducts || !organizationId) {
        setDynamicProductsData([]);
        return;
      }

      setLoadingDynamicProducts(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, description, price, images, thumbnail_image, is_featured, is_new, category, sku, stock_quantity, slug, created_at, updated_at')
          .eq('is_active', true)
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false });

        switch (productsType) {
          case 'featured':
            query = query.eq('is_featured', true);
            break;
          case 'selected':
            if (selectedProducts && selectedProducts.length > 0) {
              query = query.in('id', selectedProducts);
            } else {
              setDynamicProductsData([]);
              return;
            }
            break;
          case 'latest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'new':
            query = query.eq('is_new', true);
            break;
          default:
            query = query.eq('is_featured', true);
        }

        if (productsLimit && productsLimit > 0) {
          query = query.limit(productsLimit);
        }

        const { data, error } = await query;

        if (error) {
          setDynamicProductsData([]);
        } else {
          setDynamicProductsData(data || []);
        }
      } catch (error) {
        setDynamicProductsData([]);
      } finally {
        setLoadingDynamicProducts(false);
      }
    };

    // استخدام timeout قصير لتجنب الجلب المتكرر
    const timeoutId = setTimeout(fetchProducts, 100);
    return () => clearTimeout(timeoutId);
  }, [isPreview, showProducts, productsType, organizationId, selectedProducts, productsLimit]);

  // استخدام useMemo لتجنب إعادة الحساب مع كل render
  const memoizedData = useMemo(() => {

    if (isPreview) {
      // في وضع المعاينة، استخدم المنتجات المناسبة حسب النوع
      let displayProducts = [];

      if (showProducts && dynamicProductsData.length > 0) {
        // استخدم المنتجات المجلبة ديناميكياً
        displayProducts = dynamicProductsData;
      } else if (showProducts && productsType === 'selected' && (!selectedProducts || selectedProducts.length === 0)) {
        // بيانات وهمية للمنتجات المختارة عندما لا توجد منتجات محددة
        displayProducts = [
          {
            id: 'preview-1',
            name: 'منتج تجريبي 1',
            thumbnail_url: imageUrl || '/images/placeholder-product.jpg',
            thumbnail_image: imageUrl || '/images/placeholder-product.jpg',
            price: 99.99,
            compare_at_price: 149.99,
            slug: 'product-1',
            is_featured: true
          },
          {
            id: 'preview-2',
            name: 'منتج تجريبي 2',
            thumbnail_url: imageUrl || '/images/placeholder-product.jpg',
            thumbnail_image: imageUrl || '/images/placeholder-product.jpg',
            price: 79.99,
            compare_at_price: null,
            slug: 'product-2',
            is_featured: true
          }
        ];
      } else if (showProducts) {
        // بيانات وهمية عامة للأنواع الأخرى
        displayProducts = [
          {
            id: 'preview-1',
            name: 'منتج تجريبي 1',
            thumbnail_url: imageUrl || '/images/placeholder-product.jpg',
            thumbnail_image: imageUrl || '/images/placeholder-product.jpg',
            price: 99.99,
            compare_at_price: 149.99,
            slug: 'product-1',
            is_featured: productsType === 'featured',
            is_new: productsType === 'new'
          }
        ];
      }

      return {
        organization: { name: 'متجر المعاينة' },
        organizationSettings: { logo_url: null },
        featuredProducts: displayProducts,
        isLoading: loadingDynamicProducts,
        showProducts,
        productsDisplay,
        productsLimit,
        productsType
      };
    }

    return {
      organization: { name: 'المتجر' },
      organizationSettings: { logo_url: null },
      featuredProducts: [],
      isLoading: false,
      showProducts: false,
      productsDisplay: 'grid',
      productsLimit: 4,
      productsType: 'featured'
    };
  }, [
    isPreview,
    imageUrl,
    dynamicProductsData,
    loadingDynamicProducts,
    showProducts,
    productsDisplay,
    productsLimit,
    productsType,
    selectedProducts
  ]);
  
  // تتبع محاولات التحميل
  useEffect(() => {
    if (!memoizedData.isLoading) {
      setHasAttemptedLoad(true);
    }
  }, [memoizedData.isLoading]);
  
  // إدارة currentSlide
  useEffect(() => {
    const featuredProducts = memoizedData.featuredProducts || [];
    if (featuredProducts.length > 0 && currentSlide >= featuredProducts.length) {
      setCurrentSlide(0);
    }
  }, [memoizedData.featuredProducts?.length, currentSlide]);

  // تمكين الحركة فقط على الشاشات الكبيرة وبدون "تقليل الحركة"
  // في وضع المعاينة، نعطل الحركة لتحسين الأداء
  const [enableMotion, setEnableMotion] = useState(false);
  useEffect(() => {
    if (isPreview) {
      setEnableMotion(false);
      return;
    }
    
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
      const shouldEnable = !prefersReduced && !isSmallScreen;
      setEnableMotion(shouldEnable);
    } catch {
      setEnableMotion(false);
    }
  }, [isPreview]);

  // التحكم في السلايد شو
  const nextSlide = useCallback(() => {
    if (memoizedData.featuredProducts && memoizedData.featuredProducts.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % memoizedData.featuredProducts.length);
    }
  }, [memoizedData.featuredProducts?.length]);

  const prevSlide = useCallback(() => {
    if (memoizedData.featuredProducts && memoizedData.featuredProducts.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + memoizedData.featuredProducts.length) % memoizedData.featuredProducts.length);
    }
  }, [memoizedData.featuredProducts?.length]);

  // تشغيل السلايد شو التلقائي - سرعة أبطأ
  // في وضع المعاينة، نعطل السلايد شو التلقائي
  useEffect(() => {
    if (isPreview || !memoizedData.featuredProducts || memoizedData.featuredProducts.length <= 1) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 8000); // تغيير كل 8 ثواني بدلاً من 5

    return () => clearInterval(interval);
  }, [isPreview, memoizedData.featuredProducts?.length, nextSlide]);

  // استخدام useMemo للأنماط لتجنب إعادة الحساب
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: 'easeOut' as const } }
  }), []);

  const logoVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.9, y: -20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
  }), []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  // استخدام useMemo لحساب الأنماط
  const containerClasses = useMemo(() => cn(
    "relative",
    isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
  ), [isRTL]);

  const imageContainerClasses = useMemo(() => cn(
    "relative aspect-square mx-auto",
    containerSize === 'small' ? "w-full max-w-sm" : 
    containerSize === 'large' ? "w-full max-w-lg" : 
    "w-full max-w-md"
  ), [containerSize]);

  return (
    <>
      {enableMotion ? (
        <motion.div
          className={containerClasses}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={imageContainerClasses}>
            {/* الحاوية الرئيسية */}
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/30 group">
              
              {/* خلفية بسيطة وجميلة - باللون الرئيسي للمتجر */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/10 dark:to-primary/20" />
              
              {/* المحتوى الرئيسي */}
              <div className="relative z-10 w-full h-full">
                
                {/* الشعار في الأعلى على اليمين - محسن */}
                <motion.div 
                  className="absolute top-4 right-4 z-30"
                  variants={logoVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  {memoizedData.organizationSettings?.logo_url ? (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        <OptimizedImage
                          src={memoizedData.organizationSettings.logo_url}
                          alt={memoizedData.organization?.name || 'شعار المتجر'}
                          className="w-14 h-14 object-contain"
                          fit="contain"
                          objectPosition="center"
                          onLoad={handleImageLoad}
                        />
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-foreground">
                            {memoizedData.organization?.name || 'متجرنا'}
                          </h3>
                        </div>
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  )}
                </motion.div>
                
                {/* السلايد شو البسيط */}
                {memoizedData.isLoading || !hasAttemptedLoad ? (
                  /* حالة التحميل */
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        جاري تحميل المنتجات المميزة...
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        يرجى الانتظار قليلاً
                      </p>
                    </div>
                  </div>
                ) : memoizedData.featuredProducts && memoizedData.featuredProducts.length > 0 ? (
                  <div className="relative w-full h-full">
                    {/* الصورة الحالية */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg group bg-white">
                        <OptimizedImage
                          src={memoizedData.featuredProducts[currentSlide]?.thumbnail_url || memoizedData.featuredProducts[currentSlide]?.thumbnail_image}
                          alt={memoizedData.featuredProducts[currentSlide]?.name || 'منتج مميز'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          fit="contain"
                          objectPosition="center"
                          priority={true}
                        />
                        
                        {/* بادج الخصم */}
                        {memoizedData.featuredProducts[currentSlide]?.compare_at_price && 
                         memoizedData.featuredProducts[currentSlide]?.price &&
                         memoizedData.featuredProducts[currentSlide]?.compare_at_price > memoizedData.featuredProducts[currentSlide]?.price && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg">
                              -{Math.round(((memoizedData.featuredProducts[currentSlide].compare_at_price - memoizedData.featuredProducts[currentSlide].price) / memoizedData.featuredProducts[currentSlide].compare_at_price) * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* رابط المنتج - في وضع المعاينة لا نضيف رابط */}
                        {!isPreview && (
                          <Link 
                            to={`/product-purchase-max-v2/${memoizedData.featuredProducts[currentSlide]?.slug || memoizedData.featuredProducts[currentSlide]?.name?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                            className="absolute inset-0 z-10"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* أزرار التنقل */}
                    {memoizedData.featuredProducts.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={prevSlide}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/50 z-20 h-10 w-10 text-gray-700 hover:text-gray-900"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={nextSlide}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/50 z-20 h-10 w-10 text-gray-700 hover:text-gray-900"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* مؤشرات السلايد */}
                    {memoizedData.featuredProducts.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                        {memoizedData.featuredProducts.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              index === currentSlide 
                                ? "bg-primary shadow-lg" 
                                : "bg-white/60 hover:bg-white/80"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* حالة عدم وجود منتجات */
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center p-8"
                    variants={logoVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        لا توجد منتجات مميزة حالياً
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        سنضيف منتجات مميزة قريباً
                      </p>
                      {!isPreview && (
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                          <ArrowRight className="h-4 w-4 ml-2" />
                          تصفح جميع المنتجات
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className={containerClasses}>
          <div className={imageContainerClasses}>
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/30 group">
              {/* خلفية بسيطة وجميلة - باللون الرئيسي للمتجر */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/10 dark:to-primary/20" />
              
              {/* المحتوى الرئيسي */}
              <div className="relative z-10 w-full h-full">
                
                {/* الشعار في الأعلى على اليمين - محسن */}
                <div className="absolute top-4 right-4 z-30">
                  {memoizedData.organizationSettings?.logo_url ? (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        <OptimizedImage
                          src={memoizedData.organizationSettings.logo_url}
                          alt={memoizedData.organization?.name || 'شعار المتجر'}
                          className="w-14 h-14 object-contain"
                          fit="contain"
                          objectPosition="center"
                          onLoad={handleImageLoad}
                        />
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-foreground">
                            {memoizedData.organization?.name || 'متجرنا'}
                          </h3>
                        </div>
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  )}
                </div>
                
                {/* السلايد شو البسيط */}
                {memoizedData.isLoading || !hasAttemptedLoad ? (
                  /* حالة التحميل */
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        جاري تحميل المنتجات المميزة...
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        يرجى الانتظار قليلاً
                      </p>
                    </div>
                  </div>
                ) : memoizedData.featuredProducts && memoizedData.featuredProducts.length > 0 ? (
                  <div className="relative w-full h-full">
                    {/* الصورة الحالية */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg group bg-white">
                        <OptimizedImage
                          src={memoizedData.featuredProducts[currentSlide]?.thumbnail_url || memoizedData.featuredProducts[currentSlide]?.thumbnail_image}
                          alt={memoizedData.featuredProducts[currentSlide]?.name || 'منتج مميز'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          fit="contain"
                          objectPosition="center"
                          priority={true}
                        />
                        
                        {/* بادج الخصم */}
                        {memoizedData.featuredProducts[currentSlide]?.compare_at_price && 
                         memoizedData.featuredProducts[currentSlide]?.price &&
                         memoizedData.featuredProducts[currentSlide]?.compare_at_price > memoizedData.featuredProducts[currentSlide]?.price && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg">
                              -{Math.round(((memoizedData.featuredProducts[currentSlide].compare_at_price - memoizedData.featuredProducts[currentSlide].price) / memoizedData.featuredProducts[currentSlide].compare_at_price) * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* رابط المنتج - في وضع المعاينة لا نضيف رابط */}
                        {!isPreview && (
                          <Link 
                            to={`/product-purchase-max-v2/${memoizedData.featuredProducts[currentSlide]?.slug || memoizedData.featuredProducts[currentSlide]?.name?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                            className="absolute inset-0 z-10"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* أزرار التنقل */}
                    {memoizedData.featuredProducts.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={prevSlide}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/50 z-20 h-10 w-10 text-gray-700 hover:text-gray-900"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={nextSlide}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/50 z-20 h-10 w-10 text-gray-700 hover:text-gray-900"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {/* مؤشرات السلايد */}
                    {memoizedData.featuredProducts.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                        {memoizedData.featuredProducts.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              index === currentSlide 
                                ? "bg-primary shadow-lg" 
                                : "bg-white/60 hover:bg-white/80"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* حالة عدم وجود منتجات */
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        لا توجد منتجات مميزة حالياً
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        سنضيف منتجات مميزة قريباً
                      </p>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                        <ArrowRight className="h-4 w-4 ml-2" />
                        تصفح جميع المنتجات
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

BannerImage.displayName = 'BannerImage';

export default BannerImage;
