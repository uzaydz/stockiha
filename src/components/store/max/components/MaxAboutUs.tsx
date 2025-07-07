import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Target, 
  Award, 
  Heart, 
  CheckCircle, 
  ArrowLeft,
  Truck,
  Shield,
  Clock,
  Star
} from 'lucide-react';
import { StoreData } from '@/api/optimized-store-api';

interface MaxAboutUsProps {
  settings: any;
  storeData: StoreData;
}

export const MaxAboutUs: React.FC<MaxAboutUsProps> = ({ settings, storeData }) => {
  const organization = storeData.organization_details;

  const defaultSettings = {
    title: 'من نحن',
    subtitle: 'تعرف على قصتنا ورؤيتنا',
    showStats: true,
    showValues: true,
    showTeam: false,
    layout: 'modern'
  };

  const aboutSettings = { ...defaultSettings, ...settings };

  const stats = [
    { icon: Users, value: '500+', label: 'عميل راضي' },
    { icon: Award, value: '4.8', label: 'تقييم العملاء' },
    { icon: Truck, value: '1000+', label: 'طلب تم توصيله' },
    { icon: Clock, value: '24/7', label: 'دعم العملاء' }
  ];

  const values = [
    {
      icon: Target,
      title: 'رؤيتنا',
      description: 'أن نكون المتجر الإلكتروني الأول والأكثر ثقة في المنطقة، نوفر تجربة تسوق استثنائية لعملائنا.'
    },
    {
      icon: Heart,
      title: 'مهمتنا',
      description: 'نسعى لتوفير أفضل المنتجات بأسعار تنافسية مع خدمة عملاء متميزة وتوصيل سريع وآمن.'
    },
    {
      icon: Award,
      title: 'قيمنا',
      description: 'الجودة، الثقة، والابتكار هي القيم الأساسية التي توجه عملنا وتضمن رضا عملائنا.'
    }
  ];

  const features = [
    'منتجات عالية الجودة ومضمونة',
    'أسعار تنافسية وعروض حصرية',
    'شحن سريع وآمن لجميع المحافظات',
    'خدمة عملاء متاحة 24/7',
    'ضمان الإرجاع خلال 14 يوم',
    'طرق دفع متنوعة وآمنة'
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* رأس القسم */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {aboutSettings.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {aboutSettings.subtitle}
          </p>
        </motion.div>

        {/* القصة الرئيسية */}
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* النص */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              قصة {organization.name}
            </h3>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {organization.description || 
                'بدأت رحلتنا بحلم بسيط: توفير تجربة تسوق إلكترونية استثنائية تجمع بين الجودة والراحة والثقة. منذ انطلاقتنا، نعمل بلا كلل لنكون الخيار الأول لعملائنا في المنطقة.'}
              </p>
              <p>
                نؤمن بأن التسوق الإلكتروني يجب أن يكون تجربة ممتعة وآمنة. لذلك، نحرص على انتقاء أفضل المنتجات من موردين موثوقين، ونوفر خدمة عملاء متميزة تضمن رضاكم الكامل.
              </p>
              <p>
                فريقنا المتخصص يعمل على مدار الساعة لضمان وصول طلباتكم في الوقت المحدد وبأفضل حالة ممكنة. نحن لسنا مجرد متجر، بل شريككم في رحلة التسوق الذكي.
              </p>
            </div>

            {/* المميزات */}
            <div className="mt-8 space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* الصورة */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1740"
                alt="من نحن"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            
            {/* عناصر زخرفية */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-secondary/10 rounded-full blur-xl"></div>
          </div>
        </motion.div>

        {/* الإحصائيات */}
        {aboutSettings.showStats && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center p-6 bg-card border border-border rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* القيم والرؤية */}
        {aboutSettings.showValues && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 mb-20"
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center p-8 bg-card border border-border rounded-2xl hover:shadow-lg transition-all duration-300 hover:border-primary/20"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full mb-6">
                  <value.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* دعوة للعمل */}
        <motion.div
          className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            انضم إلى عائلة عملائنا السعداء
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            اكتشف تجربة تسوق جديدة مع آلاف المنتجات عالية الجودة وخدمة عملاء استثنائية
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/products"
              className="group inline-flex items-center px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              ابدأ التسوق الآن
              <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            
            <a
              href="/contact"
              className="inline-flex items-center px-8 py-4 border-2 border-primary text-primary rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              تواصل معنا
            </a>
          </div>

          {/* تقييم العملاء */}
          <div className="flex items-center justify-center gap-2 mt-8 p-4 bg-background/50 rounded-xl border border-border max-w-sm mx-auto">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-foreground font-semibold">4.8</span>
            <span className="text-muted-foreground">من أكثر من 500 تقييم</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}; 