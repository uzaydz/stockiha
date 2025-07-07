import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { StoreData } from '@/api/optimized-store-api';

interface MaxTestimonialsProps {
  settings: any;
  storeData: StoreData;
}

export const MaxTestimonials: React.FC<MaxTestimonialsProps> = ({ settings, storeData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const defaultSettings = {
    title: 'آراء عملائنا',
    subtitle: 'اكتشف ما يقوله عملاؤنا عن تجربتهم معنا',
    autoPlay: true,
    autoPlayDelay: 5000,
    showRating: true,
    showNavigation: true
  };

  const testimonialSettings = { ...defaultSettings, ...settings };

  // تقييمات تجريبية
  const defaultTestimonials = [
    {
      id: '1',
      name: 'أحمد محمد',
      role: 'مهندس برمجيات',
      content: 'تجربة رائعة! المنتجات عالية الجودة والخدمة ممتازة. أنصح الجميع بالتسوق من هنا.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1887',
      date: '2024-01-15'
    },
    {
      id: '2',
      name: 'فاطمة العلي',
      role: 'طبيبة',
      content: 'سرعة في التوصيل وجودة في المنتجات. موقع موثوق وأسعار تنافسية جداً.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=1887',
      date: '2024-01-10'
    },
    {
      id: '3',
      name: 'محمد حسن',
      role: 'رجل أعمال',
      content: 'خدمة عملاء متميزة وحلول سريعة لأي مشكلة. بالتأكيد سأعود للشراء مرة أخرى.',
      rating: 4,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1770',
      date: '2024-01-05'
    },
    {
      id: '4',
      name: 'سارة أحمد',
      role: 'مصممة جرافيك',
      content: 'تنوع رائع في المنتجات وأسعار معقولة. التطبيق سهل الاستخدام والتصفح ممتع.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770',
      date: '2023-12-28'
    }
  ];

  const testimonials = defaultTestimonials; // يمكن استبدالها بالتقييمات الحقيقية من storeData

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index);
  };

  // التنقل التلقائي
  React.useEffect(() => {
    if (testimonialSettings.autoPlay) {
      const interval = setInterval(nextTestimonial, testimonialSettings.autoPlayDelay);
      return () => clearInterval(interval);
    }
  }, [testimonialSettings.autoPlay, testimonialSettings.autoPlayDelay]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* رأس القسم */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {testimonialSettings.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {testimonialSettings.subtitle}
          </p>
        </motion.div>

        {/* التقييم الرئيسي */}
        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-lg"
            >
              {/* أيقونة الاقتباس */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Quote className="h-8 w-8 text-primary" />
                </div>
              </div>

              {/* محتوى التقييم */}
              <div className="text-center">
                <p className="text-lg md:text-xl text-foreground leading-relaxed mb-8 italic">
                  "{testimonials[currentIndex].content}"
                </p>

                {/* التقييم بالنجوم */}
                {testimonialSettings.showRating && (
                  <div className="flex justify-center items-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= testimonials[currentIndex].rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* معلومات العميل */}
                <div className="flex items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
                    {testimonials[currentIndex].image ? (
                      <img
                        src={testimonials[currentIndex].image}
                        alt={testimonials[currentIndex].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-foreground">
                      {testimonials[currentIndex].name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {testimonials[currentIndex].role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* أزرار التنقل */}
          {testimonialSettings.showNavigation && testimonials.length > 1 && (
            <>
              <button
                onClick={prevTestimonial}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-background border border-border rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-primary hover:text-primary-foreground group"
                aria-label="التقييم السابق"
              >
                <ChevronRight className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
              
              <button
                onClick={nextTestimonial}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-background border border-border rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-primary hover:text-primary-foreground group"
                aria-label="التقييم التالي"
              >
                <ChevronLeft className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
            </>
          )}
        </div>

        {/* مؤشرات التقييمات */}
        {testimonials.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-primary scale-125'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`الانتقال إلى التقييم ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* شبكة التقييمات الإضافية */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16"
        >
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              variants={itemVariants}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
            >
              {/* التقييم بالنجوم */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= testimonial.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* محتوى التقييم */}
              <p className="text-muted-foreground mb-4 line-clamp-3">
                "{testimonial.content}"
              </p>

              {/* معلومات العميل */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                  {testimonial.image ? (
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* إحصائيات التقييمات */}
        <motion.div
          className="mt-16 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">4.8</div>
              <div className="text-muted-foreground">متوسط التقييم</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">تقييم إيجابي</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">رضا العملاء</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">دعم العملاء</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}; 