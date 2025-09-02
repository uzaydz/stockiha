import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import HeroSection, { HeroSlide } from '../components/HeroSection';

interface StorePreviewPageProps {
  className?: string;
}

// بيانات افتراضية محسنة للمعاينة
const defaultHeroSlides: HeroSlide[] = [
  {
    id: '1',
    title: 'مرحباً بك في متجرنا الإلكتروني',
    subtitle: 'أفضل المنتجات بأسعار منافسة',
    description: 'اكتشف مجموعة واسعة من المنتجات عالية الجودة مع خدمة عملاء استثنائية وتوصيل سريع إلى جميع أنحاء المملكة',
    backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    backgroundColor: 'from-indigo-600 to-purple-700',
    primaryButton: {
      text: 'تسوق الآن',
      href: '/products',
      style: 'primary'
    },
    secondaryButton: {
      text: 'اكتشف المزيد',
      href: '/about',
      style: 'outline'
    },
    trustBadges: ['ضمان الجودة', 'توصيل مجاني', 'دعم 24/7'],
    overlay: {
      enabled: true,
      opacity: 0.4,
      color: 'black'
    }
  },
  {
    id: '2',
    title: 'عروض خاصة لفترة محدودة',
    subtitle: 'خصومات تصل إلى 50%',
    description: 'لا تفوت الفرصة! عروض حصرية على أفضل المنتجات لفترة محدودة فقط. اطلب الآن واستفد من أسعار لا تُقاوم',
    backgroundImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    backgroundColor: 'from-red-500 to-pink-600',
    primaryButton: {
      text: 'اطلب الآن',
      href: '/offers',
      style: 'primary'
    },
    secondaryButton: {
      text: 'عرض العروض',
      href: '/deals',
      style: 'secondary'
    },
    trustBadges: ['عروض حقيقية', 'أفضل الأسعار', 'جودة مضمونة'],
    overlay: {
      enabled: true,
      opacity: 0.5,
      color: 'black'
    }
  },
  {
    id: '3',
    title: 'خدمة عملاء متميزة',
    subtitle: 'نحن هنا لخدمتك دائماً',
    description: 'فريق خدمة العملاء المتخصص لدينا جاهز لمساعدتك في أي وقت. تواصل معنا واحصل على الدعم الذي تحتاجه',
    backgroundImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
    backgroundColor: 'from-green-500 to-emerald-600',
    primaryButton: {
      text: 'تواصل معنا',
      href: '/contact',
      style: 'primary'
    },
    secondaryButton: {
      text: 'الأسئلة الشائعة',
      href: '/faq',
      style: 'outline'
    },
    trustBadges: ['دعم فوري', 'خبراء متخصصون', 'حلول سريعة'],
    overlay: {
      enabled: true,
      opacity: 0.3,
      color: 'black'
    }
  }
];

const StorePreviewPage: React.FC<StorePreviewPageProps> = ({ className }) => {
  const [heroSlides] = useState<HeroSlide[]>(defaultHeroSlides);

  // تحسين الأداء: استخدام useMemo للحسابات الثقيلة
  const memoizedHeroSection = useMemo(() => (
    <HeroSection
      slides={heroSlides}
      autoPlay={true}
      autoPlayInterval={5000}
      showNavigation={true}
      showIndicators={true}
      showTrustBadges={true}
      height="lg"
      isPreview={false}
    />
  ), [heroSlides]);

  return (
    <div className={cn("min-h-screen bg-white dark:bg-gray-900", className)}>
      {/* مقطع الهيرو */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {memoizedHeroSection}
      </motion.section>

      {/* مقطع المنتجات المميزة */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="py-16 px-6"
      >
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              المنتجات المميزة
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              اكتشف مجموعة مختارة بعناية من أفضل منتجاتنا
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <div className="text-4xl">📦</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    منتج رقم {i + 1}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    وصف قصير للمنتج
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {(Math.random() * 100 + 50).toFixed(0)} ريال
                    </span>
                    <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* مقطع الفئات */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="py-16 px-6 bg-gray-50 dark:bg-gray-800"
      >
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              تسوق بالفئات
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              استكشف منتجاتنا المنظمة في فئات مختلفة
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'إلكترونيات', icon: '📱', color: 'from-blue-500 to-blue-600' },
              { name: 'أزياء', icon: '👕', color: 'from-pink-500 to-pink-600' },
              { name: 'منزل وحديقة', icon: '🏠', color: 'from-green-500 to-green-600' },
              { name: 'رياضة', icon: '⚽', color: 'from-orange-500 to-orange-600' },
              { name: 'كتب', icon: '📚', color: 'from-purple-500 to-purple-600' },
              { name: 'ألعاب', icon: '🎮', color: 'from-red-500 to-red-600' }
            ].map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="group cursor-pointer"
              >
                <div className={cn(
                  "aspect-square rounded-xl bg-gradient-to-br flex flex-col items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105",
                  category.color
                )}>
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <span className="text-sm font-medium text-center">{category.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* مقطع الشهادات */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="py-16 px-6"
      >
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              آراء عملائنا
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              تعرف على تجارب عملائنا الراضين
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }, (_, star) => (
                      <span key={star}>⭐</span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  "تجربة رائعة مع الموقع. المنتجات عالية الجودة والتوصيل سريع. أنصح الجميع بالتسوق من هنا."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="mr-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      عميل راضٍ {i + 1}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      عميل منذ {2020 + i}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* مقطع الاتصال */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="py-16 px-6 bg-indigo-600 text-white"
      >
        <div className="container mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            هل لديك سؤال؟
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            فريق خدمة العملاء جاهز لمساعدتك في أي وقت
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              تواصل معنا
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors">
              الأسئلة الشائعة
            </button>
          </div>
        </div>
      </motion.section>

      {/* الفوتر */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">متجرك الإلكتروني</h3>
              <p className="text-gray-400 mb-4">
                أفضل المنتجات بأسعار منافسة مع خدمة عملاء استثنائية
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">الرئيسية</a></li>
                <li><a href="#" className="hover:text-white transition-colors">المنتجات</a></li>
                <li><a href="#" className="hover:text-white transition-colors">من نحن</a></li>
                <li><a href="#" className="hover:text-white transition-colors">اتصل بنا</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">الفئات</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">إلكترونيات</a></li>
                <li><a href="#" className="hover:text-white transition-colors">أزياء</a></li>
                <li><a href="#" className="hover:text-white transition-colors">منزل وحديقة</a></li>
                <li><a href="#" className="hover:text-white transition-colors">رياضة</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">تواصل معنا</h4>
              <div className="space-y-2 text-gray-400">
                <p>📞 +966 50 123 4567</p>
                <p>✉️ info@store.com</p>
                <p>📍 الرياض، المملكة العربية السعودية</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 متجرك الإلكتروني. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StorePreviewPage;
