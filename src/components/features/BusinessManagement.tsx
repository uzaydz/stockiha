import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Boxes,
  Users, 
  Receipt, 
  Calculator, 
  ClipboardList,
  Wallet,
  Bell
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  delay: number;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, delay }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true, margin: "-100px" }}
    className="relative rounded-xl p-6 border border-border/40 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300"
  >
    <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center ${bgColor}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </motion.div>
);

const BusinessManagement = () => {
  const features = [
    {
      icon: Boxes,
      title: "إدارة المخزون",
      description: "تتبع كميات المنتجات، إدارة المخزون، وتلقي تنبيهات عند انخفاض المخزون لمنع نفاذ المنتجات.",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      icon: Receipt,
      title: "نظام POS متكامل",
      description: "نقطة بيع سهلة الاستخدام مع طباعة الإيصالات والفواتير، ودعم للباركود وطرق الدفع المتعددة.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
    },
    {
      icon: Users,
      title: "إدارة العملاء",
      description: "قاعدة بيانات كاملة للعملاء مع سجل مشترياتهم وتفضيلاتهم، وإمكانية التواصل معهم.",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      icon: BarChart3,
      title: "التقارير والتحليلات",
      description: "تقارير مفصلة عن المبيعات والإيرادات والمنتجات الأكثر مبيعاً وأداء الموظفين.",
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30"
    },
    {
      icon: ClipboardList,
      title: "إدارة الطلبات",
      description: "تتبع كامل لدورة حياة الطلبات من الإنشاء إلى التسليم، مع إشعارات بالتحديثات.",
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30"
    },
    {
      icon: Wallet,
      title: "إدارة المصاريف",
      description: "تسجيل وتصنيف المصاريف، وتتبع الميزانية، وإنشاء تقارير مالية مفصلة.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30"
    },
    {
      icon: Bell,
      title: "التنبيهات والإشعارات",
      description: "إشعارات آلية للمهام المهمة، مثل انخفاض المخزون، المنتجات المنتهية، والمواعيد المهمة.",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    },
    {
      icon: Calculator,
      title: "الفواتير والضرائب",
      description: "إنشاء فواتير احترافية وإيصالات، مع حساب تلقائي للضرائب وتتبع المدفوعات.",
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30"
    }
  ];
  
  return (
    <section id="business" className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            إدارة الأعمال
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            إدارة شاملة <span className="text-primary">لمتجرك</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            نظام متكامل يتيح لك إدارة كافة جوانب متجرك من مكان واحد، من المخزون إلى المبيعات والعملاء والتقارير.
          </p>
        </motion.div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              bgColor={feature.bgColor}
              delay={index * 0.1}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 relative rounded-xl overflow-hidden border border-border bg-card/50 shadow-lg mx-auto max-w-5xl"
        >
          <div className="flex justify-between items-center p-3 bg-muted/80 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="text-xs text-muted-foreground">لوحة تحكم إدارة المتجر</div>
            <div className="w-12"></div>
          </div>
          <div className="aspect-[16/9] bg-muted/50 flex items-center justify-center">
            <img 
              src="/images/business-dashboard.png" 
              alt="لوحة تحكم إدارة المتجر" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Crect width='1200' height='600' fill='%23f8fafc'/%3E%3Ctext x='600' y='300' font-family='Arial' font-size='32' fill='%2394a3b8' text-anchor='middle'%3Eلوحة تحكم إدارة المتجر%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BusinessManagement; 