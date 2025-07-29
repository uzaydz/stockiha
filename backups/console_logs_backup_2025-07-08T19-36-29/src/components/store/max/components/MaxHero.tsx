import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Truck, ShieldCheck, Gem, Clock, Award, HeartHandshake, CheckCircle, Star, Sparkles } from 'lucide-react';
import { StoreData } from '@/api/optimized-store-api';
import { cn } from '@/lib/utils';

// أنماط CSS مخصصة للتابلت والأجهزة المتوسطة
const customStyles = `
  /* تحسينات للتابلت */
  @media (min-width: 768px) and (max-width: 1023px) {
    .hero-title {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      line-height: 1.1;
    }
    
    .hero-description {
      font-size: clamp(1.125rem, 2.5vw, 1.375rem);
      line-height: 1.5;
    }
    
    .hero-button {
      font-size: clamp(0.875rem, 2vw, 1rem);
      padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem);
    }
    
    .trust-badge-text {
      font-size: clamp(0.875rem, 1.8vw, 1rem);
    }
  }
  
  /* تحسينات للشاشات الصغيرة */
  @media (max-width: 767px) {
    .hero-title {
      font-size: clamp(1.875rem, 8vw, 2.5rem);
      line-height: 1.2;
    }
    
    .hero-description {
      font-size: clamp(1rem, 4vw, 1.25rem);
      line-height: 1.5;
    }
  }
`;

// إدراج الأنماط في الـ head
if (typeof document !== 'undefined' && !document.getElementById('hero-custom-styles')) {
  const style = document.createElement('style');
  style.id = 'hero-custom-styles';
  style.textContent = customStyles;
  document.head.appendChild(style);
}

// أنماط أزرار محسّنة مع تدرجات لونية أنيقة
export const buttonStyles = {
  primary: "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300",
  secondary: "bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary text-secondary-foreground shadow-lg hover:shadow-xl transition-all duration-300",
  teal: "bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 dark:from-teal-700 dark:to-teal-800 dark:hover:from-teal-600 dark:hover:to-teal-700 text-white shadow-lg hover:shadow-teal-500/25 transition-all duration-300",
  blue: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300",
  purple: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300",
  amber: "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 dark:from-amber-700 dark:to-amber-800 dark:hover:from-amber-600 dark:hover:to-amber-700 text-white shadow-lg hover:shadow-amber-500/25 transition-all duration-300",
  emerald: "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 dark:from-emerald-700 dark:to-emerald-800 dark:hover:from-emerald-600 dark:hover:to-emerald-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-300",
  rose: "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 dark:from-rose-700 dark:to-rose-800 dark:hover:from-rose-600 dark:hover:to-rose-700 text-white shadow-lg hover:shadow-rose-500/25 transition-all duration-300",
  indigo: "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 dark:from-indigo-700 dark:to-indigo-800 dark:hover:from-indigo-600 dark:hover:to-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-300",
  neutral: "bg-gradient-to-r from-neutral-700 to-neutral-800 hover:from-neutral-600 hover:to-neutral-700 dark:from-neutral-600 dark:to-neutral-700 dark:hover:from-neutral-500 dark:hover:to-neutral-600 text-white shadow-lg hover:shadow-neutral-500/25 transition-all duration-300",
};

// أنماط أزرار ثانوية محسّنة مع حدود متوهجة
export const outlineButtonStyles = {
  primary: "border-2 border-primary text-primary hover:bg-primary/10 hover:border-primary/80 hover:shadow-lg hover:shadow-primary/20 dark:text-primary-foreground dark:hover:bg-primary/20 backdrop-blur-sm transition-all duration-300",
  secondary: "border-2 border-secondary text-secondary-foreground hover:bg-secondary/10 hover:border-secondary/80 hover:shadow-lg hover:shadow-secondary/20 dark:hover:bg-secondary/20 backdrop-blur-sm transition-all duration-300",
  teal: "border-2 border-teal-600 text-teal-600 hover:bg-teal-50 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/20 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-950/50 dark:hover:border-teal-400 backdrop-blur-sm transition-all duration-300",
  blue: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50 dark:hover:border-blue-400 backdrop-blur-sm transition-all duration-300",
  purple: "border-2 border-purple-600 text-purple-600 hover:bg-purple-50 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950/50 dark:hover:border-purple-400 backdrop-blur-sm transition-all duration-300",
  amber: "border-2 border-amber-600 text-amber-600 hover:bg-amber-50 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950/50 dark:hover:border-amber-400 backdrop-blur-sm transition-all duration-300",
  emerald: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-400 backdrop-blur-sm transition-all duration-300",
  rose: "border-2 border-rose-600 text-rose-600 hover:bg-rose-50 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:border-rose-400 backdrop-blur-sm transition-all duration-300",
  indigo: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-400 backdrop-blur-sm transition-all duration-300",
  neutral: "border-2 border-neutral-600 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-500 hover:shadow-lg hover:shadow-neutral-500/20 dark:border-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800/50 dark:hover:border-neutral-300 backdrop-blur-sm transition-all duration-300",
};

// تحويل اسم الأيقونة إلى مكون
const getIconComponent = (iconName: string | React.ElementType) => {
  if (typeof iconName !== 'string') {
    return iconName;
  }
  
  const iconMap: Record<string, React.ElementType> = {
    Truck,
    ShieldCheck,
    Gem,
    CheckCircle,
    Clock,
    Award,
    HeartHandshake,
    Star,
    Sparkles
  };
  
  return iconMap[iconName] || Gem;
};

interface MaxHeroProps {
  settings?: any;
  storeData: StoreData;
}

export const MaxHero: React.FC<MaxHeroProps> = ({ settings, storeData }) => {
  // الحصول على الصورة من قاعدة البيانات أو الإعدادات
  const getHeroImage = () => {
    // 1. أولوية للصورة من الإعدادات المخصصة
    if (settings?.imageUrl) {
      return settings.imageUrl;
    }
    
    // 2. البحث عن صورة هيرو في إعدادات المخصصة
    if (settings?.hero_image_url) {
      return settings.hero_image_url;
    }
    
    // 3. استخدام صورة الشعار إذا كانت متوفرة
    if (storeData.organization_details?.logo_url || storeData.organization_settings?.logo_url) {
      return storeData.organization_details?.logo_url || storeData.organization_settings?.logo_url;
    }
    
    // 4. صورة افتراضية جميلة كخيار أخير
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center';
  };

  // إعدادات افتراضية محسنة
  const defaultHeroData = {
    imageUrl: getHeroImage(),
    title: storeData.organization_details?.name || 'متجر إلكتروني متطور',
    description: storeData.organization_details?.description || 'اكتشف أفضل المنتجات بأفضل الأسعار مع تجربة تسوق استثنائية',
    primaryButtonText: 'تسوق الآن',
    primaryButtonLink: '/products',
    primaryButtonStyle: 'primary' as keyof typeof buttonStyles,
    secondaryButtonText: 'تعرف علينا',
    secondaryButtonLink: '/about',
    secondaryButtonStyle: 'primary' as keyof typeof outlineButtonStyles,
    trustBadges: [
      { icon: Truck, text: 'توصيل سريع' },
      { icon: ShieldCheck, text: 'دفع آمن' },
      { icon: Gem, text: 'جودة عالية' },
    ],
  };

  const heroData = { ...defaultHeroData, ...settings };

  // انيميشنز محسّنة ومتطورة
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1,
        duration: 0.6,
        ease: "easeOut"
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.7, 
        ease: [0.25, 0.46, 0.45, 0.94]
      } 
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      rotate: [0, 2, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="relative w-full min-h-[80vh] sm:min-h-[85vh] md:min-h-[75vh] lg:min-h-[85vh] xl:min-h-[90vh] bg-gradient-to-br from-background via-background/95 to-muted/20 dark:from-background dark:via-background/98 dark:to-muted/10 overflow-hidden -mt-2 sm:-mt-4 md:mt-0">
      {/* خلفية زخرفية متطورة مطابقة لـ StoreBanner */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-pattern opacity-30 dark:opacity-20"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      {/* تحسينات إضافية للخلفية */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50"></div>
      
      <div className="relative container mx-auto px-4 py-8 sm:py-12 md:py-16 lg:py-24 xl:py-32">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 xl:gap-20 items-center">
          
          {/* قسم النص المحسّن */}
          <motion.div 
            className="flex flex-col justify-center space-y-6 md:space-y-8 order-2 lg:order-1 text-center lg:text-start"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {/* عنصر زخرفي للعنوان */}
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <motion.h1 
                className="hero-title text-3xl xs:text-4xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black mb-4 md:mb-6 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-[1.1] tracking-tight"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {heroData.title}
              </motion.h1>
              
              {/* خط زخرفي تحت العنوان */}
              <motion.div 
                className="absolute -bottom-2 h-1 rounded-full bg-gradient-to-r from-primary to-secondary left-0 right-0 mx-auto lg:mx-0"
                initial={{ width: 0 }}
                whileInView={{ width: "50%" }}
                transition={{ duration: 0.8, delay: 0.5 }}
                viewport={{ once: true }}
              />
            </motion.div>
            
            <motion.p 
              variants={itemVariants}
              className="hero-description text-lg sm:text-xl md:text-xl lg:text-2xl text-muted-foreground/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light"
            >
              {heroData.description}
            </motion.p>
            
            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start"
            > 
              {/* الزر الأول المحسّن */}
              {heroData.primaryButtonText && (
                <a href={heroData.primaryButtonLink}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button 
                      className={cn(
                        "hero-button w-full sm:w-auto text-base md:text-lg px-6 md:px-10 py-3 md:py-4 h-auto group font-semibold rounded-2xl", 
                        buttonStyles[heroData.primaryButtonStyle]
                      )}
                    >
                      {heroData.primaryButtonText}
                      <ArrowRight className="mr-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                </a>
              )}
              
              {/* الزر الثاني المحسّن */}
              {heroData.secondaryButtonText && (
                <a href={heroData.secondaryButtonLink}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button 
                      className={cn(
                        "hero-button w-full sm:w-auto text-base md:text-lg px-6 md:px-10 py-3 md:py-4 h-auto font-semibold rounded-2xl",
                        outlineButtonStyles[heroData.secondaryButtonStyle]
                      )}
                    >
                      {heroData.secondaryButtonText}
                    </button>
                  </motion.div>
                </a>
              )}
            </motion.div>

            {/* أيقونات الثقة المحسّنة */}
            {heroData.trustBadges && heroData.trustBadges.length > 0 && (
              <motion.div 
                variants={itemVariants} 
                className="flex flex-wrap gap-4 md:gap-6 lg:gap-8 justify-center lg:justify-start"
              >
                {heroData.trustBadges.map((badge: any, index: number) => {
                  const IconComponent = getIconComponent(badge.icon);
                  return (
                    <motion.div 
                      key={index} 
                      className="flex items-center gap-2 md:gap-3 text-sm md:text-base text-muted-foreground/80 group cursor-default"
                      whileHover={{ scale: 1.05, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-primary/80 transition-colors duration-300 relative z-10" />
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-150"></div>
                      </div>
                      <span className="trust-badge-text font-medium group-hover:text-foreground transition-colors duration-300">{badge.text}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* قسم الصورة المحسّن والمتطور */}
          <motion.div 
            className="group relative order-1 lg:order-2"
            initial={{ 
              opacity: 0, 
              x: 50, 
              rotateY: 15 
            }}
            whileInView={{ 
              opacity: 1, 
              x: 0, 
              rotateY: 0 
            }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true, amount: 0.3 }}
            variants={floatingVariants}
            animate="animate"
          >
            {/* إطار خارجي زخرفي */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-2xl scale-110 opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
            
            {/* الصورة الرئيسية */}
            <div className="relative aspect-square w-full max-w-md md:max-w-lg lg:max-w-full mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/40 border border-white/20 dark:border-white/10 backdrop-blur-sm group-hover:scale-[1.02] transition-all duration-700 ease-out">
              <img
                src={heroData.imageUrl}
                alt={heroData.title}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  // في حالة فشل تحميل الصورة، استخدم صورة احتياطية
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center';
                }}
                onLoad={() => {
                  console.log('✅ تم تحميل صورة الهيرو بنجاح:', heroData.imageUrl);
                }}
              />
              
              {/* طبقات تحسين بصرية متعددة */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 opacity-60"></div>
              
              {/* تأثير لمعان */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>

            {/* عناصر زخرفية عائمة */}
            <motion.div
              className="absolute w-8 h-8 bg-primary/30 rounded-full blur-sm -top-4 -left-4"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute w-12 h-12 bg-secondary/30 rounded-full blur-sm -bottom-6 -right-6"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}; 