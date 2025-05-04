import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const FeaturesCTA = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border border-primary/20 rounded-2xl overflow-hidden shadow-lg p-8 md:p-12 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full -ml-20 -mt-20"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/10 rounded-full -mr-20 -mb-20"></div>
            
            <div className="relative text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1 mb-4 bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">جرّب بازار مجاناً لمدة 5 أيام</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                ابدأ رحلة نمو تجارتك <span className="text-primary">اليوم</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                احصل على كل المميزات التي استعرضناها مع دعم فني على مدار الساعة. 
                ابدأ التجربة المجانية الآن بدون بطاقة ائتمان، واكتشف كيف يمكن لمنصة بازار مساعدتك في تنمية أعمالك.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                <Button size="lg" className="min-w-[200px] group">
                  ابدأ التجربة المجانية
                  <ArrowRight className="mr-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  تواصل مع فريق المبيعات
                </Button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 mb-6">
                {[
                  "تجربة مجانية لمدة 5 أيام",
                  "بدون بطاقة ائتمان",
                  "دعم فني على مدار الساعة"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <h3 className="text-2xl font-bold mb-8">
            منصة موثوقة من آلاف التجار في الجزائر
          </h3>
          
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 max-w-4xl mx-auto">
            {[
              { value: "5,000+", label: "تاجر نشط" },
              { value: "97%", label: "نسبة رضا العملاء" },
              { value: "10+", label: "سنوات خبرة" },
              { value: "24/7", label: "دعم فني" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesCTA; 