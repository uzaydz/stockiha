import React from 'react';
import { motion } from 'framer-motion';
import { LandingPageComponent } from './types';
import { cn } from '@/lib/utils';
import { 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  CreditCard,
  Lock,
  Clock,
  CheckCircle,
  Fingerprint,
  Shield,
  Percent
} from 'lucide-react';

// خريطة الأيقونات المتاحة
const ICONS_MAP: Record<string, React.ReactNode> = {
  'shieldCheck': <ShieldCheck />,
  'rotateCcw': <RotateCcw />,
  'truck': <Truck />,
  'creditCard': <CreditCard />,
  'lock': <Lock />,
  'clock': <Clock />,
  'checkCircle': <CheckCircle />,
  'fingerprint': <Fingerprint />,
  'shield': <Shield />,
  'percent': <Percent />
};

interface GuaranteesComponentPreviewProps {
  component: LandingPageComponent;
}

const GuaranteesComponentPreview: React.FC<GuaranteesComponentPreviewProps> = ({ component }) => {
  const { 
    title = 'ضمانات المنتج والإسترجاع',
    subtitle = 'نحن نثق بجودة منتجاتنا ونقدم لك هذه الضمانات',
    backgroundColor = '#f8f9fa',
    textColor = '#333333',
    accentColor = '#4f46e5',
    headingColor,
    layout = 'grid',
    columns = 3,
    iconStyle = 'filled',
    iconSize = 'medium',
    iconShape = 'circle',
    borderStyle = 'none',
    animation = 'fade',
    animationDuration = 0.5,
    staggerDelay = 0.1,
    containerPadding = 40,
    itemSpacing = 20,
    itemStyle = 'card',
    boxShadow = false,
    hoverEffect = false,
    textAlignment = 'right',
    items = []
  } = component.settings;

  // تحديد عرض الأعمدة حسب نوع التخطيط وعدد الأعمدة
  const getGridCols = () => {
    if (layout === 'list') return '';
    
    const colsMap: Record<number, string> = {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    };
    
    return colsMap[columns] || 'md:grid-cols-3';
  };

  // تحديد أنيميشن الدخول للعناصر
  const getItemAnimation = (index: number) => {
    const duration = animationDuration || 0.5;
    const delay = staggerDelay || 0.1;
    
    switch (animation) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          transition: { delay: index * delay, duration }
        };
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 30 },
          whileInView: { opacity: 1, y: 0 },
          transition: { delay: index * delay, duration }
        };
      case 'slideRight':
        return {
          initial: { opacity: 0, x: -30 },
          whileInView: { opacity: 1, x: 0 },
          transition: { delay: index * delay, duration }
        };
      case 'slideLeft':
        return {
          initial: { opacity: 0, x: 30 },
          whileInView: { opacity: 1, x: 0 },
          transition: { delay: index * delay, duration }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.8 },
          whileInView: { opacity: 1, scale: 1 },
          transition: { delay: index * delay, duration }
        };
      case 'bounce':
        return {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          transition: { delay: index * delay, duration, type: "spring" as const, stiffness: 200 }
        };
      case 'stagger':
        return {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          transition: { delay: index * delay, duration }
        };
      default:
        return {};
    }
  };

  // تحديد نمط الحدود
  const getBorderStyle = () => {
    switch (borderStyle) {
      case 'rounded':
        return 'border border-gray-200 rounded-xl';
      case 'simple':
        return 'border border-gray-200';
      case 'raised':
        return 'border border-gray-200 shadow-sm rounded-lg';
      default:
        return '';
    }
  };

  // تحديد حجم الأيقونة
  const getIconSize = () => {
    switch (iconSize) {
      case 'small':
        return { container: 'w-10 h-10', icon: 20 };
      case 'large':
        return { container: 'w-20 h-20', icon: 32 };
      default: // medium
        return { container: 'w-16 h-16', icon: 28 };
    }
  };

  // تحديد شكل الأيقونة
  const getIconShape = () => {
    switch (iconShape) {
      case 'square':
        return 'rounded-lg';
      case 'none':
        return '';
      default: // circle
        return 'rounded-full';
    }
  };

  // تحديد نمط البطاقة
  const getItemStyle = () => {
    switch (itemStyle) {
      case 'minimal':
        return 'bg-transparent border-0 shadow-none';
      case 'card':
      default:
        return cn(
          'bg-white',
          boxShadow && 'shadow-sm hover:shadow-md',
          hoverEffect && 'hover:scale-105 hover:-translate-y-1',
          'transition-all duration-300'
        );
    }
  };

  // تحديد محاذاة النص
  const getTextAlignment = () => {
    switch (textAlignment) {
      case 'center':
        return 'text-center';
      case 'left':
        return 'text-left';
      default: // right
        return 'text-right';
    }
  };

  // تحديد شكل مكون الضمان
  const renderGuaranteeItem = (item: any, index: number) => {
    const iconElement = ICONS_MAP[item.icon] || <ShieldCheck />;
    const iconSizeConfig = getIconSize();
    const iconShapeClass = getIconShape();
    const itemStyleClass = getItemStyle();
    const textAlignClass = getTextAlignment();
    
    if (layout === 'list') {
      return (
        <motion.div 
          key={item.id || index}
          className={cn(
            "flex gap-5 p-5 transition-all relative",
            itemStyleClass,
            getBorderStyle(),
            hoverEffect && "hover:bg-gray-50"
          )}
          {...getItemAnimation(index)}
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* البادج إذا كان موجود */}
          {item.badge && (
            <div 
              className="absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: item.badgeColor || accentColor }}
            >
              {item.badge}
            </div>
          )}
          
          {/* أيقونة الضمان */}
          <div 
            className={cn(
              "flex-shrink-0 flex items-center justify-center",
              iconSizeConfig.container,
              iconShapeClass,
              iconStyle === 'filled' ? "text-white" : "text-accent border-2",
            )}
            style={{ 
              backgroundColor: iconStyle === 'filled' ? (item.iconColor || accentColor) : 'transparent',
              borderColor: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'transparent',
              color: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'white'
            }}
          >
            {React.cloneElement(iconElement as React.ReactElement, { size: iconSizeConfig.icon })}
          </div>
          
          {/* معلومات الضمان */}
          <div className={cn("flex-1", textAlignClass)}>
            <h3 
              className="text-lg font-bold mb-2" 
              style={{ color: headingColor || textColor }}
            >
              {item.title}
            </h3>
            <p className="opacity-80 text-sm" style={{ color: textColor }}>
              {item.description}
            </p>
            {item.highlight && (
              <div className="mt-2">
                <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                  {item.highlight}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      );
    }
    
    // تصميم Grid
    return (
      <motion.div 
        key={item.id || index}
        className={cn(
          "flex flex-col p-6 transition-all relative",
          itemStyleClass,
          getBorderStyle(),
          textAlignClass
        )}
        {...getItemAnimation(index)}
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* البادج إذا كان موجود */}
        {item.badge && (
          <div 
            className="absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-medium"
            style={{ backgroundColor: item.badgeColor || accentColor }}
          >
            {item.badge}
          </div>
        )}
        
        {/* أيقونة الضمان */}
        <div 
          className={cn(
            "mx-auto mb-4 flex items-center justify-center",
            iconSizeConfig.container,
            iconShapeClass,
            iconStyle === 'filled' ? "text-white" : "text-accent border-2",
          )}
          style={{ 
            backgroundColor: iconStyle === 'filled' ? (item.iconColor || accentColor) : 'transparent',
            borderColor: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'transparent',
            color: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'white'
          }}
        >
          {React.cloneElement(iconElement as React.ReactElement, { size: iconSizeConfig.icon })}
        </div>
        
        {/* معلومات الضمان */}
        <h3 
          className="text-lg font-bold mb-3"
          style={{ color: headingColor || textColor }}
        >
          {item.title}
        </h3>
        
        <p 
          className="opacity-80 text-sm mb-3"
          style={{ color: textColor }}
        >
          {item.description}
        </p>

        {/* النص المميز */}
        {item.highlight && (
          <div className="mt-auto">
            <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {item.highlight}
            </span>
          </div>
        )}

        {/* زر إضافي إذا كان مطلوب */}
        {item.includeButton && item.buttonText && (
          <button className="mt-4 w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm">
            {item.buttonText}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div 
      style={{ 
        backgroundColor, 
        color: textColor,
        paddingTop: containerPadding,
        paddingBottom: containerPadding
      }} 
      className="py-12 px-4 overflow-hidden"
    >
      <div className="container mx-auto max-w-6xl">
        {/* عنوان القسم */}
        {(title || subtitle) && (
          <div className={cn("mb-10", textAlignment === 'center' ? 'text-center' : '')}>
            {title && (
              <motion.h2 
                className="text-3xl font-bold mb-4" 
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: animationDuration || 0.5 }}
                viewport={{ once: true }}
                style={{ color: headingColor || textColor }}
              >
                {title}
              </motion.h2>
            )}
            
            {subtitle && (
              <motion.p 
                className="text-lg opacity-80 max-w-3xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: animationDuration || 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                style={{ color: textColor }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}
        
        {/* قائمة الضمانات */}
        <div 
          className={cn(
            layout === 'list' ? "space-y-4" : `grid grid-cols-1 gap-6 ${getGridCols()}`
          )}
          style={{ gap: itemSpacing }}
        >
          {items.map((item: any, index: number) => renderGuaranteeItem(item, index))}
        </div>
      </div>
    </div>
  );
};

export default GuaranteesComponentPreview;
