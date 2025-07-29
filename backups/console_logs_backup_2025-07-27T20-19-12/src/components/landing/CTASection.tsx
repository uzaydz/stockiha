import { memo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ChevronLeft, 
  Users, 
  Rocket,
  Star,
  Shield,
  Clock,
  CreditCard,
  Zap,
  Sparkles,
  Gift,
  TrendingUp,
  Phone,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

const CTASection = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);

  return (
    <section 
      ref={containerRef}
      className="relative py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden landing-section"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.6 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/3 -left-1/4 w-[800px] h-[800px] bg-gradient-radial from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.5 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-1/3 -right-1/4 w-[1000px] h-[1000px] bg-gradient-radial from-purple-500/20 via-purple-500/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='cta-grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23cta-grid)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Floating Rockets */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -400 - 200],
              opacity: [0, 0.4, 0],
              rotate: [0, 360]
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeOut"
            }}
          >
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary/60" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-6 mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-7xl mx-auto"
        >
          
          {/* Main CTA Card */}
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background/80 to-purple-500/15 p-8 lg:p-16 shadow-2xl overflow-hidden backdrop-blur-sm">
            
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-radial from-primary/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-radial from-purple-500/25 to-transparent rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Badge Header */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-3 mb-8 bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-6 py-3 rounded-full border border-primary/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Star className="h-5 w-5 fill-current text-yellow-500" />
                  </motion.div>
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">أكثر من 5000 تاجر يثق بنا</span>
                </div>
              </motion.div>
              
              {/* Main Headline */}
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-4xl lg:text-7xl font-bold text-foreground mb-8 leading-tight"
              >
                حول متجرك إلى{" "}
                <span className="bg-gradient-to-l from-primary via-primary-darker to-primary-lighter bg-clip-text text-transparent">
                  إمبراطورية رقمية
                </span>
              </motion.h2>
              
              {/* Subtitle */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-xl lg:text-3xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
              >
                منصة شاملة متكاملة لإدارة متجرك، نقطة البيع، الخدمات، والتجارة الإلكترونية في مكان واحد
              </motion.p>
              
              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-col lg:flex-row items-center justify-center gap-6 mb-16"
              >
                <Link to="/tenant/signup">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      className="group min-w-[280px] h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary-darker text-primary-foreground rounded-2xl shadow-2xl hover:shadow-primary/30 transition-all duration-300"
                    >
                      <Rocket className="h-6 w-6 ml-3 group-hover:rotate-12 transition-transform" />
                      <span>ابدأ رحلتك المجانية</span>
                      <ArrowRight className="h-6 w-6 mr-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </Link>
                
                <Link to="/contact">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="min-w-[280px] h-16 text-xl font-semibold rounded-2xl border-2 border-primary/50 hover:bg-primary/10 hover:border-primary backdrop-blur-sm transition-all duration-300"
                    >
                      <Phone className="h-6 w-6 ml-3" />
                      تحدث مع خبير مبيعات
                      <MessageSquare className="h-6 w-6 mr-3" />
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
              
              {/* Features Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
              >
                {[
                  { 
                    icon: Gift, 
                    title: "14 يوم مجاني", 
                    desc: "تجربة كاملة المميزات",
                    color: "text-green-500"
                  },
                  { 
                    icon: CreditCard, 
                    title: "بدون التزام", 
                    desc: "لا حاجة لبطاقة ائتمان",
                    color: "text-blue-500"
                  },
                  { 
                    icon: Zap, 
                    title: "إعداد فوري", 
                    desc: "جاهز في 3 دقائق فقط",
                    color: "text-yellow-500"
                  },
                  { 
                    icon: Shield, 
                    title: "ضمان شامل", 
                    desc: "استرداد خلال 30 يوم",
                    color: "text-purple-500"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02, y: -3 }}
                    className="group relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative flex flex-col items-center text-center">
                      <div className={`p-3 rounded-xl bg-card/80 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className={`h-8 w-8 ${feature.color}`} />
                      </div>
                      <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Social Proof & Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">4.9/5</span>
                  <span>تقييم العملاء</span>
                </div>
                
                <div className="w-px h-6 bg-border" />
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-foreground">+40%</span>
                  <span>متوسط نمو المبيعات</span>
                </div>
                
                <div className="w-px h-6 bg-border" />
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-foreground">24/7</span>
                  <span>دعم فني متواصل</span>
                </div>
                
                <div className="w-px h-6 bg-border" />
                
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold text-foreground">99.9%</span>
                  <span>معدل الاستقرار</span>
                </div>
              </motion.div>

              {/* Final Trust Elements */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="mt-12 pt-8 border-t border-border/50"
              >
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    SSL آمن ومشفر
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-4 py-2">
                    <Shield className="h-4 w-4 mr-2" />
                    ISO 27001 معتمد
                  </Badge>
                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-4 py-2">
                    <Users className="h-4 w-4 mr-2" />
                    ثقة آلاف التجار
                  </Badge>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = 'CTASection';

export default CTASection;
