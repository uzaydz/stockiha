import React, { useState, useEffect, memo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Star, 
  Store, 
  User, 
  ShoppingBag, 
  Building2, 
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Heart,
  Award,
  TrendingUp,
  Users,
  Sparkles,
  MapPin,
  Calendar,
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
  gradient: string;
  bgGradient: string;
  content: string;
  rating: number;
  businessType: string;
  businessSize: string;
  joinDate: string;
  results: {
    metric: string;
    improvement: string;
    icon: React.ElementType;
  }[];
  featured?: boolean;
}

const TestimonialsSection = memo(() => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  // Enhanced testimonials data
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'عبد القادر بن عيسى',
      position: 'صاحب محل',
      company: 'مكتبة النجاح',
      location: 'الجزائر العاصمة',
      image: '/images/testimonials/user-1-dz.jpg',
      iconType: 'store',
      gradient: 'from-[#fc5d41] to-indigo-600',
      bgGradient: 'from-[#fc5d41]/10 to-indigo-600/10',
      content: 'منصة بازار سهّلت عليّ تنظيم الفواتير والمخزون بطريقة لم أتوقعها. الدعم التقني متجاوب جدًا والتطبيق سهل حتى لغير التقنيين. زادت مبيعاتي 40% في 3 أشهر فقط!',
      rating: 5,
      businessType: 'مكتبة ومطبعة',
      businessSize: 'متوسط',
      joinDate: '2023',
      results: [
        { metric: '+40%', improvement: 'زيادة المبيعات', icon: TrendingUp },
        { metric: '90%', improvement: 'توفير الوقت', icon: CheckCircle },
        { metric: '200+', improvement: 'عملاء جدد', icon: Users }
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
      gradient: 'from-pink-500 to-rose-600',
      bgGradient: 'from-pink-500/10 to-rose-600/10',
      content: 'جربت عدة أنظمة لكن لم أجد سهولة ودعم مثل بازار. كل شيء واضح وبالعربية الجزائرية. وفر لي الوقت في تسيير المواعيد والمنتجات. عملائي سعداء بالخدمة السريعة.',
      rating: 5,
      businessType: 'صالون تجميل',
      businessSize: 'صغير',
      joinDate: '2023',
      results: [
        { metric: '+65%', improvement: 'رضا العملاء', icon: Heart },
        { metric: '3x', improvement: 'سرعة الخدمة', icon: Award },
        { metric: '85%', improvement: 'تنظيم أفضل', icon: CheckCircle }
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
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-500/10 to-green-600/10',
      content: 'منصة جزائرية 100% تفهم السوق المحلي. سهولة في البيع أونلاين وربط مباشر مع الزبائن. زادت مبيعاتي بفضل حلول بازار المحلية. النظام يدعم كل احتياجاتي.',
      rating: 4,
      businessType: 'ملابس وأزياء',
      businessSize: 'متوسط',
      joinDate: '2022',
      results: [
        { metric: '+120%', improvement: 'مبيعات أونلاين', icon: TrendingUp },
        { metric: '50%', improvement: 'عملاء جدد', icon: Users },
        { metric: '4.9★', improvement: 'تقييم العملاء', icon: Star }
      ]
    },
    {
      id: 4,
      name: 'ياسمين براهيمي',
      position: 'مديرة مقهى',
      company: 'مقهى الياسمين',
      location: 'سطيف',
      image: '/images/testimonials/user-4-dz.jpg',
      iconType: 'building',
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10',
      content: 'أخيرا وجدت تطبيق يسهل إدارة المقهى والفروع. كل شيء واضح بالدينار الجزائري والدعم دائمًا متواجد. ساعدني أوسع لفرعين جديدين بسهولة كبيرة.',
      rating: 5,
      businessType: 'مقاهي ومطاعم',
      businessSize: 'كبير',
      joinDate: '2022',
      results: [
        { metric: '3', improvement: 'فروع جديدة', icon: Building2 },
        { metric: '+75%', improvement: 'كفاءة التشغيل', icon: Award },
        { metric: '24/7', improvement: 'خدمة مستمرة', icon: CheckCircle }
      ],
      featured: true
    },
    {
      id: 5,
      name: 'أحمد بن مولود',
      position: 'صاحب محل قطع غيار',
      company: 'قطع غيار الأمل',
      location: 'عنابة',
      image: '/images/testimonials/user-5-dz.jpg',
      iconType: 'store',
      gradient: 'from-purple-500 to-violet-600',
      bgGradient: 'from-purple-500/10 to-violet-600/10',
      content: 'نظام رائع يدير مخزوني من آلاف القطع بسهولة. البحث السريع والباركود ساعدني كثيراً. العملاء راضيين عن السرعة في الخدمة والدقة في الفواتير.',
      rating: 5,
      businessType: 'قطع غيار',
      businessSize: 'متوسط',
      joinDate: '2023',
      results: [
        { metric: '99%', improvement: 'دقة المخزون', icon: CheckCircle },
        { metric: '5min', improvement: 'وقت الفاتورة', icon: Award },
        { metric: '+30%', improvement: 'رضا العملاء', icon: Heart }
      ]
    },
    {
      id: 6,
      name: 'خديجة العربي',
      position: 'صاحبة مخبزة',
      company: 'مخبزة الورود',
      location: 'تلمسان',
      image: '/images/testimonials/user-6-dz.jpg',
      iconType: 'store',
      gradient: 'from-cyan-500 to-blue-600',
      bgGradient: 'from-cyan-500/10 to-blue-600/10',
      content: 'التطبيق سهل جداً حتى بدون خبرة في التكنولوجيا. ساعدني أنظم طلبات الحلويات والأعراس. الزبائن يحجزون أونلاين والدفع أصبح أسهل بكثير.',
      rating: 5,
      businessType: 'مخبزة وحلويات',
      businessSize: 'صغير',
      joinDate: '2023',
      results: [
        { metric: '+200%', improvement: 'طلبات أونلاين', icon: TrendingUp },
        { metric: '95%', improvement: 'سهولة الاستخدام', icon: CheckCircle },
        { metric: '2x', improvement: 'أرباح الأعراس', icon: Award }
      ]
    }
  ];
  
  const iconMap = {
    'store': Store,
    'user': User,
    'bag': ShoppingBag,
    'building': Building2
  };
  
  // Auto rotate testimonials
  useEffect(() => {
    if (!autoplay) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [autoplay, testimonials.length]);
  
  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };
  
  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const regularTestimonials = testimonials.filter(t => !t.featured);

  return (
    <section 
      ref={containerRef}
      className="relative py-32 bg-gradient-to-br from-[#fc5d41] via-[#fc5d41]/98 to-[#fc5d41]/5 dark:from-[#fc5d41] dark:via-[#fc5d41]/99 dark:to-[#fc5d41]/10 overflow-hidden landing-section"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.4 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 -left-1/4 w-[700px] h-[700px] bg-gradient-radial from-[#fc5d41]/20 via-[#fc5d41]/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-1/4 -right-1/4 w-[900px] h-[900px] bg-gradient-radial from-purple-500/15 via-purple-500/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Floating Hearts */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -300 - 100],
              opacity: [0, 0.4, 0],
              rotate: [0, 180]
            }}
            transition={{
              duration: Math.random() * 12 + 8,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          >
            <div className="w-4 h-4 text-[#fc5d41]/30">
              <Heart className="w-full h-full fill-current" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* Premium Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <Badge variant="landing" className="items-center gap-2 px-5 py-2.5 rounded-full mb-6">
            <Heart className="h-4 w-4" />
            شهادات حقيقية من عملائنا
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            نفخر بثقة <span className="bg-gradient-to-l from-[#fc5d41] via-[#e04e2f] to-[#ff7a5e] bg-clip-text text-transparent">تجارنا الجزائريين</span>
          </h2>
          
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            أكثر من 5000 تاجر جزائري يعتمدون على منصتنا يومياً لإدارة وتنمية أعمالهم بنجاح
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#fc5d41]" />
              <span className="font-semibold text-foreground">5000+</span>
              <span className="text-muted-foreground">تاجر نشط</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="font-semibold text-foreground">4.9/5</span>
              <span className="text-muted-foreground">متوسط التقييم</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-foreground">98%</span>
              <span className="text-muted-foreground">معدل الرضا</span>
            </div>
          </div>
        </motion.div>

        {/* Featured Testimonial - Large Carousel */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="relative">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-foreground">شهادات مميزة</h3>
                <Badge className="bg-[#fc5d41]/10 text-[#fc5d41] border-[#fc5d41]/20">
                  {activeIndex + 1} من {testimonials.length}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoplay(!autoplay)}
                  className="border-border hover:bg-muted"
                >
                  {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="border-border hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    className="border-border hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Carousel Container */}
            <div className="relative overflow-hidden rounded-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="relative"
                >
                  {(() => {
                    const testimonial = testimonials[activeIndex];
                    const IconComponent = iconMap[testimonial.iconType];
                    
                    return (
                      <div className={`relative rounded-3xl border border-border/50 bg-gradient-to-br ${testimonial.bgGradient} dark:from-card dark:to-card/90 p-8 lg:p-12 shadow-2xl overflow-hidden`}>
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-5`} />
                        
                        {/* Quote Decoration */}
                        <div className="absolute top-8 right-8 opacity-10">
                          <Quote className="h-24 w-24 text-[#fc5d41]" />
                        </div>
                        
                        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                          {/* Content */}
                          <div>
                            <div className="flex items-center gap-4 mb-6">
                              <div className={`p-4 rounded-2xl bg-gradient-to-br ${testimonial.gradient} shadow-lg`}>
                                <IconComponent className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <Badge className="bg-[#fc5d41]/10 text-[#fc5d41] border-[#fc5d41]/20 mb-2">
                                  {testimonial.businessType}
                                </Badge>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {testimonial.location}
                                  <span className="mx-2">•</span>
                                  <Calendar className="h-4 w-4" />
                                  عضو منذ {testimonial.joinDate}
                                </p>
                              </div>
                            </div>
                            
                            <blockquote className="text-2xl text-foreground leading-relaxed mb-8 font-medium">
                              "{testimonial.content}"
                            </blockquote>
                            
                            <div className="flex items-center gap-2 mb-6">
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.1, duration: 0.3 }}
                                >
                                  <Star 
                                    className={cn(
                                      "w-6 h-6", 
                                      i < testimonial.rating 
                                        ? "text-yellow-500 fill-yellow-500" 
                                        : "text-muted-foreground/30"
                                    )} 
                                  />
                                </motion.div>
                              ))}
                              <span className="mr-3 text-lg font-semibold text-foreground">
                                {testimonial.rating}/5
                              </span>
                            </div>
                            
                            {/* Results */}
                            <div className="grid grid-cols-3 gap-4">
                              {testimonial.results.map((result, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 + i * 0.1 }}
                                  className="text-center p-4 rounded-xl bg-card/50 border border-border/50"
                                >
                                  <result.icon className="h-6 w-6 text-[#fc5d41] mx-auto mb-2" />
                                  <div className="text-2xl font-bold text-foreground">{result.metric}</div>
                                  <div className="text-sm text-muted-foreground">{result.improvement}</div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Profile */}
                          <div className="text-center lg:text-right">
                            <div className="relative inline-block mb-6">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#fc5d41] to-[#e04e2f] p-1"
                              />
                              <Avatar className="relative h-32 w-32 border-4 border-background shadow-2xl">
                                <AvatarImage 
                                  src={testimonial.image} 
                                  alt={testimonial.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=random`;
                                  }}
                                />
                                <AvatarFallback className="bg-[#fc5d41]/10 text-[#fc5d41] font-bold text-3xl">
                                  {testimonial.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            
                            <div>
                              <h3 className="text-3xl font-bold text-foreground mb-2">{testimonial.name}</h3>
                              <p className="text-xl text-[#fc5d41] font-semibold mb-1">{testimonial.position}</p>
                              <p className="text-lg text-muted-foreground mb-4">{testimonial.company}</p>
                              
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fc5d41]/10 text-[#fc5d41] dark:text-[#e04e2f] rounded-full text-sm font-medium">
                                <CheckCircle className="h-4 w-4" />
                                عميل موثق
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "h-3 w-3 rounded-full transition-all duration-300",
                    index === activeIndex 
                      ? "bg-[#fc5d41] w-8" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Regular Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {regularTestimonials.slice(0, 6).map((testimonial, index) => {
            const IconComponent = iconMap[testimonial.iconType];
            
            return (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredCard(testimonial.id)}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ scale: 1.02, y: -5 }}
                className="relative group"
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-20 rounded-3xl blur-xl transform scale-110 transition-opacity duration-500`} />
                
                <div className={`relative h-full rounded-3xl border border-border/50 bg-gradient-to-br ${testimonial.bgGradient} dark:from-card dark:to-card/90 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
                  
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  {/* Quote */}
                  <div className="absolute top-4 right-4 opacity-10">
                    <Quote className="h-8 w-8 text-[#fc5d41]" />
                  </div>
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <Avatar className="h-14 w-14 border-2 border-[#fc5d41] shadow-lg">
                        <AvatarImage 
                          src={testimonial.image} 
                          alt={testimonial.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=random`;
                          }}
                        />
                        <AvatarFallback className="bg-[#fc5d41]/10 text-[#fc5d41] font-semibold">
                          {testimonial.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-foreground mb-1">{testimonial.name}</h3>
                        <p className="text-muted-foreground text-sm mb-1">{testimonial.position}</p>
                        <p className="text-muted-foreground text-sm">{testimonial.company}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{testimonial.location}</span>
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${testimonial.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Rating & Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
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
                      </div>
                      <Badge className="bg-[#fc5d41]/10 text-[#fc5d41] border-[#fc5d41]/20 text-xs">
                        {testimonial.businessType}
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <blockquote className="text-muted-foreground leading-relaxed mb-6 text-sm">
                      "{testimonial.content}"
                    </blockquote>
                    
                    {/* Results - Show on Hover */}
                    <AnimatePresence>
                      {hoveredCard === testimonial.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-3 gap-2 pt-4 border-t border-border/50"
                        >
                          {testimonial.results.slice(0, 3).map((result, i) => (
                            <div key={i} className="text-center">
                              <result.icon className="h-4 w-4 text-[#fc5d41] mx-auto mb-1" />
                              <div className="text-sm font-bold text-foreground">{result.metric}</div>
                              <div className="text-xs text-muted-foreground">{result.improvement}</div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl bg-gradient-to-br from-[#fc5d41]/5 to-[#fc5d41]/10 border border-[#fc5d41]/20">
            <div className="p-4 rounded-2xl bg-[#fc5d41]">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                انضم إلى آلاف التجار الناجحين
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl">
                ابدأ رحلتك معنا اليوم واحصل على نفس النتائج المذهلة
              </p>
            </div>
            <Button 
              size="lg"
              className="min-w-[200px] h-14 text-lg font-semibold bg-[#fc5d41] hover:bg-[#e04e2f] shadow-lg hover:shadow-xl hover:shadow-[#fc5d41]/20 transition-all duration-300"
            >
              ابدأ تجربتك المجانية
              <Sparkles className="h-5 w-5 mr-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

TestimonialsSection.displayName = 'TestimonialsSection';

export default TestimonialsSection;
