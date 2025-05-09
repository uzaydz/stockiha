import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductHeroComponentPreviewProps {
  settings: {
    productTitle?: string;
    tagline?: string;
    description?: string;
    price?: string;
    oldPrice?: string;
    currency?: string;
    showDiscount?: boolean;
    priceLabel?: string;
    primaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    imageUrl?: string;
    imageAlt?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    secondaryColor?: string;
    layout?: 'classic' | 'stacked' | 'overlay' | 'asymmetric';
    textAlignment?: 'right' | 'center' | 'left';
    containerPadding?: number;
    borderRadius?: number;
    showHighlightBadge?: boolean;
    badgeText?: string;
    badgeColor?: string;
    badgePosition?: 'top-right' | 'top-left' | 'inline';
    useGradient?: boolean;
    gradientStart?: string;
    gradientEnd?: string;
    gradientDirection?: string;
    enableShadows?: boolean;
    enableAnimations?: boolean;
    showFeatures?: boolean;
    feature1?: string;
    feature2?: string;
    feature3?: string;
    feature4?: string;
    showGallery?: boolean;
    gallery?: {id: string; url: string; alt: string}[];
    enableZoom?: boolean;
    showVideo?: boolean;
    videoUrl?: string;
    videoThumbnail?: string;
    [key: string]: any;
  };
}

/**
 * مكون معاينة لقسم هيرو المنتج
 */
const ProductHeroComponentPreview: React.FC<ProductHeroComponentPreviewProps> = ({ settings }) => {
  // إعداد الخلفية (عادية أو متدرجة)
  const backgroundStyle = settings.useGradient 
    ? {
        background: `linear-gradient(${settings.gradientDirection === 'to-r' ? 'to right' : 
                                     settings.gradientDirection === 'to-l' ? 'to left' :
                                     settings.gradientDirection === 'to-t' ? 'to top' :
                                     settings.gradientDirection === 'to-b' ? 'to bottom' :
                                     settings.gradientDirection === 'to-tr' ? 'to top right' :
                                     settings.gradientDirection === 'to-bl' ? 'to bottom left' : 'to right'}, 
                                     ${settings.gradientStart || '#4f46e5'}, ${settings.gradientEnd || '#0ea5e9'})`,
        color: settings.textColor || '#ffffff'
      }
    : {
        backgroundColor: settings.backgroundColor || '#ffffff',
        color: settings.textColor || '#000000'
      };
  
  // حساب نسبة الخصم
  const discountPercentage = settings.showDiscount && settings.price && settings.oldPrice
    ? Math.round((1 - Number(settings.price) / Number(settings.oldPrice)) * 100)
    : null;
  
  // صورة بديلة للمنتج
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAzMTkuNUwzNjUuNSAyNzVMMzc0LjUgMjgzLjVMNDAwIDMwM0w0NjkgMjQ5LjVMNDk2LjUgMjc1TDUyNS41IDI0Ni41TDUzNC41IDI2My41TDYwMCAzMzAuNUw0MDAgMzgwTDMxMC41IDMxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjI0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMzQ5LjVDMjM4LjUgMzQ5LjUgMjYwLjUgMzA1IDMwMi41IDI5NC41QzM0NC41IDI4NCA0MDAuNSAzMTMgNDAwLjUgMzEzTDIzOC41IDM1NS41VjM0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTQ5NDk0Ij7LktmI2LHYqTwvdGV4dD48L3N2Zz4=';
  
  // أسلوب الظل (إذا كان مفعلاً)
  const shadowClass = settings.enableShadows ? 'shadow-lg' : '';
  
  // إنشاء قائمة المميزات إذا كانت مفعلة
  const features = settings.showFeatures 
    ? [settings.feature1, settings.feature2, settings.feature3, settings.feature4].filter(Boolean)
    : [];
  
  // دالة للنزول السلس إلى قسم معين
  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // استخدم دج كعملة افتراضية
  const currency = settings.currency || 'دج';
  
  // عرض تخطيط مختلف حسب نوع التخطيط المحدد
  const renderLayout = () => {
    switch(settings.layout) {
      case 'stacked':
        return (
          <div className="flex flex-col text-center gap-6">
            {/* قسم العلامة المميزة */}
            {settings.showHighlightBadge && settings.badgeText && settings.badgePosition !== 'inline' && (
              <div className={cn(
                "absolute",
                settings.badgePosition === 'top-left' ? "top-4 left-4" : "top-4 right-4"
              )}>
                <Badge
                  style={{
                    backgroundColor: settings.badgeColor || '#ef4444',
                    color: '#ffffff'
                  }}
                  className="px-3 py-1 text-sm"
                >
                  {settings.badgeText}
                </Badge>
              </div>
            )}
            
            {/* صورة المنتج */}
            <div className={`w-full max-w-2xl mx-auto ${shadowClass}`} style={{ borderRadius: `${settings.borderRadius || 8}px` }}>
              <img 
                src={settings.imageUrl || fallbackImage} 
                alt={settings.imageAlt || settings.productTitle || 'صورة المنتج'} 
                className="w-full h-auto object-contain"
                style={{ borderRadius: `${settings.borderRadius || 8}px` }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
              />
            </div>
            
            {/* محتوى نصي */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: settings.textColor || settings.accentColor || '#0ea5e9' }}>
                    {settings.productTitle || 'عنوان المنتج'}
                  </h1>
                  
                  {/* شارة مميزة بجانب العنوان */}
                  {settings.showHighlightBadge && settings.badgeText && settings.badgePosition === 'inline' && (
                    <Badge
                      style={{
                        backgroundColor: settings.badgeColor || '#ef4444',
                        color: '#ffffff'
                      }}
                    >
                      {settings.badgeText}
                    </Badge>
                  )}
                </div>
                
                {settings.tagline && (
                  <p className="text-lg" style={{ color: settings.secondaryColor || 'inherit' }}>
                    {settings.tagline}
                  </p>
                )}
              </div>
              
              {settings.description && (
                <p className="text-base" style={{ color: settings.secondaryColor || 'inherit' }}>
                  {settings.description}
                </p>
              )}
              
              {/* قسم السعر */}
              {settings.price && (
                <div className="mt-4">
                  <div className="flex flex-row-reverse items-center justify-center gap-3" dir="rtl">
                    <span className="text-2xl font-bold text-primary">
                      {settings.price} {currency}
                    </span>
                    
                    {settings.oldPrice && (
                      <span className="text-lg line-through text-muted-foreground" style={{ opacity: 0.7 }}>
                        {settings.oldPrice} {currency}
                      </span>
                    )}
                    
                    {discountPercentage && (
                      <Badge className="bg-red-500 text-white">
                        خصم {discountPercentage}%
                      </Badge>
                    )}
                  </div>
                  
                  {settings.priceLabel && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      {settings.priceLabel}
                    </p>
                  )}
                </div>
              )}
              
              {/* المميزات السريعة */}
              {features.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                  {features.map((feature, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="py-1 px-3"
                      style={{ 
                        borderColor: settings.accentColor || 'currentColor',
                        color: settings.accentColor || 'currentColor'
                      }}
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* أزرار الدعوة للإجراء */}
              <div className="flex flex-wrap gap-3 mt-8 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                {settings.primaryButtonText && (
                  <button 
                    className="px-7 py-2.5 rounded-lg text-white font-bold text-base shadow-md transition bg-primary hover:bg-primary/90"
                    style={{ backgroundColor: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                    onClick={() => handleScrollTo('order-form')}
                  >
                    {settings.primaryButtonText}
                  </button>
                )}
                
                {settings.secondaryButtonText && (
                  <button 
                    className="px-7 py-2.5 rounded-lg font-bold text-base border border-primary text-primary bg-white hover:bg-primary/5 transition"
                    style={{ borderColor: settings.accentColor || '#3b82f6', color: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                    onClick={() => handleScrollTo('after-hero-section')}
                  >
                    {settings.secondaryButtonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'overlay':
        return (
          <div className="relative overflow-hidden" style={{ borderRadius: `${settings.borderRadius || 8}px` }}>
            {/* الخلفية (صورة المنتج) */}
            <div className="w-full h-full">
              <img 
                src={settings.imageUrl || fallbackImage} 
                alt={settings.imageAlt || settings.productTitle || 'صورة المنتج'} 
                className="w-full h-auto object-cover"
                style={{ borderRadius: `${settings.borderRadius || 8}px` }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
              />
            </div>
            
            {/* طبقة داكنة فوق الصورة */}
            <div className="absolute inset-0 bg-black/50" style={{ borderRadius: `${settings.borderRadius || 8}px` }}></div>
            
            {/* المحتوى النصي */}
            <div className={`absolute inset-0 text-center flex flex-col justify-center p-6 sm:p-10`}>
              {/* قسم العلامة المميزة */}
              {settings.showHighlightBadge && settings.badgeText && settings.badgePosition !== 'inline' && (
                <div className={cn(
                  "absolute",
                  settings.badgePosition === 'top-left' ? "top-4 left-4" : "top-4 right-4"
                )}>
                  <Badge
                    style={{
                      backgroundColor: settings.badgeColor || '#ef4444',
                      color: '#ffffff'
                    }}
                    className="px-3 py-1 text-sm"
                  >
                    {settings.badgeText}
                  </Badge>
                </div>
              )}
              
              <div className="space-y-4 text-white">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: settings.textColor || settings.accentColor || '#0ea5e9' }}>
                      {settings.productTitle || 'عنوان المنتج'}
                    </h1>
                    
                    {/* شارة مميزة بجانب العنوان */}
                    {settings.showHighlightBadge && settings.badgeText && settings.badgePosition === 'inline' && (
                      <Badge
                        style={{
                          backgroundColor: settings.badgeColor || '#ef4444',
                          color: '#ffffff'
                        }}
                      >
                        {settings.badgeText}
                      </Badge>
                    )}
                  </div>
                  
                  {settings.tagline && (
                    <p className="text-lg text-white/90">
                      {settings.tagline}
                    </p>
                  )}
                </div>
                
                {settings.description && (
                  <p className="text-base text-white/80">
                    {settings.description}
                  </p>
                )}
                
                {/* قسم السعر */}
                {settings.price && (
                  <div className="mt-4">
                    <div className="flex flex-row-reverse items-center justify-center gap-3" dir="rtl">
                      <span className="text-2xl font-bold text-primary">
                        {settings.price} {currency}
                      </span>
                      
                      {settings.oldPrice && (
                        <span className="text-lg line-through text-white/70">
                          {settings.oldPrice} {currency}
                        </span>
                      )}
                      
                      {discountPercentage && (
                        <Badge className="bg-red-500 text-white">
                          خصم {discountPercentage}%
                        </Badge>
                      )}
                    </div>
                    
                    {settings.priceLabel && (
                      <p className="text-sm mt-1 text-white/80">
                        {settings.priceLabel}
                      </p>
                    )}
                  </div>
                )}
                
                {/* أزرار الدعوة للإجراء */}
                <div className="flex flex-wrap gap-3 mt-8 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                  {settings.primaryButtonText && (
                    <button 
                      className="px-7 py-2.5 rounded-lg text-white font-bold text-base shadow-md transition bg-primary hover:bg-primary/90"
                      style={{ backgroundColor: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                      onClick={() => handleScrollTo('order-form')}
                    >
                      {settings.primaryButtonText}
                    </button>
                  )}
                  
                  {settings.secondaryButtonText && (
                    <button 
                      className="px-7 py-2.5 rounded-lg font-bold text-base border border-primary text-primary bg-white hover:bg-primary/5 transition"
                      style={{ borderColor: settings.accentColor || '#3b82f6', color: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                      onClick={() => handleScrollTo('after-hero-section')}
                    >
                      {settings.secondaryButtonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'asymmetric':
        return (
          <div className="relative flex flex-col md:flex-row items-stretch overflow-hidden" style={{ borderRadius: `${settings.borderRadius || 8}px` }}>
            {/* قسم العلامة المميزة */}
            {settings.showHighlightBadge && settings.badgeText && settings.badgePosition !== 'inline' && (
              <div className={cn(
                "absolute z-10",
                settings.badgePosition === 'top-left' ? "top-4 left-4" : "top-4 right-4"
              )}>
                <Badge
                  style={{
                    backgroundColor: settings.badgeColor || '#ef4444',
                    color: '#ffffff'
                  }}
                  className="px-3 py-1 text-sm"
                >
                  {settings.badgeText}
                </Badge>
              </div>
            )}
            
            {/* قسم المحتوى */}
            <div className={`p-6 sm:p-10 flex-1 text-center`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: settings.textColor || settings.accentColor || '#0ea5e9' }}>
                      {settings.productTitle || 'عنوان المنتج'}
                    </h1>
                    
                    {/* شارة مميزة بجانب العنوان */}
                    {settings.showHighlightBadge && settings.badgeText && settings.badgePosition === 'inline' && (
                      <Badge
                        style={{
                          backgroundColor: settings.badgeColor || '#ef4444',
                          color: '#ffffff'
                        }}
                      >
                        {settings.badgeText}
                      </Badge>
                    )}
                  </div>
                  
                  {settings.tagline && (
                    <p className="text-lg" style={{ color: settings.secondaryColor || 'inherit' }}>
                      {settings.tagline}
                    </p>
                  )}
                </div>
                
                {settings.description && (
                  <p className="text-base" style={{ color: settings.secondaryColor || 'inherit' }}>
                    {settings.description}
                  </p>
                )}
                
                {/* قسم السعر */}
                {settings.price && (
                  <div className="mt-4">
                    <div className="flex flex-row-reverse items-center justify-center gap-3" dir="rtl">
                      <span className="text-2xl font-bold text-primary">
                        {settings.price} {currency}
                      </span>
                      
                      {settings.oldPrice && (
                        <span className="text-lg line-through text-muted-foreground" style={{ opacity: 0.7 }}>
                          {settings.oldPrice} {currency}
                        </span>
                      )}
                      
                      {discountPercentage && (
                        <Badge className="bg-red-500 text-white">
                          خصم {discountPercentage}%
                        </Badge>
                      )}
                    </div>
                    
                    {settings.priceLabel && (
                      <p className="text-sm mt-1 text-muted-foreground">
                        {settings.priceLabel}
                      </p>
                    )}
                  </div>
                )}
                
                {/* المميزات السريعة */}
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                    {features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="py-1 px-3"
                        style={{ 
                          borderColor: settings.accentColor || 'currentColor',
                          color: settings.accentColor || 'currentColor'
                        }}
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* أزرار الدعوة للإجراء */}
                <div className="flex flex-wrap gap-3 mt-8 justify-center xs:justify-start sm:justify-start md:justify-start lg:justify-start xl:justify-start">
                  {settings.primaryButtonText && (
                    <button 
                      className="px-7 py-2.5 rounded-lg text-white font-bold text-base shadow-md transition bg-primary hover:bg-primary/90"
                      style={{ backgroundColor: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                      onClick={() => handleScrollTo('order-form')}
                    >
                      {settings.primaryButtonText}
                    </button>
                  )}
                  
                  {settings.secondaryButtonText && (
                    <button 
                      className="px-7 py-2.5 rounded-lg font-bold text-base border border-primary text-primary bg-white hover:bg-primary/5 transition"
                      style={{ borderColor: settings.accentColor || '#3b82f6', color: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 8}px` }}
                      onClick={() => handleScrollTo('after-hero-section')}
                    >
                      {settings.secondaryButtonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* قسم الصورة (أزاح نحو الأسفل وأصغر) */}
            <div className="flex-1 relative p-4">
              <div className={`absolute bottom-0 right-0 w-4/5 h-4/5 ${shadowClass}`} style={{ borderRadius: `${settings.borderRadius || 8}px` }}>
                <img 
                  src={settings.imageUrl || fallbackImage} 
                  alt={settings.imageAlt || settings.productTitle || 'صورة المنتج'} 
                  className="w-full h-full object-cover"
                  style={{ borderRadius: `${settings.borderRadius || 8}px` }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImage;
                  }}
                />
              </div>
              
              {/* صور إضافية بحجم أصغر */}
              {settings.showGallery && settings.gallery && settings.gallery.length > 0 && (
                <div className="absolute top-0 left-0 w-1/2 h-1/2" style={{ borderRadius: `${settings.borderRadius || 8}px` }}>
                  <img 
                    src={settings.gallery[0].url || fallbackImage} 
                    alt={settings.gallery[0].alt || 'صورة المنتج'} 
                    className="w-full h-full object-cover"
                    style={{ borderRadius: `${settings.borderRadius || 8}px` }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
        
      // التخطيط الافتراضي (classic)
      default:
        return (
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-stretch">
            {/* صورة المنتج */}
            <div className={`w-full md:w-1/2 flex justify-center items-center mb-6 md:mb-0 ${shadowClass}`} style={{ borderRadius: `${settings.borderRadius || 16}px` }}>
              <img 
                src={settings.imageUrl || fallbackImage} 
                alt={settings.imageAlt || settings.productTitle || 'صورة المنتج'} 
                className="w-full max-w-xs md:max-w-md h-auto object-contain rounded-2xl border bg-white"
                style={{ borderRadius: `${settings.borderRadius || 16}px` }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
              />
            </div>
            {/* النصوص والمحتوى */}
            <div className="w-full md:w-1/2 flex flex-col items-center text-center gap-5">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight" style={{ color: settings.textColor || settings.accentColor || '#0ea5e9' }}>
                {settings.productTitle || 'عنوان المنتج'}
              </h1>
              {settings.tagline && (
                <p className="text-lg text-accent mb-2" style={{ color: settings.secondaryColor || '#6b7280' }}>
                  {settings.tagline}
                </p>
              )}
              {settings.description && (
                <p className="text-base text-muted-foreground mb-2" style={{ color: settings.secondaryColor || '#6b7280' }}>
                  {settings.description}
                </p>
              )}
              {settings.price && (
                <div className="flex flex-row-reverse items-center justify-center gap-3" dir="rtl">
                  <span className="text-2xl md:text-3xl font-bold text-accent" style={{ color: settings.accentColor || '#0ea5e9' }}>
                    {settings.price} {currency}
                  </span>
                  {settings.oldPrice && (
                    <span className="text-lg line-through text-muted-foreground" style={{ opacity: 0.7 }}>
                      {settings.oldPrice} {currency}
                    </span>
                  )}
                  {discountPercentage && (
                    <Badge className="bg-red-500 text-white">
                      خصم {discountPercentage}%
                    </Badge>
                  )}
                </div>
              )}
              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-2">
                  {features.map((feature, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="py-1 px-3 text-xs"
                      style={{ borderColor: settings.accentColor || 'currentColor', color: settings.accentColor || 'currentColor' }}
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full justify-center">
                {settings.primaryButtonText && (
                  <button 
                    className="px-8 py-3 rounded-lg text-white font-bold text-base shadow-md transition bg-primary hover:bg-primary/90 w-full sm:w-auto"
                    style={{ backgroundColor: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 12}px` }}
                    onClick={() => handleScrollTo('order-form')}
                  >
                    {settings.primaryButtonText}
                  </button>
                )}
                {settings.secondaryButtonText && (
                  <button 
                    className="px-8 py-3 rounded-lg font-bold text-base border border-primary text-primary bg-white hover:bg-primary/5 transition w-full sm:w-auto"
                    style={{ borderColor: settings.accentColor || '#3b82f6', color: settings.accentColor || '#3b82f6', borderRadius: `${settings.borderRadius || 12}px` }}
                    onClick={() => handleScrollTo('after-hero-section')}
                  >
                    {settings.secondaryButtonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <section 
      className="relative py-8 overflow-hidden" 
      style={{
        ...backgroundStyle,
        padding: `${settings.containerPadding || 40}px 0`
      }}
    >
      <div className="container mx-auto px-4">
        {renderLayout()}
      </div>
    </section>
  );
};

export default ProductHeroComponentPreview; 