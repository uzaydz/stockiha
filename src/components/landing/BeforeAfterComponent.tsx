import React, { useState, useRef, useEffect, useMemo, lazy, Suspense, startTransition } from 'react';
import { useInView } from 'react-intersection-observer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBeforeAfterImages } from '@/hooks/useBeforeAfterImages';
import { flushSync } from 'react-dom';

interface BeforeAfterComponentProps {
  settings: Record<string, any>;
}

/**
 * مكون "قبل وبعد" محسن للصفحات - محدث بتقنيات 2024-2025
 * يستخدم تقنيات تحميل متقدمة لتحسين السرعة وتجربة المستخدم
 * - تحميل كسول للصور خارج نطاق الرؤية مع ViewTransitions API
 * - تحميل تدريجي (صور مصغرة أولاً)
 * - Priority Hints للصور
 * - Content-Visibility و CSS containment
 * - تخزين مؤقت محسّن
 */
const BeforeAfterComponent: React.FC<BeforeAfterComponentProps> = ({ settings }) => {
  const { 
    title, 
    description, 
    items = [], 
    backgroundColor = '#ffffff', 
    textColor = '#333333', 
    layout = 'horizontal',
    showLabels = true,
    slidersCount = 1
  } = settings;

  // استخراج جميع روابط الصور للتحميل المسبق
  const allImageUrls = useMemo(() => {
    const urls: string[] = [];
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        if (item.beforeImage) urls.push(item.beforeImage);
        if (item.afterImage) urls.push(item.afterImage);
      });
    }
    return urls;
  }, [items]);

  // استخدام hook محسن لإدارة الصور
  const { 
    isLoading: imagesLoading, 
    isImageLoaded, 
    hasImageError, 
    getThumbnail,
    getFallbackImage,
    preloadNextImages 
  } = useBeforeAfterImages(allImageUrls);

  // استخدام IntersectionObserver المحسن للتحميل الكسول والعرض الفوري
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.05, // تقليل قيمة العتبة لتسريع الاكتشاف
    rootMargin: '300px 0px', // زيادة هامش التحميل المسبق
  });

  // حالة لمواقع شرائح التمرير
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({});
  const isDragging = useRef<Record<string, boolean>>({});

  // تطبيق View Transitions API لتحسين التجربة البصرية
  const applyViewTransition = (callback: () => void) => {
    if (document.startViewTransition) {
      // إذا كان المتصفح يدعم View Transitions API
      document.startViewTransition(() => {
        flushSync(() => {
          callback();
        });
      });
    } else {
      // إذا لم يكن المتصفح يدعم الـ API
      callback();
    }
  };

  // تهيئة مواقع البداية - بدون أي تأخير
  useEffect(() => {
    if (!inView) return;
    
    // إعداد المواقع الأولية للشرائح
    const initialPositions: Record<string, number> = {};
    items.forEach(item => {
      const id = item.id || String(Math.random());
      initialPositions[id] = 50;
    });
    
    // تطبيق التغييرات باستخدام microtask بدلاً من flushSync مباشرة
    queueMicrotask(() => {
      setSliderPositions(initialPositions);
    });

    // تحميل مسبق للصور التالية أثناء وقت الخمول
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        preloadNextImages(3); // تحميل الـ 3 صور القادمة مسبقًا
      });
    }
  }, [items, inView, preloadNextImages]);

  // التعامل مع بدء السحب
  const handleMouseDown = (itemId: string) => {
    isDragging.current = { ...isDragging.current, [itemId]: true };
    document.addEventListener('mouseup', () => handleMouseUp(itemId), { once: true });
    document.addEventListener('touchend', () => handleMouseUp(itemId), { once: true });
  };

  // التعامل مع نهاية السحب
  const handleMouseUp = (itemId: string) => {
    isDragging.current = { ...isDragging.current, [itemId]: false };
  };

  // التعامل مع حركة الماوس أو اللمس - محسن للأداء
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    if (!isDragging.current[itemId]) return;
    
    e.preventDefault();
    
    const slider = e.currentTarget as HTMLDivElement;
    const rect = slider.getBoundingClientRect();
    
    // الحصول على موضع الماوس أو اللمس
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : (e as React.MouseEvent).clientX;
    
    // حساب النسبة المئوية
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    
    // استخدام startTransition لتحسين استجابة واجهة المستخدم
    startTransition(() => {
      setSliderPositions(prev => ({
        ...prev,
        [itemId]: position
      }));
    });
  };

  // إذا لم توجد عناصر، نعرض رسالة
  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <div className="w-full py-10 text-center text-muted-foreground">
        لا توجد عناصر مقارنة متاحة
      </div>
    );
  }

  // استخدام نمط الـ Skeleton Prioritization للتحميل
  if (!inView) {
    return (
      <div 
        ref={ref}
        className="w-full py-10 px-4 min-h-[300px] content-visibility-auto contain-intrinsic-size-1-1000"
        style={{ backgroundColor, color: textColor }}
      >
        <div className="container mx-auto animate-pulse">
          <Skeleton className="h-8 w-1/3 mx-auto priority-bg" />
        </div>
      </div>
    );
  }

  // العرض المبكر باستخدام الهياكل - مع تأثيرات مرئية متقدمة
  if (imagesLoading) {
    return (
      <div 
        ref={ref}
        className="w-full py-10 px-4 content-visibility-auto"
        style={{ backgroundColor, color: textColor }}
      >
        <div className="container mx-auto animate-in fade-in duration-300">
          {title && <h2 className="text-3xl font-bold text-center mb-4 text-skeleton animate-pulse">{title}</h2>}
          {description && <p className="text-lg text-center mb-10 max-w-2xl mx-auto text-skeleton-light animate-pulse">{description}</p>}
          
          <div className={`grid grid-cols-1 ${
            slidersCount > 1 
              ? `md:grid-cols-${Math.min(slidersCount, 3)}` 
              : 'max-w-3xl mx-auto'
          } gap-6`}>
            {Array.from({ length: Math.min(items.length, 4) }).map((_, i) => (
              <div key={i} className="space-y-4 animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="h-[300px] w-full rounded-xl bg-gray-200/60 animate-pulse overflow-hidden relative">
                  {/* قبل-وبعد هيكلي للتحميل */}
                  <div className="absolute inset-0 w-1/2 bg-gray-300/60"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full" />
                </div>
                <div className="h-4 w-1/2 mx-auto bg-gray-200/60 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className="w-full py-10 px-4 relative animate-in fade-in slide-in-from-bottom-4 duration-300 view-transition-name:before-after-container content-visibility-auto"
      style={{ 
        backgroundColor, 
        color: textColor,
        boxShadow: 'rgba(50, 50, 93, 0.03) 0px 50px 100px -20px, rgba(0, 0, 0, 0.04) 0px 30px 60px -30px',
        willChange: 'transform, opacity',
        contain: 'content'
      }}
    >
      <div className="container mx-auto">
        {title && (
          <h2 
            className="text-3xl font-bold text-center mb-4 view-transition-name:section-title animate-in slide-in-from-bottom-2 duration-500"
            style={{ color: textColor }}
          >
            {title}
          </h2>
        )}
        
        {description && (
          <p 
            className="text-lg text-center mb-10 max-w-2xl mx-auto animate-in slide-in-from-bottom-2 duration-500 delay-100"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {description}
          </p>
        )}

        <div 
          className={`grid grid-cols-1 ${
            slidersCount > 1 
              ? `md:grid-cols-${Math.min(slidersCount, 3)}` 
              : 'max-w-3xl mx-auto'
          } gap-10`}
        >
          {items.map((item, index) => {
            const itemId = item.id || String(index);
            const position = sliderPositions[itemId] || 50;
            
            // معالجة الصور مع الأخطاء
            const beforeImgSrc = hasImageError(item.beforeImage) 
              ? getFallbackImage('before') 
              : item.beforeImage;
              
            const afterImgSrc = hasImageError(item.afterImage) 
              ? getFallbackImage('after') 
              : item.afterImage;
            
            // الحصول على روابط الصور المصغرة للتحميل السريع
            const beforeThumbSrc = getThumbnail(item.beforeImage);
            const afterThumbSrc = getThumbnail(item.afterImage);
            
            // استخدام صور كاملة الدقة عند تحميلها بنجاح
            const useFinalBeforeImg = isImageLoaded(item.beforeImage);
            const useFinalAfterImg = isImageLoaded(item.afterImage);
            
            return (
              <div 
                key={itemId} 
                className="flex flex-col items-center animate-in slide-in-from-bottom duration-300"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  viewTransitionName: `before-after-item-${index}` 
                }}
              >
                {layout === 'horizontal' ? (
                  // تصميم أفقي مع شريط التمرير
                  <div 
                    className="relative rounded-xl overflow-hidden shadow-lg aspect-video w-full will-change-transform"
                    style={{ 
                      height: '300px',
                      containIntrinsicSize: '0 300px',
                      contentVisibility: 'auto'
                    }}
                    onMouseMove={(e) => handleMouseMove(e, itemId)}
                    onTouchMove={(e) => handleMouseMove(e, itemId)}
                    onMouseDown={() => handleMouseDown(itemId)}
                    onTouchStart={() => handleMouseDown(itemId)}
                  >
                    {/* استخدام تقنية ترتيب التحميل للصور */}
                    
                    {/* صورة الخلفية (قبل) - مع تحسين أولويات التحميل */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transform-gpu will-change-transform"
                      style={{ 
                        backgroundImage: `url(${useFinalBeforeImg ? beforeImgSrc : beforeThumbSrc})`,
                        backgroundSize: 'cover',
                        filter: useFinalBeforeImg ? 'none' : 'blur(2px)',
                        transition: 'filter 0.1s ease-out',
                        viewTransitionName: `before-image-${index}`
                      }}
                    />
                    
                    {/* صورة متراكبة (بعد) مع clip-path - تحسينات CSS */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transform-gpu will-change-transform"
                      style={{ 
                        backgroundImage: `url(${useFinalAfterImg ? afterImgSrc : afterThumbSrc})`,
                        backgroundSize: 'cover',
                        clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`,
                        filter: useFinalAfterImg ? 'contrast(1.05)' : 'blur(2px) contrast(1.05)',
                        transition: 'filter 0.1s ease-out, clip-path 0.1s ease-out',
                        viewTransitionName: `after-image-${index}`
                      }}
                    />
                    
                    {/* خط الفصل والمقبض */}
                    <div 
                      className="absolute top-0 bottom-0 cursor-ew-resize z-10 transform-gpu will-change-transform"
                      style={{ 
                        left: `${position}%`,
                        transform: 'translateX(-50%)',
                        width: '40px',
                        touchAction: 'none',
                        viewTransitionName: `slider-${index}`
                      }}
                    >
                      <div 
                        className="absolute top-0 bottom-0 left-1/2 w-1 bg-white shadow-lg transform-gpu"
                        style={{ transform: 'translateX(-50%)' }}
                      />
                      <div 
                        className="absolute top-1/2 left-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transform-gpu"
                        style={{ transform: 'translate(-50%, -50%)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5L3 10L8 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 5L21 10L16 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* التسميات */}
                    {showLabels && (
                      <>
                        <div className="absolute top-5 left-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm animate-in fade-in duration-300">
                          {item.beforeLabel || 'قبل'}
                        </div>
                        <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm animate-in fade-in duration-300 delay-100">
                          {item.afterLabel || 'بعد'}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // تصميم عمودي مع وضع الصور فوق بعضها
                  <div className="w-full">
                    <div className="relative mb-4">
                      <img 
                        src={useFinalBeforeImg ? beforeImgSrc : beforeThumbSrc} 
                        alt={item.beforeLabel || 'قبل'} 
                        className="w-full h-auto rounded-t-xl shadow-md transform-gpu will-change-transform"
                        fetchPriority="high"
                        decoding="async"
                        loading="eager"
                        style={{
                          filter: useFinalBeforeImg ? 'none' : 'blur(2px)',
                          transition: 'filter 0.1s ease-out',
                          viewTransitionName: `before-image-vertical-${index}`
                        }}
                      />
                      {showLabels && (
                        <div className="absolute top-5 left-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm animate-in fade-in">
                          {item.beforeLabel || 'قبل'}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <img 
                        src={useFinalAfterImg ? afterImgSrc : afterThumbSrc}
                        alt={item.afterLabel || 'بعد'} 
                        className="w-full h-auto rounded-b-xl shadow-md transform-gpu will-change-transform"
                        fetchPriority="high"
                        decoding="async"
                        loading="eager"
                        style={{
                          filter: useFinalAfterImg ? 'none' : 'blur(2px)',
                          transition: 'filter 0.1s ease-out',
                          viewTransitionName: `after-image-vertical-${index}`
                        }}
                      />
                      {showLabels && (
                        <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm animate-in fade-in">
                          {item.afterLabel || 'بعد'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {item.title && (
                  <h3 className="text-lg font-medium mt-4 text-center animate-in fade-in">{item.title}</h3>
                )}
                
                {item.description && (
                  <p className="text-sm text-muted-foreground text-center mt-2 animate-in fade-in delay-100">{item.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterComponent; 