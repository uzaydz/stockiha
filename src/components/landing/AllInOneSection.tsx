import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Wrench, 
  Receipt, 
  Users, 
  BarChart, 
  Bell, 
  Tag, 
  ShoppingCart, 
  CircleDashed,
  Database,
  BadgePercent,
  UserCircle,
  Printer,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FeatureTabProps {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  imageSrc: string;
  description: string;
  features: string[];
}

const AllInOneSection = () => {
  const [activeTab, setActiveTab] = useState('products');
  
  const featureTabs: FeatureTabProps[] = [
    {
      value: 'products',
      label: 'المنتجات والمخزون',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      imageSrc: '/images/products-inventory-animated.svg',
      description: 'إدارة منتجاتك ومخزونك بشكل احترافي. أضف المنتجات، تتبع المخزون، وتلقى تنبيهات عند انخفاض الكميات.',
      features: [
        'إدارة المنتجات مع الصور والأوصاف',
        'تتبع المخزون في الوقت الفعلي',
        'إدارة الأسعار والخصومات',
        'تنبيهات انخفاض المخزون'
      ]
    },
    {
      value: 'services',
      label: 'الخدمات والصيانة',
      icon: Wrench,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      imageSrc: '/images/services-screen.png',
      description: 'قدم خدماتك باحترافية. إنشاء أوامر صيانة، متابعة حالة الطلبات، وإصدار وصولات مع رموز QR لتتبع الخدمات.',
      features: [
        'إدارة طلبات الصيانة والخدمات',
        'وصولات مع رموز QR للتتبع',
        'التحديث التلقائي لحالة الخدمة',
        'إشعارات للعملاء عند اكتمال الخدمة'
      ]
    },
    {
      value: 'invoices',
      label: 'الفواتير والمبيعات',
      icon: Receipt,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      imageSrc: '/images/invoices-screen.png',
      description: 'إنشاء وإدارة الفواتير والمبيعات بسهولة. طباعة إيصالات احترافية، تتبع المدفوعات، وإدارة العائدات.',
      features: [
        'إنشاء فواتير احترافية',
        'طباعة إيصالات المبيعات',
        'تتبع المدفوعات والديون',
        'ملخص المبيعات اليومية/الشهرية/السنوية'
      ]
    },
    {
      value: 'customers',
      label: 'العملاء والموظفين',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      imageSrc: '/images/customers-screen.png',
      description: 'إدارة علاقاتك مع العملاء والموظفين. احتفظ بقاعدة بيانات للعملاء، تتبع تاريخ المشتريات، وإدارة صلاحيات الموظفين.',
      features: [
        'قاعدة بيانات العملاء مع تاريخ المشتريات',
        'إدارة الموظفين وصلاحياتهم',
        'برنامج الولاء والمكافآت',
        'إحصائيات وتقارير العملاء'
      ]
    },
    {
      value: 'reports',
      label: 'التقارير والتحليلات',
      icon: BarChart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/20',
      imageSrc: '/images/reports-screen.png',
      description: 'تحليلات وتقارير شاملة لمساعدتك في اتخاذ قرارات أفضل. راقب أداء متجرك واتجاهات المبيعات والمنتجات الأكثر مبيعًا.',
      features: [
        'لوحة تحكم تحليلية شاملة',
        'تقارير المبيعات والإيرادات',
        'تحليل أداء المنتجات والخدمات',
        'توقعات المبيعات المستقبلية'
      ]
    },
    {
      value: 'pos',
      label: 'نقطة البيع (POS)',
      icon: ShoppingCart,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
      imageSrc: '/images/pos-screen.png',
      description: 'نظام نقاط بيع متكامل وسهل الاستخدام. إتمام المبيعات بسرعة، طباعة الإيصالات، وتحديث المخزون تلقائيًا.',
      features: [
        'واجهة سهلة الاستخدام لإتمام المبيعات',
        'دعم الباركود والقارئات',
        'توافق مع طابعات الإيصالات',
        'العمل دون اتصال بالإنترنت'
      ]
    }
  ];
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const activeTabData = featureTabs.find(tab => tab.value === activeTab);
  
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            نظام <span className="text-primary">متكامل</span> لإدارة متجرك
          </h2>
          <p className="text-lg text-muted-foreground">
            بازار يجمع كل الأدوات التي تحتاجها في مكان واحد، لتركز على تنمية أعمالك
            بدلاً من تضييع الوقت في التنقل بين أنظمة متعددة.
          </p>
        </motion.div>
        
        <Tabs defaultValue="products" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap justify-center mb-12 bg-transparent p-0 gap-2">
            {featureTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    "rounded-lg px-4 py-2 flex items-center gap-2 border",
                    "data-[state=active]:border-primary/40 border-border/60",
                    "transition-all duration-200"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center",
                    tab.value === activeTab ? tab.bgColor : "bg-muted"
                  )}>
                    <Icon className={cn("w-4 h-4", tab.value === activeTab ? tab.color : "text-muted-foreground")} />
                  </div>
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <div className="mt-8 grid md:grid-cols-2 gap-8 items-center">
            {activeTabData && (
              <>
                <motion.div
                  key={`content-${activeTabData.value}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="order-2 md:order-1"
                >
                  <div className={cn("w-16 h-16 rounded-xl mb-6 flex items-center justify-center", activeTabData.bgColor)}>
                    <activeTabData.icon className={cn("w-8 h-8", activeTabData.color)} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{activeTabData.label}</h3>
                  <p className="text-muted-foreground mb-6">{activeTabData.description}</p>
                  
                  <ul className="space-y-3 mb-8">
                    {activeTabData.features.map((feature, index) => (
                      <motion.li 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={cn("mt-1 w-5 h-5 rounded-full flex items-center justify-center", activeTabData.bgColor)}>
                          <ChevronRight className={cn("w-4 h-4", activeTabData.color)} />
                        </div>
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  <Button className="px-6">اكتشف المزيد</Button>
                </motion.div>
                
                <motion.div
                  key={`image-${activeTabData.value}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="order-1 md:order-2"
                >
                  {activeTabData.value === 'products' ? (
                    <div className="rounded-lg border border-border overflow-hidden shadow-lg relative bg-card flex items-center justify-center aspect-[16/10]">
                      <img src="/images/products-inventory-animated.svg" alt="المنتجات والمخزون" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden shadow-lg relative bg-card">
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <img 
                          src={activeTabData.imageSrc} 
                          alt={activeTabData.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f8fafc'/%3E%3Ctext x='400' y='250' font-family='Arial' font-size='24' fill='%2394a3b8' text-anchor='middle'%3E${activeTabData.label}%3C/text%3E%3C/svg%3E`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent"></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </section>
  );
};

// ملاحظة: إذا تم نقل svg إلى public/images استخدم المسار /images/products-inventory-animated.svg
// إذا كنت تستخدم صورًا أخرى في public/images، تأكد أن المسار يبدأ بـ /images وليس /public/images

export default AllInOneSection;
