import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Star } from 'lucide-react';

const FeaturesHero = () => {
  return (
    <section className="relative pt-24 pb-16 overflow-hidden bg-gradient-to-b from-background to-primary/5">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-48 left-0 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto mb-12"
        >
          <Badge variant="outline" className="px-4 py-1 border-primary/30 bg-primary/5 text-primary mb-6 text-sm">
            <Star className="h-3.5 w-3.5 mr-1 fill-primary text-primary" />
            <span>مميزات شاملة ومتكاملة</span>
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-l from-primary to-purple-600 bg-clip-text text-transparent">كل ما تحتاجه</span>
            <br />
            <span className="text-foreground">في منصة واحدة</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 mx-auto">
            صممنا منصة بازار لتلبية كافة احتياجات التاجر من إدارة المحل والمخزون إلى
            المبيعات الإلكترونية والخدمات الاحترافية، بواجهة سهلة الاستخدام.
          </p>
        </motion.div>
        
        {/* مميزات مختصرة */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {[
            "إدارة متكاملة للمحل",
            "متجرك الإلكتروني الخاص",
            "خدمات احترافية مع كود تتبع",
            "سوق إلكتروني عام",
            "يعمل حتى بدون إنترنت"
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-sm border border-border">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </motion.div>
        
        {/* صورة توضيحية */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative mx-auto max-w-5xl rounded-lg overflow-hidden shadow-xl border border-border/40 bg-gradient-to-br from-card to-card/60"
        >
          <div className="aspect-[16/9] bg-muted/80 flex items-center justify-center">
            <img 
              src="/images/features-overview.png" 
              alt="نظرة عامة على مميزات المنصة" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Crect width='1200' height='600' fill='%23f8fafc'/%3E%3Ctext x='600' y='300' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eنظرة عامة على المميزات%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
        </motion.div>
        
        {/* أقسام المميزات - للانتقال السريع */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-6">استكشف مميزات المنصة</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { name: "إدارة الأعمال", href: "#business" },
              { name: "المتجر الإلكتروني", href: "#store" },
              { name: "إدارة الخدمات", href: "#services" },
              { name: "السوق الإلكتروني", href: "#marketplace" },
              { name: "العمل دون اتصال", href: "#offline" }
            ].map((section, index) => (
              <a
                key={index}
                href={section.href}
                className="bg-card border border-border rounded-lg px-3 py-3 text-center hover:border-primary/40 hover:shadow-sm transition-all text-sm font-medium flex items-center justify-center gap-1 group"
              >
                {section.name}
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesHero; 