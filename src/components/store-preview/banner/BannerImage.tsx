import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BannerImageProps } from './types';
import OptimizedImage from './OptimizedImage';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Star, ArrowRight, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  isPreview = false
}) => {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  // في وضع المعاينة، نستخدم بيانات وهمية بسيطة
  const { organization, organizationSettings, featuredProducts, isLoading, refreshData } = useSharedStoreDataContext();
  
  // استخدام useMemo لتجنب إعادة الحساب مع كل render
  const memoizedData = useMemo(() => {
    if (isPreview) {
      // بيانات وهمية للمعاينة
      return {
        organization: { name: 'متجر المعاينة' },
        organizationSettings: { logo_url: null },
        featuredProducts: [
          {
            name: 'منتج تجريبي 1',
            thumbnail_url: imageUrl || '/images/placeholder-product.jpg',
            thumbnail_image: imageUrl || '/images/placeholder-product.jpg',
            price: 99.99,
            compare_at_price: 149.99,
            slug: 'product-1'
          },
          {
            name: 'منتج تجريبي 2',
            thumbnail_url: imageUrl || '/images/placeholder-product.jpg',
            thumbnail_image: imageUrl || '/images/placeholder-product.jpg',
            price: 79.99,
            compare_at_price: null,
            slug: 'product-2'
          }
        ],
        isLoading: false
      };
    }
    
    return { organization, organizationSettings, featuredProducts, isLoading };
  }, [isPreview, imageUrl, organization, organizationSettings, featuredProducts, isLoading]);
  
  // في وضع المعاينة، نعطل جميع آلية إعادة التحميل والمراقبة لتحسين الأداء
  const retryAttempts = useRef(0);
  const maxRetries = 3;
  
  useEffect(() => {
    if (isPreview) return; // تخطي جميع المنطق في وضع المعاينة
    
    // إذا لم تكن البيانات محملة، حاول إعادة التحميل مع تأخير متزايد
    if (!memoizedData.isLoading && (!memoizedData.featuredProducts || memoizedData.featuredProducts.length === 0) && retryAttempts.current < maxRetries) {
      const delay = Math.min(1000 * (retryAttempts.current + 1), 5000); // 1s, 2s, 3s كحد أقصى 5s
      const timer = setTimeout(() => {
        retryAttempts.current++;
        refreshData();
      }, delay);
      
      return () => clearTimeout(timer);
    }
    
    // إعادة تعيين العداد عند نجاح التحميل
    if (memoizedData.featuredProducts && memoizedData.featuredProducts.length === 0) {
      retryAttempts.current = 0;
    }
  }, [isPreview, memoizedData.isLoading, memoizedData.featuredProducts?.length, refreshData]);
  
  // تتبع محاولات التحميل
  useEffect(() => {
    if (isPreview) return; // تخطي في وضع المعاينة
    
    if (!memoizedData.isLoading) {
      setHasAttemptedLoad(true);
    }
  }, [isPreview, memoizedData.isLoading]);
  
  // إعادة تعيين hasAttemptedLoad عند إعادة تحميل البيانات بشكل صريح
  useEffect(() => {
    if (isPreview) return; // تخطي في وضع المعاينة
    
    if (memoizedData.isLoading) {
      // لا نعيد تعيين hasAttemptedLoad إلا إذا لم تكن هناك بيانات موجودة
      if (!memoizedData.featuredProducts || memoizedData.featuredProducts.length === 0) {
        setHasAttemptedLoad(false);
      }
    }
  }, [isPreview, memoizedData.isLoading, memoizedData.featuredProducts?.length]);
  
  // إضافة مراقبة للتغييرات في البيانات ومراقبة العودة للصفحة
  const dataLoadedRef = useRef(false);
  const lastVisitTime = useRef(Date.now());
  
  useEffect(() => {
    if (isPreview) return; // تخطي في وضع المعاينة
    
    if (memoizedData.featuredProducts && memoizedData.featuredProducts.length > 0 && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      // إعادة تعيين currentSlide إذا كان خارج النطاق
      if (currentSlide >= memoizedData.featuredProducts.length) {
        setCurrentSlide(0);
      }
    }
  }, [isPreview, memoizedData.featuredProducts?.length, currentSlide]);
  
  // مراقبة العودة للصفحة وإعادة التحميل إذا لزم الأمر
  useEffect(() => {
    if (isPreview) return; // تخطي في وضع المعاينة
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastVisit = Date.now() - lastVisitTime.current;
        // إذا مر أكثر من دقيقة منذ آخر زيارة ولا توجد منتجات مميزة، أعد التحميل
        if (timeSinceLastVisit > 60000 && (!memoizedData.featuredProducts || memoizedData.featuredProducts.length === 0)) {
          refreshData();
        }
        lastVisitTime.current = Date.now();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // مراقبة تغيير المسار للعودة إلى الصفحة الرئيسية
    const handleRouteChange = () => {
      if (window.location.pathname === '/' || window.location.pathname.includes('/store')) {
        // إذا كنا في الصفحة الرئيسية أو صفحة المتجر ولا توجد منتجات مميزة
        if (!memoizedData.featuredProducts || memoizedData.featuredProducts.length === 0) {
          setTimeout(() => refreshData(), 500); // تأخير بسيط للسماح للمكون بالتحديث
        }
      }
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [isPreview, memoizedData.featuredProducts?.length, refreshData]);

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
                      {!isPreview && (
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={refreshData}
                            variant="outline"
                            className="text-sm"
                          >
                            <RefreshCw className="h-4 w-4 ml-2" />
                            إعادة تحميل
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                            <ArrowRight className="h-4 w-4 ml-2" />
                            تصفح جميع المنتجات
                          </Button>
                        </div>
                      )}
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
