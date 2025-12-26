import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Youtube, Linkedin, Heart, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

interface FooterProps {
  onNavigate?: (page: 'home' | 'features' | 'pricing' | 'download' | 'pos' | 'ecommerce' | 'contact' | 'courses' | 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate = (_page) => { } }) => {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (!showScroll && window.scrollY > 400) {
        setShowScroll(true);
      } else if (showScroll && window.scrollY <= 400) {
        setShowScroll(false);
      }
    };

    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, [showScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigationLinks = [
    { label: 'الرئيسية', id: 'home' },
    { label: 'المميزات', id: 'features' },
    { label: 'الأسعار', id: 'pricing' },
    { label: 'تواصل معنا', id: 'contact' },
  ];

  const productLinks = [
    { label: 'نظام الكاشير (POS)', id: 'pos' },
    { label: 'المتجر الإلكتروني', id: 'ecommerce' },
    { label: 'تحميل التطبيق', id: 'download' },
  ];

  return (
    <footer className="bg-[#020202] pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-brand/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none opacity-20 will-change-transform"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-20"
        >
          {/* Brand Column */}
          <motion.div variants={itemVariants} className="md:col-span-5 lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-transparent rounded-xl flex items-center justify-center border border-white/10">
                <img src="/logo-new.ico" alt="Logo" className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white tracking-wide">سطوكيها</span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-8 max-w-sm text-sm">
              النظام المتكامل لإدارة تجارتك. من تسيير المخزون والكاشير، إلى متجرك الإلكتروني وتوصيل الطلبات. كل ما تحتاجه للنجاح في منصة واحدة.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Youtube, href: "#" },
                { icon: Linkedin, href: "#" }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:bg-brand hover:border-brand hover:text-white transition-all duration-300 group will-change-transform transform-gpu"
                >
                  <social.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants} className="md:col-span-3 lg:col-span-2">
            <h4 className="text-white font-bold mb-6">روابط سريعة</h4>
            <ul className="space-y-4">
              {navigationLinks.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id as any)}
                    className="text-gray-400 hover:text-brand transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-brand transition-colors"></span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Product */}
          <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-3">
            <h4 className="text-white font-bold mb-6">المنتج</h4>
            <ul className="space-y-4">
              {productLinks.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id as any)}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants} className="md:col-span-12 lg:col-span-3">
            <h4 className="text-white font-bold mb-6">تواصل معنا</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-1">
                  <Phone className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <div className="text-xs text-brand font-bold mb-0.5">خدمة العملاء</div>
                  <div dir="ltr" className="text-gray-300 font-mono text-sm hover:text-white transition-colors cursor-pointer">+213 550 00 00 00</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-1">
                  <Mail className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <div className="text-xs text-brand font-bold mb-0.5">البريد الإلكتروني</div>
                  <div className="text-gray-300 font-mono text-sm hover:text-white transition-colors cursor-pointer">contact@stoukiha.com</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-1">
                  <MapPin className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <div className="text-xs text-brand font-bold mb-0.5">المقر الرئيسي</div>
                  <div className="text-gray-300 text-sm">الجزائر العاصمة، الجزائر</div>
                </div>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm font-medium">
            © {new Date().getFullYear()} Stoukiha. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('terms')} className="text-sm text-gray-500 hover:text-white transition-colors">الشروط والأحكام</button>
            <button onClick={() => onNavigate('privacy')} className="text-sm text-gray-500 hover:text-white transition-colors">سياسة الخصوصية</button>
          </div>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            صنع بـ <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> في الجزائر
          </p>
        </div>
      </div>
    </footer>
  );
};