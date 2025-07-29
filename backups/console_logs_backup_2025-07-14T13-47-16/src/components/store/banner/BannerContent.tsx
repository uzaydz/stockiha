import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BannerContentProps, buttonStyles } from './types';

/**
 * مكون محتوى البانر
 * يتضمن العنوان والوصف والأزرار
 */
const BannerContent = React.memo<BannerContentProps>(({
  title,
  description,
  primaryButtonText,
  primaryButtonLink,
  secondaryButtonText,
  secondaryButtonLink,
  primaryButtonStyle = 'primary',
  secondaryButtonStyle = 'outline',
  isRTL = false
}) => {
  // انيميشنز للمحتوى
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.1,
        duration: 0.5,
        ease: "easeOut"
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: "easeOut"
      } 
    }
  };

  return (
    <motion.div 
      className={cn(
        "flex flex-col justify-center space-y-6",
        isRTL ? "order-2 lg:order-1 text-center lg:text-start" : "order-2 lg:order-2 text-center lg:text-end"
      )}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* العنوان */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
          {title}
        </h1>
      </motion.div>
      
      {/* الوصف */}
      <motion.p 
        variants={itemVariants}
        className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0"
      >
        {description}
      </motion.p>
      
      {/* الأزرار */}
      {(primaryButtonText || secondaryButtonText) && (
        <motion.div 
          variants={itemVariants} 
          className={cn(
            "flex flex-col sm:flex-row gap-4",
            isRTL ? "justify-center lg:justify-start" : "justify-center lg:justify-end"
          )}
        > 
          {primaryButtonText && primaryButtonLink && (
            <Link to={primaryButtonLink}>
              <Button 
                size="lg" 
                className={cn(
                  "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group", 
                  buttonStyles[primaryButtonStyle]
                )}
              >
                {primaryButtonText}
                <ArrowRight className={cn(
                  "h-5 w-5 transition-transform group-hover:translate-x-1",
                  isRTL ? "mr-3 rotate-180 group-hover:-translate-x-1" : "ml-3"
                )} />
              </Button>
            </Link>
          )}
          
          {secondaryButtonText && secondaryButtonLink && (
            <Link to={secondaryButtonLink}>
              <Button 
                size="lg" 
                variant="outline" 
                className={cn(
                  "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl",
                  buttonStyles[secondaryButtonStyle]
                )}
              >
                {secondaryButtonText}
              </Button>
            </Link>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

BannerContent.displayName = 'BannerContent';

export default BannerContent; 