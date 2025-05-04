import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import TestimonialCard, { Testimonial } from "./TestimonialCard";
import { getTestimonials } from "@/lib/api/testimonials";

interface CustomerTestimonialsProps {
  title?: string;
  description?: string;
  organizationId?: string;
  visibleCount?: number;
  backgroundColor?: 'default' | 'light' | 'dark' | 'primary' | 'accent';
  cardStyle?: 'default' | 'outline' | 'elevated' | 'minimal';
  testimonials?: Testimonial[];
}

export function CustomerTestimonials({
  title = "آراء عملائنا",
  description = "استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا",
  organizationId,
  visibleCount = 3,
  backgroundColor = 'default',
  cardStyle = 'default',
  testimonials: initialTestimonials,
}: CustomerTestimonialsProps) {
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

  // جلب آراء العملاء من قاعدة البيانات
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
          const data = await getTestimonials(organizationId, true);
          setTestimonials(data.length > 0 ? data : defaultTestimonials);
        } else {
          console.warn('لم يتم تمرير معرف المؤسسة إلى مكون آراء العملاء');
          setTestimonials(defaultTestimonials);
        }
      } catch (error) {
        console.error('خطأ في جلب آراء العملاء:', error);
        setTestimonials(defaultTestimonials);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [initialTestimonials, organizationId]);

  const defaultTestimonials: Testimonial[] = [
    {
      id: "1",
      customerName: "أحمد محمود",
      customerAvatar: "/images/avatars/avatar-1.png",
      rating: 5,
      comment: "منتج رائع جداً! لقد استخدمته لمدة شهر وأنا سعيد جداً بالنتائج. التوصيل كان سريعاً والتغليف كان ممتازاً.",
      verified: true,
      productName: "سماعات بلوتوث لاسلكية",
      productImage: "/images/products/headphones.jpg",
      purchaseDate: "2023-09-15T12:00:00Z",
    },
    {
      id: "2",
      customerName: "فاطمة علي",
      customerAvatar: "/images/avatars/avatar-2.png",
      rating: 4.5,
      comment: "جودة المنتج ممتازة والسعر مناسب جداً مقارنة بالمنتجات المماثلة في السوق. أنصح الجميع بتجربته!",
      verified: true,
      productName: "ساعة ذكية",
      productImage: "/images/products/smartwatch.jpg",
      purchaseDate: "2023-08-20T09:30:00Z",
    },
    {
      id: "3",
      customerName: "محمد سعيد",
      customerAvatar: "/images/avatars/avatar-3.png",
      rating: 5,
      comment: "خدمة العملاء ممتازة والرد سريع على الاستفسارات. المنتج وصل بحالة ممتازة وبدون أي خدوش.",
      verified: true,
      productName: "تلفزيون ذكي 55 بوصة",
      productImage: "/images/products/tv.jpg",
      purchaseDate: "2023-07-10T15:45:00Z",
    },
    {
      id: "4",
      customerName: "نورا عبدالله",
      customerAvatar: "/images/avatars/avatar-4.png",
      rating: 4,
      comment: "المنتج جيد ولكن التوصيل تأخر قليلاً عن الموعد المحدد. بشكل عام أنا راضية عن التجربة.",
      verified: true,
      productName: "مكنسة كهربائية روبوتية",
      productImage: "/images/products/vacuum.jpg",
      purchaseDate: "2023-10-05T11:20:00Z",
    },
    {
      id: "5",
      customerName: "عمر حسن",
      customerAvatar: "/images/avatars/avatar-5.png",
      rating: 5,
      comment: "من أفضل المنتجات التي اشتريتها على الإطلاق! الجودة عالية جداً والأداء ممتاز. سأشتري منه مرة أخرى بالتأكيد.",
      verified: true,
      productName: "لابتوب للألعاب",
      productImage: "/images/products/laptop.jpg",
      purchaseDate: "2023-09-28T14:15:00Z",
    },
    {
      id: "6",
      customerName: "ليلى أحمد",
      customerAvatar: "/images/avatars/avatar-6.png",
      rating: 4.5,
      comment: "تجربة تسوق رائعة! المنتج مطابق للمواصفات المذكورة وسعره مناسب. أنصح به بشدة.",
      verified: true,
      productName: "آلة صنع القهوة",
      productImage: "/images/products/coffee-maker.jpg",
      purchaseDate: "2023-10-10T08:30:00Z",
    },
  ];

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
          <p className="mt-4 text-muted-foreground">جاري تحميل آراء العملاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-12 px-4", getSectionClassNames())} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          <p className={cn(
            "max-w-2xl mx-auto",
            backgroundColor === 'dark' ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
          )}>
            {description}
          </p>
        </div>

        {testimonials.length > 0 ? (
          <div className="relative">
            <div className="flex justify-between items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                aria-label="العنصر السابق"
                className="h-10 w-10 rounded-full"
                disabled={testimonials.length <= displayedCount}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                aria-label="العنصر التالي"
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
                    aria-label={`العنصر ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-muted-foreground">لا توجد آراء للعملاء متاحة حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerTestimonials; 