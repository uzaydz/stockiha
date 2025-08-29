import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award,
  Users,
  Clock,
  Shield,
  Star,
  TrendingUp,
  Heart,
  CheckCircle,
  Target,
  Zap,
  ThumbsUp,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// قاموس الأيقونات المتاحة
const ICONS_MAP: Record<string, React.ReactNode> = {
  Award: <Award />,
  Users: <Users />,
  Clock: <Clock />,
  Shield: <Shield />,
  Star: <Star />,
  TrendingUp: <TrendingUp />,
  Heart: <Heart />,
  CheckCircle: <CheckCircle />,
  Target: <Target />,
  Zap: <Zap />,
  ThumbsUp: <ThumbsUp />,
  Crown: <Crown />
};

interface WhyChooseUsComponentProps {
  settings: {
    title?: string;
    subtitle?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    layout?: string;
    columns?: number;
    showNumbers?: boolean;
    showIcons?: boolean;
    animation?: string;
    items?: Array<{
      id: string;
      title: string;
      description: string;
      icon?: string;
      iconColor?: string;
      number?: string;
      highlight?: boolean;
    }>;
    [key: string]: any;
  };
  className?: string;
}

const WhyChooseUsComponent: React.FC<WhyChooseUsComponentProps> = ({ 
  settings, 
  className = '' 
}) => {
  const { 
    title = 'لماذا نحن؟', 
    subtitle = 'اكتشف الأسباب التي تجعلنا الخيار الأفضل لك', 
    backgroundColor = '#f8f9fa',
    textColor = '#333333',
    accentColor = '#4f46e5',
    layout = 'grid',
    columns = 3,
    showNumbers = false,
    showIcons = true,
    animation = 'fade',
    items = []
  } = settings;

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
      case 'slideInFromSides':
        return {
          initial: { opacity: 0, x: index % 2 === 0 ? -30 : 30 },
          whileInView: { opacity: 1, x: 0 },
          transition: { delay: index * 0.1, duration: 0.5 }
        };
      default:
        return {};
    }
  };

  // تحديد شكل مكون السبب
  const renderReasonItem = (item: any, index: number) => {
    const icon = item.icon && ICONS_MAP[item.icon] ? ICONS_MAP[item.icon] : <Star />;
    
    return (
      <motion.div
        key={item.id || index}
        {...getItemAnimation(index)}
        viewport={{ once: true, amount: 0.3 }}
        className={cn(
          "group relative p-6 rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100",
          layout === 'list' ? 'flex items-center gap-6' : 'text-center',
          item.highlight ? 'ring-2 ring-opacity-50' : '',
          "hover:scale-105 hover:-translate-y-2"
        )}
        style={{
          ringColor: item.highlight ? accentColor : 'transparent'
        }}
      >
        {/* تأثير الهالة للعناصر المميزة */}
        {item.highlight && (
          <div 
            className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
            style={{ backgroundColor: accentColor }}
          />
        )}

        {/* رقم الترتيب */}
        {showNumbers && (
          <div 
            className={cn(
              "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg",
              layout === 'list' ? 'relative top-0 right-0 shrink-0' : ''
            )}
            style={{ backgroundColor: accentColor }}
          >
            {item.number || (index + 1)}
          </div>
        )}
        
        {/* الأيقونة */}
        {showIcons && item.icon && (
          <div 
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg",
              layout === 'list' ? 'mb-0 shrink-0' : 'mx-auto'
            )}
            style={{ 
              backgroundColor: `${item.iconColor || accentColor}20`,
              border: `2px solid ${item.iconColor || accentColor}30`
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              size: 28,
              style: { color: item.iconColor || accentColor }
            })}
          </div>
        )}
        
        <div className={cn(layout === 'list' ? 'flex-1' : '')}>
          {/* العنوان */}
          <h3 
            className="font-bold text-xl mb-3 group-hover:text-opacity-80 transition-colors duration-300"
            style={{ color: textColor }}
          >
            {item.title}
          </h3>
          
          {/* الوصف */}
          <p 
            className="text-sm leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            style={{ color: textColor }}
          >
            {item.description}
          </p>
        </div>

        {/* تأثير الإضاءة عند التمرير */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white via-transparent to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />
        
        {/* خطوط الزخرفة */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: accentColor }}
        />
      </motion.div>
    );
  };

  if (!items || items.length === 0) {
    return (
      <section className={cn("py-16", className)} style={{ backgroundColor }}>
        <div className="container mx-auto px-4">
          <div className="text-center" style={{ color: textColor }}>
            <p>لا توجد أسباب محددة</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("py-16 relative overflow-hidden", className)} style={{ backgroundColor }}>
      <div className="container mx-auto px-4">
        {/* العنوان والعنوان الفرعي */}
        {(title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
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
          </motion.div>
        )}

        {/* قائمة الأسباب */}
        <div className={cn(
          "gap-6",
          layout === 'grid' 
            ? `grid grid-cols-1 ${getGridCols()}` 
            : 'space-y-6'
        )}>
          {items.map((item, index) => renderReasonItem(item, index))}
        </div>

        {/* تأثيرات الخلفية */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-20 right-20 w-32 h-32 rounded-full opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor }}
          />
          <div 
            className="absolute bottom-20 left-20 w-40 h-40 rounded-full opacity-10 animate-pulse"
            style={{ backgroundColor: accentColor, animationDelay: '1s' }}
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsComponent;
