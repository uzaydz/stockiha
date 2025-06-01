import { motion } from 'framer-motion';
import { 
  Store, Zap, Printer, Package, Search, 
  CreditCard, Users, BarChart, QrCode
} from 'lucide-react';

const POSFeatures = () => {
  const features = [
    {
      icon: Zap,
      title: "بيع سريع وسهل",
      description: "واجهة سهلة الاستعمال للعمال والمديرين مع بحث سريع",
      details: ["بحث بالاسم أو الباركود", "دعم QR Code", "واجهة بديهية"]
    },
    {
      icon: CreditCard,
      title: "مرونة في الدفع",
      description: "دعم جميع طرق الدفع مع إمكانية الدفع الجزئي أو المؤجل",
      details: ["دفع نقدي", "دفع جزئي", "دفع مؤجل"]
    },
    {
      icon: Printer,
      title: "فواتير احترافية",
      description: "طباعة فواتير مخصصة بالكامل حرارية أو A4",
      details: ["تخصيص كامل", "شعار وتوقيع", "سجل كامل"]
    },
    {
      icon: Package,
      title: "إدارة مخزون ذكية",
      description: "تتبع دقيق للمخزون مع تنبيهات انخفاض الكميات",
      details: ["كميات حية", "تنبيهات ذكية", "منتجات متغيرة"]
    }
  ];

  const stats = [
    { number: "10x", label: "أسرع في المعاملات" },
    { number: "99.9%", label: "دقة في المخزون" },
    { number: "24/7", label: "متاح دائماً" },
    { number: "0", label: "أخطاء حسابية" }
  ];

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-full mb-4">
          <Store className="w-5 h-5" />
          <span className="font-semibold">نظام نقطة البيع POS</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          نقطة بيع ذكية وسريعة
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          حول محلك إلى نقطة بيع حديثة مع نظام متطور يسهل عملية البيع ويزيد الإنتاجية
        </p>
      </motion.div>

      {/* الإحصائيات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 text-center"
          >
            <h3 className="text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
              {stat.number}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* المميزات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-3 group-hover:scale-110 transition-transform">
                <feature.icon className="w-full h-full text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      </div>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* قسم العرض التوضيحي */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-3xl p-8 lg:p-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              واجهة بيع متطورة تناسب جميع الأعمال
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Search className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">بحث ذكي ومتقدم</h4>
                  <p className="text-gray-600 dark:text-gray-300">ابحث بالاسم، الباركود، أو امسح QR Code للوصول السريع للمنتجات</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Users className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">إدارة العملاء</h4>
                  <p className="text-gray-600 dark:text-gray-300">اختر العميل أو البيع كزائر مع حفظ سجل كامل للمعاملات</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <BarChart className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">تقارير فورية</h4>
                  <p className="text-gray-600 dark:text-gray-300">تابع المبيعات والأرباح والمخزون بتقارير تفصيلية لحظية</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-green-500 text-white p-4 flex items-center justify-between">
                <span className="font-semibold">نقطة البيع - سطوكيها</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 text-center">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-slate-600 rounded mb-2 mx-auto"></div>
                      <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-800 dark:text-green-300">المجموع</span>
                    <span className="text-2xl font-bold text-green-800 dark:text-green-300">2,450 دج</span>
                  </div>
                </div>
              </div>
            </div>
            {/* عناصر زخرفية */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default POSFeatures; 