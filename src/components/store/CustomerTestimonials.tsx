import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star, Verified } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import TestimonialCard, { Testimonial } from "./TestimonialCard";
import { getTestimonials } from "@/lib/api/testimonials";
import { useTranslation } from 'react-i18next';

interface CustomerTestimonialsProps {
  title?: string;
  description?: string;
  organizationId?: string;
  visibleCount?: number;
  backgroundColor?: 'default' | 'light' | 'dark' | 'primary' | 'accent';
  cardStyle?: 'default' | 'outline' | 'elevated' | 'minimal';
  testimonials?: Testimonial[];
}

// دالة للحصول على الشهادات الافتراضية مع الترجمة
const getDefaultTestimonials = (t: any): Testimonial[] => {
  const testimonialsData = t('customerTestimonials.defaultTestimonials', { returnObjects: true });
  
  return testimonialsData.map((testimonial: any, index: number) => ({
    id: `${index + 1}`,
    customerName: testimonial.customerName,
    customerAvatar: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b612b412?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    ][index] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    rating: [5, 4.5, 5, 4, 5, 4.5][index] || 5,
    comment: testimonial.comment,
    verified: true,
    productName: testimonial.productName,
    productImage: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop"
    ][index] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop",
    purchaseDate: [
      "2023-09-15T12:00:00Z",
      "2023-08-20T09:30:00Z",
      "2023-07-10T15:45:00Z",
      "2023-10-05T11:20:00Z",
      "2023-09-28T14:15:00Z",
      "2023-10-10T08:30:00Z"
    ][index] || "2023-09-15T12:00:00Z",
  }));
};

export function CustomerTestimonials({
  title,
  description,
  organizationId,
  visibleCount = 3,
  backgroundColor = 'default',
  cardStyle = 'default',
  testimonials: initialTestimonials,
}: CustomerTestimonialsProps) {
  const { t } = useTranslation();
  
  // استخدام القيم المترجمة أو القيم المرسلة من props
  const displayTitle = title || t('customerTestimonials.title');
  const displayDescription = description || t('customerTestimonials.description');
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(1);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);

  // تعديل عدد العناصر المرئية حسب حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setDisplayedCount(Math.min(3, visibleCount));
      } else if (window.innerWidth >= 768) {
        setDisplayedCount(Math.min(2, visibleCount));
      } else {
        setDisplayedCount(1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visibleCount]);

  // جلب آراء العملاء من API إذا كان معرف المؤسسة متوفر
  useEffect(() => {
    // إذا تم تمرير آراء مباشرة، استخدمها
    if (initialTestimonials && initialTestimonials.length > 0) {
      setTestimonials(initialTestimonials);
      return;
    }

    // جلب آراء العملاء من API إذا كان معرف المؤسسة متوفر
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        if (organizationId) {
          // 🚀 محاولة استخدام البيانات المحفوظة من appInitializer أولاً
          const { getAppInitData } = await import('@/lib/appInitializer');
          const appData = getAppInitData();
          
          if (appData?.testimonials && appData.testimonials.length > 0) {
            const convertedData = appData.testimonials.map((item: any) => ({
              id: item.id,
              customerName: item.customer_name,
              customerAvatar: item.customer_avatar,
              rating: item.rating,
              comment: item.comment,
              verified: item.verified,
              purchaseDate: item.purchase_date,
              productName: item.product_name,
              productImage: item.product_image,
            }));
            setTestimonials(convertedData);
            setLoading(false);
            return;
          }
          
          // 🔄 إذا لم تتوفر البيانات المحفوظة، جلب من قاعدة البيانات مع التنسيق
          const { coordinateRequest } = await import('@/lib/api/requestCoordinator');
          
          const data = await coordinateRequest(
            'customer_testimonials',
            { 
              organization_id: organizationId,
              is_active: true,
              order: 'created_at.desc'
            },
            async () => {
              return await getTestimonials(organizationId, { active: true });
            },
            'CustomerTestimonials'
          );
          
          // تحويل البيانات من تنسيق قاعدة البيانات إلى تنسيق المكون
          const convertedData = data.map((item: any) => ({
            id: item.id,
            customerName: item.customer_name,
            customerAvatar: item.customer_avatar,
            rating: item.rating,
            comment: item.comment,
            verified: item.verified,
            purchaseDate: item.purchase_date,
            productName: item.product_name,
            productImage: item.product_image,
          }));
          setTestimonials(convertedData.length > 0 ? convertedData : getDefaultTestimonials(t));
        } else {
          setTestimonials(getDefaultTestimonials(t));
        }
      } catch (error) {
        setTestimonials(getDefaultTestimonials(t));
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [initialTestimonials, organizationId, t]);

  // تطبيق نمط البطاقة المحدد
  const getCardClassNames = () => {
    switch (cardStyle) {
      case 'outline':
        return 'border-2 shadow-none bg-transparent';
      case 'elevated':
        return 'border-0 shadow-lg hover:shadow-xl';
      case 'minimal':
        return 'border-0 shadow-none bg-transparent';
      default:
        return '';
    }
  };

  // تطبيق لون الخلفية المحدد
  const getSectionClassNames = () => {
    switch (backgroundColor) {
      case 'light':
        return 'bg-gray-50 dark:bg-gray-900/30';
      case 'dark':
        return 'bg-gray-900 text-white dark:bg-gray-950';
      case 'primary':
        return 'bg-primary/10 dark:bg-primary/20';
      case 'accent':
        return 'bg-secondary/10 dark:bg-secondary/20';
      default:
        return 'bg-background';
    }
  };

  const handlePrevious = () => {
    setActiveIndex((prev) =>
      prev === 0 ? testimonials.length - displayedCount : prev - 1
    );
  };

  const handleNext = () => {
    setActiveIndex((prev) =>
      prev >= testimonials.length - displayedCount ? 0 : prev + 1
    );
  };

  // Auto-scroll للشهادات كل 5 ثوان
  useEffect(() => {
    if (testimonials.length <= displayedCount) return;
    
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length, displayedCount]);

  const visibleTestimonials = Array.from({ length: displayedCount }).map(
    (_, index) => {
      const testimonialIndex = (activeIndex + index) % testimonials.length;
      return testimonials[testimonialIndex];
    }
  );

  if (loading) {
    return (
      <div className={cn("py-12 px-4", getSectionClassNames())}>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">{t('customerTestimonials.loading')}</p>
        </div>
      </div>
    );
  }

  // مكون بطاقة شهادة بتصميم جديد كلياً
  const ElegantTestimonialCard = ({ testimonial, index }: { testimonial: Testimonial; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      {/* البطاقة الرئيسية */}
      <div className="relative p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group-hover:scale-[1.02]">
        
        {/* شريط علوي ملون */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-2xl"></div>
        
        {/* المحتوى */}
        <div className="space-y-4">
          
          {/* النجوم والتقييم */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-4 h-4",
                    i < Math.floor(testimonial.rating) 
                      ? "text-yellow-400 fill-yellow-400" 
                      : "text-gray-200 dark:text-gray-700"
                  )}
                />
              ))}
            </div>
            {testimonial.verified && (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Verified className="w-4 h-4" />
                <span className="text-xs font-medium">مؤكد</span>
              </div>
            )}
          </div>

          {/* نص الشهادة */}
          <blockquote className="text-gray-700 dark:text-gray-300 leading-relaxed relative">
            <Quote className="absolute -top-2 -right-2 w-8 h-8 text-primary/20 transform rotate-180" />
            <p className="text-base relative z-10 pr-4">
              {testimonial.comment}
            </p>
          </blockquote>

          {/* خط فاصل رفيع */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>

          {/* معلومات العميل */}
          <div className="flex items-center gap-3">
            <img
              src={testimonial.customerAvatar}
              alt={testimonial.customerName}
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
            />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {testimonial.customerName}
              </h4>
              {testimonial.productName && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  اشترى {testimonial.productName}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                {testimonial.rating}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                من 5
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className={cn("py-16 px-4", getSectionClassNames())} dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* العنوان والوصف بتصميم بسيط */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {displayTitle}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {displayDescription}
          </p>
        </motion.div>

        {testimonials.length > 0 ? (
          <div className="relative">
            
            {/* أزرار التنقل المبسطة */}
            {testimonials.length > displayedCount && (
              <div className="flex justify-center gap-4 mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  aria-label={t('customerTestimonials.previousItem')}
                  className="rounded-full"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  aria-label={t('customerTestimonials.nextItem')}
                  className="rounded-full"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* الشهادات */}
            <div className={cn(
              "grid gap-6",
              displayedCount === 1 ? "grid-cols-1 max-w-2xl mx-auto" :
                displayedCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              <AnimatePresence mode="wait">
                {visibleTestimonials.map((testimonial, index) => (
                  <ElegantTestimonialCard
                    key={`testimonial-${testimonial.id}-${activeIndex + index}`}
                    testimonial={testimonial}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* مؤشرات التنقل المبسطة */}
            {testimonials.length > displayedCount && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mt-8 gap-2"
              >
                {Array.from({ length: Math.ceil(testimonials.length / displayedCount) }).map((_, index) => (
                  <button
                    key={`nav-dot-${index}`}
                    onClick={() => setActiveIndex(index * displayedCount)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      Math.floor(activeIndex / displayedCount) === index
                        ? "bg-primary scale-125"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    )}
                    aria-label={`${t('customerTestimonials.item')} ${index + 1}`}
                  />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl"
          >
            <Quote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('customerTestimonials.noTestimonials')}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default CustomerTestimonials;
