import React from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  Users,
  Globe,
  Shield,
  Headphones,
  CreditCard,
  Smartphone
} from 'lucide-react';

const AdditionalFeatures = () => {
  const additionalFeatures = [
    { 
      icon: Package, 
      title: 'إدارة المخزون', 
      description: 'تتبع دقيق للمخزون مع تنبيهات ذكية',
      color: 'from-amber-500 to-orange-500'
    },
    { 
      icon: Truck, 
      title: 'إدارة التوصيل', 
      description: 'ربط مباشر مع شركات التوصيل',
      color: 'from-emerald-500 to-teal-500'
    },
    { 
      icon: Users, 
      title: 'إدارة الفريق', 
      description: 'تحكم في صلاحيات موظفيك',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: Globe, 
      title: 'متعدد اللغات', 
      description: 'دعم اللغة العربية والفرنسية',
      color: 'from-violet-500 to-purple-500'
    },
    { 
      icon: Shield, 
      title: 'أمان متقدم', 
      description: 'حماية قصوى لبياناتك',
      color: 'from-rose-500 to-pink-500'
    },
    { 
      icon: Headphones, 
      title: 'دعم فني', 
      description: 'دعم على مدار الساعة',
      color: 'from-amber-500 to-yellow-500'
    },
    { 
      icon: CreditCard, 
      title: 'مدفوعات متنوعة', 
      description: 'قبول جميع وسائل الدفع',
      color: 'from-emerald-500 to-green-500'
    },
    { 
      icon: Smartphone, 
      title: 'تطبيق جوال', 
      description: 'إدارة متجرك من هاتفك',
      color: 'from-blue-500 to-indigo-500'
    }
  ];

  return (
    <div className="mb-24">
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12"
      >
        مميزات إضافية قوية
      </motion.h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {additionalFeatures.map((feature, index) => {
          const Icon = feature.icon;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-900 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
              
              {/* Hover effect */}
              <div className={`w-full h-1 rounded-full bg-gradient-to-r ${feature.color} mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalFeatures;