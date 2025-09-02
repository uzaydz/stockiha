import React, { useState, useEffect, memo } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Star, 
  Store, 
  User, 
  ShoppingBag, 
  Building2, 
  Heart,
  Award,
  TrendingUp,
  Users,
  Sparkles,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: number;
  name: string;
  position: string;
  company: string;
  location: string;
  image: string;
  iconType: 'store' | 'user' | 'bag' | 'building';
  content: string;
  rating: number;
  businessType: string;
  results: {
    metric: string;
    improvement: string;
    icon: React.ElementType;
  }[];
}

const TestimonialsSection = memo(() => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  
  // بيانات الشهادات المبسطة
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'عبد القادر بن عيسى',
      position: 'صاحب محل',
      company: 'مكتبة النجاح',
      location: 'الجزائر العاصمة',
      image: '/images/testimonials/user-1-dz.jpg',
      iconType: 'store',
      content: 'منصة بازار سهّلت عليّ تنظيم الفواتير والمخزون بطريقة لم أتوقعها. الدعم التقني متجاوب جدًا والتطبيق سهل حتى لغير التقنيين.',
      rating: 5,
      businessType: 'مكتبة ومطبعة',
      results: [
        { metric: '+40%', improvement: 'زيادة المبيعات', icon: TrendingUp },
        { metric: '90%', improvement: 'توفير الوقت', icon: CheckCircle }
      ]
    },
    {
      id: 2,
      name: 'فاطمة الزهراء بوزيد',
      position: 'مديرة صالون',
      company: 'صالون لمسة حواء',
      location: 'وهران',
      image: '/images/testimonials/user-2-dz.jpg',
      iconType: 'user',
      content: 'جربت عدة أنظمة لكن لم أجد سهولة ودعم مثل بازار. كل شيء واضح وبالعربية الجزائرية.',
      rating: 5,
      businessType: 'صالون تجميل',
      results: [
        { metric: '+65%', improvement: 'رضا العملاء', icon: Heart },
        { metric: '3x', improvement: 'سرعة الخدمة', icon: Award }
      ]
    },
    {
      id: 3,
      name: 'سليم قشي',
      position: 'مدير',
      company: 'محل قشي للملابس',
      location: 'قسنطينة',
      image: '/images/testimonials/user-3-dz.jpg',
      iconType: 'bag',
      content: 'منصة جزائرية 100% تفهم السوق المحلي. سهولة في البيع أونلاين وربط مباشر مع الزبائن.',
      rating: 4,
      businessType: 'ملابس وأزياء',
      results: [
        { metric: '+120%', improvement: 'مبيعات أونلاين', icon: TrendingUp },
        { metric: '50%', improvement: 'عملاء جدد', icon: Users }
      ]
    }
  ];
  
  const iconMap = {
    'store': Store,
    'user': User,
    'bag': ShoppingBag,
    'building': Building2
  };
  
  // دوران تلقائي للشهادات
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section
      ref={containerRef}
      className="relative py-16 landing-bg-accent landing-section-transition"
    >
      <div className="container px-6 mx-auto relative z-10">
        {/* العنوان الرئيسي */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <Badge variant="secondary" className="mb-4 px-3 py-1.5 rounded-full text-sm">
            <Heart className="h-3 w-3 mr-1.5" />
            شهادات عملائنا
          </Badge>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            نفخر بثقة <span className="text-primary">تجارنا</span>
          </h2>
          
          <p className="text-muted-foreground">
            أكثر من 5000 تاجر جزائري يعتمدون على منصتنا
          </p>
        </motion.div>

        {/* الشهادة المميزة */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-lg">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="p-6 lg:p-8"
              >
                {(() => {
                  const testimonial = testimonials[activeIndex];
                  const IconComponent = iconMap[testimonial.iconType];
                  
                  return (
                    <div className="grid lg:grid-cols-2 gap-6 items-center">
                      {/* المحتوى */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2.5 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <Badge variant="secondary" className="mb-1.5 text-xs">
                              {testimonial.businessType}
                            </Badge>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {testimonial.location}
                            </p>
                          </div>
                        </div>
                        
                        <blockquote className="text-foreground leading-relaxed mb-4 text-sm">
                          "{testimonial.content}"
                        </blockquote>
                        
                        <div className="flex items-center gap-1.5 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={cn(
                                "w-4 h-4", 
                                i < testimonial.rating 
                                  ? "text-yellow-500 fill-yellow-500" 
                                  : "text-muted-foreground/30"
                              )} 
                            />
                          ))}
                          <span className="mr-2 text-sm text-foreground">
                            {testimonial.rating}/5
                          </span>
                        </div>
                        
                        {/* النتائج */}
                        <div className="grid grid-cols-2 gap-2">
                          {testimonial.results.map((result, i) => (
                            <div key={i} className="text-center p-2.5 rounded-lg bg-muted/50">
                              <result.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                              <div className="text-sm font-bold text-foreground">{result.metric}</div>
                              <div className="text-xs text-muted-foreground">{result.improvement}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* الملف الشخصي */}
                      <div className="text-center lg:text-right">
                        <Avatar className="h-20 w-20 mx-auto lg:mx-0 mb-4 border-3 border-background shadow-md">
                          <AvatarImage 
                            src={testimonial.image} 
                            alt={testimonial.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=random`;
                            }}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                            {testimonial.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-1">{testimonial.name}</h3>
                          <p className="text-primary font-medium text-sm mb-0.5">{testimonial.position}</p>
                          <p className="text-muted-foreground text-sm">{testimonial.company}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>

            {/* مؤشر النقاط */}
            <div className="flex justify-center gap-1.5 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === activeIndex 
                      ? "bg-primary w-6" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* شبكة الشهادات */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => {
            const IconComponent = iconMap[testimonial.iconType];
            
            return (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="h-full rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  {/* الرأس */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 border border-primary/20">
                      <AvatarImage 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=random`;
                        }}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {testimonial.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm mb-0.5 truncate">{testimonial.name}</h3>
                      <p className="text-muted-foreground text-xs truncate">{testimonial.position}</p>
                      <p className="text-muted-foreground text-xs truncate">{testimonial.company}</p>
                    </div>
                    
                    <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                      <IconComponent className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  
                  {/* التقييم */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-3.5 h-3.5", 
                            i < testimonial.rating 
                              ? "text-yellow-500 fill-yellow-500" 
                              : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {testimonial.businessType}
                    </Badge>
                  </div>
                  
                  {/* المحتوى */}
                  <blockquote className="text-muted-foreground leading-relaxed text-xs mb-3 line-clamp-3">
                    "{testimonial.content}"
                  </blockquote>
                  
                  {/* النتائج */}
                  <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-border">
                    {testimonial.results.slice(0, 2).map((result, i) => (
                      <div key={i} className="text-center">
                        <result.icon className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <div className="text-xs font-bold text-foreground">{result.metric}</div>
                        <div className="text-xs text-muted-foreground leading-tight">{result.improvement}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* دعوة للعمل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
            <div className="p-2.5 rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                انضم إلى آلاف التجار الناجحين
              </h3>
              <p className="text-sm text-muted-foreground">
                ابدأ رحلتك معنا اليوم
              </p>
            </div>
            <Button 
              size="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              ابدأ تجربتك المجانية
              <Sparkles className="h-4 w-4 mr-1.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

TestimonialsSection.displayName = 'TestimonialsSection';

export default TestimonialsSection;
