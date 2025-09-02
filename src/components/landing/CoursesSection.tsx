import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Play,
  Users,
  Calendar,
  Award,
  TrendingUp,
  Store,
  Megaphone,
  Wrench,
  Smartphone,
  ArrowLeft,
  Sparkles,
  Gift,
  CheckCircle,
  Star,
  Clock,
} from 'lucide-react';

// بيانات الدورات التدريبية
const COURSES: ReadonlyArray<{
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  duration: string;
  level: string;
  color: string;
  category: string;
}> = [
  {
    icon: TrendingUp,
    title: 'دورة التسويق الإلكتروني الشاملة',
    description: 'تعلم أسرار التسويق الرقمي وإدارة الحملات الإعلانية الناجحة',
    duration: '12 ساعة',
    level: 'متوسط',
    color: 'from-blue-500 to-indigo-600',
    category: 'تسويق',
  },
  {
    icon: Store,
    title: 'التجارة الإلكترونية والدفع عند الاستلام',
    description: 'دليل شامل لبناء متجرك الإلكتروني وإدارة الطلبات في الجزائر',
    duration: '8 ساعات',
    level: 'مبتدئ',
    color: 'from-emerald-500 to-green-600',
    category: 'تجارة إلكترونية',
  },
  {
    icon: Smartphone,
    title: 'إنشاء متجر إلكتروني عبر سطوكيها',
    description: 'خطوات عملية لإنشاء وتخصيص متجرك الإلكتروني بسهولة',
    duration: '6 ساعات',
    level: 'مبتدئ',
    color: 'from-purple-500 to-pink-600',
    category: 'منصة سطوكيها',
  },
  {
    icon: Megaphone,
    title: 'الدورة الشاملة في التيك توك أدس',
    description: 'احتراف إعلانات TikTok وتحقيق أفضل النتائج من حملاتك',
    duration: '10 ساعات',
    level: 'متقدم',
    color: 'from-pink-500 to-rose-600',
    category: 'إعلانات',
  },
  {
    icon: TrendingUp,
    title: 'التجار التقليديين: من المحل إلى المنصة الرقمية',
    description: 'كيفية نقل تجارتك التقليدية إلى العالم الرقمي بنجاح',
    duration: '9 ساعات',
    level: 'مبتدئ',
    color: 'from-amber-500 to-orange-600',
    category: 'تحول رقمي',
  },
  {
    icon: Wrench,
    title: 'مقدمي الخدمات والتصليحات مع سطوكيها',
    description: 'إدارة خدماتك وحجوزاتك بكفاءة عبر منصة سطوكيها',
    duration: '7 ساعات',
    level: 'متوسط',
    color: 'from-teal-500 to-cyan-600',
    category: 'خدمات',
  },
];

// بطاقة الدورة التدريبية
const CourseCard = memo(
  ({ course, index }: { course: (typeof COURSES)[number]; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      viewport={{ once: true, margin: '-50px' }}
      className="group h-full"
    >
      <div className="h-full bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-brand-500/30 transition-all duration-300 flex flex-col">
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between mb-4">
          <Badge className="bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 text-xs font-medium px-3 py-1 rounded-full">
            {course.category}
          </Badge>
          <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${course.color} rounded-xl shadow-sm ring-1 ring-white/40 dark:ring-white/10`}>
            <course.icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* محتوى البطاقة */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {course.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow">
          {course.description}
        </p>

        {/* معلومات الدورة */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            <span>{course.level}</span>
          </div>
        </div>

        {/* رابط المشاهدة */}
        <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-brand-600/90 dark:text-brand-400">
          <Play className="h-4 w-4" />
          <span>شاهد الآن</span>
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
);

CourseCard.displayName = 'CourseCard';

const CoursesSection = memo(() => {
  const courses = useMemo(() => COURSES, []);

  return (
    <section dir="rtl" className="relative py-20 landing-bg-secondary landing-section-transition overflow-hidden">
      {/* خلفيات ناعمة */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-1/4 w-72 h-72 bg-gradient-to-r from-brand-500/10 to-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-l from-blue-500/8 to-brand-500/8 rounded-full blur-3xl"
        />
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* عنوان القسم */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            whileInView={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.5 }} 
            viewport={{ once: true }}
          >
            <Badge className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 rounded-full mb-6">
              <BookOpen className="h-4 w-4" />
              دورات تدريبية مجانية
            </Badge>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            دورات سطوكيها{' '}
            <span className="bg-gradient-to-r from-brand-500 to-brand-500/80 bg-clip-text text-transparent">للتجار</span>
          </h2>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            مئات الدروس التعليمية المجانية، حصص مباشرة أسبوعية، ودعم مستمر - كل هذا مجاناً بإشتراكك معنا فقط
          </p>

          {/* مميزات الدورات */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {[
              { icon: Gift, text: '100% مجاني', color: 'text-green-600' },
              { icon: Users, text: 'حصص مباشرة أسبوعية', color: 'text-blue-600' },
              { icon: CheckCircle, text: 'دعم مستمر', color: 'text-purple-600' },
              { icon: Award, text: 'شهادات معتمدة', color: 'text-amber-600' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* شبكة الدورات */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {courses.map((course, index) => (
            <CourseCard key={course.title} course={course} index={index} />
          ))}
        </div>

        {/* دعوة للعمل */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-brand-500/5 to-purple-500/5 rounded-3xl p-8 md:p-10 border border-brand-200 dark:border-brand-500/20">
            <motion.div
              className="flex items-center justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                <Gift className="h-4 w-4" />
                عرض خاص محدود
              </div>
            </motion.div>

            <motion.h3
              className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              احصل على جميع الدورات مجاناً
            </motion.h3>
            
            <motion.p
              className="text-lg text-gray-600 dark:text-gray-400 mb-8"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              فقط بإنشاء حسابك في سطوكيها، ستحصل على الوصول الكامل لجميع الدورات والحصص المباشرة والدعم المستمر
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
            >
              <Button
                size="lg"
                className="group min-w-[220px] h-12 text-base font-semibold bg-brand-600 hover:bg-brand-600/90 dark:bg-brand-500 dark:hover:bg-brand-500/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              >
                ابدأ رحلتك التعليمية مجاناً
                <BookOpen className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
              </Button>
            </motion.div>

            {/* إحصائيات */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 mt-6 border-t border-gray-200 dark:border-gray-800"
            >
              {[
                { number: '500+', label: 'درس تعليمي' },
                { number: '50+', label: 'ساعة محتوى' },
                { number: '5000+', label: 'طالب مستفيد' },
                { number: '4.9★', label: 'تقييم الدورات' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CoursesSection.displayName = 'CoursesSection';

export default CoursesSection;
