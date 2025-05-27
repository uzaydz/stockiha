import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  Store, 
  ChevronLeft, 
  Zap, 
  Sparkles 
} from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-primary/10 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute h-80 w-80 bg-primary/10 rounded-full filter blur-3xl opacity-30 -top-40 -right-20"></div>
        <div className="absolute h-80 w-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30 -bottom-40 -left-20"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative max-w-4xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border border-primary/20 rounded-2xl overflow-hidden shadow-lg p-8 md:p-12 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full -ml-20 -mt-20"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/10 rounded-full -mr-20 -mb-20"></div>
            
            <div className="relative text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1 mb-4 bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">انضم إلى الآلاف من التجار الناجحين</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ابدأ في تطوير تجارتك الآن مع{" "}
                <span className="text-primary">سطوكيها</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                منصة واحدة ذكية لإدارة متجرك وتحويله إلى تجارة إلكترونية. تجربة مجانية لمدة 5 أيام بكامل المميزات - ابدأ الآن بدون بطاقة ائتمان.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link to="/tenant/signup">
                  <Button size="lg" className="min-w-[180px] group">
                    <span>سجل مؤسستك الآن</span>
                    <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                <Button size="lg" variant="outline" className="min-w-[180px] group">
                  <span>جدولة عرض توضيحي</span>
                  <Zap className="h-4 w-4 mr-1" />
                </Button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-6">
                {[
                  "تجربة مجانية لمدة 5 أيام",
                  "بدون بطاقة ائتمان",
                  "إعداد في دقائق"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  <span>5000+ تاجر نشط</span>
                </div>
                <div className="h-4 w-0.5 bg-border rounded-full"></div>
                <div>دعم فني 24/7</div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 text-center"
        >
          <h3 className="text-2xl font-bold mb-6">
            انضم إلى الثورة التجارية في <span className="text-primary">الجزائر</span>
          </h3>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "ابدأ مجاناً",
                description: "تجربة كاملة لمدة 5 أيام بدون قيود"
              },
              {
                title: "سهولة الاستخدام",
                description: "واجهة مبسطة وفيديوهات توضيحية"
              },
              {
                title: "دعم محلي",
                description: "فريق دعم فني يتحدث لغتك المحلية"
              },
              {
                title: "تطور مستمر",
                description: "ميزات جديدة تضاف باستمرار"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + (index * 0.1) }}
                viewport={{ once: true, margin: "-100px" }}
                className="p-5 rounded-lg border border-border bg-card/50 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
