import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
          const data = await getTestimonials(organizationId, { active: true });
          // تحويل البيانات من تنسيق قاعدة البيانات إلى تنسيق المكون
          const convertedData = data.map(item => ({
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

  return (
    <div className={cn("py-12 px-4", getSectionClassNames())} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">{displayTitle}</h2>
          <p className={cn(
            "max-w-2xl mx-auto",
            backgroundColor === 'dark' ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
          )}>
            {displayDescription}
          </p>
        </div>

        {testimonials.length > 0 ? (
          <div className="relative">
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                aria-label={t('customerTestimonials.previousItem')}
                className="h-10 w-10 rounded-full"
                disabled={testimonials.length <= displayedCount}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                aria-label={t('customerTestimonials.nextItem')}
                className="h-10 w-10 rounded-full"
                disabled={testimonials.length <= displayedCount}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>

            <div className={cn(
              "grid gap-6",
              displayedCount === 1 ? "grid-cols-1" :
                displayedCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                  "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            )}>
              {visibleTestimonials.map((testimonial, index) => (
                <div key={`testimonial-${testimonial.id}-${activeIndex + index}`} className="h-full">
                  <div className={getCardClassNames()}>
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                </div>
              ))}
            </div>

            {testimonials.length > displayedCount && (
              <div className="flex justify-center mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={`nav-dot-${index}`}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "h-2 w-2 mx-1 rounded-full transition-colors",
                      index >= activeIndex && index < activeIndex + displayedCount
                        ? "bg-primary"
                        : backgroundColor === 'dark'
                          ? "bg-gray-700 hover:bg-gray-600"
                          : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
                    )}
                    aria-label={`${t('customerTestimonials.item')} ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-muted-foreground">{t('customerTestimonials.noTestimonials')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerTestimonials;
