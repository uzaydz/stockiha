import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StoreHero = () => {
  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full filter blur-3xl opacity-40"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-20 items-center">
          {/* القسم النصي */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:w-1/2 text-center lg:text-right"
          >
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              المتجر الإلكتروني
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              متجرك الإلكتروني <span className="text-primary">المتكامل</span> بدون جهد
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0">
              متجر إلكتروني احترافي يتم إنشاؤه تلقائياً مع كامل المميزات والتخصيصات التي تحتاجها لنمو مبيعاتك عبر الإنترنت.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button size="lg" asChild>
                <Link to="/signup">
                  ابدأ الآن مجاناً
                </Link>
              </Button>
              
              <Button variant="outline" size="lg" asChild>
                <Link to="#store-features" className="flex items-center gap-2">
                  <span>استكشف المميزات</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
          
          {/* صورة توضيحية */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="bg-card border border-border/40 shadow-xl rounded-xl overflow-hidden">
                <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  <div className="h-5 w-72 mx-auto bg-background/80 rounded-md flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">store.stockiha.com</span>
                  </div>
                </div>
                
                <div className="relative aspect-[16/9]">
                  <img
                    src="/images/store-hero.png"
                    alt="واجهة المتجر الإلكتروني"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'%3E%3Crect width='1200' height='675' fill='%23f8fafc'/%3E%3Ctext x='600' y='337.5' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eواجهة المتجر الإلكتروني%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </div>
              
              {/* عناصر عائمة */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute -bottom-10 -right-10 bg-card p-4 rounded-lg shadow-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium">إنشاء تلقائي</div>
                    <div className="text-xs text-muted-foreground">خلال دقائق</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -top-10 -left-10 bg-card p-4 rounded-lg shadow-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium">تخصيص كامل</div>
                    <div className="text-xs text-muted-foreground">بدون برمجة</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoreHero; 