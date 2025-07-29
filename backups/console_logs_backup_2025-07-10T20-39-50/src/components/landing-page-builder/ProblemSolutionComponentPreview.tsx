import React from 'react';
import { AlertCircle, CheckCircle, XCircle, ThumbsDown, ThumbsUp, Frown, Smile, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProblemSolutionComponentPreviewProps {
  settings: any;
}

// This function returns the appropriate icon component
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'AlertCircle': return AlertCircle;
    case 'XCircle': return XCircle;
    case 'ThumbsDown': return ThumbsDown;
    case 'Frown': return Frown;
    case 'CheckCircle': return CheckCircle;
    case 'ThumbsUp': return ThumbsUp;
    case 'Smile': return Smile;
    case 'Heart': return Heart;
    default: return AlertCircle;
  }
};

// Get animation variants based on the setting
const getAnimationVariants = (animation: string) => {
  switch (animation) {
    case 'fade':
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      };
    case 'fade-up':
      return {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      };
    case 'fade-in':
      return {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
      };
    case 'slide-in':
      return {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      };
    case 'scale':
      return {
        hidden: { opacity: 0, scale: 0.85 },
        visible: { opacity: 1, scale: 1 }
      };
    default:
      return {
        hidden: { opacity: 1 },
        visible: { opacity: 1 }
      };
  }
};

const ProblemSolutionComponentPreview: React.FC<ProblemSolutionComponentPreviewProps> = ({ settings }) => {
  // Default settings if not provided
  const {
    title = 'المشكلة والحل',
    subtitle = 'اكتشف كيف يمكن لمنتجنا حل مشاكلك',
    backgroundColor = '#f8f9fa',
    textColor = '#333333',
    accentColor = '#4f46e5',
    layout = 'side-by-side',
    animation = 'fade',
    showMainImage = true,
    mainImage = '',
    useGradient = true,
    gradientStart = '#4338ca',
    gradientEnd = '#3b82f6',
    gradientDirection = 'to-r',
    enableShadows = true,
    borderRadius = 12,
    containerPadding = 48,
    headerAlignment = 'center',
    items = []
  } = settings;

  // Generate container style
  const containerStyle = {
    backgroundColor: useGradient ? 'transparent' : backgroundColor,
    color: textColor,
    padding: `${containerPadding}px`,
    borderRadius: `${borderRadius}px`,
    boxShadow: enableShadows ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
    backgroundImage: useGradient ? `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})` : 'none',
  };

  // Animation variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Define item variants based on animation type
  const itemVariants = getAnimationVariants(animation);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full overflow-hidden"
      style={containerStyle}
    >
      {/* Header Section */}
      <div className={cn("mx-auto max-w-4xl text-center mb-12", {
        "text-right": headerAlignment === 'right',
        "text-left": headerAlignment === 'left',
        "text-center": headerAlignment === 'center'
      })}>
        <h2 className="text-3xl font-bold mb-3" style={{ color: textColor }}>
          {title}
        </h2>
        <p className="text-lg opacity-90 max-w-2xl mx-auto" style={{ color: textColor }}>
          {subtitle}
        </p>
      </div>

      {/* Main Image (if enabled) */}
      {showMainImage && mainImage && (
        <div className="mx-auto max-w-3xl mb-12">
          <img 
            src={mainImage} 
            alt="Main visualization" 
            className="w-full h-auto rounded-xl object-cover"
            style={{ 
              borderRadius: `${borderRadius}px`,
              boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          />
        </div>
      )}

      {/* Problem-Solution Items Container */}
      <div className={cn(
        "grid gap-8", 
        {
          "grid-cols-1": layout === 'cascade',
          "grid-cols-1 md:grid-cols-2": layout === 'side-by-side' || layout === 'alternating',
          "grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6": layout === 'cards',
        }
      )}>
        {items.map((item: any, index: number) => {
          // Get Problem and Solution icons
          const ProblemIcon = getIconComponent(item.problemIconName);
          const SolutionIcon = getIconComponent(item.solutionIconName);

          // Layout specific styles and markup
          if (layout === 'side-by-side' || (layout === 'alternating' && index % 2 === 0)) {
            return (
              <motion.div 
                key={item.id}
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 rounded-xl overflow-hidden"
                style={{ 
                  boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                  borderRadius: `${borderRadius}px` 
                }}
                transition={{ duration: 0.3, delay: item.animationDelay || 0 }}
              >
                {/* Problem Side */}
                <div className="p-6 bg-red-50" style={{ borderTopLeftRadius: `${borderRadius}px`, borderBottomLeftRadius: `${borderRadius}px` }}>
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.problemIconColor}20` }}>
                      <ProblemIcon className="h-6 w-6" style={{ color: item.problemIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.problemTitle}</h3>
                  </div>
                  <p className="text-gray-700 mb-4">{item.problemDescription}</p>
                  {item.problemImage && (
                    <img 
                      src={item.problemImage} 
                      alt={item.problemTitle}
                      className="w-full h-auto rounded-lg"
                      style={{ borderRadius: `${borderRadius / 2}px` }}
                    />
                  )}
                </div>
                
                {/* Solution Side */}
                <div className="p-6 bg-green-50" style={{ borderTopRightRadius: `${borderRadius}px`, borderBottomRightRadius: `${borderRadius}px` }}>
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.solutionIconColor}20` }}>
                      <SolutionIcon className="h-6 w-6" style={{ color: item.solutionIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.solutionTitle}</h3>
                  </div>
                  <p className="text-gray-700 mb-4">{item.solutionDescription}</p>
                  {item.solutionImage && (
                    <img 
                      src={item.solutionImage} 
                      alt={item.solutionTitle}
                      className="w-full h-auto rounded-lg"
                      style={{ borderRadius: `${borderRadius / 2}px` }}
                    />
                  )}
                </div>
              </motion.div>
            );
          } else if (layout === 'alternating' && index % 2 === 1) {
            // Alternating layout with reversed ordering for odd items
            return (
              <motion.div 
                key={item.id}
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 rounded-xl overflow-hidden"
                style={{ 
                  boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                  borderRadius: `${borderRadius}px` 
                }}
                transition={{ duration: 0.3, delay: item.animationDelay || 0 }}
              >
                {/* Solution Side (first for odd items) */}
                <div className="p-6 bg-green-50" style={{ borderTopLeftRadius: `${borderRadius}px`, borderBottomLeftRadius: `${borderRadius}px` }}>
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.solutionIconColor}20` }}>
                      <SolutionIcon className="h-6 w-6" style={{ color: item.solutionIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.solutionTitle}</h3>
                  </div>
                  <p className="text-gray-700 mb-4">{item.solutionDescription}</p>
                  {item.solutionImage && (
                    <img 
                      src={item.solutionImage} 
                      alt={item.solutionTitle}
                      className="w-full h-auto rounded-lg"
                      style={{ borderRadius: `${borderRadius / 2}px` }}
                    />
                  )}
                </div>
                
                {/* Problem Side (second for odd items) */}
                <div className="p-6 bg-red-50" style={{ borderTopRightRadius: `${borderRadius}px`, borderBottomRightRadius: `${borderRadius}px` }}>
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.problemIconColor}20` }}>
                      <ProblemIcon className="h-6 w-6" style={{ color: item.problemIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.problemTitle}</h3>
                  </div>
                  <p className="text-gray-700 mb-4">{item.problemDescription}</p>
                  {item.problemImage && (
                    <img 
                      src={item.problemImage} 
                      alt={item.problemTitle}
                      className="w-full h-auto rounded-lg"
                      style={{ borderRadius: `${borderRadius / 2}px` }}
                    />
                  )}
                </div>
              </motion.div>
            );
          } else if (layout === 'cards') {
            // Cards layout with problem and solution in separate cards
            return (
              <motion.div 
                key={item.id}
                variants={itemVariants}
                className="flex flex-col gap-4"
                transition={{ duration: 0.3, delay: item.animationDelay || 0 }}
              >
                {/* Problem Card */}
                <div 
                  className="p-6 bg-white/90 rounded-xl"
                  style={{ 
                    boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                    borderRadius: `${borderRadius}px`,
                    borderRight: `4px solid ${item.problemIconColor}`
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.problemIconColor}20` }}>
                      <ProblemIcon className="h-6 w-6" style={{ color: item.problemIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.problemTitle}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <p className="text-gray-700">{item.problemDescription}</p>
                    
                    {item.problemImage && (
                      <div className="order-first md:order-last">
                        <img 
                          src={item.problemImage} 
                          alt={item.problemTitle}
                          className="w-full h-auto rounded-lg"
                          style={{ borderRadius: `${borderRadius / 2}px` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Solution Card */}
                <div 
                  className="p-6 bg-white/90 rounded-xl"
                  style={{ 
                    boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                    borderRadius: `${borderRadius}px`,
                    borderRight: `4px solid ${item.solutionIconColor}`
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${item.solutionIconColor}20` }}>
                      <SolutionIcon className="h-6 w-6" style={{ color: item.solutionIconColor }} />
                    </div>
                    <h3 className="text-xl font-bold mr-3">{item.solutionTitle}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <p className="text-gray-700">{item.solutionDescription}</p>
                    
                    {item.solutionImage && (
                      <div className="order-first md:order-last">
                        <img 
                          src={item.solutionImage} 
                          alt={item.solutionTitle}
                          className="w-full h-auto rounded-lg"
                          style={{ borderRadius: `${borderRadius / 2}px` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          } else if (layout === 'cascade') {
            // Cascade layout with problem and solution in a vertical flow
            return (
              <motion.div 
                key={item.id}
                variants={itemVariants}
                className="bg-white/90 rounded-xl overflow-hidden p-1"
                style={{ 
                  boxShadow: enableShadows ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                  borderRadius: `${borderRadius}px` 
                }}
                transition={{ duration: 0.3, delay: item.animationDelay || 0 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                  {/* Left Column - Problem */}
                  <div className="flex flex-col">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-full" style={{ backgroundColor: `${item.problemIconColor}20` }}>
                        <ProblemIcon className="h-6 w-6" style={{ color: item.problemIconColor }} />
                      </div>
                      <h3 className="text-xl font-bold mr-3">{item.problemTitle}</h3>
                    </div>
                    
                    <div className="bg-red-50 p-5 rounded-lg flex-grow">
                      <p className="text-gray-700 mb-4">{item.problemDescription}</p>
                      {item.problemImage && (
                        <img 
                          src={item.problemImage} 
                          alt={item.problemTitle}
                          className="w-full h-auto rounded-lg mt-2"
                          style={{ borderRadius: `${borderRadius / 2}px` }}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Right Column - Solution */}
                  <div className="flex flex-col">
                    <div className="flex items-center mb-4">
                      <div className="p-2 rounded-full" style={{ backgroundColor: `${item.solutionIconColor}20` }}>
                        <SolutionIcon className="h-6 w-6" style={{ color: item.solutionIconColor }} />
                      </div>
                      <h3 className="text-xl font-bold mr-3">{item.solutionTitle}</h3>
                    </div>
                    
                    <div className="bg-green-50 p-5 rounded-lg flex-grow">
                      <p className="text-gray-700 mb-4">{item.solutionDescription}</p>
                      {item.solutionImage && (
                        <img 
                          src={item.solutionImage} 
                          alt={item.solutionTitle}
                          className="w-full h-auto rounded-lg mt-2"
                          style={{ borderRadius: `${borderRadius / 2}px` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Down arrow connecting to next item */}
                {index < items.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                )}
              </motion.div>
            );
          }
          
          // Fallback layout
          return null;
        })}
      </div>
    </motion.div>
  );
};

export default ProblemSolutionComponentPreview;
