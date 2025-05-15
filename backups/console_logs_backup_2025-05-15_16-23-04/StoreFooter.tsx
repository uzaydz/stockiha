import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  ChevronRight, 
  Heart,
  CreditCard,
  Truck,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

interface StoreFooterProps {
  storeName?: string;
  logoUrl?: string;
  description?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

const StoreFooter = ({
  storeName = 'متجرنا',
  logoUrl,
  description = 'متجر إلكتروني متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.',
  socialLinks = {
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com'
  }
}: StoreFooterProps) => {
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // إجراء الاشتراك في النشرة البريدية
    console.log('تم الاشتراك في النشرة البريدية');
  };

  const footerLinks = [
    {
      title: 'روابط سريعة',
      links: [
        { text: 'الصفحة الرئيسية', url: '/' },
        { text: 'منتجاتنا', url: '/products' },
        { text: 'العروض الخاصة', url: '/offers' },
        { text: 'تواصل معنا', url: '/contact' },
        { text: 'من نحن', url: '/about' }
      ]
    },
    {
      title: 'فئات المنتجات',
      links: [
        { text: 'إلكترونيات', url: '/categories/electronics' },
        { text: 'أجهزة منزلية', url: '/categories/appliances' },
        { text: 'هواتف ذكية', url: '/categories/smartphones' },
        { text: 'أجهزة كمبيوتر', url: '/categories/computers' },
        { text: 'إكسسوارات', url: '/categories/accessories' }
      ]
    },
    {
      title: 'خدمة العملاء',
      links: [
        { text: 'مركز المساعدة', url: '/help' },
        { text: 'سياسة الشحن', url: '/shipping-policy' },
        { text: 'سياسة الإرجاع', url: '/return-policy' },
        { text: 'الأسئلة الشائعة', url: '/faq' },
        { text: 'سياسة الخصوصية', url: '/privacy-policy' }
      ]
    }
  ];

  return (
    <footer className="bg-muted/30 border-t border-border/40 pt-16 pb-8">
      {/* القسم العلوي من الفوتر */}
      <div className="container px-4 mx-auto mb-10">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8">
          {/* معلومات المتجر */}
          <div className="md:col-span-6 lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              {logoUrl ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden border border-border/40 bg-card">
                <img 
                  src={logoUrl} 
                    alt={`شعار ${storeName}`} 
                    className="w-full h-full object-contain"
                />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {storeName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{storeName}</span>
            </div>
            
            <p className="text-muted-foreground mb-6">{description}</p>
            
            {/* وسائل التواصل الاجتماعي */}
            <div className="flex items-center gap-3 mb-8">
                {socialLinks.facebook && (
                <Link to={socialLinks.facebook} className="h-10 w-10 rounded-full bg-card hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/40 hover:border-primary/30">
                    <Facebook className="h-5 w-5" />
                </Link>
                )}
                {socialLinks.twitter && (
                <Link to={socialLinks.twitter} className="h-10 w-10 rounded-full bg-card hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/40 hover:border-primary/30">
                    <Twitter className="h-5 w-5" />
                </Link>
                )}
                {socialLinks.instagram && (
                <Link to={socialLinks.instagram} className="h-10 w-10 rounded-full bg-card hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/40 hover:border-primary/30">
                    <Instagram className="h-5 w-5" />
                </Link>
                )}
                {socialLinks.youtube && (
                <Link to={socialLinks.youtube} className="h-10 w-10 rounded-full bg-card hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border/40 hover:border-primary/30">
                    <Youtube className="h-5 w-5" />
                </Link>
                )}
            </div>
          
            {/* معلومات الاتصال */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>123 شارع الجزائر، الجزائر العاصمة، الجزائر</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span dir="ltr">+213 (0) 123 456 789</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>info@{storeName.toLowerCase().replace(' ', '')}.dz</span>
              </div>
            </div>
                </div>
          
          {/* روابط سريعة */}
          <div className="md:col-span-6 lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {footerLinks.map((section, index) => (
              <div key={index}>
                <h4 className="font-bold mb-4 text-lg">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                      <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors flex items-center group">
                        <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span>{link.text}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
        </div>
        
          {/* النشرة البريدية */}
          <div className="md:col-span-6 lg:col-span-3">
            <h4 className="font-bold mb-4 text-lg">النشرة البريدية</h4>
            <p className="text-muted-foreground mb-4">
              اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mb-8">
              <div className="flex">
                <div className="relative flex-grow">
                  <Input 
                    type="email" 
                    placeholder="البريد الإلكتروني" 
                    className="pr-4 h-11 rounded-l-none rounded-r-lg border-r-0"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="rounded-r-none rounded-l-lg border-l-0"
                >
                  اشتراك
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </form>
            
            {/* وسائل الدفع */}
            <h4 className="font-bold mb-4 text-lg">وسائل الدفع</h4>
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-16 bg-card rounded-md border border-border/40 p-2 flex items-center justify-center">
                <img src="/images/payment/visa.svg" alt="Visa" className="h-full" />
              </div>
              <div className="h-10 w-16 bg-card rounded-md border border-border/40 p-2 flex items-center justify-center">
                <img src="/images/payment/mastercard.svg" alt="Mastercard" className="h-full" />
                      </div>
              <div className="h-10 w-16 bg-card rounded-md border border-border/40 p-2 flex items-center justify-center">
                <img src="/images/payment/paypal.svg" alt="PayPal" className="h-full" />
                  </div>
              <div className="h-10 w-16 bg-card rounded-md border border-border/40 p-2 flex items-center justify-center">
                <span className="text-xs font-medium">بطاقة بريدية</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* قسم المميزات */}
      <div className="container px-4 mx-auto mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8 border-y border-border/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">شحن سريع</h3>
              <p className="text-sm text-muted-foreground">توصيل مجاني للطلبات +5000 د.ج</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">دفع آمن</h3>
              <p className="text-sm text-muted-foreground">طرق دفع متعددة 100% آمنة</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">ضمان الجودة</h3>
              <p className="text-sm text-muted-foreground">منتجات عالية الجودة معتمدة</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">دعم 24/7</h3>
              <p className="text-sm text-muted-foreground">مساعدة متوفرة طول اليوم</p>
            </div>
          </div>
        </div>
      </div>
        
        {/* حقوق النشر */}
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-right">
            &copy; {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.
          </p>
          
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              شروط الاستخدام
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              سياسة الخصوصية
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link to="/sitemap" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              خريطة الموقع
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter; 