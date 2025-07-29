import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube,
  CreditCard,
  Truck,
  Shield,
  Award,
  ArrowUp,
  ArrowLeft,
  Heart,
  Clock
} from 'lucide-react';
import { StoreData } from '@/api/optimized-store-api';

interface MaxFooterProps {
  storeData: StoreData;
  footerSettings: any;
}

export const MaxFooter: React.FC<MaxFooterProps> = ({ storeData, footerSettings }) => {
  const organization = storeData.organization_details;
  const settings = storeData.organization_settings;

  const features = [
    { icon: Truck, title: 'شحن سريع', description: 'توصيل خلال 24 ساعة' },
    { icon: Shield, title: 'أمان مضمون', description: 'حماية كاملة للبيانات' },
    { icon: Award, title: 'جودة عالية', description: 'منتجات مضمونة الجودة' },
    { icon: Clock, title: 'دعم 24/7', description: 'خدمة عملاء متواصلة' }
  ];

  const quickLinks = [
    { name: 'الرئيسية', href: '/' },
    { name: 'المنتجات', href: '/products' },
    { name: 'الفئات', href: '/categories' },
    { name: 'العروض', href: '/offers' },
    { name: 'من نحن', href: '/about' },
    { name: 'اتصل بنا', href: '/contact' }
  ];

  const customerService = [
    { name: 'سياسة الإرجاع', href: '/return-policy' },
    { name: 'الشحن والتوصيل', href: '/shipping' },
    { name: 'طرق الدفع', href: '/payment-methods' },
    { name: 'الأسئلة الشائعة', href: '/faq' },
    { name: 'تتبع الطلب', href: '/track-order' },
    { name: 'الدعم الفني', href: '/support' }
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', name: 'Facebook' },
    { icon: Instagram, href: '#', name: 'Instagram' },
    { icon: Twitter, href: '#', name: 'Twitter' },
    { icon: Youtube, href: '#', name: 'YouTube' }
  ];

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-16">
      {/* شريط المميزات */}
      <div className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-md transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="p-3 bg-primary/10 rounded-full">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* المحتوى الرئيسي للفوتر */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* معلومات المتجر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6">
                {settings.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt={organization.name}
                    className="h-12 w-auto mb-4"
                  />
                ) : (
                  <h3 className="text-2xl font-bold text-primary mb-4">{organization.name}</h3>
                )}
                <p className="text-muted-foreground leading-relaxed">
                  {organization.description || 'متجر إلكتروني متطور يوفر أفضل المنتجات بأفضل الأسعار مع خدمة عملاء متميزة.'}
                </p>
              </div>

              {/* معلومات الاتصال */}
              <div className="space-y-3">
                {organization.contact_email && (
                  <a 
                    href={`mailto:${organization.contact_email}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{organization.contact_email}</span>
                  </a>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>+213 123 456 789</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>الجزائر، العاصمة</span>
                </div>
              </div>
            </motion.div>

            {/* روابط سريعة */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-6">روابط سريعة</h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* خدمة العملاء */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-6">خدمة العملاء</h3>
              <ul className="space-y-3">
                {customerService.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* النشرة الإخبارية */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-6">النشرة الإخبارية</h3>
              <p className="text-muted-foreground mb-4">
                اشترك في نشرتنا الإخبارية لتحصل على أحدث العروض والمنتجات الجديدة
              </p>
              
              <form className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="بريدك الإلكتروني"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105"
                >
                  اشتراك
                </button>
              </form>

              {/* وسائل التواصل الاجتماعي */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-foreground mb-3">تابعنا على</h4>
                <div className="flex items-center gap-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      className="p-2 bg-muted rounded-full text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                      aria-label={social.name}
                    >
                      <social.icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* أسفل الفوتر */}
      <div className="py-6 border-t border-border bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm">
                © {currentYear} {organization.name}. جميع الحقوق محفوظة.
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>صنع بـ</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>في الجزائر</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <a href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                سياسة الخصوصية
              </a>
              <a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                الشروط والأحكام
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* زر العودة للأعلى */}
      <motion.button
        onClick={scrollToTop}
        className="max-scroll-to-top"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="العودة للأعلى"
      >
        <ArrowUp size={20} />
      </motion.button>
    </footer>
  );
}; 