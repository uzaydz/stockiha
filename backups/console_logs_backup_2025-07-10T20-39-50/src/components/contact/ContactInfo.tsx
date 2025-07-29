import { motion } from 'framer-motion';
import { 
  Phone, Mail, MapPin, Clock, MessageCircle, 
  Facebook, Twitter, Instagram, Linkedin, Github,
  HeadphonesIcon, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContactInfo = () => {
  const contactDetails = [
    {
      icon: Phone,
      title: "رقم الهاتف",
      value: "+213 540 240 886",
      action: "tel:+213540240886",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      value: "info@stockiha.com",
      action: "mailto:info@stockiha.com",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: MapPin,
      title: "العنوان",
      value: "الجزائر، حي النصر، خنشلة",
      action: "#map",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Clock,
      title: "ساعات العمل",
      value: "24/7 - نحن هنا دائماً",
      action: null,
      color: "from-orange-500 to-red-500"
    }
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Github, href: "#", label: "GitHub" }
  ];

  const quickActions = [
    {
      icon: MessageCircle,
      title: "دردشة مباشرة",
      description: "تحدث مع فريق الدعم الآن",
      action: "#chat"
    },
    {
      icon: HeadphonesIcon,
      title: "دعم فني سريع",
      description: "احصل على مساعدة فورية",
      action: "#support"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* معلومات التواصل */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 lg:p-10">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
          معلومات التواصل
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          نحن متواجدون لخدمتك في أي وقت. اختر الطريقة التي تناسبك للتواصل معنا.
        </p>

        <div className="space-y-6">
          {contactDetails.map((detail, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              {detail.action ? (
                <a
                  href={detail.action}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${detail.color} p-2.5 group-hover:scale-110 transition-transform`}>
                    <detail.icon className="w-full h-full text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {detail.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                      {detail.value}
                    </p>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${detail.color} p-2.5`}>
                    <detail.icon className="w-full h-full text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {detail.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                      {detail.value}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* إجراءات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="w-full h-auto p-6 justify-start bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
              onClick={() => window.location.href = action.action}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-right">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {action.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {action.description}
                  </p>
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* وسائل التواصل الاجتماعي */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          تابعنا على وسائل التواصل
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          انضم إلى مجتمعنا واحصل على آخر الأخبار والتحديثات
        </p>
        <div className="flex justify-center gap-4">
          {socialLinks.map((social, index) => (
            <motion.a
              key={index}
              href={social.href}
              aria-label={social.label}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
            >
              <social.icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </motion.a>
          ))}
        </div>
      </div>

      {/* معلومات إضافية */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            نخدم جميع أنحاء الجزائر
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          منصة ستوكيها متاحة لجميع التجار في الجزائر. 
          نوفر دعماً كاملاً باللغة العربية والفرنسية لضمان أفضل تجربة ممكنة.
        </p>
      </div>
    </motion.div>
  );
};

export default ContactInfo;
