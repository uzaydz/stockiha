import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  TimerIcon, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  ArrowLeft, 
  Users 
} from 'lucide-react';

const LaunchOfferSection = () => {
  return (
    <section className="py-16 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute h-40 w-40 bg-primary/20 rounded-full filter blur-3xl opacity-30 -top-20 -right-20"></div>
        <div className="absolute h-40 w-40 bg-blue-500/20 rounded-full filter blur-3xl opacity-30 -bottom-20 -left-20"></div>
        <motion.div 
          initial={{ opacity: 0.5, y: 0 }}
          animate={{ opacity: [0.5, 0.8, 0.5], y: [-10, 10, -10] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/3 h-40 w-40 bg-purple-500/20 rounded-full filter blur-3xl opacity-30"
        ></motion.div>
      </div>
      
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="bg-card border border-primary/30 rounded-2xl overflow-visible shadow-xl relative max-w-4xl mx-auto"
        >
          {/* Ribbon */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30">
            <Badge variant="outline" className="px-4 py-2 text-base bg-primary/90 text-white border-none shadow-lg rounded-full animate-pulse">
              <Sparkles className="h-4 w-4 mr-2 text-yellow-300" />
              <span>عرض محدود</span>
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2">
            {/* Left side: Offer details */}
            <div className="p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                <span className="text-primary">عرض الإطلاق</span> 🚀
              </h2>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">لأول 100 مستخدم فقط</p>
                  <p className="text-sm text-muted-foreground">اغتنم الفرصة الآن</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">خطة Standard بسعر خاص</p>
                    <p className="text-sm text-muted-foreground">احصل على جميع المميزات المتقدمة</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">سعر ثابت مدى الحياة</p>
                    <p className="text-sm text-muted-foreground">لن يزيد السعر أبداً مهما ارتفعت أسعارنا</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">دعم فني أولوية</p>
                    <p className="text-sm text-muted-foreground">مساعدة مباشرة من فريقنا خلال مرحلة الإعداد</p>
                  </div>
                </div>
              </div>
              
              <Link to="/tenant/signup" className="block w-full">
                <Button size="lg" className="w-full group">
                  <span className="ml-1">احصل على العرض الآن</span>
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            
            {/* Right side: Pricing & Timer */}
            <div className="bg-gradient-to-br from-primary/30 to-primary/5 p-8 md:p-10 border-t md:border-t-0 md:border-r border-primary/20 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full filter blur-3xl opacity-30 -mr-20 -mt-20"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <TimerIcon className="h-6 w-6 text-primary animate-pulse" />
                  <p className="font-medium">العرض متاح لفترة محدودة</p>
                </div>
                
                <div className="flex gap-3 mb-8">
                  {['أيام', 'ساعات', 'دقائق', 'ثواني'].map((unit, index) => (
                    <div key={index} className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-lg p-2 md:p-3 w-full text-center">
                      <div className="text-lg md:text-2xl font-bold">
                        {index === 0 ? '14' : index === 1 ? '23' : index === 2 ? '59' : '42'}
                      </div>
                      <div className="text-xs text-muted-foreground">{unit}</div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center gap-2 mb-2">
                    <div className="text-xl line-through text-muted-foreground">3,000</div>
                    <Zap className="h-5 w-5 text-primary" />
                    <div className="text-3xl md:text-4xl font-bold">2,300</div>
                    <div className="text-xl">د.ج</div>
                  </div>
                  <p className="text-md font-medium">اشتراك شهري مدى الحياة</p>
                  <p className="text-sm text-muted-foreground">لن يتغير السعر أبداً</p>
                </div>
                
                <div className="p-3 bg-card/80 backdrop-blur-sm border border-border/60 rounded-lg text-center">
                  <p className="text-sm">
                    <span className="font-medium">المستخدمون المسجلون حتى الآن: </span>
                    <span className="text-primary font-bold">73</span> / 100
                  </p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '73%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LaunchOfferSection; 