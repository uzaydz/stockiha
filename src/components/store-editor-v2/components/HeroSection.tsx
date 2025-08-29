import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Play, Pause, Star, Shield, Truck, Award, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  backgroundColor: string;
  primaryButton: {
    text: string;
    href: string;
    style: 'primary' | 'secondary' | 'outline';
  };
  secondaryButton?: {
    text: string;
    href: string;
    style: 'primary' | 'secondary' | 'outline';
  };
  trustBadges?: string[];
  overlay?: {
    enabled: boolean;
    opacity: number;
    color: string;
  };
}

export interface HeroSectionProps {
  slides: HeroSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showIndicators?: boolean;
  showTrustBadges?: boolean;
  height?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  isPreview?: boolean;
  className?: string;
}

const defaultSlides: HeroSlide[] = [
  {
    id: '1',
    title: 'مرحباً بك في متجرنا الإلكتروني',
    subtitle: 'أفضل المنتجات بأسعار منافسة',
    description: 'اكتشف مجموعة واسعة من المنتجات عالية الجودة مع خدمة عملاء استثنائية وتوصيل سريع إلى جميع أنحاء المملكة',
    backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    backgroundColor: 'from-indigo-600 to-purple-700',
    primaryButton: {
      text: 'تسوق الآن',
      href: '/products',
      style: 'primary'
    },
    secondaryButton: {
      text: 'اكتشف المزيد',
      href: '/about',
      style: 'outline'
    },
    trustBadges: ['ضمان الجودة', 'توصيل مجاني', 'دعم 24/7'],
    overlay: {
      enabled: true,
      opacity: 0.4,
      color: 'black'
    }
  },
  {
    id: '2',
    title: 'عروض خاصة لفترة محدودة',
    subtitle: 'خصومات تصل إلى 50%',
    description: 'لا تفوت الفرصة! عروض حصرية على أفضل المنتجات لفترة محدودة فقط. اطلب الآن واستفد من أسعار لا تُقاوم',
    backgroundImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    backgroundColor: 'from-red-500 to-pink-600',
    primaryButton: {
      text: 'اطلب الآن',
      href: '/offers',
      style: 'primary'
    },
    secondaryButton: {
      text: 'عرض العروض',
      href: '/deals',
      style: 'secondary'
    },
    trustBadges: ['عروض حقيقية', 'أفضل الأسعار', 'جودة مضمونة'],
    overlay: {
      enabled: true,
      opacity: 0.5,
      color: 'black'
    }
  },
  {
    id: '3',
    title: 'خدمة عملاء متميزة',
    subtitle: 'نحن هنا لخدمتك دائماً',
    description: 'فريق خدمة العملاء المتخصص لدينا جاهز لمساعدتك في أي وقت. تواصل معنا واحصل على الدعم الذي تحتاجه',
    backgroundImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
    backgroundColor: 'from-green-500 to-emerald-600',
    primaryButton: {
      text: 'تواصل معنا',
      href: '/contact',
      style: 'primary'
    },
    secondaryButton: {
      text: 'الأسئلة الشائعة',
      href: '/faq',
      style: 'outline'
    },
    trustBadges: ['دعم فوري', 'خبراء متخصصون', 'حلول سريعة'],
    overlay: {
      enabled: true,
      opacity: 0.3,
      color: 'black'
    }
  }
];

const HeroSection: React.FC<HeroSectionProps> = ({
  slides = defaultSlides,
  autoPlay = true,
  autoPlayInterval = 5000,
  showNavigation = true,
  showIndicators = true,
  showTrustBadges = true,
  height = 'lg',
  isPreview = false,
  className
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [direction, setDirection] = useState(0);

  // تحسين الأداء: استخدام useMemo للحسابات
  const heightClasses = useMemo(() => {
    switch (height) {
      case 'sm': return 'h-96';
      case 'md': return 'h-[500px]';
      case 'lg': return 'h-[600px]';
      case 'xl': return 'h-[700px]';
      case 'full': return 'h-screen';
      default: return 'h-[600px]';
    }
  }, [height]);

  const trustBadgeIcons = useMemo(() => ({
    'ضمان الجودة': Shield,
    'توصيل مجاني': Truck,
    'دعم 24/7': Users,
    'عروض حقيقية': Award,
    'أفضل الأسعار': Star,
    'جودة مضمونة': CheckCircle,
    'دعم فوري': Users,
    'خبراء متخصصون': Award,
    'حلول سريعة': CheckCircle
  }), []);

  // التحكم في السلايد شو
  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  // التشغيل التلقائي
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isPlaying, nextSlide, autoPlayInterval]);

  // تحسين الأداء: منع إعادة التصيير غير الضرورية
  const currentSlideData = useMemo(() => slides[currentSlide], [slides, currentSlide]);

  // متغيرات الحركة
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className={cn("relative overflow-hidden", heightClasses, className)}>
      {/* السلايدات */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0"
        >
          {/* صورة الخلفية */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${currentSlideData.backgroundImage})` }}
          />
          
          {/* التدرج الاحتياطي */}
          <div className={cn("absolute inset-0 bg-gradient-to-r", currentSlideData.backgroundColor)} />
          
          {/* الطبقة العلوية */}
          {currentSlideData.overlay?.enabled && (
            <div 
              className="absolute inset-0"
              style={{ 
                backgroundColor: currentSlideData.overlay.color,
                opacity: currentSlideData.overlay.opacity 
              }}
            />
          )}
          
          {/* المحتوى */}
          <div className="relative z-10 h-full flex items-center">
            <div className="container mx-auto px-6 lg:px-8">
              <div className="max-w-4xl">
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="space-y-6"
                >
                  {/* العنوان الفرعي */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg lg:text-xl font-medium text-white/90 mb-4"
                  >
                    {currentSlideData.subtitle}
                  </motion.p>
                  
                  {/* العنوان الرئيسي */}
                  <motion.h1
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight"
                  >
                    {currentSlideData.title}
                  </motion.h1>
                  
                  {/* الوصف */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg lg:text-xl text-white/80 max-w-2xl leading-relaxed"
                  >
                    {currentSlideData.description}
                  </motion.p>
                  
                  {/* الأزرار */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 pt-4"
                  >
                    <Button
                      size="lg"
                      className={cn(
                        "text-lg px-8 py-4 h-auto font-semibold transition-all duration-200",
                        currentSlideData.primaryButton.style === 'primary' && "bg-white text-gray-900 hover:bg-gray-100 shadow-lg hover:shadow-xl",
                        currentSlideData.primaryButton.style === 'secondary' && "bg-black/20 text-white border border-white/30 hover:bg-black/30",
                        currentSlideData.primaryButton.style === 'outline' && "bg-transparent text-white border-2 border-white hover:bg-white hover:text-gray-900"
                      )}
                      onClick={() => !isPreview && window.open(currentSlideData.primaryButton.href, '_blank')}
                    >
                      {currentSlideData.primaryButton.text}
                    </Button>
                    
                    {currentSlideData.secondaryButton && (
                      <Button
                        size="lg"
                        variant="outline"
                        className={cn(
                          "text-lg px-8 py-4 h-auto font-semibold transition-all duration-200",
                          currentSlideData.secondaryButton.style === 'primary' && "bg-white text-gray-900 hover:bg-gray-100",
                          currentSlideData.secondaryButton.style === 'secondary' && "bg-black/20 text-white border border-white/30 hover:bg-black/30",
                          currentSlideData.secondaryButton.style === 'outline' && "bg-transparent text-white border-2 border-white hover:bg-white hover:text-gray-900"
                        )}
                        onClick={() => !isPreview && window.open(currentSlideData.secondaryButton!.href, '_blank')}
                      >
                        {currentSlideData.secondaryButton.text}
                      </Button>
                    )}
                  </motion.div>
                  
                  {/* شارات الثقة */}
                  {showTrustBadges && currentSlideData.trustBadges && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="flex flex-wrap gap-4 pt-6"
                    >
                      {currentSlideData.trustBadges.map((badge, index) => {
                        const IconComponent = trustBadgeIcons[badge as keyof typeof trustBadgeIcons] || CheckCircle;
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
                          >
                            <IconComponent className="w-4 h-4 text-white" />
                            <span className="text-sm font-medium text-white">{badge}</span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* أزرار التنقل */}
      {showNavigation && slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/20 hover:bg-black/40 text-white border border-white/20 backdrop-blur-sm"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/20 hover:bg-black/40 text-white border border-white/20 backdrop-blur-sm"
            onClick={nextSlide}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}
      
      {/* مؤشرات السلايد */}
      {showIndicators && slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                index === currentSlide 
                  ? "bg-white shadow-lg" 
                  : "bg-white/40 hover:bg-white/60"
              )}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}
      
      {/* زر التشغيل/الإيقاف */}
      {autoPlay && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 text-white border border-white/20 backdrop-blur-sm"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
};

export default HeroSection;
