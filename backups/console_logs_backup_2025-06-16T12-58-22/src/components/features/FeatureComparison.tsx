import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const FeatureComparison = () => {
  const features = [
    { name: "إدارة المنتجات والمخزون", bazaar: true, others: true },
    { name: "نظام نقطة البيع (POS)", bazaar: true, others: true },
    { name: "إدارة العملاء والموظفين", bazaar: true, others: true },
    { name: "إدارة المصاريف والتقارير", bazaar: true, others: true },
    { name: "خدمات مع رمز QR للتتبع", bazaar: true, others: false },
    { name: "متجر إلكتروني تلقائي", bazaar: true, others: false },
    { name: "سوق إلكتروني متكامل", bazaar: true, others: false },
    { name: "العمل دون اتصال", bazaar: true, others: false },
    { name: "مزامنة تلقائية للبيانات", bazaar: true, others: false },
    { name: "واجهة سهلة الاستخدام", bazaar: true, others: false },
    { name: "تتبع المبيعات ومؤشرات الأداء", bazaar: true, others: true },
    { name: "الدعم الفني 24/7", bazaar: true, others: false }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl opacity-50"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            لماذا تختار بازار؟
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            منصة <span className="text-primary">متكاملة</span> تتفوق على المنافسين
          </h2>
          <p className="text-lg text-muted-foreground">
            تجمع منصة بازار بين مميزات متعددة لا توفرها الحلول الأخرى، مما يجعلها الخيار الأمثل لإدارة متجرك ونمو أعمالك.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="grid grid-cols-3">
            {/* العناوين */}
            <div className="p-4 bg-muted/30 border-b border-r border-border">
              <div className="font-medium">المميزات</div>
            </div>
            <div className="p-4 bg-primary/5 border-b border-r border-border">
              <div className="font-bold text-primary">منصة بازار</div>
            </div>
            <div className="p-4 bg-muted/30 border-b border-border">
              <div className="font-medium text-muted-foreground">الحلول الأخرى</div>
            </div>

            {/* المميزات */}
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="contents"
              >
                <div className={`p-4 border-b border-r border-border ${index % 2 === 0 ? 'bg-background/50' : 'bg-card'}`}>
                  <div className="text-sm font-medium">{feature.name}</div>
                </div>
                <div className={`p-4 border-b border-r border-border flex justify-center items-center ${index % 2 === 0 ? 'bg-background/50' : 'bg-card'}`}>
                  {feature.bazaar ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className={`p-4 border-b border-border flex justify-center items-center ${index % 2 === 0 ? 'bg-background/50' : 'bg-card'}`}>
                  {feature.others ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="max-w-2xl mx-auto text-muted-foreground">
            منصة بازار هي الحل الوحيد الذي يقدم منظومة متكاملة تجمع بين إدارة المتجر، المتجر الإلكتروني، السوق الإلكتروني، وإدارة الخدمات، مع ميزة فريدة للعمل دون اتصال.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureComparison;
