import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  Star, 
  Store, 
  ShoppingBag, 
  Globe, 
  Laptop, 
  Zap, 
  ArrowRight
} from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden bg-gradient-to-b from-background to-primary/5">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-48 left-0 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex mx-auto"
          >
            <Badge variant="outline" className="px-4 py-1 border-primary/30 bg-primary/5 text-primary mb-6 text-sm">
              <Star className="h-3.5 w-3.5 mr-1 fill-primary text-primary" />
              <span>منصة متكاملة للتجار</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight"
          >
            <span className="bg-gradient-to-l from-primary to-purple-600 bg-clip-text text-transparent">منصة واحدة ذكية</span>
            <br />
            <span className="text-foreground">لإدارة وتنمية تجارتك</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto"
          >
            من إدارة المخزون إلى بيع المنتجات عبر الإنترنت، نوفر لك كل ما تحتاجه
            لتشغيل متجرك بكفاءة عالية وتحويله إلى تجارة إلكترونية بخطوة واحدة فقط.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link to="/tenant/signup">
              <Button size="lg" className="min-w-[180px] font-medium text-base group">
                سجل مؤسستك مجاناً
                <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="min-w-[180px] font-medium text-base">
              شاهد عرض توضيحي
            </Button>
          </motion.div>
        </div>
        
        {/* Features/USP Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {[
            {
              icon: Store,
              title: "إدارة المحل بالكامل",
              description: "المنتجات، الخدمات، الفواتير، المخزون، وإدارة العملاء",
              color: "bg-blue-50 dark:bg-blue-950/30",
              iconColor: "text-blue-500"
            },
            {
              icon: Zap,
              title: "خدمات احترافية",
              description: "تتبع الخدمات عبر QR Code وواجهة مخصصة للعملاء",
              color: "bg-purple-50 dark:bg-purple-950/30",
              iconColor: "text-purple-500"
            },
            {
              icon: Globe,
              title: "متجر إلكتروني تلقائي",
              description: "دومين فرعي خاص بك ومتجر جاهز للبيع فوراً",
              color: "bg-emerald-50 dark:bg-emerald-950/30",
              iconColor: "text-emerald-500"
            },
            {
              icon: Laptop,
              title: "يعمل بدون إنترنت",
              description: "تطبيق سطح مكتب يعمل حتى عند انقطاع الإنترنت",
              color: "bg-amber-50 dark:bg-amber-950/30",
              iconColor: "text-amber-500"
            },
          ].map((feature, index) => (
            <div 
              key={index}
              className="relative flex flex-col rounded-xl border border-border/40 p-6 bg-card/30 backdrop-blur-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-lg mb-4 flex items-center justify-center ${feature.color}`}>
                <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm flex-1">{feature.description}</p>
              <div className="mt-4 text-primary text-sm font-medium hidden group-hover:flex items-center">
                <span>اكتشف المزيد</span>
                <ArrowRight className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          ))}
        </motion.div>
        
        {/* Dashboard/App Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative mx-auto max-w-5xl rounded-lg overflow-hidden shadow-xl border border-border/60 bg-gradient-to-br from-card to-card/50"
        >
          {/* Barra superior simulando un navegador */}
          <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4">
            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
            <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
              <span className="text-xs text-muted-foreground">store.stockiha.com</span>
            </div>
          </div>
          
          <img 
            src="/images/Screenshot-2025-04-27.png" 
            alt="عرض للوحة التحكم" 
            className="w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Crect width='1200' height='600' fill='%23f8fafc'/%3E%3Ctext x='600' y='300' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eصورة لوحة التحكم%3C/text%3E%3C/svg%3E";
            }}
          />
        </motion.div>
        
        {/* Estadísticas/Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="max-w-4xl mx-auto mt-12 py-6 flex flex-wrap justify-center gap-x-12 gap-y-6"
        >
          {[
            { label: "تاجر نشط", value: "5,000+" },
            { label: "معاملة شهرية", value: "200,000+" },
            { label: "نسبة رضا العملاء", value: "97%" },
            { label: "في البنية التحتية", value: "مليون دينار" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
