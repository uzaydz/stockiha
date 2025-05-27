import { motion } from 'framer-motion';
import { Star, UserCheck, ShoppingBag, Award, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CustomerStatsSectionProps {
  title?: string;
  subtitle?: string;
  stats?: {
    totalCustomers: number;
    completedOrders: number;
    averageRating: number;
    customerSatisfaction: number;
    ratingDistribution: {
      five: number;
      four: number;
      three: number;
      two: number;
      one: number;
    };
  };
}

const defaultStats = {
  totalCustomers: 5600,
  completedOrders: 12750,
  averageRating: 4.7,
  customerSatisfaction: 98,
  ratingDistribution: {
    five: 75,
    four: 18,
    three: 5,
    two: 1,
    one: 1
  }
};

const CustomerStatsSection = ({
  title = "اكتشف تجربة عملائنا",
  subtitle = "نحن نفخر بخدمة آلاف العملاء المميزين ونسعى دوماً للارتقاء بمستوى رضاهم",
  stats = defaultStats
}: CustomerStatsSectionProps) => {
  // إعدادات التحريك للأرقام المتزايدة
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="py-16 bg-muted/10">
      <div className="container px-4 mx-auto">
        {/* عنوان القسم */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard 
            icon={<UserCheck className="h-10 w-10 text-blue-500" />}
            label="عدد العملاء"
            value={stats.totalCustomers.toLocaleString('ar-EG')}
            background="from-blue-50 to-blue-100"
          />
          <StatsCard 
            icon={<ShoppingBag className="h-10 w-10 text-green-500" />}
            label="طلبات مكتملة"
            value={stats.completedOrders.toLocaleString('ar-EG')}
            background="from-green-50 to-green-100"
          />
          <StatsCard 
            icon={<Star className="h-10 w-10 text-amber-500" />}
            label="متوسط التقييم"
            value={stats.averageRating.toLocaleString('ar-EG')}
            background="from-amber-50 to-amber-100"
          />
          <StatsCard 
            icon={<Award className="h-10 w-10 text-indigo-500" />}
            label="رضا العملاء"
            value={`${stats.customerSatisfaction}%`}
            background="from-indigo-50 to-indigo-100"
          />
        </div>

        {/* توزيع التقييمات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div 
            className="space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            <h3 className="text-xl font-semibold mb-4">توزيع التقييمات</h3>
            <RatingBar rating={5} percentage={stats.ratingDistribution.five} />
            <RatingBar rating={4} percentage={stats.ratingDistribution.four} />
            <RatingBar rating={3} percentage={stats.ratingDistribution.three} />
            <RatingBar rating={2} percentage={stats.ratingDistribution.two} />
            <RatingBar rating={1} percentage={stats.ratingDistribution.one} />
          </motion.div>

          <div className="relative bg-white p-6 rounded-lg shadow-sm border">
            <div className="absolute -top-5 -right-5 bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-6 mt-4">التزامنا تجاه العملاء</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <div className="bg-primary/10 p-1 rounded-full mt-1 ml-3">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <span>منتجات عالية الجودة تم اختيارها بعناية</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 p-1 rounded-full mt-1 ml-3">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <span>شحن سريع وموثوق وتغليف آمن للمنتجات</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 p-1 rounded-full mt-1 ml-3">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <span>دعم فني على مدار الساعة لحل أي مشكلة</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 p-1 rounded-full mt-1 ml-3">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <span>ضمان استرجاع المنتج خلال 30 يوم</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

// مكون بطاقة إحصائية
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  background: string;
}

const StatsCard = ({ icon, label, value, background }: StatsCardProps) => {
  return (
    <motion.div 
      className={`bg-gradient-to-br ${background} p-6 rounded-lg shadow-sm border border-muted`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center mb-4">
        {icon}
        <h4 className="text-lg font-semibold mr-3">{label}</h4>
      </div>
      <div className="text-3xl md:text-4xl font-bold">{value}</div>
    </motion.div>
  );
};

// مكون شريط التقييم
interface RatingBarProps {
  rating: number;
  percentage: number;
}

const RatingBar = ({ rating, percentage }: RatingBarProps) => {
  return (
    <motion.div 
      className="flex items-center"
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
    >
      <div className="flex items-center w-16">
        <span className="font-semibold">{rating}</span>
        <Star className="h-4 w-4 text-amber-400 fill-amber-400 mr-1" />
      </div>
      <div className="flex-1 ml-3">
        <Progress value={percentage} className="h-2.5" />
      </div>
      <span className="w-12 text-right text-sm text-muted-foreground">{percentage}%</span>
    </motion.div>
  );
};

export default CustomerStatsSection;
