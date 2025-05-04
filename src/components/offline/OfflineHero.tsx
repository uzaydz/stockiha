import { motion } from 'framer-motion';
import { WifiOff, Database, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OfflineHero = () => {
  return (
    <section className="py-20 overflow-hidden bg-gradient-to-b from-background to-background/90">
      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* النص والعنوان */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-right"
          >
            <div className="inline-block mb-6 px-6 py-2 bg-primary/10 text-primary rounded-full">
              <span>العمل دون اتصال بالإنترنت</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="block">استمر في العمل</span>
              <span className="block text-primary">حتى بدون إنترنت</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              استخدم منصة بازار بكامل إمكانياتها حتى بدون اتصال بالإنترنت. أدر عملياتك اليومية، سجل المبيعات، وأضف المخزون - كل شيء يعمل بسلاسة دون الحاجة إلى اتصال.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="gap-2">
                <Database className="h-5 w-5" />
                <span>اكتشف الإمكانيات</span>
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <RefreshCw className="h-5 w-5" />
                <span>كيف تعمل المزامنة؟</span>
              </Button>
            </div>
          </motion.div>
          
          {/* الصورة أو الرسم التوضيحي */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-tr from-primary/20 via-primary/10 to-background p-4 rounded-2xl border border-border shadow-xl overflow-hidden">
              <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border flex items-center gap-2 text-sm font-medium">
                <WifiOff className="h-4 w-4 text-yellow-500" />
                <span>وضع الأوفلاين نشط</span>
              </div>
              
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-muted/50 border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">نقطة البيع</h3>
                        <p className="text-xs text-muted-foreground">اخر مزامنة: منذ 2 ساعة</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium">
                      وضع غير متصل
                    </div>
                  </div>
                </div>
                
                {/* محتوى تجريبي للواجهة في وضع الأوفلاين */}
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2">المبيعات اليوم</h4>
                        <p className="text-2xl font-bold">12,580 دج</p>
                        <p className="text-xs text-muted-foreground mt-1">8 معاملات</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-2">المخزون</h4>
                        <p className="text-2xl font-bold">126</p>
                        <p className="text-xs text-muted-foreground mt-1">14 منتج منخفض</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">آخر المعاملات (محلية)</h4>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium">{i}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">طلب #{1000 + i}</p>
                              <p className="text-xs text-muted-foreground">منذ {i * 10} دقيقة</p>
                            </div>
                          </div>
                          <p className="font-semibold">{i * 1500} دج</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* زخرفة */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-primary/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
              </div>
            </div>
            
            {/* المؤشر على جانب الصورة */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden lg:block">
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="bg-card p-4 rounded-lg border border-border shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">قاعدة بيانات محلية</p>
                    <p className="text-xs text-muted-foreground">تخزين آمن</p>
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

export default OfflineHero; 