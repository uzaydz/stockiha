import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, Verified } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "./TestimonialCard";
import { getTestimonials } from "@/lib/api/testimonials";
import { useTranslation } from 'react-i18next';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';

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
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  // إضافة المتغيرات المفقودة
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(visibleCount);

  // 🔒 استخدام البيانات من useSharedStoreData بدلاً من الاستدعاءات المنفصلة
  const { testimonials: sharedTestimonials, isLoading: sharedLoading } = useSharedStoreData({
    includeTestimonials: true,
    enabled: !initialTestimonials // تفعيل فقط إذا لم تكن هناك بيانات أولية
  });

  // إضافة القيم المترجمة
  const displayTitle = title || t('customerTestimonials.title');
  const displayDescription = description || t('customerTestimonials.description');

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

  useEffect(() => {
    // إذا تم تمرير آراء مباشرة، استخدمها
    if (initialTestimonials && initialTestimonials.length > 0) {
      setTestimonials(initialTestimonials);
      return;
    }

    // 🔒 استخدام البيانات المشتركة من useSharedStoreData
    if (sharedTestimonials && sharedTestimonials.length > 0) {
      // تحويل البيانات من تنسيق قاعدة البيانات إلى تنسيق المكون
      const convertedData = sharedTestimonials.map((item: any) => ({
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
    } else {
      // استخدام البيانات الافتراضية إذا لم تكن هناك بيانات
      setTestimonials(getDefaultTestimonials(t));
    }
  }, [initialTestimonials, sharedTestimonials, t]);

  // تحديث حالة التحميل
  useEffect(() => {
    setLoading(sharedLoading);
  }, [sharedLoading]);

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

  // أدوات مساعدة للأفاتار الحرفي
  const stringToHsl = (str: string, s = 65, l = 55) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h} ${s}% ${l}%)`;
  };
  const getInitial = (name?: string) => {
    if (!name) return "؟";
    const trimmed = name.trim();
    if (!trimmed) return "؟";
    // دعم أسماء عربية/لاتينية، خذ أول حرف مرئي
    return trimmed.charAt(0).toUpperCase();
  };
  const PlainTestimonialCard: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => {
    return (
      <li className="h-full list-none">
        <article className="h-full rounded-xl border border-border/60 bg-card text-card-foreground p-5 shadow-sm">
          {/* العنوان: الاسم + تحقق + التقييم */}
          <header className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                aria-hidden
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm select-none flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${stringToHsl(testimonial.customerName || '')} 0%, ${stringToHsl((testimonial.customerName || '') + 'x', 60, 45)} 100%)`
                }}
              >
                <span className="text-sm leading-none">{getInitial(testimonial.customerName)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium truncate">{testimonial.customerName}</h3>
                {testimonial.productName && (
                  <p className="text-xs text-muted-foreground truncate">اشترى {testimonial.productName}</p>
                )}
              </div>
              {testimonial.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-medium">
                  <Verified className="w-3 h-3" /> موثّق
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-yellow-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-3.5 h-3.5", i < Math.round(testimonial.rating) ? "fill-yellow-400" : "text-muted-foreground/30")}/>
              ))}
              <span className="sr-only">تقييم {testimonial.rating} من 5</span>
            </div>
          </header>

          {/* التعليق */}
          <p className="text-sm leading-6 text-muted-foreground">
            {testimonial.comment}
          </p>
        </article>
      </li>
    );
  };

  return (
    <section className={cn("py-16 px-4", getSectionClassNames())} dir="rtl" aria-labelledby="testimonials-title">
      <div className="max-w-6xl mx-auto">
        {/* العنوان والوصف */}
        <div className="text-center mb-10">
          <h2 id="testimonials-title" className="text-2xl md:text-3xl font-semibold tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-3">
            {displayDescription}
          </p>
        </div>

        {testimonials.length > 0 ? (
          <div className="relative">
            {testimonials.length > displayedCount && (
              <div className="flex justify-center gap-3 mb-6">
                <Button variant="outline" size="icon" onClick={handlePrevious} aria-label={t('customerTestimonials.previousItem')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext} aria-label={t('customerTestimonials.nextItem')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}

            <ul className={cn(
              "grid gap-5",
              displayedCount === 1 ? "grid-cols-1 max-w-2xl mx-auto" :
              displayedCount === 2 ? "grid-cols-1 md:grid-cols-2" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              {visibleTestimonials.map((testimonial) => (
                <PlainTestimonialCard key={`testimonial-${testimonial.id}`} testimonial={testimonial} />
              ))}
            </ul>

            {testimonials.length > displayedCount && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: Math.ceil(testimonials.length / displayedCount) }).map((_, index) => (
                  <button
                    key={`nav-dot-${index}`}
                    onClick={() => setActiveIndex(index * displayedCount)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-colors",
                      Math.floor(activeIndex / displayedCount) === index
                        ? "bg-primary"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`${t('customerTestimonials.item')} ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
            <p className="text-muted-foreground">{t('customerTestimonials.noTestimonials')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerTestimonials;
