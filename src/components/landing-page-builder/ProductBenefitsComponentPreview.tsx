import React, { memo } from 'react';
import { LandingPageComponent } from './types';
import { 
  Sparkles,
  Clock,
  CheckCircle,
  Shield,
  Heart,
  Star,
  Zap,
  Award,
  TrendingUp,
  DollarSign,
  Users,
  Truck,
  Gift,
  ThumbsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// قاموس الأيقونات - محسن للأداء
const ICONS_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles />,
  Clock: <Clock />,
  CheckCircle: <CheckCircle />,
  Shield: <Shield />,
  Heart: <Heart />,
  Star: <Star />,
  Zap: <Zap />,
  Award: <Award />,
  TrendingUp: <TrendingUp />,
  DollarSign: <DollarSign />,
  Users: <Users />,
  Truck: <Truck />,
  Gift: <Gift />,
  ThumbsUp: <ThumbsUp />
};

interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  iconColor?: string;
  image?: string;
  // إعدادات الصورة الفردية (اختيارية)
  imageHeight?: number;
  imageObjectFit?: string;
  imageBorderRadius?: number;
  imageHoverEffect?: boolean;
  imageShadow?: boolean;
  imageBorder?: boolean;
}

interface ProductBenefitsComponentPreviewProps {
  component: LandingPageComponent;
}

// مكون الفائدة الواحدة - محسن للأداء (نفس التصميم تماماً)
const BenefitItem = memo<{
  item: BenefitItem;
  index: number;
  layout: 'grid' | 'list';
  accentColor: string;
  textColor: string;
  showImages: boolean;
  showIcons: boolean;
  imagePosition: string;
  globalImageSettings: any;
}>(({ item, index, layout, accentColor, textColor, showImages, showIcons, imagePosition, globalImageSettings }) => {
  
  // حساب إعدادات الصورة (العنصر يُعطى الأولوية على الإعدادات العامة)
  const getImageSettings = () => {
    return {
      height: item.imageHeight || globalImageSettings.imageHeight || 128,
      objectFit: item.imageObjectFit || globalImageSettings.imageObjectFit || 'cover',
      borderRadius: item.imageBorderRadius || globalImageSettings.imageBorderRadius || 12,
      hoverEffect: item.imageHoverEffect !== undefined ? item.imageHoverEffect : (globalImageSettings.imageHoverEffect !== false),
      shadow: item.imageShadow !== undefined ? item.imageShadow : (globalImageSettings.imageShadow !== false),
      border: item.imageBorder !== undefined ? item.imageBorder : (globalImageSettings.imageBorder !== false)
    };
  };
  
  const imageSettings = getImageSettings();
  const iconElement = ICONS_MAP[item.icon || 'Sparkles'];
  
  if (layout === 'list') {
    return (
      <div 
        className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
        style={{ 
          animationDelay: `${index * 50}ms`,
          transform: 'translateZ(0)' // تحسين الأداء
        }}
      >
        {/* صورة الفائدة (للقائمة) */}
        {showImages && item.image && (
          <div 
            className={cn(
              "flex-shrink-0 w-16 overflow-hidden transition-all duration-300",
              imageSettings.shadow && "shadow-md",
              imageSettings.border && "border border-gray-200"
            )}
            style={{
              height: `${Math.min(imageSettings.height, 64)}px`,
              borderRadius: `${imageSettings.borderRadius}px`
            }}
          >
            <img 
              src={item.image} 
              alt={item.title} 
              className={cn(
                "w-full h-full transition-transform duration-300",
                imageSettings.hoverEffect && "hover:scale-110"
              )}
              style={{ objectFit: imageSettings.objectFit as any }}
              loading="lazy"
            />
          </div>
        )}
        
        {/* الأيقونة */}
        {showIcons && (
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: item.iconColor || accentColor }}
          >
            {React.cloneElement(iconElement as React.ReactElement, { size: 20, className: "drop-shadow-sm" })}
          </div>
        )}
        
        {/* المحتوى */}
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-lg mb-1 truncate"
            style={{ color: textColor }}
          >
            {item.title}
          </h3>
          <p 
            className="text-sm opacity-80 line-clamp-2"
            style={{ color: textColor }}
          >
            {item.description}
          </p>
        </div>
      </div>
    );
  }
  
  // تصميم Grid البسيط والسريع (نفس العرض الفعلي تماماً)
  return (
    <div 
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-50 text-center h-full"
      style={{ 
        animationDelay: `${index * 50}ms`,
        transform: 'translateZ(0)' // تحسين الأداء
      }}
    >
      {/* صورة الفائدة (أعلى) */}
      {showImages && item.image && imagePosition === 'top' && (
        <div 
          className={cn(
            "w-full mb-4 overflow-hidden transition-all duration-300",
            imageSettings.shadow && "shadow-lg",
            imageSettings.border && "border border-gray-200"
          )}
          style={{
            height: `${imageSettings.height}px`,
            borderRadius: `${imageSettings.borderRadius}px`
          }}
        >
          <img 
            src={item.image} 
            alt={item.title} 
            className={cn(
              "w-full h-full transition-transform duration-300",
              imageSettings.hoverEffect && "group-hover:scale-110"
            )}
            style={{ objectFit: imageSettings.objectFit as any }}
            loading="lazy"
          />
        </div>
      )}
      
      {/* الأيقونة */}
      {showIcons && (
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-sm"
          style={{ backgroundColor: item.iconColor || accentColor }}
        >
          {React.cloneElement(iconElement as React.ReactElement, { size: 24, className: "drop-shadow-sm" })}
        </div>
      )}
      
      {/* العنوان */}
      <h3 
        className="font-semibold text-lg mb-3"
        style={{ color: textColor }}
      >
        {item.title}
      </h3>
      
      {/* الوصف */}
      <p 
        className="text-sm opacity-80 leading-relaxed"
        style={{ color: textColor }}
      >
        {item.description}
      </p>
      
      {/* صورة الفائدة (أسفل) */}
      {showImages && item.image && imagePosition === 'bottom' && (
        <div 
          className={cn(
            "w-full mt-4 overflow-hidden transition-all duration-300",
            imageSettings.shadow && "shadow-lg",
            imageSettings.border && "border border-gray-200"
          )}
          style={{
            height: `${imageSettings.height}px`,
            borderRadius: `${imageSettings.borderRadius}px`
          }}
        >
          <img 
            src={item.image} 
            alt={item.title} 
            className={cn(
              "w-full h-full transition-transform duration-300",
              imageSettings.hoverEffect && "group-hover:scale-110"
            )}
            style={{ objectFit: imageSettings.objectFit as any }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
});

BenefitItem.displayName = 'BenefitItem';

const ProductBenefitsComponentPreview: React.FC<ProductBenefitsComponentPreviewProps> = memo(({ component }) => {
  const { 
    title, 
    subtitle, 
    backgroundColor = '#fafafa',
    textColor = '#374151',
    accentColor = '#3b82f6',
    layout = 'grid',
    columns = 3,
    showImages = false,
    showIcons = true,
    imagePosition = 'top',
    // إعدادات الصور
    imageObjectFit = 'cover',
    imageHeight = 128,
    imageBorderRadius = 12,
    imageHoverEffect = true,
    imageShadow = true,
    imageBorder = false,
    items = []
  } = component.settings;

  // تجميع إعدادات الصورة العامة
  const globalImageSettings = {
    imageObjectFit,
    imageHeight,
    imageBorderRadius,
    imageHoverEffect,
    imageShadow,
    imageBorder
  };

  // تحسين: تحديد الأعمدة بطريقة محسنة (نفس المنطق تماماً)
  const gridCols = layout === 'list' ? '' : 
    columns === 1 ? 'md:grid-cols-1' :
    columns === 2 ? 'md:grid-cols-2' :
    columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
    'md:grid-cols-2 lg:grid-cols-3'; // افتراضي للثلاثة أعمدة

  // حالة فارغة محسنة (نفس العرض الفعلي تماماً)
  if (!items?.length) {
    return (
      <section 
        className="py-12" 
        style={{ backgroundColor }}
      >
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white rounded-xl p-8 max-w-md mx-auto">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-gray-500">لا توجد فوائد محددة</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="py-16" 
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4">
        {/* العنوان - نفس التصميم تماماً */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: textColor }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p 
                className="text-lg opacity-80 max-w-2xl mx-auto"
                style={{ color: textColor }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* قائمة الفوائد - نفس التصميم والأداء تماماً */}
        <div className={cn(
          layout === 'grid' 
            ? `grid grid-cols-1 ${gridCols} gap-6` 
            : 'space-y-4',
          "will-change-transform" // تحسين الأداء للأنيميشن
        )}>
          {items.map((item: BenefitItem, index: number) => (
            <BenefitItem
              key={item.id}
              item={item}
              index={index}
              layout={layout}
              accentColor={accentColor}
              textColor={textColor}
              showImages={showImages}
              showIcons={showIcons}
              imagePosition={imagePosition}
              globalImageSettings={globalImageSettings}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

ProductBenefitsComponentPreview.displayName = 'ProductBenefitsComponentPreview';

export default ProductBenefitsComponentPreview;
