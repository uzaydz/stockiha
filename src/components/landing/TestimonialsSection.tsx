import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define the testimonial type
interface Testimonial {
  id: number;
  name: string;
  position: string;
  company: string;
  image: string;
  iconType: 'store' | 'user' | 'bag' | 'building';
  iconBg: string;
  iconColor: string;
  content: string;
  rating: number;
  businessType: string;
}

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  
  // Testimonials data
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'عبد القادر بن عيسى',
      position: 'صاحب محل',
      company: 'مكتبة النجاح - الجزائر العاصمة',
      image: '/images/testimonials/user-1-dz.jpg',
      iconType: 'store',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      content: 'منصة بازار سهّلت عليّ تنظيم الفواتير والمخزون. الدعم التقني متجاوب جدًا والتطبيق سهل حتى لغير التقنيين. أنصح بها لكل تاجر جزائري.',
      rating: 5,
      businessType: 'مكتبة'
    },
    {
      id: 2,
      name: 'فاطمة الزهراء بوزيد',
      position: 'مديرة صالون',
      company: 'صالون لمسة حواء - وهران',
      image: '/images/testimonials/user-2-dz.jpg',
      iconType: 'user',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      content: 'جربت عدة أنظمة لكن لم أجد سهولة ودعم مثل بازار. كل شيء واضح وبالعربية الجزائرية. وفر لي الوقت في تسيير المواعيد والمنتجات.',
      rating: 5,
      businessType: 'صالون تجميل'
    },
    {
      id: 3,
      name: 'سليم قشي',
      position: 'مدير',
      company: 'محل قشي للملابس - قسنطينة',
      image: '/images/testimonials/user-3-dz.jpg',
      iconType: 'bag',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      content: 'منصة جزائرية 100%. سهولة في البيع أونلاين وربط مباشر مع الزبائن. زادت مبيعاتي بفضل حلول بازار المحلية.',
      rating: 4,
      businessType: 'ملابس وأزياء'
    },
    {
      id: 4,
      name: 'ياسمين براهيمي',
      position: 'مديرة مقهى',
      company: 'مقهى الياسمين - سطيف',
      image: '/images/testimonials/user-4-dz.jpg',
      iconType: 'building',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      content: 'أخيرا وجدت تطبيق يسهل إدارة المقهى والفروع. كل شيء واضح بالدينار الجزائري والدعم دائمًا متواجد.',
      rating: 5,
      businessType: 'مقاهي ومطاعم'
    }
  ];
  
  // Function to render the correct icon based on iconType
  const renderIcon = (iconType: string, className: string) => {
    switch (iconType) {
      case 'store':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path>
            <path d="M2 7h20"></path>
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"></path>
            <path d="M18 12V7"></path>
            <path d="M14 12V7"></path>
            <path d="M10 12V7"></path>
            <path d="M6 12V7"></path>
            <path d="M2 7v3a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7"></path>
          </svg>
        );
      case 'user':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case 'bag':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
            <path d="M3 6h18"></path>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        );
      case 'building':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Auto rotate testimonials
  useEffect(() => {
    if (!autoplay) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoplay, testimonials.length]);
  
  const handlePrev = () => {
    setAutoplay(false);
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };
  
  const handleNext = () => {
    setAutoplay(false);
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };
  
  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ماذا يقول <span className="text-primary">عملاؤنا</span> عنا
          </h2>
          <p className="text-xl text-muted-foreground">
            آلاف التجار يعتمدون على منصتنا كل يوم لإدارة وتنمية أعمالهم
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Featured testimonial */}
          <motion.div 
            key={`testimonial-${activeIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-8 shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full -ml-20 -mb-20"></div>
            
            <div className="relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                  <Avatar className="h-16 w-16 border-4 border-background">
                    <AvatarImage 
                      src={testimonials[activeIndex].image} 
                      alt={testimonials[activeIndex].name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${testimonials[activeIndex].name}&background=random`;
                      }}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonials[activeIndex].name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-xl">{testimonials[activeIndex].name}</h3>
                    <p className="text-muted-foreground">
                      {testimonials[activeIndex].position} | {testimonials[activeIndex].company}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  testimonials[activeIndex].iconBg
                )}>
                  {renderIcon(testimonials[activeIndex].iconType, cn("w-6 h-6", testimonials[activeIndex].iconColor))}
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn(
                        "w-5 h-5", 
                        i < testimonials[activeIndex].rating 
                          ? "text-amber-500 fill-amber-500" 
                          : "text-muted"
                      )} 
                    />
                  ))}
                </div>
                <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  {testimonials[activeIndex].businessType}
                </div>
              </div>
              
              <div className="relative mb-6">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-8 w-8 text-primary/20 absolute -top-1 -right-1"
                >
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                </svg>
                <blockquote className="text-lg pr-6 pt-2 leading-relaxed">
                  {testimonials[activeIndex].content}
                </blockquote>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handlePrev}
                  className="h-9 w-9 rounded-full"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleNext}
                  className="h-9 w-9 rounded-full"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="absolute top-20 right-6">
                <div className="text-7xl text-primary/10 font-serif">"</div>
              </div>
            </div>
          </motion.div>
          
          {/* Right side - Testimonial grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((testimonial, index) => (
              <motion.button
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                onClick={() => {
                  setActiveIndex(index);
                  setAutoplay(false);
                }}
                className={cn(
                  "flex flex-col items-start p-5 rounded-lg border text-left transition-all",
                  index === activeIndex 
                    ? "bg-primary/5 border-primary scale-[1.02] shadow-md" 
                    : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <div className="flex gap-3 items-center">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=random`;
                        }} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-sm">{testimonial.name}</h4>
                      <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    testimonial.iconBg
                  )}>
                    {renderIcon(testimonial.iconType, cn("h-4 w-4", testimonial.iconColor))}
                  </div>
                </div>
                
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn(
                        "w-3.5 h-3.5", 
                        i < testimonial.rating 
                          ? "text-amber-500 fill-amber-500" 
                          : "text-muted"
                      )} 
                    />
                  ))}
                </div>
                
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {testimonial.content}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection; 