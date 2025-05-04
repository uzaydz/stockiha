import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, Zap, Globe } from 'lucide-react';

export const RegistrationSidebar = () => {
  return (
    <>
      <Card className="border-primary/10 shadow-md overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/5 p-4">
          <h3 className="font-semibold text-lg">مزايا النظام</h3>
        </div>
        <CardContent className="p-4">
          <ul className="space-y-3">
            {[
              { 
                icon: ShieldCheck, 
                title: 'نظام آمن وموثوق',
                description: 'بيانات مشفرة بالكامل ونسخ احتياطية يومية'
              },
              { 
                icon: Zap, 
                title: 'أداء عالي',
                description: 'سرعة تحميل عالية وتجربة مستخدم سلسة'
              },
              { 
                icon: Globe, 
                title: 'متجر إلكتروني جاهز',
                description: 'متجر متكامل بنطاق فرعي خاص بمؤسستك'
              },
            ].map((item, index) => (
              <motion.li 
                key={index} 
                className="flex gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
              >
                <div className="mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-md">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">ماذا يقول عملاؤنا؟</h3>
          
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-muted/50 p-3 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-semibold text-blue-600 dark:text-blue-400">
                  م
                </div>
                <div>
                  <div className="font-medium">محمد علي</div>
                  <div className="text-xs text-muted-foreground">مالك متجر إلكترونيات</div>
                </div>
              </div>
              <p className="text-sm">
                "ساعدنا النظام في زيادة مبيعاتنا بنسبة 40% من خلال المتجر الإلكتروني. تجربة مذهلة!"
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="bg-muted/50 p-3 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-semibold text-green-600 dark:text-green-400">
                  ن
                </div>
                <div>
                  <div className="font-medium">نورة أحمد</div>
                  <div className="text-xs text-muted-foreground">صاحبة متجر ملابس</div>
                </div>
              </div>
              <p className="text-sm">
                "واجهة سهلة الاستخدام ودعم فني ممتاز. أنصح به بشدة لكل صاحب مشروع."
              </p>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-primary/5 p-4 rounded-lg border border-primary/10"
      >
        <h4 className="font-medium flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          5 أيام تجربة مجانية
        </h4>
        <p className="text-sm text-muted-foreground">
          جرّب النظام بالكامل لمدة 5 أيام دون الحاجة إلى بطاقة ائتمان أو التزامات مالية
        </p>
      </motion.div>
    </>
  );
};

export default RegistrationSidebar; 