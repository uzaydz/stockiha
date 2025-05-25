import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <footer className="bg-muted/50 border-t border-border pt-16 pb-6">
      <div className="container px-4 mx-auto">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              {/* Logo SVG */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-md">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="8" width="24" height="16" rx="6" fill="#0EA5E9"/>
                  <rect x="8" y="12" width="16" height="8" rx="4" fill="#22D3EE"/>
                  <path d="M10 20L16 12L22 20" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="font-extrabold text-2xl tracking-tight text-primary font-logo">
                stockiha
              </div>
            </Link>
            
            <p className="text-muted-foreground mb-6 max-w-md">
              منصة واحدة ذكية تمكّن التاجر من إدارة محله بالكامل وتحويله إلى تجارة إلكترونية بسهولة، مع نظام يعمل حتى بدون إنترنت.
            </p>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span>info@stockiha.com</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <PhoneCall className="h-4 w-4 text-primary" />
                </div>
                <span>0540240886</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span>خنشلة حي النصر، الجزائر</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              {[
                { icon: Facebook, label: 'Facebook' },
                { icon: Instagram, label: 'Instagram' },
                { icon: Twitter, label: 'Twitter' },
                { icon: Linkedin, label: 'LinkedIn' },
                { icon: Youtube, label: 'Youtube' }
              ].map((social, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors"
                >
                  <social.icon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
            <ul className="space-y-3">
              {[
                { label: 'الرئيسية', href: '/' },
                { label: 'المميزات', href: '/#features' },
                { label: 'الأسعار', href: '/#pricing' },
                { label: 'عن الشركة', href: '/about' },
                { label: 'تواصل معنا', href: '/contact' },
                { label: 'المدونة', href: '/blog' }
              ].map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-lg mb-4">المنتجات</h4>
            <ul className="space-y-3">
              {[
                { label: 'نظام إدارة المتاجر', href: '/products/pos' },
                { label: 'المتجر الإلكتروني', href: '/products/ecommerce' },
                { label: 'نظام تتبع الخدمات', href: '/products/service-tracking' },
                { label: 'تطبيق سطح المكتب', href: '/products/desktop-app' },
                { label: 'السوق الإلكتروني', href: '/products/marketplace' },
                { label: 'واجهات API', href: '/products/api' }
              ].map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg mb-4">النشرة البريدية</h4>
            <p className="text-muted-foreground mb-4">
              اشترك ليصلك كل جديد عن المنصة والعروض الحصرية
            </p>
            
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="bg-card"
              />
              <Button>اشترك</Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              من خلال الاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا.
            </p>
          </div>
        </div>
        
        <hr className="border-border my-8" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} stockiha. جميع الحقوق محفوظة.
          </div>
          
          <div className="flex gap-4 text-sm">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              سياسة الخصوصية
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              الشروط والأحكام
            </Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
              سياسة ملفات تعريف الارتباط
            </Link>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full h-10 w-10"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 