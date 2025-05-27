import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Store, 
  BarChart, 
  QrCode, 
  ShoppingBag, 
  Truck, 
  Receipt, 
  Users, 
  Boxes, 
  Bell, 
  FileText,
  Smartphone,
  Repeat,
  Globe,
  Building,
  CheckCircle2
} from 'lucide-react';

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  items = [], 
  color, 
  bgColor, 
  index
}: { 
  icon: any, 
  title: string, 
  description: string, 
  items?: string[], 
  color: string, 
  bgColor: string,
  index: number
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className={cn(
        "relative rounded-xl p-6 border border-border/40 bg-card/60",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      )}
    >
      <div className={cn("w-16 h-16 rounded-xl mb-5 flex items-center justify-center", bgColor)}>
        <Icon className={cn("w-8 h-8", color)} />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground mb-5">{description}</p>
      
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Store,
      title: "إدارة محلك بالكامل",
      description: "نظام متكامل يتيح لك إدارة كافة جوانب متجرك من مكان واحد",
      items: [
        "إدارة المنتجات والخدمات بسهولة",
        "نظام POS كامل لطباعة الوصولات والفواتير",
        "إدارة المخزون مع تنبيهات انخفاض المخزون",
        "متابعة العملاء والموظفين والتقارير"
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-950/40"
    },
    {
      icon: QrCode,
      title: "تقديم الخدمات باحترافية",
      description: "ارفع مستوى خدماتك مع نظام متابعة متطور وواجهة مخصصة للعملاء",
      items: [
        "وصولات مع QR Code لتتبع حالة الخدمة",
        "صفحة مخصصة لكل عميل لمتابعة طلباته",
        "إشعارات تلقائية عند تغيير حالة الخدمة",
        "تقييمات وملاحظات العملاء بعد إتمام الخدمة"
      ],
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-950/40"
    },
    {
      icon: Globe,
      title: "متجر إلكتروني تلقائي",
      description: "احصل على متجر إلكتروني فوري بمجرد تسجيلك في المنصة",
      items: [
        "دومين فرعي خاص بك (store.stockiha.com)",
        "المنتجات تظهر تلقائياً في متجرك الإلكتروني",
        "ربط المخزون تلقائياً مع المبيعات الإلكترونية",
        "تخصيص المتجر بألوان وشعار علامتك التجارية"
      ],
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/40"
    },
    {
      icon: Building,
      title: "سوق إلكتروني عام",
      description: "زد مبيعاتك من خلال عرض منتجاتك في سوقنا الإلكتروني الرئيسي",
      items: [
        "عرض كل منتجاتك تلقائياً في السوق الرئيسي",
        "إدارة الطلبات من لوحة تحكم متكاملة",
        "فرصة الوصول لعملاء جدد من جميع أنحاء البلاد",
        "دعم التسويق وبناء سمعة علامتك التجارية"
      ],
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-950/40"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">كل ما تحتاجه <span className="text-primary">في منصة واحدة</span></h2>
          <p className="text-xl text-muted-foreground mb-0">
            منصة متكاملة تمكّنك من إدارة أعمالك التجارية بكفاءة وتنميتها دون الحاجة إلى مهارات تقنية
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              {...feature}
              index={index}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            وصممنا المنصة بواجهة مبسطة تناسب جميع التجار، حتى غير التقنيين منهم. مع فيديوهات توضيحية باللهجة المحلية لكل ميزة.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
