import React, { useState, useEffect, useRef } from 'react';
import { AdvancedDescriptionComponent } from '@/types/advanced-description';
import { cn } from '@/lib/utils';
import { ImageIcon, DollarSign, Hash, ShoppingCart } from 'lucide-react';
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import { Button } from '@/components/ui/button';
import { useAdvancedDescriptionContext } from '../context/AdvancedDescriptionContext';

interface PureComponentRendererProps {
  component: AdvancedDescriptionComponent;
  className?: string;
  product?: any; // For gallery component
}

export const PureComponentRenderer: React.FC<PureComponentRendererProps> = ({
  component,
  className,
  product
}) => {
  switch (component.type) {
    case 'image':
      return <PureImageComponent component={component} className={className} />;
    
    case 'slideshow':
      return <PureSlideshowComponent component={component} className={className} />;
    
    case 'reviews':
      return <PureReviewsComponent component={component} className={className} />;
    
    case 'text':
      return <PureTextComponent component={component} className={className} />;
    
    case 'features':
      return <PureFeaturesComponent component={component} className={className} />;
    
    case 'specifications':
      return <PureSpecificationsComponent component={component} className={className} />;
    
    case 'gif':
      return <PureGifComponent component={component} className={className} />;
    
    case 'video':
      return <PureVideoComponent component={component} className={className} />;
    
    case 'before-after':
      return <PureBeforeAfterComponent component={component} className={className} />;
    
    case 'gallery':
      return <PureGalleryComponent component={component} className={className} product={product} />;
    case 'price':
      return <PurePriceComponent component={component} className={className} product={product} />;
    case 'quantity':
      return <PureQuantityComponent component={component} className={className} product={product} />;
    case 'buy-now':
      return <PureBuyNowComponent component={component} className={className} product={product} />;
    
    default:
      return null;
  }
};

// Pure Image Component
const PureImageComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!data.url) return null;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // إعادة تعيين الحالة عند تغيير URL
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [data.url]);

  // دالة لحساب عرض الصورة حسب الاستجابة
  const getResponsiveWidth = () => {
    const breakpoints = settings?.responsiveBreakpoints || { mobile: 100, tablet: 80, desktop: 60 };
    // نستخدم قيمة الحاسوب كافتراضية
    return breakpoints.desktop;
  };

  // دالة لحساب classes للاستجابة
  const getResponsiveClasses = () => {
    const breakpoints = settings?.responsiveBreakpoints || { mobile: 100, tablet: 80, desktop: 60 };
    
    return cn(
      // تطبيق classes حسب الاستجابة
      breakpoints.mobile === 100 && "w-full",
      breakpoints.tablet === 100 && "md:w-full",
      breakpoints.desktop === 100 && "lg:w-full",
      // تطبيق النسب المئوية
      breakpoints.mobile < 100 && `w-[${breakpoints.mobile}%]`,
      breakpoints.tablet < 100 && `md:w-[${breakpoints.tablet}%]`,
      breakpoints.desktop < 100 && `lg:w-[${breakpoints.desktop}%]`
    );
  };

  // دالة لحساب أنماط CSS حسب إعدادات الحجم
  const getImageStyles = () => {
    const styles: React.CSSProperties = {
      borderRadius: `${data.borderRadius || 8}px`,
      objectFit: data.fitMode || 'contain',
      objectPosition: data.objectPosition || 'center',
    };

    // تطبيق نسبة الأبعاد
    if (data.aspectRatio && data.aspectRatio !== 'auto') {
      styles.aspectRatio = data.aspectRatio;
    }

    // تطبيق أنماط الحجم المختلفة
    switch (data.sizeMode || 'responsive') {
      case 'full-width':
        styles.width = '100%';
        styles.height = 'auto';
        break;
      case 'contain':
        styles.maxWidth = '100%';
        styles.height = 'auto';
        break;
      case 'cover':
        styles.width = '100%';
        styles.height = '300px'; // ارتفاع ثابت للتغطية
        break;
      case 'custom':
        if (data.maxWidth) {
          styles.maxWidth = `${data.maxWidth}px`;
        }
        if (data.maxHeight) {
          styles.maxHeight = `${data.maxHeight}px`;
        }
        break;
      case 'responsive':
      default:
        const responsiveWidth = getResponsiveWidth();
        styles.maxWidth = `${responsiveWidth}%`;
        styles.height = 'auto';
        break;
    }

    // تطبيق الحدود إذا كانت موجودة
    if (data.borderRadius && data.borderRadius > 0) {
      styles.borderRadius = `${data.borderRadius}px`;
    }

    return styles;
  };

  // دالة لحساب classes حسب إعدادات الحجم
  const getImageClasses = () => {
    return cn(
      "transition-all duration-300",
      data.shadow && "shadow-lg hover:shadow-xl",
      settings?.enableLightbox && "cursor-zoom-in hover:scale-[1.02]",
      // تطبيق classes حسب وضع الحجم
      (data.sizeMode || 'responsive') === 'full-width' && "w-full",
      (data.sizeMode || 'responsive') === 'contain' && "max-w-full h-auto",
      (data.sizeMode || 'responsive') === 'cover' && "w-full h-48",
      (data.sizeMode || 'responsive') === 'custom' && "max-w-full h-auto",
      (data.sizeMode || 'responsive') === 'responsive' && getResponsiveClasses(),
      // إضافة hover effects
      settings?.enableLightbox && "hover:brightness-105",
      // إضافة focus states
      settings?.enableLightbox && "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
    );
  };

  // دالة لحساب classes للحاوية
  const getContainerClasses = () => {
    return cn(
      "relative overflow-hidden",
      data.shadow && "shadow-lg",
      data.shadow && settings?.enableLightbox && "hover:shadow-xl"
    );
  };

  return (
    <>
      <div className={cn(
        "flex justify-center", 
        data.alignment === 'left' && "justify-start",
        data.alignment === 'center' && "justify-center",
        data.alignment === 'right' && "justify-end",
        className
      )}>
        <div 
          className={getContainerClasses()}
          style={{
            textAlign: data.alignment || 'center',
            borderRadius: `${data.borderRadius || 8}px`
          }}
        >
          {/* Error State فقط */}
          {imageError && (
            <div className="flex flex-col items-center justify-center h-48 bg-muted/30 rounded-lg border-2 border-dashed border-border">
              <div className="w-8 h-8 text-muted-foreground mb-2">❌</div>
              <p className="text-sm text-muted-foreground text-center">
                خطأ في تحميل الصورة
              </p>
            </div>
          )}

          {/* Image - عرض مباشر */}
          <img
            src={data.url}
            alt={data.alt || data.caption || 'صورة المنتج'}
            loading={settings?.lazyLoad ? 'lazy' : 'eager'}
            className={cn(
              getImageClasses(),
              "opacity-100" // عرض مباشر
            )}
            style={getImageStyles()}
            onClick={() => settings?.enableLightbox && setShowLightbox(true)}
            onLoad={handleImageLoad}
            onError={handleImageError}
            role="img"
            aria-label={data.alt || data.caption || 'صورة المنتج'}
            tabIndex={settings?.enableLightbox ? 0 : undefined}
            onKeyDown={(e) => {
              if (settings?.enableLightbox && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setShowLightbox(true);
              }
            }}
            decoding="async"
            fetchPriority={settings?.lazyLoad ? "low" : "high"}
            title={data.caption || data.alt || 'صورة المنتج'}
          />
          {settings?.showCaption && data.caption && (
            <div className={cn(
              "mt-2 text-sm text-muted-foreground",
              data.alignment === 'left' && "text-left",
              data.alignment === 'center' && "text-center",
              data.alignment === 'right' && "text-right"
            )}>
              {data.caption}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && settings?.enableLightbox && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={data.url}
              alt={data.alt || data.caption || ''}
              className={cn(
                "max-w-full max-h-full object-contain rounded-lg",
                settings?.lightboxZoom && "cursor-zoom-in"
              )}
              style={{
                objectFit: data.fitMode || 'contain',
                objectPosition: data.objectPosition || 'center',
                borderRadius: data.borderRadius ? `${data.borderRadius}px` : '0.5rem',
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setShowLightbox(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

// Pure Slideshow Component
const PureSlideshowComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  
  if (!data.images || data.images.length === 0) return null;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (data.autoPlay && data.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % data.images.length);
      }, data.autoPlayInterval || 5000);
      return () => clearInterval(interval);
    }
  }, [data.autoPlay, data.autoPlayInterval, data.images.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % data.images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + data.images.length) % data.images.length);
  };

  return (
    <div className={cn("slideshow-container relative", className)}>
      <div 
        className="relative overflow-hidden rounded-lg"
        style={{ height: settings?.height || 400 }}
      >
        {/* Slides */}
        <div className="relative w-full h-full">
          {data.images.map((image: any, index: number) => (
            <div
              key={index}
              className={cn(
                "absolute inset-0 transition-all duration-500",
                index === currentSlide ? "opacity-100" : "opacity-0"
              )}
            >
              <img
                src={image.url}
                alt={image.alt || image.caption || `صورة ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4">
                  <p className="text-sm">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {data.showArrows && data.images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              ←
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              →
            </button>
          </>
        )}

        {/* Dots */}
        {data.showDots && data.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {data.images.map((_: any, index: number) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  index === currentSlide ? "bg-white" : "bg-white/50 hover:bg-white/75"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Pure Text Component
const PureTextComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data } = component;
  
  if (!data.content) return null;

  const Tag = data.style?.tag || 'p';
  
  return (
    <div className={cn("text-component", className)}>
      <Tag 
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          data.style?.textAlign && `text-${data.style.textAlign}`,
          data.style?.fontSize && `text-${data.style.fontSize}`,
          data.style?.fontWeight && `font-${data.style.fontWeight}`,
          data.style?.textColor && `text-${data.style.textColor}`
        )}
        style={{
          textAlign: data.style?.textAlign || 'right',
          fontSize: data.style?.fontSize,
          fontWeight: data.style?.fontWeight,
          color: data.style?.textColor
        }}
      >
        {data.content}
      </Tag>
    </div>
  );
};

// Pure Features Component
const PureFeaturesComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  
  if (!data.features || data.features.length === 0) return null;

  return (
    <div className={cn(
      "overflow-hidden transition-all duration-300",
      "border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg",
      className
    )}>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-center mb-4">{data.title}</h3>
        <div className={cn(
          "gap-4",
          settings?.layout === 'grid' && `grid grid-cols-1 md:grid-cols-${settings?.columns || 2}`,
          settings?.layout === 'list' && "space-y-3"
        )}>
          {data.features.map((feature: any, index: number) => (
              <div key={feature.id || index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                {settings?.showIcons && (
                  <div className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0">
                    {feature.icon ? (
                      <span className="text-lg">{feature.icon}</span>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Pure Specifications Component
const PureSpecificationsComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  
  // التحقق من وجود المواصفات
  const hasSpecifications = (data?.specifications && data.specifications.length > 0) || 
                           (data?.categories && data.categories.length > 0);
  
  if (!hasSpecifications) {
    return (
      <div className={cn(
        'relative overflow-hidden transition-all duration-500 group',
        'bg-gradient-to-br from-background via-background/80 to-muted/20',
        'border border-border/40 rounded-xl shadow-sm hover:shadow-lg',
        'backdrop-blur-sm',
        className
      )}>
        {/* خلفية تدرجية خفيفة */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative p-8 text-center">
          {data?.title && (
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {data.title}
            </h3>
          )}
          <div className="text-muted-foreground space-y-4">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300" />
              <div className="relative w-full h-full bg-gradient-to-br from-background to-muted/50 rounded-2xl flex items-center justify-center text-2xl">
                📋
              </div>
            </div>
            <p className="text-sm font-medium">لا توجد مواصفات مضافة بعد</p>
            <p className="text-xs opacity-60">أضف المواصفات لعرضها هنا</p>
          </div>
        </div>
      </div>
    );
  }

  // تحديد نوع التخطيط
  const layoutType = data?.layoutType || 'simple';
  
  // تجميع المواصفات حسب نوع التخطيط
  let displayData: any = {};
  
  if (layoutType === 'categorized' && data?.categories && data.categories.length > 0) {
    // استخدام الفئات المحددة
    displayData = data.categories.reduce((acc: Record<string, any[]>, category: any) => {
      if (category.specifications && category.specifications.length > 0) {
        acc[category.name] = category.specifications.map((spec: any) => ({
          id: spec.id || Math.random().toString(),
          name: spec.name,
          value: spec.value,
          unit: spec.unit,
          description: spec.description
        }));
      }
      return acc;
    }, {});
  } else if (data?.specifications && data.specifications.length > 0) {
    // استخدام المواصفات البسيطة
    if (settings?.showCategories) {
      // تجميع حسب الفئة
      displayData = data.specifications.reduce((acc: Record<string, any[]>, spec: any) => {
        const categoryName = (spec.category || '').trim() || 'عام';
        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push(spec);
        return acc;
      }, {});
    } else {
      // عرض بسيط بدون فئات
      displayData = { '': data.specifications };
    }
  }

  // التحقق من وجود بيانات للعرض
  const hasDisplayData = Object.keys(displayData).length > 0;
  if (!hasDisplayData) {
    return (
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        'border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg',
        className
      )}>
        <div className="p-6 text-center">
          {data?.title && (
            <h3 className="text-lg font-semibold mb-4">{data.title}</h3>
          )}
          <div className="text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-2 opacity-50">📋</div>
            <p className="text-sm">لا توجد مواصفات للعرض</p>
          </div>
        </div>
      </div>
    );
  }

  // تحديد نمط العرض
  const isTableLayout = settings?.layout === 'table' || layoutType === 'table';

  // تطبيق الإعدادات على الأنماط
  const containerStyles: React.CSSProperties = {
    backgroundColor: settings?.backgroundColor !== 'transparent' ? 
      (settings?.backgroundColor === 'background' ? 'hsl(var(--background))' :
       settings?.backgroundColor === 'muted' ? 'hsl(var(--muted))' :
       settings?.backgroundColor === 'primary/5' ? 'hsl(var(--primary) / 0.05)' :
       settings?.backgroundColor === 'secondary/5' ? 'hsl(var(--secondary) / 0.05)' :
       settings?.backgroundColor === 'accent/5' ? 'hsl(var(--accent) / 0.05)' :
       settings?.backgroundColor) : undefined,
    padding: settings?.padding ? `${settings.padding}px` : '24px',
    borderRadius: settings?.borderRadius === 'none' ? '0' :
                 settings?.borderRadius === 'sm' ? '0.25rem' :
                 settings?.borderRadius === 'md' ? '0.75rem' :
                 settings?.borderRadius === 'lg' ? '1rem' :
                 settings?.borderRadius === 'xl' ? '1.5rem' :
                 settings?.borderRadius === 'full' ? '9999px' : '0.75rem'
  };

  const borderClasses = cn(
    'relative overflow-hidden transition-all duration-500 group',
    settings?.borderStyle === 'none' ? 'border-0' :
    settings?.borderStyle === 'separated' ? 'border-0' :
    'border border-border/30 hover:border-border/60',
    'bg-gradient-to-br from-background/95 via-background/90 to-muted/10',
    'backdrop-blur-md shadow-sm hover:shadow-xl',
    'rounded-xl'
  );

  return (
    <div className={cn(borderClasses, className)} style={containerStyles}>
      {/* خلفية تدرجية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3 opacity-0 group-hover:opacity-100 transition-all duration-700" />
      
      {/* نقاط زخرفية */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-primary/20 rounded-full animate-pulse" />
      <div className="absolute top-6 right-8 w-1 h-1 bg-secondary/30 rounded-full animate-pulse delay-300" />
      
      <div className="relative space-y-6">
        {/* العنوان والعنوان الفرعي */}
        {data?.title && (
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                {data.title}
              </h3>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full" />
            </div>
            {data?.subtitle && (
              <p className="text-sm text-muted-foreground/80 font-medium max-w-md mx-auto leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        {/* عرض المواصفات */}
        <div className="space-y-4">
          {Object.entries(displayData).map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-3">
              {/* عنوان الفئة */}
              {categoryName && settings?.showCategories && layoutType === 'categorized' && (
                <div className="relative group/category">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-primary to-secondary rounded-full" />
                      <h4 className="text-lg font-bold text-foreground/90 tracking-wide">
                        {categoryName}
                      </h4>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                  </div>
                </div>
              )}

              {/* المواصفات */}
              {isTableLayout ? (
                <div className="overflow-hidden rounded-xl border border-border/30 shadow-sm bg-background/50 backdrop-blur-sm">
                  <div className={cn(
                    settings?.borderStyle === 'separated' ? 'divide-y divide-border/20' : ''
                  )}>
                    {(items as any[]).map((spec: any, idx: number) => (
                      <div
                        key={spec.id || idx}
                        className={cn(
                          'grid grid-cols-2 gap-4 p-4 transition-all duration-300 hover:bg-muted/20 group/row',
                          settings?.alternatingColors && idx % 2 === 1 ? 
                            'bg-gradient-to-r from-muted/20 to-muted/10' : 
                            'bg-gradient-to-r from-background/80 to-background/60'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary/40 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" />
                          <div className="text-sm font-semibold text-foreground/90">
                            {spec.name}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground text-left flex items-center justify-between">
                          <span className="font-medium text-foreground/80">
                            {spec.value}
                            {settings?.showUnits && spec.unit && (
                              <span className="text-xs text-primary/60 mr-2 font-normal bg-primary/10 px-1.5 py-0.5 rounded-md">
                                {spec.unit}
                              </span>
                            )}
                          </span>
                        </div>
                        {settings?.showDescriptions && spec.description && (
                          <div className="col-span-2 text-xs text-muted-foreground/70 pt-2 border-t border-border/10 bg-muted/10 -mx-4 px-4 pb-2 mt-2 rounded-b-lg">
                            <div className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-muted-foreground/40 rounded-full mt-1.5 flex-shrink-0" />
                              <span className="leading-relaxed">{spec.description}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(items as any[]).map((spec: any, idx: number) => (
                    <div
                      key={spec.id || idx}
                      className={cn(
                        'group/card relative overflow-hidden rounded-xl border border-border/30 p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]',
                        'bg-gradient-to-br from-background/80 to-muted/20 backdrop-blur-sm',
                        settings?.alternatingColors && idx % 2 === 1 ? 
                          'hover:from-primary/5 hover:to-secondary/5' : 
                          'hover:from-secondary/5 hover:to-primary/5'
                      )}
                    >
                      {/* خلفية تفاعلية */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                      
                      {/* نقطة زخرفية */}
                      <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary/30 rounded-full opacity-0 group-hover/card:opacity-100 transition-all duration-300 delay-100" />
                      
                      <div className="relative space-y-3">
                        {/* اسم المواصفة */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-gradient-to-b from-primary/60 to-secondary/60 rounded-full opacity-60 group-hover/card:opacity-100 transition-opacity duration-300" />
                          <div className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                            {spec.name}
                          </div>
                        </div>
                        
                        {/* قيمة المواصفة */}
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold text-foreground/90 group-hover/card:text-foreground transition-colors duration-300">
                            {spec.value}
                          </span>
                          {settings?.showUnits && spec.unit && (
                            <span className="text-xs font-medium text-primary/70 bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                              {spec.unit}
                            </span>
                          )}
                        </div>
                        
                        {/* الوصف */}
                        {settings?.showDescriptions && spec.description && (
                          <div className="text-xs text-muted-foreground/70 leading-relaxed border-t border-border/20 pt-2">
                            <div className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-muted-foreground/40 rounded-full mt-1.5 flex-shrink-0" />
                              <span>{spec.description}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pure Reviews Component
const PureReviewsComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data } = component;
  
  if (!data.reviews || data.reviews.length === 0) return null;

  return (
    <div className={cn("reviews-container", className)}>
      <div className="space-y-4">
        {data.reviews.map((review: any, index: number) => (
          <div key={index} className="review-item p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center mb-2">
              <div className="font-semibold">{review.name}</div>
              <div className="mr-auto flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm">{review.comment}</p>
            {review.date && (
              <div className="text-xs text-muted-foreground mt-2">{review.date}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Pure GIF Component - مبسط للغاية
const PureGifComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  
  if (!data.url) return null;

  // حساب الأنماط الأساسية فقط
  const imageStyles: React.CSSProperties = {
    maxWidth: settings?.maxWidth ? `${settings.maxWidth}px` : '100%',
    height: 'auto',
    borderRadius: typeof settings?.borderRadius === 'number' 
      ? `${settings.borderRadius}px` 
      : '8px',
    display: 'block',
  };

  // حساب classes للمحاذاة
  const alignmentClass = cn(
    "flex",
    settings?.alignment === 'left' && "justify-start",
    settings?.alignment === 'center' && "justify-center", 
    settings?.alignment === 'right' && "justify-end",
    !settings?.alignment && "justify-center"
  );

  return (
    <div className={cn(alignmentClass, className)}>
      <div className="relative">
        {/* عرض GIF مباشر بدون تعقيدات */}
        <img
          src={data.url}
          alt={data.alt || data.caption || 'GIF متحرك'}
          style={imageStyles}
          // خصائص أساسية فقط
          loading="eager"
          decoding="auto"
          draggable={false}
          data-gif="true"
          // إزالة crossOrigin التي قد تسبب مشاكل
        />

        {/* عرض التسمية التوضيحية */}
        {data.caption && (
          <div className="mt-2 text-sm text-muted-foreground text-center">
            {data.caption}
          </div>
        )}
      </div>
    </div>
  );
};

// Pure Video Component
const PureVideoComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data } = component;
  
  if (!data.url) return null;

  return (
    <div className={cn("video-container", className)}>
      <div className="relative aspect-video rounded-lg overflow-hidden">
        <video
          src={data.url}
          controls={data.showControls !== false}
          autoPlay={data.autoPlay}
          loop={data.loop}
          muted={data.muted}
          className="w-full h-full object-cover"
        />
      </div>
      {data.caption && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          {data.caption}
        </div>
      )}
    </div>
  );
};

// Pure Before/After Component - Enhanced like landing page
const PureBeforeAfterComponent: React.FC<{ component: any; className?: string }> = ({ component, className }) => {
  const { data, settings } = component;
  
  if (!data.beforeImage || !data.afterImage) return null;

  // State for slider position
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDragging = useRef(false);

  // Handle mouse/touch events
  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    
    const slider = e.currentTarget as HTMLDivElement;
    const rect = slider.getBoundingClientRect();
    
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : (e as React.MouseEvent).clientX;
    
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(position);
  };

  // Add event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div className={cn("before-after-container space-y-6", className)}>
      {/* Title and Description */}
      {data.title && (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">{data.title}</h3>
          {data.description && (
            <p className="text-muted-foreground">{data.description}</p>
          )}
        </div>
      )}

      {/* Interactive Slider */}
      <div className="max-w-4xl mx-auto">
        <div 
          className="relative w-full overflow-hidden rounded-xl shadow-lg cursor-ew-resize"
          style={{ height: '400px' }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onTouchCancel={handleMouseUp}
          onTouchMove={handleMouseMove}
        >
          {/* Before Image (Background) */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all"
            style={{ 
              backgroundImage: `url(${data.beforeImage})`,
              backgroundSize: 'cover',
              filter: 'contrast(1.05)'
            }}
          />
          
          {/* After Image (Overlay with clip-path) */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform"
            style={{ 
              backgroundImage: `url(${data.afterImage})`,
              backgroundSize: 'cover',
              clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
              filter: 'contrast(1.05)'
            }}
          />
          
          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 cursor-ew-resize z-10"
            style={{ 
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
              width: '40px',
              touchAction: 'none' 
            }}
          >
            <div 
              className="absolute top-0 bottom-0 left-1/2 w-1 bg-white shadow-lg"
              style={{ transform: 'translateX(-50%)' }}
            />
            <div 
              className="absolute top-1/2 left-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5L3 10L8 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 5L21 10L16 15" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          {/* Labels */}
          {settings?.showLabels !== false && (
            <>
              <div className="absolute top-5 left-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                {data.beforeLabel || 'قبل'}
              </div>
              <div className="absolute top-5 right-5 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md backdrop-blur-sm">
                {data.afterLabel || 'بعد'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Pure Gallery Component - Uses ProductImageGalleryV2
const PureGalleryComponent: React.FC<{ component: any; className?: string; product?: any }> = ({ 
  component, 
  className,
  product
}) => {
  const { data } = component;

  // If no product is provided, show a placeholder
  if (!product) {
    return (
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        "border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg p-6",
        className
      )}>
        {/* Title and Description */}
        {data.title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        )}
        
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">معرض الصور سيظهر هنا عند عرض المنتج</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Description */}
      {data.title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </div>
      )}

      {/* Use ProductImageGalleryV2 directly */}
      <ProductImageGalleryV2 
        product={product}
        className="advanced-description-gallery"
      />
    </div>
  );
};

// Pure Price Component - Uses ProductPriceDisplay
const PurePriceComponent: React.FC<{ component: any; className?: string; product?: any }> = ({ 
  component, 
  className,
  product
}) => {
  const { data } = component;
  const { quantity, setQuantity } = useAdvancedDescriptionContext();

  // استخرج الحد الأقصى للكمية من المنتج (يمكنك تعديله حسب بنية المنتج)
  const maxQuantity = product?.maxQuantity || product?.stock || 99;

  // If no product is provided, show a placeholder
  if (!product) {
    return (
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        "border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg p-6",
        className
      )}>
        {/* Title and Description */}
        {data.title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        )}
        
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">سعر المنتج سيظهر هنا عند عرض المنتج</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Use ProductPriceDisplay directly */}
      {(() => {
        
        if (product) {
          return (
            <ProductPriceDisplay 
              product={product}
              quantity={quantity}
              selectedColor={undefined}
              selectedSize={undefined}
              selectedOffer={null}
              hideSpecialOfferDetails={false}
              className="advanced-description-price"
            />
          );
        } else {
          return (
            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border/30 aspect-[4/3] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">سعر المنتج</p>
                  <p className="text-xs text-muted-foreground px-4">
                    لا توجد بيانات سعر متاحة للمنتج
                  </p>
                </div>
              </div>
            </div>
          );
        }
      })()}
    </div>
  );
};

// Pure Quantity Component - Uses ProductQuantitySelector
const PureQuantityComponent: React.FC<{ component: any; className?: string; product?: any }> = ({ 
  component, 
  className,
  product
}) => {
  const { data } = component;
  const { quantity, setQuantity } = useAdvancedDescriptionContext();

  // استخرج الحد الأقصى للكمية من المنتج (يمكنك تعديله حسب بنية المنتج)
  const maxQuantity = product?.maxQuantity || product?.stock || 99;

  // If no product is provided, show a placeholder
  if (!product) {
    return (
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        "border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg p-6",
        className
      )}>
        {/* Title and Description */}
        {data.title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        )}
        
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">محدد الكمية سيظهر هنا عند عرض المنتج</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Use ProductQuantitySelector directly */}
      <ProductQuantitySelector 
        quantity={quantity}
        onQuantityChange={setQuantity}
        maxQuantity={maxQuantity}
        className="advanced-description-quantity"
      />
    </div>
  );
};

// Pure Buy Now Component - Customizable Buy Now Button
const PureBuyNowComponent: React.FC<{ component: any; className?: string; product?: any }> = ({ 
  component, 
  className,
  product
}) => {
  const { data, settings } = component;

  const handleBuyNow = () => {
    // يمكن إضافة منطق الطلب هنا
    // يمكن فتح صفحة الطلب أو إظهار نموذج الطلب
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Description */}
      {data.title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">{data.title}</h3>
          {data.description && (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          )}
        </div>
      )}

      {/* Buy Now Button */}
      <div className="flex justify-center">
        <Button
          size={settings.buttonSize}
          onClick={handleBuyNow}
          className={cn(
            "font-semibold transition-all duration-200 hover:opacity-90",
            settings.fullWidth ? "w-full" : "px-8",
            settings.showIcon && "gap-2"
          )}
          style={{
            backgroundColor: settings.buttonColor,
            color: settings.buttonTextColor,
            borderRadius: `${settings.borderRadius}px`,
          }}
        >
          {settings.showIcon && <ShoppingCart className="w-4 h-4" />}
          {data.buttonText}
        </Button>
      </div>
    </div>
  );
};
