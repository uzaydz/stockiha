import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BannerContentProps, buttonStyles } from './types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * مكون محتوى البانر المحسن
 * يتضمن العنوان والوصف والأزرار مع تصميم عصري وجميل
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
  const { t } = useTranslation();
  // تفعيل الحركة على الشاشات الكبيرة فقط وبدون "تقليل الحركة"
  const [enableMotion, setEnableMotion] = useState(false);
  useEffect(() => {
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
      const shouldEnable = !prefersReduced && !isSmallScreen;
      setEnableMotion(shouldEnable);
    } catch {
      setEnableMotion(false);
    }
  }, []);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        staggerChildren: 0.2, 
        delayChildren: 0.1, 
        duration: 0.8, 
        ease: 'easeOut' as const 
      } 
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        duration: 0.6, 
        ease: 'easeOut' as const 
      } 
    }
  }), []);

  const buttonVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        duration: 0.5, 
        ease: 'easeOut' as const 
      } 
    }
  }), []);

  if (enableMotion) {
    return (
      <motion.div 
        className={cn(
          "flex flex-col justify-center space-y-8 p-6 lg:p-8",
          isRTL ? "order-2 lg:order-1 text-center" : "order-2 lg:order-2 text-center"
        )}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* العنوان الرئيسي مع تأثيرات جميلة */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="relative">
            {/* تأثير الوهج خلف العنوان */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-3xl opacity-60" />
            
            <h1 className="relative text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              {title}
            </h1>
            
            {/* خط تزييني تحت العنوان */}
            <div className="mt-4 w-24 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto" />
          </div>
        </motion.div>

        {/* الوصف مع تصميم محسن */}
        <motion.p 
          variants={itemVariants} 
          className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto opacity-90"
        >
          {description}
        </motion.p>

        {/* شارات الثقة المصغرة */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{t('banner.fastDelivery')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{t('banner.highQuality')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{t('banner.featuredProducts')}</span>
          </div>
        </motion.div>

        {/* الأزرار مع تصميم محسن */}
        {(primaryButtonText || secondaryButtonText) && (
          <motion.div 
            variants={buttonVariants} 
            className="flex flex-col sm:flex-row gap-4 pt-4 justify-center"
          > 
            {primaryButtonText && primaryButtonLink && (
              <Link to={primaryButtonLink}>
                <Button 
                  size="lg" 
                  className={cn(
                    "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group relative overflow-hidden",
                    buttonStyles[primaryButtonStyle]
                  )}
                >
                  {/* تأثير الخلفية المتحرك */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <span className="relative z-10 flex items-center gap-3">
                    {primaryButtonText}
                    <ArrowRight className={cn(
                      "h-5 w-5 transition-all duration-300 group-hover:scale-110", 
                      isRTL ? "rotate-180" : ""
                    )} />
                  </span>
                </Button>
              </Link>
            )}
            
            {secondaryButtonText && secondaryButtonLink && (
              <Link to={secondaryButtonLink}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={cn(
                    "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group relative overflow-hidden border-2",
                    buttonStyles[secondaryButtonStyle]
                  )}
                >
                  {/* تأثير الخلفية المتحرك */}
                  <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 via-transparent to-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <span className="relative z-10">
                    {secondaryButtonText}
                  </span>
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // نسخة خفيفة بدون حركات (موبايل)
  return (
    <div
      className={cn(
        "flex flex-col justify-center space-y-8 p-6 lg:p-8",
        isRTL ? "order-2 lg:order-1 text-center" : "order-2 lg:order-2 text-center"
      )}
    >
      {/* العنوان الرئيسي مع تأثيرات جميلة */}
      <div className="space-y-6">
        <div className="relative">
          {/* تأثير الوهج خلف العنوان */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-3xl opacity-60" />
          
          <h1 className="relative text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            {title}
          </h1>
          
          {/* خط تزييني تحت العنوان */}
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto" />
        </div>
      </div>

      {/* الوصف مع تصميم محسن */}
      <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto opacity-90">
        {description}
      </p>

      {/* شارات الثقة المصغرة */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>{t('banner.fastDelivery')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <span>{t('banner.highQuality')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{t('banner.featuredProducts')}</span>
        </div>
      </div>

      {/* الأزرار مع تصميم محسن */}
      {(primaryButtonText || secondaryButtonText) && (
        <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center"> 
          {primaryButtonText && primaryButtonLink && (
            <Link to={primaryButtonLink}>
              <Button 
                size="lg" 
                className={cn(
                  "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group relative overflow-hidden",
                  buttonStyles[primaryButtonStyle]
                )}
              >
                {/* تأثير الخلفية المتحرك */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="relative z-10 flex items-center gap-3">
                  {primaryButtonText}
                  <ArrowRight className={cn(
                    "h-5 w-5 transition-all duration-300 group-hover:scale-110", 
                    isRTL ? "rotate-180" : ""
                  )} />
                </span>
              </Button>
            </Link>
          )}
          
          {secondaryButtonText && secondaryButtonLink && (
            <Link to={secondaryButtonLink}>
              <Button 
                size="lg" 
                variant="outline" 
                className={cn(
                  "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group relative overflow-hidden border-2",
                  buttonStyles[secondaryButtonStyle]
                )}
              >
                {/* تأثير الخلفية المتحرك */}
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 via-transparent to-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="relative z-10">
                  {secondaryButtonText}
                </span>
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
});

BannerContent.displayName = 'BannerContent';

export default BannerContent;
