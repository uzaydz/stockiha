import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Globe, 
  ShoppingCart, 
  Store, 
  Truck, 
  ArrowRight, 
  BarChart, 
  Package, 
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeHTML } from '@/utils/security';

const MarketplaceSection = () => {
  const marketplaceFeatures = [
    {
      title: "دومين فرعي خاص بك",
      description: "بمجرد التسجيل تحصل على متجر إلكتروني خاص بك مع دومين فرعي (<span className='font-bold text-primary'>store.stockiha.com</span>)",
      icon: Globe,
      color: "text-blue-500"
    },
    {
      title: "تزامن المخزون تلقائياً",
      description: "المنتجات والمخزون يتم تحديثهما تلقائياً بين المتجر الفعلي والمتجر الإلكتروني",
      icon: Package,
      color: "text-purple-500"
    },
    {
      title: "إدارة الطلبات من لوحة واحدة",
      description: "تلقي وإدارة الطلبات الإلكترونية من نفس لوحة التحكم التي تستخدمها لمتجرك",
      icon: ShoppingCart,
      color: "text-emerald-500"
    },
    {
      title: "تظهر في السوق الإلكتروني العام",
      description: "منتجاتك تظهر تلقائياً في السوق الرئيسي للوصول إلى عملاء جدد",
      icon: Store,
      color: "text-amber-500"
    }
  ];

  return (
    <section className="py-20 landing-bg-accent landing-section-transition">
      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-primary">متجر إلكتروني</span> و{" "}
              <span className="text-primary">سوق إلكتروني</span> في آن واحد
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              لا حاجة لتعلم تقنيات التجارة الإلكترونية. منصتنا تحول متجرك إلى متجر إلكتروني وتعرض منتجاتك في السوق العام بشكل تلقائي.
            </p>
            
            <div className="space-y-6 mb-8">
              {marketplaceFeatures.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="flex gap-4"
                >
                  <div className="h-12 w-12 bg-card rounded-full border border-border flex items-center justify-center shadow-sm shrink-0">
                    <feature.icon className={cn("h-6 w-6", feature.color)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHTML(feature.description) }} />
                  </div>
                </motion.div>
              ))}
            </div>
            
            <Button className="px-6">
              جرّب المتجر الإلكتروني
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative bg-card rounded-xl border border-border shadow-lg overflow-hidden"
          >
            {/* First Card - E-commerce Store */}
            <div className="relative p-6 bg-gradient-to-br from-background to-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">متجرك الإلكتروني الخاص</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
                  <LinkIcon className="h-3 w-3" />
                  <span>store.stockiha.com</span>
                </div>
              </div>
              
              <div className="aspect-[16/9] bg-muted/40 rounded-lg overflow-hidden relative mb-4">
                <img 
                  src="/images/online-store-preview.png"
                  alt="متجر إلكتروني"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23f8fafc'/%3E%3Ctext x='400' y='225' font-family='Arial' font-size='24' fill='%2394a3b8' text-anchor='middle'%3Eصورة المتجر الإلكتروني%3C/text%3E%3C/svg%3E`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="text-white text-sm font-medium">متجر احترافي جاهز للاستخدام</div>
                  <Button size="sm" variant="outline" className="bg-white/90 text-foreground h-8 dark:bg-background dark:text-primary">تصفح المتجر</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-muted/40 text-center">
                  <div className="text-3xl font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted-foreground">متاح على مدار الساعة</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-center">
                  <div className="text-3xl font-bold text-primary">100%</div>
                  <div className="text-xs text-muted-foreground">تزامن مع المخزون</div>
                </div>
              </div>
            </div>
            
            {/* Second Card - Marketplace */}
            <div className="relative p-6 mt-4 bg-gradient-to-br from-background to-muted">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">السوق الإلكتروني العام</h3>
                </div>
                <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">يصل إلى آلاف العملاء</div>
              </div>
              
              <div className="bg-muted/40 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-background rounded-md overflow-hidden relative">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-center text-muted-foreground">
                  منتجاتك تظهر في السوق العام مع تحديث المخزون تلقائياً
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="text-sm">الطلبات تصل لك مباشرة</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center">
                    <BarChart className="h-4 w-4" />
                  </div>
                  <div className="text-sm">تقارير وتحليلات</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceSection;
