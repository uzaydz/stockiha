import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, ShieldCheck, Gem, Clock, Award, HeartHandshake, CheckCircle, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';

// أنماط CSS مخصصة للتابلت والأجهزة المتوسطة
const customStyles = `
  /* تحسينات للتابلت */
  @media (min-width: 768px) and (max-width: 1023px) {
    .banner-title {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      line-height: 1.1;
    }
    
    .banner-description {
      font-size: clamp(1.125rem, 2.5vw, 1.375rem);
      line-height: 1.5;
    }
    
    .banner-button {
      font-size: clamp(0.875rem, 2vw, 1rem);
      padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem);
    }
    
    .trust-badge-text {
      font-size: clamp(0.875rem, 1.8vw, 1rem);
    }
  }
  
  /* تحسينات للشاشات الصغيرة */
  @media (max-width: 767px) {
    .banner-title {
      font-size: clamp(1.875rem, 8vw, 2.5rem);
      line-height: 1.2;
    }
    
    .banner-description {
      font-size: clamp(1rem, 4vw, 1.25rem);
      line-height: 1.5;
    }
  }
`;

// إدراج الأنماط في الـ head
if (typeof document !== 'undefined' && !document.getElementById('banner-custom-styles')) {
  const style = document.createElement('style');
  style.id = 'banner-custom-styles';
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

// واجهة للبيانات التي قد تأتي من الخارج لاحقاً (اختياري)
interface HeroData {
  imageUrl: string;
  title: string;
  description: string;
  // دعم التنسيق القديم للأزرار
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  // دعم التنسيق الجديد للأزرار (من محرر المكون)
  primaryButton?: { 
    text: string; 
    link: string;
  };
  secondaryButton?: { 
    text: string; 
    link: string;
  };
  primaryButtonStyle?: keyof typeof buttonStyles;
  secondaryButtonStyle?: keyof typeof outlineButtonStyles;
  trustBadges?: { icon: React.ElementType | string; text: string }[];
}

// تحويل اسم الأيقونة إلى مكون
const getIconComponent = (iconName: string | React.ElementType) => {
  // إذا كان المدخل هو بالفعل مكون React، أعده كما هو
  if (typeof iconName !== 'string') {
    return iconName;
  }
  
  // خريطة للأيقونات المتاحة مع إضافة أيقونات جديدة
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
  
  // إرجاع المكون المناسب، أو Gem كافتراضي إذا لم يكن موجوداً
  return iconMap[iconName] || Gem;
};

// دالة لإنشاء بيانات الهيرو الافتراضية بناءً على الترجمة
const getDefaultHeroData = (t: any): HeroData => ({
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: t('banner.welcomeTitle'),
  description: t('banner.welcomeSubtitle'),
  primaryButtonText: t('banner.shopNow'),
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: t('banner.learnMore'),
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'primary',
  trustBadges: [
    { icon: Truck, text: t('banner.fastShipping') },
    { icon: ShieldCheck, text: t('banner.securePayment') },
    { icon: Gem, text: t('banner.qualityGuarantee') },
  ],
});

// بيانات الهيرو الافتراضية (للتوافق مع النظام الحالي)
const defaultHeroData: HeroData = {
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: 'أحدث المنتجات',
  description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
  primaryButtonText: 'تصفح الكل',
  primaryButtonLink: '/products',
  primaryButtonStyle: 'primary',
  secondaryButtonText: 'العروض الخاصة',
  secondaryButtonLink: '/offers',
  secondaryButtonStyle: 'primary',
  trustBadges: [
    { icon: Truck, text: 'توصيل سريع' },
    { icon: ShieldCheck, text: 'دفع آمن' },
    { icon: Gem, text: 'جودة عالية' },
  ],
};

const StoreBanner = ({ heroData }: { heroData?: HeroData }) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageSwitcher();

  // تحديد ما إذا كانت اللغة الحالية هي LTR أم RTL
  const isRTL = currentLanguage.direction === 'rtl';
  const isLTR = currentLanguage.direction === 'ltr';

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
        ease: [0.25, 0.46, 0.45, 0.94] // cubic-bezier للحركة الطبيعية
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
  
  // الحصول على البيانات الافتراضية المترجمة
  const translatedDefaultData = getDefaultHeroData(t);
  
  // استخدام البيانات المرسلة أو القيم الافتراضية المترجمة
  const currentHeroData = heroData || translatedDefaultData;
  
  // استخدام قيم افتراضية في حالة عدم وجود الخصائص
  const primaryStyle = currentHeroData.primaryButtonStyle || 'primary';
  const secondaryStyle = currentHeroData.secondaryButtonStyle || 'primary';
  
  // دالة مساعدة للتحقق من النصوص الافتراضية الثابتة
  const isDefaultText = (text: string) => {
    const defaultTexts = [
      // نصوص الأزرار
      'تسوق الآن', 'Shop Now', 'Acheter maintenant',
      'معلومات أكثر', 'Learn More', 'En savoir plus',
      'تصفح الكل', 'Browse All', 'Parcourir tout',
      'العروض الخاصة', 'Special Offers', 'Offres spéciales',
      
      // نصوص أيقونات الثقة
      'توصيل سريع', 'Fast Shipping', 'Livraison rapide',
      'دفع آمن', 'Secure Payment', 'Paiement sécurisé',
      'جودة عالية', 'Quality Guarantee', 'Garantie qualité',
      'دعم العملاء', 'Customer Support', 'Support client',
      
      // نصوص العناوين الافتراضية
      'أحدث المنتجات', 'Latest Products', 'Derniers produits',
      'مرحباً بك في متجرنا', 'Welcome to Our Store', 'Bienvenue dans notre boutique'
    ];
    return defaultTexts.includes(text);
  };

  // استخراج نصوص وروابط الأزرار مع إعطاء الأولوية للترجمة عند وجود نصوص افتراضية
  const getButtonText = (heroText?: string, translatedText?: string) => {
    if (!heroText || isDefaultText(heroText)) {
      return translatedText;
    }
    return heroText;
  };

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
  
  // استخدام العنوان والوصف المترجم إذا لم يتم توفيرهما أو كانوا افتراضيين
  const title = (!currentHeroData.title || isDefaultText(currentHeroData.title)) 
    ? translatedDefaultData.title 
    : currentHeroData.title;
    
  const description = (!currentHeroData.description || isDefaultText(currentHeroData.description))
    ? translatedDefaultData.description 
    : currentHeroData.description;
    
  // التحقق من نصوص أيقونات الثقة والاستعاضة بالترجمة إذا لزم الأمر
  const trustBadges = currentHeroData.trustBadges?.map((badge, index) => {
    // إذا كان النص افتراضياً، استخدم الترجمة
    if (isDefaultText(badge.text)) {
      // محاولة العثور على الترجمة المطابقة حسب الفهرس أو النوع
      const translatedBadge = translatedDefaultData.trustBadges?.[index] || 
                             translatedDefaultData.trustBadges?.find(tb => 
                               tb.icon === badge.icon || 
                               tb.text.includes('شحن') && badge.text.includes('توصيل') ||
                               tb.text.includes('دفع') && badge.text.includes('دفع') ||
                               tb.text.includes('جودة') && badge.text.includes('جودة')
                             );
      
      return {
        ...badge,
        text: translatedBadge?.text || badge.text
      };
    }
    return badge;
  }) || translatedDefaultData.trustBadges;
  
  return (
    <section className="relative w-full min-h-[80vh] sm:min-h-[85vh] md:min-h-[75vh] lg:min-h-[85vh] xl:min-h-[90vh] bg-gradient-to-br from-background via-background/95 to-muted/20 dark:from-background dark:via-background/98 dark:to-muted/10 overflow-hidden -mt-2 sm:-mt-4 md:mt-0">
      {/* خلفية زخرفية متطورة */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-pattern opacity-30 dark:opacity-20"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative container mx-auto px-4 py-8 sm:py-12 md:py-16 lg:py-24 xl:py-32">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 xl:gap-20 items-center">
          
          {/* قسم النص المحسّن */}
                      <motion.div 
            className={cn(
              "flex flex-col justify-center space-y-6 md:space-y-8",
              // للعربية: النص في العمود الأول، للإنجليزية والفرنسية: النص في العمود الثاني
              isRTL ? "order-2 lg:order-1 text-center lg:text-start" : "order-2 lg:order-2 text-center lg:text-end"
            )}
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
                className="banner-title text-3xl xs:text-4xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black mb-4 md:mb-6 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-[1.1] tracking-tight"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.h1>
              
              {/* خط زخرفي تحت العنوان */}
              <motion.div 
                className={cn(
                  "absolute -bottom-2 h-1 rounded-full",
                  // للعربية: تدرج من اليمين إلى اليسار، للإنجليزية والفرنسية: تدرج من اليسار إلى اليمين
                  isRTL 
                    ? "bg-gradient-to-r from-primary to-secondary left-0 lg:left-0 right-0 lg:right-auto mx-auto lg:mx-0" 
                    : "bg-gradient-to-l from-primary to-secondary left-0 lg:left-auto right-0 lg:right-0 mx-auto lg:mx-0"
                )}
                initial={{ width: 0 }}
                whileInView={{ width: "50%" }}
                transition={{ duration: 0.8, delay: 0.5 }}
                viewport={{ once: true }}
              />
            </motion.div>
            
            <motion.p 
              variants={itemVariants}
              className="banner-description text-lg sm:text-xl md:text-xl lg:text-2xl text-muted-foreground/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light"
            >
              {description}
            </motion.p>
            
            <motion.div 
              variants={itemVariants} 
              className={cn(
                "flex flex-col sm:flex-row gap-3 md:gap-4",
                // للعربية: محاذاة للوسط/بداية، للإنجليزية والفرنسية: محاذاة للوسط/نهاية
                isRTL 
                  ? "justify-center lg:justify-start" 
                  : "justify-center lg:justify-end"
              )}
            > 
              {/* الزر الأول المحسّن */}
              {primaryButtonText && (
                <Link to={primaryButtonLink}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button 
                      size="lg" 
                      className={cn(
                        "banner-button w-full sm:w-auto text-base md:text-lg px-6 md:px-10 py-3 md:py-4 h-auto group font-semibold rounded-2xl", 
                        buttonStyles[primaryStyle]
                      )}
                    >
                      {primaryButtonText}
                      <ArrowRight className={cn(
                        "h-5 w-5 group-hover:translate-x-1 transition-transform",
                        // للعربية: الأيقونة على اليمين ومعكوسة، للإنجليزية والفرنسية: على اليسار
                        isRTL 
                          ? "mr-3 rotate-180 group-hover:-translate-x-1" 
                          : "ml-3 group-hover:translate-x-1"
                      )} />
                    </Button>
                  </motion.div>
                </Link>
              )}
              
              {/* الزر الثاني المحسّن */}
              {secondaryButtonText && (
                <Link to={secondaryButtonLink}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className={cn(
                        "banner-button w-full sm:w-auto text-base md:text-lg px-6 md:px-10 py-3 md:py-4 h-auto font-semibold rounded-2xl",
                        outlineButtonStyles[secondaryStyle]
                      )}
                    >
                      {secondaryButtonText}
                    </Button>
                  </motion.div>
                </Link>
              )}
            </motion.div>

            {/* أيقونات الثقة المحسّنة */}
            {trustBadges && trustBadges.length > 0 && (
              <motion.div 
                variants={itemVariants} 
                className={cn(
                  "flex flex-wrap gap-4 md:gap-6 lg:gap-8",
                  // للعربية: محاذاة للوسط/بداية، للإنجليزية والفرنسية: محاذاة للوسط/نهاية
                  isRTL 
                    ? "justify-center lg:justify-start" 
                    : "justify-center lg:justify-end"
                )}
              >
                {trustBadges.map((badge, index) => {
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
            className={cn(
              "group relative",
              // للعربية: الصورة في العمود الثاني، للإنجليزية والفرنسية: الصورة في العمود الأول
              isRTL ? "order-1 lg:order-2" : "order-1 lg:order-1"
            )}
            initial={{ 
              opacity: 0, 
              x: isRTL ? 50 : -50, 
              rotateY: isRTL ? 15 : -15 
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
                src={currentHeroData.imageUrl}
                alt={title}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110"
              />
              
              {/* طبقات تحسين بصرية متعددة */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 opacity-60"></div>
              
              {/* تأثير لمعان */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>

            {/* عناصر زخرفية عائمة */}
            <motion.div
              className={cn(
                "absolute w-8 h-8 bg-primary/30 rounded-full blur-sm",
                // تموضع العناصر الزخرفية حسب الاتجاه
                isRTL ? "-top-4 -right-4" : "-top-4 -left-4"
              )}
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
              className={cn(
                "absolute w-12 h-12 bg-secondary/30 rounded-full blur-sm",
                // تموضع العناصر الزخرفية حسب الاتجاه
                isRTL ? "-bottom-6 -left-6" : "-bottom-6 -right-6"
              )}
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

export default StoreBanner;
