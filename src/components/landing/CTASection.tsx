import { memo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
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

  return (
    <section
      ref={containerRef}
      className="relative py-20 landing-bg-primary landing-section-transition"
    >
      <div className="container px-6 mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-5xl mx-auto"
        >
          
          {/* البطاقة الرئيسية */}
          <div className="relative rounded-2xl border border-border bg-card p-8 lg:p-12 shadow-lg overflow-hidden">
            
            {/* خلفية بسيطة */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            
            <div className="relative z-10">
              {/* شارة الرأس */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 mb-6 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20"
              >
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-sm">منصة سطوكيها الجديدة</span>
              </motion.div>
              
              {/* العنوان الرئيسي */}
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-3xl lg:text-5xl font-bold text-foreground mb-6 leading-tight"
              >
                حول متجرك إلى{" "}
                <span className="text-primary">
                  إمبراطورية رقمية
                </span>
              </motion.h2>
              
              {/* النص الفرعي */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
              >
                منصة شاملة متكاملة لإدارة متجرك، نقطة البيع، الخدمات، والتجارة الإلكترونية في مكان واحد. انضم إلينا اليوم وكن من أوائل المستخدمين!
              </motion.p>
              
              {/* أزرار الدعوة للعمل */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-col lg:flex-row items-center justify-center gap-4 mb-12"
              >
                <Link to="/tenant/signup">
                  <Button 
                    size="lg" 
                    className="min-w-[240px] h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg"
                  >
                    <Rocket className="h-5 w-5 ml-2" />
                    ابدأ رحلتك المجانية
                    <ArrowRight className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
                
                <Link to="/contact">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="min-w-[240px] h-14 text-lg font-semibold rounded-xl border-2 border-primary/50 hover:bg-primary/10 hover:border-primary"
                  >
                    <Phone className="h-5 w-5 ml-2" />
                    تحدث مع خبير مبيعات
                    <MessageSquare className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
              </motion.div>
              
              {/* شبكة المميزات */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
              >
                {[
                  { 
                    icon: Gift, 
                    title: "5 أيام مجاني", 
                    desc: "تجربة كاملة المميزات"
                  },
                  { 
                    icon: CreditCard, 
                    title: "بدون التزام", 
                    desc: "لا حاجة لبطاقة ائتمان"
                  },
                  { 
                    icon: Zap, 
                    title: "إعداد فوري", 
                    desc: "جاهز في 3 دقائق فقط"
                  },
                  { 
                    icon: Shield, 
                    title: "ضمان شامل", 
                    desc: "استرداد خلال 30 يوم"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    viewport={{ once: true }}
                    className="group p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="p-2.5 rounded-lg bg-primary/10 mb-3 group-hover:scale-110 transition-transform duration-300">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground mb-1 text-sm group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* الإحصائيات */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-8"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">منصة جديدة</span>
                  <span>تكنولوجيا حديثة</span>
                </div>
                
                <div className="w-px h-5 bg-border" />
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-semibold text-foreground">أول المستخدمين</span>
                  <span>احصل على الأولوية</span>
                </div>
                
                <div className="w-px h-5 bg-border" />
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-foreground">24/7</span>
                  <span>دعم فني متواصل</span>
                </div>
              </motion.div>

              {/* عناصر الثقة */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="pt-6 border-t border-border"
              >
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    SSL آمن ومشفر
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    حماية بياناتك
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    انضم إلينا اليوم
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
