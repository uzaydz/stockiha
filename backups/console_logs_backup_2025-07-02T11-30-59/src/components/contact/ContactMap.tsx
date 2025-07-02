import { motion } from 'framer-motion';
import { MapPin, Navigation, Compass, Map } from 'lucide-react';

const ContactMap = () => {
  // إحداثيات خنشلة، الجزائر
  const mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d51584.37934579299!2d7.0886!3d35.4358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12f9e0990488c035%3A0x9d4f3c41c3b89f7e!2sKhenchela%2C%20Algeria!5e0!3m2!1sen!2s!4v1234567890";

  return (
    <div className="container mx-auto px-6" id="map">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full mb-4">
          <MapPin className="w-5 h-5" />
          <span className="font-semibold">موقعنا</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          زورونا في مقرنا
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          نسعد بزيارتكم في مقرنا الرئيسي في خنشلة، الجزائر
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* الخريطة */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2"
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden h-[500px]">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="موقع ستوكيها على الخريطة"
              className="w-full h-full"
            />
          </div>
        </motion.div>

        {/* معلومات الموقع */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* بطاقة العنوان */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-2.5">
                <MapPin className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                عنوان المقر
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              حي النصر<br />
              خنشلة 40000<br />
              الجزائر
            </p>
          </div>

          {/* معالم قريبة */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5">
                <Navigation className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                معالم قريبة
              </h3>
            </div>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>بالقرب من المسجد الكبير</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>أمام الحديقة العامة</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>خلف مركز التسوق</span>
              </li>
            </ul>
          </div>

          {/* كيفية الوصول */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Compass className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                سهولة الوصول
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              موقعنا في قلب المدينة يسهل الوصول إليه بجميع وسائل النقل.
              مواقف سيارات متوفرة للزوار.
            </p>
          </div>
        </motion.div>
      </div>

      {/* رسالة ترحيبية */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-center text-white"
      >
        <Map className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h3 className="text-2xl font-bold mb-4">
          نتطلع لرؤيتك!
        </h3>
        <p className="text-lg opacity-90 max-w-2xl mx-auto">
          فريقنا متواجد لاستقبالك والإجابة على جميع استفساراتك.
          لا تتردد في زيارتنا في أي وقت خلال ساعات العمل.
        </p>
      </motion.div>
    </div>
  );
};

export default ContactMap;
