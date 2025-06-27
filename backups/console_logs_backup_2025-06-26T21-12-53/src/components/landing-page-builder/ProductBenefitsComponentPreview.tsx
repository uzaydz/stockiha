import React from 'react';
import { motion } from 'framer-motion';
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

// قاموس الأيقونات المتاحة
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

interface ProductBenefitsComponentPreviewProps {
  component: LandingPageComponent;
}

const ProductBenefitsComponentPreview: React.FC<ProductBenefitsComponentPreviewProps> = ({ component }) => {
  const { 
    title, 
    subtitle, 
    backgroundColor = '#f8f9fa',
    textColor = '#333333',
    accentColor = '#4f46e5',
    layout = 'grid',
    columns = 3,
    showImages = true,
    imagePosition = 'top',
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

  // تحديد شكل مكون الفائدة
  const renderBenefitItem = (item: any, index: number) => {
    const iconElement = ICONS_MAP[item.icon] || <Sparkles />;
    
    if (layout === 'list') {
      return (
        <motion.div 
          key={item.id || index}
          className="flex gap-5 p-5 rounded-lg hover:bg-black/5 transition-all"
          {...getItemAnimation(index)}
        >
          {/* أيقونة الفائدة */}
          <div 
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
              "text-white"
            )}
            style={{ backgroundColor: item.iconColor || accentColor }}
          >
            {React.cloneElement(iconElement as React.ReactElement, { size: 20 })}
          </div>
          
          {/* معلومات الفائدة */}
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2" style={{ color: textColor }}>
              {item.title}
            </h3>
            <p className="opacity-80" style={{ color: textColor }}>
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
          "flex flex-col p-6 rounded-lg hover:shadow-md transition-all",
          "border border-gray-100",
          imagePosition === 'top' ? "items-center text-center" : "items-start"
        )}
        {...getItemAnimation(index)}
      >
        {/* صورة الفائدة (إذا كان متاحًا ومفعلًا) */}
        {showImages && item.image && imagePosition === 'top' && (
          <div className="w-full mb-5 overflow-hidden rounded-lg">
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-full h-auto object-cover transition-transform hover:scale-105 aspect-video"
            />
          </div>
        )}
        
        {/* أيقونة الفائدة */}
        <div 
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
            "text-white"
          )}
          style={{ backgroundColor: item.iconColor || accentColor }}
        >
          {React.cloneElement(iconElement as React.ReactElement, { size: 22 })}
        </div>
        
        {/* معلومات الفائدة */}
        <h3 
          className={cn(
            "text-xl font-bold mb-3",
            imagePosition === 'top' ? "text-center" : "text-start"
          )}
          style={{ color: textColor }}
        >
          {item.title}
        </h3>
        
        <p 
          className={cn(
            "opacity-80",
            imagePosition === 'top' ? "text-center" : "text-start"
          )}
          style={{ color: textColor }}
        >
          {item.description}
        </p>
        
        {/* صورة الفائدة (للوضع الجانبي) */}
        {showImages && item.image && imagePosition === 'side' && (
          <div className="w-full mt-4 overflow-hidden rounded-lg">
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-full h-auto object-cover transition-transform hover:scale-105 aspect-video"
            />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="container mx-auto">
        {/* عنوان المكون */}
        {title && (
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ color: textColor }}
          >
            {title}
          </motion.h2>
        )}
        
        {/* العنوان الفرعي */}
        {subtitle && (
          <motion.p 
            className="text-lg text-center mb-12 max-w-3xl mx-auto opacity-80"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.8 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ color: textColor }}
          >
            {subtitle}
          </motion.p>
        )}
        
        {/* قائمة الفوائد */}
        <div 
          className={cn(
            layout === 'list' ? "flex flex-col space-y-4" : `grid grid-cols-1 ${getGridCols()} gap-8`
          )}
        >
          {items.map((item, index) => renderBenefitItem(item, index))}
        </div>
      </div>
    </section>
  );
};

export default ProductBenefitsComponentPreview;
