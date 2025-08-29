import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BannerImageProps } from './types';
import OptimizedImage from './OptimizedImage';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { usePreloadedFeaturedProducts } from '@/hooks/usePreloadedStoreData';
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
  blurLevel = 'medium'
}) => {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [showNoProducts, setShowNoProducts] = useState(false);
  const { organization, organizationSettings } = useSharedStoreDataContext();
  
  // استخدام البيانات المحفوظة مسبقاً للمنتجات المميزة
  const { 
    featuredProducts: preloadedFeaturedProducts, 
    isLoading: preloadedLoading, 
    refreshData: preloadedRefreshData,
    isFromPreload 
  } = usePreloadedFeaturedProducts();
  
  // fallback إلى البيانات العادية إذا لم تكن البيانات المحفوظة متوفرة
  const { featuredProducts: fallbackFeaturedProducts, isLoading: fallbackLoading, refreshData: fallbackRefreshData } = useSharedStoreDataContext();
  
  // استخدام البيانات المناسبة
  const featuredProducts = preloadedFeaturedProducts?.length > 0 ? preloadedFeaturedProducts : fallbackFeaturedProducts;
  const isLoading = preloadedFeaturedProducts?.length > 0 ? preloadedLoading : fallbackLoading;
  const refreshData = preloadedFeaturedProducts?.length > 0 ? preloadedRefreshData : fallbackRefreshData;
  
  
  // تحسين آلية إعادة التحميل - محاولات متعددة مع تأخير متزايد
  const retryAttempts = useRef(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // إضافة تأخير قبل عرض "لا توجد منتجات" لتجنب العرض المبكر
  const noProductsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // إذا لم تكن البيانات محملة، حاول إعادة التحميل مع تأخير متزايد
    if (!isLoading && (!featuredProducts || featuredProducts.length === 0) && retryAttempts.current < maxRetries) {
      const delay = Math.min(1000 * (retryAttempts.current + 1), 5000); // 1s, 2s, 3s كحد أقصى 5s
      
      retryTimeoutRef.current = setTimeout(() => {
        retryAttempts.current++;
        refreshData();
      }, delay);
      
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
    
    // إعادة تعيين العداد عند نجاح التحميل
    if (featuredProducts && featuredProducts.length > 0) {
      retryAttempts.current = 0;
      setShowNoProducts(false);
    }
  }, [isLoading, featuredProducts?.length, refreshData]);
  
  // تحسين توقيت عرض "لا توجد منتجات" - تأخير 3 ثواني
  useEffect(() => {
    if (!isLoading && hasAttemptedLoad && (!featuredProducts || featuredProducts.length === 0)) {
      // تأخير عرض "لا توجد منتجات" لتجنب العرض المبكر
      noProductsTimeoutRef.current = setTimeout(() => {
        setShowNoProducts(true);
      }, 3000); // 3 ثواني تأخير
      
      return () => {
        if (noProductsTimeoutRef.current) {
          clearTimeout(noProductsTimeoutRef.current);
        }
      };
    } else {
      setShowNoProducts(false);
    }
  }, [isLoading, hasAttemptedLoad, featuredProducts?.length]);
  
  // تتبع محاولات التحميل
  useEffect(() => {
    if (!isLoading) {
      setHasAttemptedLoad(true);
    }
  }, [isLoading]);
  
  // إعادة تعيين hasAttemptedLoad عند إعادة تحميل البيانات بشكل صريح
  useEffect(() => {
    if (isLoading) {
      // لا نعيد تعيين hasAttemptedLoad إلا إذا لم تكن هناك بيانات موجودة
      if (!featuredProducts || featuredProducts.length === 0) {
        setHasAttemptedLoad(false);
        setShowNoProducts(false);
      }
    }
  }, [isLoading, featuredProducts?.length]);
  
  // إضافة مراقبة للتغييرات في البيانات ومراقبة العودة للصفحة
  const dataLoadedRef = useRef(false);
  const lastVisitTime = useRef(Date.now());
  
  useEffect(() => {
    if (featuredProducts && featuredProducts.length > 0 && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      // إعادة تعيين currentSlide إذا كان خارج النطاق
      if (currentSlide >= featuredProducts.length) {
        setCurrentSlide(0);
      }
    }
  }, [featuredProducts?.length, currentSlide]);
  
  // مراقبة العودة للصفحة وإعادة التحميل إذا لزم الأمر
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastVisit = Date.now() - lastVisitTime.current;
        // إذا مر أكثر من دقيقة منذ آخر زيارة ولا توجد منتجات مميزة، أعد التحميل
        if (timeSinceLastVisit > 60000 && (!featuredProducts || featuredProducts.length === 0)) {
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
        if (!featuredProducts || featuredProducts.length === 0) {
          setTimeout(() => refreshData(), 500); // تأخير بسيط للسماح للمكون بالتحديث
        }
      }
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [featuredProducts?.length, refreshData]);

  // تمكين الحركة فقط على الشاشات الكبيرة وبدون "تقليل الحركة"
  const [enableMotion, setEnableMotion] = useState(false);
  useEffect(() => {
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
      const shouldEnable = !prefersReduced && !isSmallScreen;
      setEnableMotion(shouldEnable);
    } catch {
      setEnableMotion(false);
    }
  }, []);

  // التحكم في السلايد شو
  const nextSlide = useCallback(() => {
    if (featuredProducts && featuredProducts.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    }
  }, [featuredProducts?.length]);

  const prevSlide = useCallback(() => {
    if (featuredProducts && featuredProducts.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    }
  }, [featuredProducts?.length]);

  // تشغيل السلايد شو التلقائي - سرعة أبطأ
  useEffect(() => {
    if (!featuredProducts || featuredProducts.length <= 1) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 8000); // تغيير كل 8 ثواني بدلاً من 5

    return () => clearInterval(interval);
  }, [featuredProducts?.length, nextSlide]);

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

  // دالة إعادة التحميل المحسنة
  const handleRefresh = useCallback(() => {
    setShowNoProducts(false);
    setHasAttemptedLoad(false);
    retryAttempts.current = 0;
    refreshData();
  }, [refreshData]);

  return (
    <>
      {enableMotion ? (
        <motion.div
          className={cn(
            "relative",
            isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
          )}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={cn(
            "relative aspect-square mx-auto",
            containerSize === 'small' ? "w-full max-w-sm" : 
            containerSize === 'large' ? "w-full max-w-lg" : 
            "w-full max-w-md"
          )}>
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
                  {organizationSettings?.logo_url ? (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
                        <OptimizedImage
                          src={organizationSettings.logo_url}
                          alt={organization?.name || 'شعار المتجر'}
                          className=""
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
                            {organization?.name || 'متجرنا'}
                          </h3>
                        </div>
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  )}
                </motion.div>
                
                {/* السلايد شو البسيط */}
                {isLoading || !hasAttemptedLoad ? (
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
                ) : featuredProducts && featuredProducts.length > 0 ? (
                  <div className="relative w-full h-full">
                    {/* الصورة الحالية */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg group bg-white" >
                        <OptimizedImage
                          src={featuredProducts[currentSlide]?.thumbnail_url || featuredProducts[currentSlide]?.thumbnail_image}
                          alt={featuredProducts[currentSlide]?.name || 'منتج مميز'}
                          className="group-hover:scale-105 transition-transform duration-500"
                          fit="contain"
                          objectPosition="center"
                          priority={true}
                        />
                        
                        {/* بادج الخصم */}
                        {featuredProducts[currentSlide]?.compare_at_price && 
                         featuredProducts[currentSlide]?.price &&
                         featuredProducts[currentSlide]?.compare_at_price > featuredProducts[currentSlide]?.price && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg">
                              -{Math.round(((featuredProducts[currentSlide].compare_at_price - featuredProducts[currentSlide].price) / featuredProducts[currentSlide].compare_at_price) * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* رابط المنتج */}
                        <Link 
                          to={`/product-purchase-max-v2/${featuredProducts[currentSlide]?.slug || featuredProducts[currentSlide]?.name?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                          className="absolute inset-0 z-10"
                        />
                      </div>
                    </div>
                    
                    {/* أزرار التنقل */}
                    {featuredProducts.length > 1 && (
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
                    {featuredProducts.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                        {featuredProducts.map((_, index) => (
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
                ) : showNoProducts ? (
                  /* حالة عدم وجود منتجات - مع تأخير */
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
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={handleRefresh}
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
                    </div>
                  </motion.div>
                ) : (
                  /* حالة التحميل المستمر - لا تظهر "لا توجد منتجات" بعد */
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        جاري البحث عن المنتجات المميزة...
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        يرجى الانتظار قليلاً
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div
          className={cn(
            "relative",
            isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
          )}
        >
          <div className={cn(
            "relative aspect-square mx-auto",
            containerSize === 'small' ? "w-full max-w-sm" : 
            containerSize === 'large' ? "w-full max-w-lg" : 
            "w-full max-w-md"
          )}>
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/30 group">
              {/* خلفية بسيطة وجميلة - باللون الرئيسي للمتجر */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/10 dark:to-primary/20" />
              
              {/* المحتوى الرئيسي */}
              <div className="relative z-10 w-full h-full">
                
                {/* الشعار في الأعلى على اليمين - محسن */}
                <div className="absolute top-4 right-4 z-30">
                  {organizationSettings?.logo_url ? (
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-full p-3 shadow-2xl border-2 border-white/30 flex items-center justify-center hover:scale-105 transition-transform duration-300">
              <OptimizedImage
                          src={organizationSettings.logo_url}
                          alt={organization?.name || 'شعار المتجر'}
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
                            {organization?.name || 'متجرنا'}
                          </h3>
                        </div>
                      </div>
                      {/* تأثير الوهج حول الدائرة */}
                      <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-lg animate-pulse" />
                    </div>
                  )}
                </div>
                
                {/* السلايد شو البسيط */}
                {isLoading || !hasAttemptedLoad ? (
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
                ) : featuredProducts && featuredProducts.length > 0 ? (
                  <div className="relative w-full h-full">
                    {/* الصورة الحالية */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg group bg-white" >
                        <OptimizedImage
                          src={featuredProducts[currentSlide]?.thumbnail_url || featuredProducts[currentSlide]?.thumbnail_image}
                          alt={featuredProducts[currentSlide]?.name || 'منتج مميز'}
                          className="group-hover:scale-105 transition-transform duration-500"
                          fit="contain"
                          objectPosition="center"
                          priority={true}
                        />
                        
                        {/* بادج الخصم */}
                        {featuredProducts[currentSlide]?.compare_at_price && 
                         featuredProducts[currentSlide]?.price &&
                         featuredProducts[currentSlide]?.compare_at_price > featuredProducts[currentSlide]?.price && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg">
                              -{Math.round(((featuredProducts[currentSlide].compare_at_price - featuredProducts[currentSlide].price) / featuredProducts[currentSlide].compare_at_price) * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* رابط المنتج */}
                        <Link 
                          to={`/product-purchase-max-v2/${featuredProducts[currentSlide]?.slug || featuredProducts[currentSlide]?.name?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                          className="absolute inset-0 z-10"
                        />
                      </div>
                    </div>
                    
                    {/* أزرار التنقل */}
                    {featuredProducts.length > 1 && (
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
                    {featuredProducts.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                        {featuredProducts.map((_, index) => (
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
                ) : showNoProducts ? (
                  /* حالة عدم وجود منتجات - مع تأخير */
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
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={handleRefresh}
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
                    </div>
                  </div>
                ) : (
                  /* حالة التحميل المستمر - لا تظهر "لا توجد منتجات" بعد */
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 max-w-sm">
                      <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-3">
                        جاري البحث عن المنتجات المميزة...
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        يرجى الانتظار قليلاً
                      </p>
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
