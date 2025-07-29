import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, ShieldCheck, Gem, Clock, Award, HeartHandshake, CheckCircle, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';

// مكون تحسين الصورة مع lazy loading
const OptimizedImage = React.memo(({ 
  src, 
  alt, 
  className, 
  onLoad 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  onLoad?: () => void; 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Skeleton loader */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-2xl" />
      )}
      
      {/* الصورة الرئيسية */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-700 ease-out",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
      
      {/* حالة الخطأ */}
      {hasError && (
        <div className="absolute inset-0 bg-muted/20 flex items-center justify-center rounded-2xl">
          <div className="text-muted-foreground text-center">
            <Gem className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">فشل في تحميل الصورة</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// أنماط أزرار محسّنة ومبسطة
export const buttonStyles = {
  primary: "bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 border-0",
  secondary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300",
  outline: "border-2 border-foreground text-foreground hover:bg-foreground hover:text-background shadow-lg hover:shadow-xl transition-all duration-300",
};

// واجهة البيانات
interface HeroData {
  imageUrl: string;
  title: string;
  description: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  primaryButton?: { text: string; link: string; };
  secondaryButton?: { text: string; link: string; };
  primaryButtonStyle?: keyof typeof buttonStyles;
  secondaryButtonStyle?: keyof typeof buttonStyles;
  trustBadges?: { icon: React.ElementType | string; text: string }[];
}

// تحويل اسم الأيقونة إلى مكون
const getIconComponent = (iconName: string | React.ElementType) => {
  if (typeof iconName !== 'string') {
    return iconName;
  }
  
  const iconMap: Record<string, React.ElementType> = {
    Truck, ShieldCheck, Gem, CheckCircle, Clock, Award, HeartHandshake, Star, Sparkles
  };
  
  return iconMap[iconName] || Gem;
};

// دالة لإنشاء بيانات الهيرو الافتراضية
const getDefaultHeroData = (t: any): HeroData => ({
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: t('banner.welcomeTitle'),
  description: t('banner.welcomeSubtitle'),
  primaryButtonText: t('banner.shopNow'),
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: t('banner.learnMore'),
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'outline',
  trustBadges: [
    { icon: Truck, text: t('banner.fastShipping') },
    { icon: ShieldCheck, text: t('banner.securePayment') },
    { icon: Gem, text: t('banner.qualityGuarantee') },
  ],
});

// بيانات افتراضية للتوافق
const defaultHeroData: HeroData = {
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: 'أحدث المنتجات',
  description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
  primaryButtonText: 'تصفح الكل',
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: 'العروض الخاصة',
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'outline',
  trustBadges: [
    { icon: Truck, text: 'توصيل سريع' },
    { icon: ShieldCheck, text: 'دفع آمن' },
    { icon: Gem, text: 'جودة عالية' },
  ],
};

const StoreBanner = ({ heroData }: { heroData?: HeroData }) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageSwitcher();
  const [imageLoaded, setImageLoaded] = useState(false);

  const isRTL = currentLanguage.direction === 'rtl';

  // انيميشنز مبسطة وسلسة
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

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.6, 
        ease: "easeOut"
      } 
    }
  };

  // الحصول على البيانات
  const translatedDefaultData = getDefaultHeroData(t);
  const currentHeroData = heroData || translatedDefaultData;
  
  // دالة للتحقق من النصوص الافتراضية
  const isDefaultText = (text: string) => {
    const defaultTexts = [
      'تسوق الآن', 'Shop Now', 'Acheter maintenant',
      'معلومات أكثر', 'Learn More', 'En savoir plus',
      'تصفح الكل', 'Browse All', 'Parcourir tout',
      'العروض الخاصة', 'Special Offers', 'Offres spéciales',
      'توصيل سريع', 'Fast Shipping', 'Livraison rapide',
      'دفع آمن', 'Secure Payment', 'Paiement sécurisé',
      'جودة عالية', 'Quality Guarantee', 'Garantie qualité',
      'أحدث المنتجات', 'Latest Products', 'Derniers produits',
      'مرحباً بك في متجرنا', 'Welcome to Our Store', 'Bienvenue dans notre boutique'
    ];
    return defaultTexts.includes(text);
  };

  const getButtonText = (heroText?: string, translatedText?: string) => {
    if (!heroText || isDefaultText(heroText)) {
      return translatedText;
    }
    return heroText;
  };

  // استخراج النصوص والروابط
  const primaryButtonText = getButtonText(
    currentHeroData.primaryButton?.text || currentHeroData.primaryButtonText,
    translatedDefaultData.primaryButtonText
  );
  const primaryButtonLink = currentHeroData.primaryButton?.link || currentHeroData.primaryButtonLink || translatedDefaultData.primaryButtonLink;
  
  const secondaryButtonText = getButtonText(
    currentHeroData.secondaryButton?.text || currentHeroData.secondaryButtonText,
    translatedDefaultData.secondaryButtonText
  );
  const secondaryButtonLink = currentHeroData.secondaryButton?.link || currentHeroData.secondaryButtonLink || translatedDefaultData.secondaryButtonLink;
  
  const title = (!currentHeroData.title || isDefaultText(currentHeroData.title)) 
    ? translatedDefaultData.title 
    : currentHeroData.title;
    
  const description = (!currentHeroData.description || isDefaultText(currentHeroData.description))
    ? translatedDefaultData.description 
    : currentHeroData.description;
    
  const trustBadges = currentHeroData.trustBadges?.map((badge, index) => {
    if (isDefaultText(badge.text)) {
      const translatedBadge = translatedDefaultData.trustBadges?.[index];
      return {
        ...badge,
        text: translatedBadge?.text || badge.text
      };
    }
    return badge;
  }) || translatedDefaultData.trustBadges;
  
      return (
      <section className="relative w-full bg-background overflow-hidden">
        {/* خلفية مبسطة وأنيقة */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
        
        <div className="relative container mx-auto px-4 navbar-spacer-lg pb-8 sm:navbar-spacer-lg sm:pb-10 md:navbar-spacer md:pb-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[40vh] sm:min-h-[50vh] lg:min-h-[60vh]">
          
          {/* قسم النص المحسّن */}
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
            <motion.div 
              variants={itemVariants} 
              className={cn(
                "flex flex-col sm:flex-row gap-4",
                isRTL ? "justify-center lg:justify-start" : "justify-center lg:justify-end"
              )}
            > 
              {primaryButtonText && (
                <Link to={primaryButtonLink}>
                  <Button 
                    size="lg" 
                    className={cn(
                      "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl group", 
                      buttonStyles[currentHeroData.primaryButtonStyle || 'primary']
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
              
              {secondaryButtonText && (
                <Link to={secondaryButtonLink}>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className={cn(
                      "w-full sm:w-auto text-lg px-8 py-6 h-auto font-semibold rounded-2xl",
                      buttonStyles[currentHeroData.secondaryButtonStyle || 'outline']
                    )}
                  >
                    {secondaryButtonText}
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* أيقونات الثقة */}
            {trustBadges && trustBadges.length > 0 && (
              <motion.div 
                variants={itemVariants} 
                className={cn(
                  "flex flex-wrap gap-6 lg:gap-8",
                  isRTL ? "justify-center lg:justify-start" : "justify-center lg:justify-end"
                )}
              >
                {trustBadges.map((badge, index) => {
                  const IconComponent = getIconComponent(badge.icon);
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <IconComponent className="h-5 w-5 text-primary" />
                      <span className="font-medium">{badge.text}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* قسم الصورة المحسّن */}
          <motion.div 
            className={cn(
              "relative",
              isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
            )}
            variants={imageVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
                         <div className="relative aspect-square w-full max-w-md mx-auto">
              {/* الصورة الرئيسية */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-border/20">
                <OptimizedImage
                  src={currentHeroData.imageUrl}
                  alt={title}
                  className="group-hover:scale-105"
                  onLoad={() => setImageLoaded(true)}
                />
                
                {/* طبقة تحسين بصرية */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
              </div>

              {/* عنصر زخرفي بسيط */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full blur-sm" />
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-secondary/20 rounded-full blur-sm" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default StoreBanner;
