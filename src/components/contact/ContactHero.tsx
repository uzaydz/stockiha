import { motion } from 'framer-motion';
import { MessageSquare, Phone, Mail, MapPin, Clock, Headphones } from 'lucide-react';

const ContactHero = () => {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent"></div>
      
      {/* دوائر متحركة في الخلفية */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* الأيقونة الرئيسية */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2 
            }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full mb-8 shadow-lg"
          >
            <MessageSquare className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            نحن هنا لمساعدتك
            <span className="block text-primary mt-2">تواصل معنا الآن</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            فريق دعم متخصص جاهز لخدمتك على مدار الساعة. 
            لا تتردد في التواصل معنا لأي استفسار أو مساعدة.
          </p>
          
          {/* بطاقات المعلومات السريعة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Phone className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">اتصل بنا</h3>
              <p className="text-gray-600 dark:text-gray-300">متاحون 24/7</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">راسلنا</h3>
              <p className="text-gray-600 dark:text-gray-300">رد خلال 24 ساعة</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg"
            >
              <Headphones className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">دعم فني</h3>
              <p className="text-gray-600 dark:text-gray-300">فريق متخصص</p>
            </motion.div>
          </div>
          
          {/* الإحصائيات */}
          <div className="flex justify-center gap-8 flex-wrap">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h4 className="text-3xl font-bold text-primary mb-1">95%</h4>
              <p className="text-gray-600 dark:text-gray-300">رضا العملاء</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h4 className="text-3xl font-bold text-primary mb-1">&lt;30 دقيقة</h4>
              <p className="text-gray-600 dark:text-gray-300">متوسط وقت الرد</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <h4 className="text-3xl font-bold text-primary mb-1">24/7</h4>
              <p className="text-gray-600 dark:text-gray-300">دعم متواصل</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactHero;
