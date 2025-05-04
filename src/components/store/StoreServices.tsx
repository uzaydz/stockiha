import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import { Service } from '@/api/store';

interface StoreServicesProps {
  title?: string;
  description?: string;
  services?: Service[];
}

const defaultServices: Service[] = [
  {
    id: '1',
    name: 'صيانة الأجهزة الإلكترونية',
    description: 'فريق متخصص في صيانة الهواتف والأجهزة اللوحية والحواسيب المحمولة مع ضمان ستة أشهر على الإصلاح.',
    price: 50,
    image: 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=1470',
    estimated_time: "60 دقيقة",
    is_price_dynamic: true,
    category: 'صيانة',
    slug: 'electronics-repair',
    badge: 'الأكثر طلباً',
    badgeColor: 'success',
    features: [
      'فحص مجاني للأجهزة',
      'قطع غيار أصلية',
      'ضمان 6 أشهر',
      'خدمة الإصلاح السريع'
    ]
  },
  {
    id: '2',
    name: 'تثبيت وإعداد الشبكات',
    description: 'إعداد وتثبيت شبكات الواي فاي المنزلية والمكتبية وحلول الاتصال عن بعد بشكل احترافي.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=1470',
    category: 'شبكات',
    slug: 'network-setup',
    features: [
      'تصميم الشبكة حسب الاحتياج',
      'أجهزة عالية الجودة',
      'دعم فني مستمر',
      'حلول أمنية متكاملة'
    ]
  },
  {
    id: '3',
    name: 'الدعم الفني والاستشارات',
    description: 'استشارات تقنية ودعم فني لحل المشكلات وتحسين أداء أجهزتك والبرامج الخاصة بك.',
    price: 30,
    image: 'https://images.unsplash.com/photo-1494599948593-3dafe8338d71?q=80&w=1470',
    estimated_time: "30 دقيقة",
    is_price_dynamic: true,
    category: 'دعم فني',
    slug: 'tech-support',
    badge: 'جديد',
    badgeColor: 'default',
    features: [
      'خبراء متخصصون',
      'حلول سريعة وفعالة',
      'مساعدة عن بعد',
      'تدريب على استخدام التقنيات الحديثة'
    ]
  },
  {
    id: '4',
    name: 'تركيب الكاميرات والأنظمة الأمنية',
    description: 'تركيب وإعداد أنظمة المراقبة والكاميرات الأمنية للمنازل والشركات مع توفير أفضل الحلول.',
    price: 200,
    image: 'https://images.unsplash.com/photo-1595859703065-2259982784bb?q=80&w=1408',
    category: 'أمان',
    slug: 'security-cameras',
    badge: 'خصم 15%',
    badgeColor: 'warning',
    features: [
      'كاميرات عالية الدقة',
      'تطبيق للتحكم والمراقبة عن بعد',
      'تخزين آمن للتسجيلات',
      'صيانة دورية'
    ]
  }
];

const getBadgeVariant = (color?: 'default' | 'success' | 'warning') => {
  switch (color) {
    case 'success':
      return 'bg-green-500 hover:bg-green-600';
    case 'warning':
      return 'bg-amber-500 hover:bg-amber-600';
    default:
      return 'bg-blue-500 hover:bg-blue-600';
  }
};

const formatPrice = (price?: number | string, is_price_dynamic?: boolean) => {
  if (!price) return '';
  
  return is_price_dynamic
    ? `يبدأ من ${price} ريال`
    : `${price} ريال`;
};

const StoreServices = ({
  title = 'خدماتنا المميزة',
  description = 'نقدم مجموعة متنوعة من الخدمات عالية الجودة',
  services = defaultServices
}: StoreServicesProps) => {
  // تأثيرات الحركة
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // صور افتراضية للخدمات (في حالة عدم توفرها من الخادم)
  const defaultImages = [
    'https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=1470',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=1470',
    'https://images.unsplash.com/photo-1494599948593-3dafe8338d71?q=80&w=1470',
    'https://images.unsplash.com/photo-1595859703065-2259982784bb?q=80&w=1408'
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1 rounded-full text-sm mb-4">
            خدمات احترافية
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </motion.div>
        
        {services && services.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {services.map((service, index) => (
              <motion.div key={service.id} variants={itemVariants}>
                <Card className="overflow-hidden h-full group border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 relative overflow-hidden">
                      <img 
                        src={service.image || defaultImages[index % defaultImages.length]} 
                        alt={service.name}
                        className="w-full h-56 md:h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {service.badge && (
                        <div className="absolute top-3 right-3">
                          <Badge className={`${getBadgeVariant(service.badgeColor)} font-medium shadow-sm`}>
                            {service.badge}
                          </Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity md:hidden"></div>
                    </div>
                    <div className="md:w-3/5 flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                            {service.name}
                          </CardTitle>
                          {service.price !== undefined && (
                            <div className="text-xl font-bold text-primary">
                              {formatPrice(service.price, service.is_price_dynamic)}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 flex-grow">
                        <CardDescription className="text-muted-foreground mb-4">
                          {service.description}
                        </CardDescription>
                        
                        {/* المميزات */}
                        {service.features && service.features.length > 0 && (
                          <ul className="space-y-1 mt-3">
                            {service.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-sm">
                                <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Link to={`/services/${service.slug || service.id}`} className="w-full">
                          <Button 
                            variant="outline" 
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground border-primary/70 transition-colors"
                          >
                            <span>المزيد من التفاصيل</span>
                            <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-muted-foreground text-center">
              <p className="text-xl mb-4">لا توجد خدمات متاحة حالياً</p>
              <p>سيتم إضافة خدمات جديدة قريباً</p>
            </div>
          </div>
        )}
        
        {services && services.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mt-14"
          >
            <Link to="/services">
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full border-primary/70 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                عرض جميع الخدمات
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default StoreServices; 