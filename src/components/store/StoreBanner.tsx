import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Truck, ShieldCheck, Gem, Clock, Award, HeartHandshake, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// أنماط أزرار متنوعة هادئة مع دعم الوضع الداكن
export const buttonStyles = {
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  secondary: "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
  teal: "bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800 text-white",
  blue: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white",
  amber: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white",
  rose: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800 text-white",
  indigo: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white",
  neutral: "bg-neutral-700 hover:bg-neutral-800 dark:bg-neutral-600 dark:hover:bg-neutral-700 text-white",
};

// أنماط أزرار ثانوية متنوعة هادئة مع دعم الوضع الداكن
export const outlineButtonStyles = {
  primary: "border-primary text-primary hover:bg-primary/10 dark:text-primary-foreground dark:hover:bg-primary/20",
  secondary: "border-secondary text-secondary-foreground hover:bg-secondary/10 dark:hover:bg-secondary/20",
  teal: "border-teal-600 text-teal-600 hover:bg-teal-50 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-950/50",
  blue: "border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50",
  purple: "border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950/50",
  amber: "border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950/50",
  emerald: "border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
  rose: "border-rose-600 text-rose-600 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/50",
  indigo: "border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950/50",
  neutral: "border-neutral-600 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800/50",
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
  
  // خريطة للأيقونات المتاحة
  const iconMap: Record<string, React.ElementType> = {
    Truck,
    ShieldCheck,
    Gem,
    CheckCircle,
    Clock,
    Award,
    HeartHandshake
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

const StoreBanner = ({ heroData = defaultHeroData }: { heroData?: HeroData }) => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.2,
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };
  
  // الحصول على البيانات الافتراضية المترجمة
  const translatedDefaultData = getDefaultHeroData(t);
  
  // استخدام قيم افتراضية في حالة عدم وجود الخصائص
  const primaryStyle = heroData.primaryButtonStyle || 'primary';
  const secondaryStyle = heroData.secondaryButtonStyle || 'primary';
  
  // استخراج نصوص وروابط الأزرار من التنسيق الجديد أو القديم مع الترجمة
  const primaryButtonText = heroData.primaryButton?.text || heroData.primaryButtonText || translatedDefaultData.primaryButtonText;
  const primaryButtonLink = heroData.primaryButton?.link || heroData.primaryButtonLink || translatedDefaultData.primaryButtonLink;
  const secondaryButtonText = heroData.secondaryButton?.text || heroData.secondaryButtonText || translatedDefaultData.secondaryButtonText;
  const secondaryButtonLink = heroData.secondaryButton?.link || heroData.secondaryButtonLink || translatedDefaultData.secondaryButtonLink;
  
  // استخدام العنوان والوصف المترجم إذا لم يتم توفيرهما
  const title = heroData.title || translatedDefaultData.title;
  const description = heroData.description || translatedDefaultData.description;
  const trustBadges = heroData.trustBadges || translatedDefaultData.trustBadges;
  
  return (
    <section className="w-full bg-gradient-to-b from-background to-muted/30 dark:to-muted/10 overflow-hidden">
      <div className="container mx-auto px-4 py-16 md:py-20 lg:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-20 items-center">
          
          {/* قسم النص */}
          <motion.div 
            className="flex flex-col justify-center text-center md:text-start order-2 md:order-1"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 text-foreground leading-tight tracking-tight"
            >
              {title}
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0"
            >
              {description}
            </motion.p>
            
            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8"
            > 
              {/* الزر الأول */}
              {primaryButtonText && (
                <Link to={primaryButtonLink}>
                  <Button 
                    size="lg" 
                    className={cn(
                      "w-full sm:w-auto text-base md:text-lg px-8 py-3 group shadow-sm hover:shadow-md transition-shadow", 
                      buttonStyles[primaryStyle]
                    )}
                  >
                    {primaryButtonText}
                    <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </Button>
                </Link>
              )}
              
              {/* الزر الثاني */}
              {secondaryButtonText && (
                <Link to={secondaryButtonLink}>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className={cn(
                      "w-full sm:w-auto text-base md:text-lg px-8 py-3",
                      outlineButtonStyles[secondaryStyle]
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
                className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3"
              >
                {trustBadges.map((badge, index) => {
                  const IconComponent = getIconComponent(badge.icon);
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconComponent className="h-5 w-5 text-primary/80" />
                      <span>{badge.text}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* قسم الصورة المحسّن */}
          <motion.div 
            className="order-1 md:order-2 group"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="relative aspect-square rounded-xl overflow-hidden shadow-2xl shadow-primary/10 border-4 border-background dark:border-gray-800/50 group-hover:scale-[1.02] transition-transform duration-500 ease-out">
              <img
                src={heroData.imageUrl}
                alt={heroData.title}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {/* تحسين بصري بطبقة تدرج خفيف */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default StoreBanner;
