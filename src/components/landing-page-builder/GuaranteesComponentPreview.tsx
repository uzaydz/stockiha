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
    layout = 'grid',
    columns = 3,
    iconStyle = 'filled',
    borderStyle = 'none',
    animation = 'fade',
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
    switch (animation) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          transition: { delay: index * 0.1, duration: 0.5 }
        };
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 30 },
          whileInView: { opacity: 1, y: 0 },
          transition: { delay: index * 0.1, duration: 0.5 }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.8 },
          whileInView: { opacity: 1, scale: 1 },
          transition: { delay: index * 0.1, duration: 0.5 }
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

  // تحديد شكل مكون الضمان
  const renderGuaranteeItem = (item: any, index: number) => {
    const iconElement = ICONS_MAP[item.icon] || <ShieldCheck />;
    
    if (layout === 'list') {
      return (
        <motion.div 
          key={item.id || index}
          className={cn(
            "flex gap-5 p-5 hover:bg-black/5 transition-all",
            getBorderStyle()
          )}
          {...getItemAnimation(index)}
        >
          {/* أيقونة الضمان */}
          <div 
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
              iconStyle === 'filled' ? "text-white" : "text-accent border-2",
            )}
            style={{ 
              backgroundColor: iconStyle === 'filled' ? (item.iconColor || accentColor) : 'transparent',
              borderColor: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'transparent',
              color: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'white'
            }}
          >
            {React.cloneElement(iconElement as React.ReactElement, { size: 24 })}
          </div>
          
          {/* معلومات الضمان */}
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2" style={{ color: textColor }}>
              {item.title}
            </h3>
            <p className="opacity-80 text-sm" style={{ color: textColor }}>
              {item.description}
            </p>
          </div>
        </motion.div>
      );
    }
    
    // تصميم Grid
    return (
      <motion.div 
        key={item.id || index}
        className={cn(
          "flex flex-col p-6 transition-all text-center",
          getBorderStyle()
        )}
        {...getItemAnimation(index)}
      >
        {/* أيقونة الضمان */}
        <div 
          className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
            iconStyle === 'filled' ? "text-white" : "text-accent border-2",
          )}
          style={{ 
            backgroundColor: iconStyle === 'filled' ? (item.iconColor || accentColor) : 'transparent',
            borderColor: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'transparent',
            color: iconStyle === 'outlined' ? (item.iconColor || accentColor) : 'white'
          }}
        >
          {React.cloneElement(iconElement as React.ReactElement, { size: 28 })}
        </div>
        
        {/* معلومات الضمان */}
        <h3 
          className="text-lg font-bold mb-3 text-center"
          style={{ color: textColor }}
        >
          {item.title}
        </h3>
        
        <p 
          className="opacity-80 text-sm text-center"
          style={{ color: textColor }}
        >
          {item.description}
        </p>
      </motion.div>
    );
  };

  return (
    <div style={{ backgroundColor, color: textColor }} className="py-12 px-4 overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        {/* عنوان القسم */}
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <motion.h2 
                className="text-3xl font-bold mb-4" 
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ color: textColor }}
              >
                {title}
              </motion.h2>
            )}
            
            {subtitle && (
              <motion.p 
                className="text-lg opacity-80 max-w-3xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{ color: textColor }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}
        
        {/* قائمة الضمانات */}
        <div className={cn(
          layout === 'list' ? "space-y-4" : `grid grid-cols-1 gap-6 ${getGridCols()}`
        )}>
          {items.map((item: any, index: number) => renderGuaranteeItem(item, index))}
        </div>
      </div>
    </div>
  );
};

export default GuaranteesComponentPreview; 