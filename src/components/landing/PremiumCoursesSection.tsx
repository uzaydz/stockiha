import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  TrendingUp,
  Store,
  Smartphone,
  Megaphone,
  Wrench,
  Users,
  Award,
  Gift,
  CheckCircle,
  Clock,
  Lock,
  Search,
} from 'lucide-react';

// بيانات الدورات التدريبية
const COURSE_CATEGORIES = [
  { id: 'all', name: 'جميع الدورات', icon: BookOpen },
  { id: 'marketing', name: 'التسويق', icon: Megaphone },
  { id: 'ecommerce', name: 'التجارة الإلكترونية', icon: Store },
  { id: 'platform', name: 'منصة سطوكيها', icon: Smartphone },
  { id: 'services', name: 'الخدمات', icon: Wrench },
];

const COURSES = [
  {
    id: 1,
    title: 'دورة التسويق الإلكتروني الشاملة',
    description: 'تعلم أسرار التسويق الرقمي وإدارة الحملات الإعلانية الناجحة',
    duration: '12 ساعة',
    level: 'متوسط',
    category: 'marketing',
    lessons: 24,
    students: 1240,
    rating: 4.9,
  },
  {
    id: 2,
    title: 'التجارة الإلكترونية والدفع عند الاستلام',
    description: 'دليل شامل لبناء متجرك الإلكتروني وإدارة الطلبات في الجزائر',
    duration: '8 ساعات',
    level: 'مبتدئ',
    category: 'ecommerce',
    lessons: 16,
    students: 980,
    rating: 4.8,
  },
  {
    id: 3,
    title: 'إنشاء متجر إلكتروني عبر سطوكيها',
    description: 'خطوات عملية لإنشاء وتخصيص متجرك الإلكتروني بسهولة',
    duration: '6 ساعات',
    level: 'مبتدئ',
    category: 'platform',
    lessons: 12,
    students: 1560,
    rating: 4.9,
  },
  {
    id: 4,
    title: 'الدورة الشاملة في التيك توك أدس',
    description: 'احتراف إعلانات TikTok وتحقيق أفضل النتائج من حملاتك',
    duration: '10 ساعات',
    level: 'متقدم',
    category: 'marketing',
    lessons: 20,
    students: 750,
    rating: 4.7,
  },
  {
    id: 5,
    title: 'التجار التقليديين: من المحل إلى المنصة الرقمية',
    description: 'كيفية نقل تجاربك التقليدية إلى العالم الرقمي بنجاح',
    duration: '9 ساعات',
    level: 'مبتدئ',
    category: 'ecommerce',
    lessons: 18,
    students: 1120,
    rating: 4.8,
  },
  {
    id: 6,
    title: 'مقدمي الخدمات والتصليحات مع سطوكيها',
    description: 'إدارة خدماتك وحجوزاتك بكفاءة عبر منصة سطوكيها',
    duration: '7 ساعات',
    level: 'متوسط',
    category: 'services',
    lessons: 14,
    students: 680,
    rating: 4.9,
  },
];

// بطاقة الدورة التدريبية - تصميم متطور
const PremiumCourseCard = memo(({ course, index }: { course: typeof COURSES[0]; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group h-full"
    >
      <div className="h-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden">
        {/* خلفية زخرفية */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full blur-2xl"></div>
        </div>
        
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">حصري لمشتركين سطوكيها</span>
          </div>
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-500 to-rose-500 rounded-lg shadow-sm">
            <Lock className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* محتوى البطاقة */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors relative z-10">
          {course.title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow relative z-10">
          {course.description}
        </p>

        {/* معلومات الدورة */}
        <div className="space-y-3 mb-4 relative z-10">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              <span>{course.level}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{course.lessons} درس</span>
            <span className="text-gray-500 dark:text-gray-400">{course.students} متعلم</span>
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span className="font-medium text-gray-900 dark:text-white">{course.rating}</span>
            </div>
          </div>
        </div>

        {/* زر الوصول للدورة */}
        <div className="mt-auto relative z-10">
          <Button 
            variant="outline" 
            className="w-full border-2 border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl py-2.5 text-sm font-medium transition-all duration-300"
          >
            <Lock className="h-4 w-4 ml-2" />
            احصل على الوصول
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

PremiumCourseCard.displayName = 'PremiumCourseCard';

const PremiumCoursesSection = memo(() => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // تصفية الدورات حسب الفئة والبحث
  const filteredCourses = COURSES.filter(course => {
    const matchesCategory = activeCategory === 'all' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section dir="rtl" className="relative py-20 landing-bg-secondary landing-section-transition overflow-hidden">
      {/* خلفيات زخرفية */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-gradient-to-r from-amber-500/10 to-rose-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-gradient-to-l from-blue-500/10 to-violet-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container px-4 mx-auto relative z-10">
        {/* عنوان القسم */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-rose-100 text-amber-700 border border-amber-200 dark:from-amber-900/20 dark:to-rose-900/20 dark:text-amber-300 dark:border-amber-700/30 rounded-full mb-6">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">مكتبة المحتوى التعليمي الحصري</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            تعلم و ارتقِ بتجاربك مع{' '}
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">سطوكيها</span>
          </h2>
          
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            اكتسب المهارات التي تحتاجها لتطوير تجاربك مع دوراتنا التدريبية الحصرية لمشتركي سطوكيها
          </p>
        </motion.div>

        {/* فلترة الفئات */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 max-w-4xl mx-auto">
          {COURSE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* شبكة الدورات */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {filteredCourses.map((course, index) => (
            <PremiumCourseCard key={course.id} course={course} index={index} />
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
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-amber-500/5 to-rose-500/5 rounded-3xl p-8 md:p-12 border border-amber-200 dark:border-gray-700 relative overflow-hidden">
            {/* خلفية زخرفية */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl -translate-x-32 -translate-y-32"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-rose-500/20 to-transparent rounded-full blur-3xl translate-x-32 translate-y-32"></div>
            </div>
            
            <div className="relative z-10">
              <motion.div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Gift className="h-4 w-4" />
                عرض حصري لمشتركي سطوكيها
              </motion.div>

              <motion.h3
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                انضم إلى مجتمع المتعلم الناجح
              </motion.h3>
              
              <motion.p
                className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                اشترك الآن في منصة سطوكيها واحصل على الوصول الكامل إلى جميع الدورات التدريبية والحصص المباشرة والدعم المستمر
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
              >
                <Button
                  size="lg"
                  className="group min-w-[240px] h-14 text-base font-semibold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                >
                  اشترك الآن وابدأ التعلم
                  <BookOpen className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
                </Button>
              </motion.div>

              {/* مزايا الاشتراك */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 mt-8 border-t border-amber-200 dark:border-gray-700"
              >
                {[
                  { icon: Users, title: 'مجتمع المتعلم', description: 'تواصل مع آلاف المتعلم النشط' },
                  { icon: Award, title: 'شهادات معتمدة', description: 'احصل على شهادات إتمام' },
                  { icon: CheckCircle, title: 'دعم متخصص', description: 'مساعدة فورية من الخبراء' },
                  { icon: Gift, title: 'محتوى حصري', description: 'دورات غير متوفرة في أي مكان' },
                ].map((benefit, i) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={i} className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl mb-3 mx-auto">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{benefit.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

PremiumCoursesSection.displayName = 'PremiumCoursesSection';

export default PremiumCoursesSection;