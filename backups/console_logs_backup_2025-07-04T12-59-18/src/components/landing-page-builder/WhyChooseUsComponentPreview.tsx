import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Award,
  Trophy,
  Headphones,
  Star,
  Shield,
  Zap,
  Clock,
  Heart
} from 'lucide-react';

// Map icon names to their components
const IconMap: Record<string, React.ReactNode> = {
  Award: <Award className="w-6 h-6" />,
  Trophy: <Trophy className="w-6 h-6" />,
  HeadphonesIcon: <Headphones className="w-6 h-6" />,
  Star: <Star className="w-6 h-6" />,
  Shield: <Shield className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  Clock: <Clock className="w-6 h-6" />,
  Heart: <Heart className="w-6 h-6" />
};

interface WhyChooseUsComponentPreviewProps {
  settings: {
    title: string;
    subtitle: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    layout: string;
    animation: string;
    backgroundImage?: string;
    useGradient: boolean;
    gradientStart: string;
    gradientEnd: string;
    gradientDirection: string;
    enableShadows: boolean;
    borderRadius: number;
    containerPadding: number;
    headerAlignment: string;
    showDivider: boolean;
    dividerColor: string;
    itemsCount: number;
    columns: number;
    showcaseImage?: string;
    imagePosition: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      iconColor: string;
      iconBackground: string;
      animation: string;
      animationDelay: number;
    }>;
    testimonial?: {
      enabled: boolean;
      quote: string;
      author: string;
      role: string;
      image?: string;
      rating: number;
    };
  };
}

const WhyChooseUsComponentPreview: React.FC<WhyChooseUsComponentPreviewProps> = ({ settings }) => {
  const containerStyle = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
    borderRadius: settings.borderRadius ? `${settings.borderRadius}px` : '0px',
    padding: `${settings.containerPadding || 48}px`,
    boxShadow: settings.enableShadows ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflow: 'hidden',
    position: 'relative' as const,
  };

  const gradientStyle = settings.useGradient ? {
    background: `linear-gradient(${settings.gradientDirection}, ${settings.gradientStart}, ${settings.gradientEnd})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } : {};

  const textContainerClass = settings.headerAlignment === 'center' ? 'text-center' : 'text-right';

  const showImage = settings.showcaseImage && settings.showcaseImage.length > 0;
  const showTestimonial = settings.testimonial?.enabled && settings.testimonial?.quote;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  const renderIcon = (iconName: string, color: string, bgColor: string) => {
    const IconComponent = IconMap[iconName] || <Award className="w-6 h-6" />;
    
    return (
      <div 
        className="p-3 rounded-full mb-4" 
        style={{ 
          backgroundColor: bgColor || 'rgba(139, 92, 246, 0.1)',
          color: color || '#8b5cf6',
          display: 'inline-flex'
        }}
      >
        {IconComponent}
      </div>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex mb-2 mt-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'fill-current' : 'stroke-current'}`}
            style={{ color: i < rating ? settings.accentColor : '#d1d5db' }}
          />
        ))}
      </div>
    );
  };

  // Determine the grid columns class based on settings
  const getGridClass = () => {
    switch(settings.columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-3';
    }
  };

  // Change layout based on the chosen design
  const renderLayout = () => {
    switch(settings.layout) {
      case 'modern':
        return renderModernLayout();
      case 'cards':
        return renderCardsLayout();
      case 'feature-focus':
        return renderFeatureFocusLayout();
      default:
        return renderModernLayout();
    }
  };

  const renderModernLayout = () => {
    return (
      <div className="flex flex-col-reverse md:flex-row gap-8 items-center">
        <div className={`flex-1 ${!showImage ? 'w-full' : ''}`}>
          <motion.div 
            className={`grid ${getGridClass()} gap-6`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {settings.items.map((item, index) => (
              <motion.div 
                key={item.id} 
                className="p-6 rounded-xl backdrop-blur-sm bg-white/10 transition-all duration-300 hover:shadow-lg"
                custom={index}
                variants={itemVariants}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: settings.enableShadows ? '0 4px 6px rgba(0, 0, 0, 0.05)' : 'none',
                }}
              >
                {renderIcon(item.icon, item.iconColor, item.iconBackground)}
                <h3 className="text-xl font-bold mb-2" style={{ color: settings.accentColor }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed opacity-90">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {showTestimonial && (
            <motion.div 
              className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-4xl absolute -top-4 right-4 opacity-20" style={{ color: settings.accentColor }}>"</div>
              {renderStars(settings.testimonial?.rating || 5)}
              <p className="text-lg italic mb-4">{settings.testimonial?.quote}</p>
              <div className="flex items-center">
                {settings.testimonial?.image && (
                  <img 
                    src={settings.testimonial.image} 
                    alt={settings.testimonial.author}
                    className="w-10 h-10 rounded-full mr-3 object-cover"
                  />
                )}
                <div>
                  <p className="font-bold">{settings.testimonial?.author}</p>
                  <p className="text-sm opacity-70">{settings.testimonial?.role}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {showImage && (
          <motion.div 
            className={`flex-1 ${settings.imagePosition === 'left' ? 'order-first' : ''}`}
            initial={{ opacity: 0, x: settings.imagePosition === 'left' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={settings.showcaseImage} 
              alt="Why Choose Us"
              className="rounded-xl max-w-full h-auto object-cover"
              style={{ 
                boxShadow: settings.enableShadows ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 'none',
                borderRadius: `${settings.borderRadius}px` 
              }}
            />
          </motion.div>
        )}
      </div>
    );
  };

  const renderCardsLayout = () => {
    return (
      <motion.div 
        className={`grid ${getGridClass()} gap-6`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {settings.items.map((item, index) => (
          <motion.div 
            key={item.id} 
            className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl transition-all duration-300 hover:shadow-xl"
            variants={itemVariants}
            custom={index}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: settings.enableShadows ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
            }}
          >
            <div className="flex items-start">
              <div 
                className="p-3 rounded-xl ml-4" 
                style={{ 
                  backgroundColor: item.iconBackground || 'rgba(139, 92, 246, 0.1)',
                  color: item.iconColor || '#8b5cf6',
                }}
              >
                {renderIcon(item.icon, item.iconColor, 'transparent')}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3" style={{ color: settings.accentColor }}>
                  {item.title}
                </h3>
                <p className="leading-relaxed opacity-90">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderFeatureFocusLayout = () => {
    return (
      <div className="flex flex-col md:flex-row gap-8">
        {showImage && (
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={settings.showcaseImage} 
              alt="Why Choose Us"
              className="rounded-xl max-w-full h-auto object-cover shadow-2xl"
              style={{ borderRadius: `${settings.borderRadius}px` }}
            />
          </motion.div>
        )}
        
        <div className={`${showImage ? 'md:w-1/2' : 'w-full'}`}>
          <motion.div 
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {settings.items.map((item, index) => (
              <motion.div 
                key={item.id} 
                className="flex items-start p-4 rounded-lg transition-all duration-300"
                variants={itemVariants}
                custom={index}
              >
                <div 
                  className="p-2 rounded-full mr-4" 
                  style={{ 
                    backgroundColor: item.iconBackground || 'rgba(139, 92, 246, 0.1)',
                    color: item.iconColor || '#8b5cf6',
                  }}
                >
                  {renderIcon(item.icon, item.iconColor, 'transparent')}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: settings.accentColor }}>
                    {item.title}
                  </h3>
                  <p className="text-sm opacity-90">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle} className="why-choose-us-component relative">
      {/* Optional overlay gradient */}
      {settings.useGradient && (
        <div 
          className="absolute inset-0 opacity-10 z-0" 
          style={{
            background: `linear-gradient(${settings.gradientDirection || 'to right'}, ${settings.gradientStart}, ${settings.gradientEnd})`,
          }}
        />
      )}
      
      <div className="relative z-10">
        <div className={`mb-12 ${textContainerClass}`}>
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={gradientStyle}
          >
            {settings.title}
          </motion.h2>
          
          <motion.p 
            className="text-lg opacity-80 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {settings.subtitle}
          </motion.p>
          
          {settings.showDivider && (
            <motion.div 
              className="my-6 mx-auto h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '80px' }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ 
                backgroundColor: settings.dividerColor || 'rgba(139, 92, 246, 0.3)',
                marginLeft: settings.headerAlignment === 'center' ? 'auto' : '0',
                marginRight: settings.headerAlignment === 'center' ? 'auto' : '0',
              }}
            />
          )}
        </div>
        
        {renderLayout()}
      </div>
    </div>
  );
};

export default WhyChooseUsComponentPreview;
