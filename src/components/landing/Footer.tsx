import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Mail, 
  PhoneCall, 
  MapPin, 
  Globe, 
  ArrowUp,
  Sparkles,
  Star,
  Shield,
  Clock,
  Award,
  Users,
  CheckCircle,
  Zap,
  Heart,
  Gift,
  CreditCard,
  Smartphone,
  Monitor,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRef } from 'react';

const Footer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -30]);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <footer 
      ref={containerRef}
      className="relative landing-bg-secondary landing-section-transition border-t border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-gradient-radial from-[#fc5d41]/15 via-[#fc5d41]/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.2 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-0 -right-1/4 w-[800px] h-[800px] bg-gradient-radial from-purple-500/10 via-purple-500/3 to-transparent rounded-full blur-3xl"
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='footer-grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23footer-grid)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Floating Elements */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -100 - 50],
              opacity: [0, 0.2, 0],
              rotate: [0, 180]
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              repeatType: "loop",
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          >
            <div className="w-4 h-4 bg-[#fc5d41]/20 rounded-full flex items-center justify-center">
          <Sparkles className="w-2 h-2 text-[#fc5d41]/60" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid gap-12 lg:grid-cols-6">
            {/* Enhanced Company Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="group"
            >
              <Link to="/" className="flex items-center gap-3 mb-6">
                {/* Enhanced Logo */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#fc5d41] to-[#fc5d41]/80 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#fc5d41] to-[#fc5d41]/80 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow overflow-hidden">
                    <img 
                      src="/images/logo-new.webp" 
                      alt="سطوكيها" 
                      className="w-full h-full object-cover"
                      fetchpriority="high"
                    />
                  </div>
                </div>
                <div className="font-extrabold text-3xl tracking-tight text-[#fc5d41]">
                  Stockiha
                </div>
              </Link>
            </motion.div>
            
            <p className="text-muted-foreground mb-8 max-w-md text-lg leading-relaxed">
              منصة جزائرية رائدة تمكّن التجار من إدارة أعمالهم بذكاء وتحويلها إلى إمبراطوريات رقمية ناجحة.
            </p>
            
            {/* Enhanced Contact Info */}
            <div className="space-y-4 mb-8">
              {[
                { icon: Mail, text: 'info@stockiha.com', color: 'text-blue-500' },
                { icon: PhoneCall, text: '0540240886', color: 'text-green-500' },
                { icon: MapPin, text: 'خنشلة حي النصر، الجزائر', color: 'text-red-500' }
              ].map((contact, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 5 }}
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-card/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-[#fc5d41]/30 flex items-center justify-center transition-colors">
                    <contact.icon className={`h-4 w-4 ${contact.color} group-hover:scale-110 transition-transform`} />
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium group-hover:text-[#fc5d41] transition-colors">{contact.text}</span>
                </motion.div>
              ))}
            </div>
            
            {/* Enhanced Social Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#fc5d41]" />
                تابعنا على
              </h4>
              <div className="flex gap-3">
                {[
                  { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-500' },
                  { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-500' },
                  { icon: Twitter, label: 'Twitter', color: 'hover:bg-blue-400' },
                  { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-blue-600' },
                  { icon: Youtube, label: 'Youtube', color: 'hover:bg-red-500' }
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    aria-label={social.label}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`group w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:text-white transition-all duration-300 ${social.color}`}
                  >
                    <social.icon className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
          
          {/* Enhanced Quick Links */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h4 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#fc5d41]" />
              روابط سريعة
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'الرئيسية', href: '/', icon: Monitor },
                { label: 'المميزات', href: '/features', icon: Star },
                { label: 'الأسعار', href: '/#pricing', icon: CreditCard },
                { label: 'عن الشركة', href: '/about', icon: Users },
                { label: 'تواصل معنا', href: '/contact', icon: Headphones },
                { label: 'المدونة', href: '/blog', icon: Globe }
              ].map((link, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link 
                    to={link.href} 
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-card/50 transition-all duration-300"
                  >
                    <link.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-muted-foreground group-hover:text-primary transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          {/* Enhanced Products */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h4 className="font-bold text-xl text-foreground mb-6 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#fc5d41]" />
              منتجاتنا
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'نظام إدارة المتاجر', href: '/products/pos', icon: Monitor },
                { label: 'المتجر الإلكتروني', href: '/products/ecommerce', icon: Globe },
                { label: 'نظام تتبع الخدمات', href: '/products/service-tracking', icon: CheckCircle },
                { label: 'تطبيق سطح المكتب', href: '/products/desktop-app', icon: Smartphone },
                { label: 'السوق الإلكتروني', href: '/products/marketplace', icon: Star },
                { label: 'واجهات API', href: '/products/api', icon: Zap }
              ].map((link, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link 
                    to={link.href} 
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-card/50 transition-all duration-300"
                  >
                    <link.icon className="h-4 w-4 text-[#fc5d41] group-hover:scale-110 transition-transform" />
                    <span className="text-gray-600 dark:text-gray-300 group-hover:text-[#fc5d41] transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          {/* Enhanced Newsletter */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="relative p-8 rounded-3xl border border-[#fc5d41]/30 bg-gradient-to-br from-[#fc5d41]/10 via-white dark:via-gray-800/50 to-purple-500/10 backdrop-blur-sm overflow-hidden">
              
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#fc5d41]/5 to-purple-500/5" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-[#fc5d41]/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#fc5d41] to-purple-600">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-foreground">النشرة البريدية</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">كن أول من يعلم</p>
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  احصل على آخر الأخبار، النصائح التجارية، والعروض الحصرية مباشرة في بريدك الإلكتروني
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="أدخل بريدك الإلكتروني"
                      className="flex-1 h-12 bg-white dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 focus:border-[#fc5d41]/50 rounded-xl"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="h-12 px-6 bg-gradient-to-r from-[#fc5d41] to-purple-600 hover:from-[#fc5d41]/90 hover:to-purple-700 rounded-xl font-semibold">
                        اشترك
                        <ArrowUp className="h-4 w-4 mr-2 rotate-45" />
                      </Button>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Shield className="h-3 w-3 text-green-500" />
                    <span>خصوصيتك محمية. لا نشارك بياناتك مع أي طرف ثالث</span>
                  </div>
                  
                  {/* Trust Indicators */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#fc5d41]" />
                      <span className="text-sm font-medium text-foreground">1000+</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">مشترك</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">أسبوعية</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">محتوى حصري</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        </div>
        
        {/* Enhanced Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700/50"
        >
          <div className="grid md:grid-cols-3 gap-8 items-center">
            
            {/* Copyright & Trust */}
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                © {new Date().getFullYear()} <span className="font-semibold text-[#fc5d41]">Stockiha</span>. جميع الحقوق محفوظة.
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  SSL آمن
                </Badge>
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  ISO معتمد
                </Badge>
              </div>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {[
                { label: 'سياسة الخصوصية', href: '/privacy' },
                { label: 'الشروط والأحكام', href: '/terms' },
                { label: 'سياسة الكوكيز', href: '/cookies' },
                { label: 'إخلاء المسؤولية', href: '/disclaimer' }
              ].map((link, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  <Link 
                    to={link.href} 
                    className="text-gray-600 dark:text-gray-300 hover:text-[#fc5d41] dark:hover:text-[#fc5d41] transition-colors relative"
                  >
                    {link.label}
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#fc5d41] group-hover:w-full transition-all duration-300" />
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {/* Back to Top & Language */}
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Globe className="h-4 w-4" />
                <span>العربية</span>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="group rounded-full h-12 w-12 border-[#fc5d41]/30 hover:bg-[#fc5d41] hover:text-white transition-all duration-300"
                  onClick={scrollToTop}
                >
                  <ArrowUp className="h-5 w-5 group-hover:animate-bounce" />
                </Button>
              </motion.div>
            </div>
          </div>
          
          {/* Made with Love */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center"
          >
            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              صُنع بـ 
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
              >
                <Heart className="h-4 w-4 text-red-500 fill-current" />
              </motion.div>
              في الجزائر 🇩🇿 من أجل التجار الجزائريين
            </div>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
