import { motion } from 'framer-motion';
import { Users, Shield, Activity, UserCheck, ClipboardList, Building } from 'lucide-react';

const ManagementFeatures = () => {
  const features = [
    {
      icon: Users,
      title: "عدد غير محدود من الموظفين",
      description: "أضف عدد لا محدود من الحسابات للموظفين والمديرين"
    },
    {
      icon: Shield,
      title: "صلاحيات متقدمة",
      description: "تحكم دقيق في الصلاحيات حسب الدور والمسؤولية"
    },
    {
      icon: Activity,
      title: "تتبع النشاط",
      description: "سجل كامل لكل نشاط وعملية يقوم بها الموظفون"
    },
    {
      icon: UserCheck,
      title: "إدارة العملاء والموردين",
      description: "معلومات كاملة مع تتبع المديونية والدفعات"
    }
  ];

  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full mb-4">
          <Building className="w-5 h-5" />
          <span className="font-semibold">إدارة المؤسسة والموظفين</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          تحكم كامل في مؤسستك
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          أدوات قوية لإدارة الموظفين والعملاء والموردين بكفاءة عالية
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 p-2.5">
                <feature.icon className="w-full h-full text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ManagementFeatures; 