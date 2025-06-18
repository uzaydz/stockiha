import React, { useState } from 'react';
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
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface FooterLink {
  id: string;
  text: string;
  url: string;
  isExternal?: boolean;
}

interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube';
  url: string;
}

interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface NewsletterSettings {
  enabled: boolean;
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
}

interface CustomizableStoreFooterProps {
  storeName?: string;
  logoUrl?: string;
  description?: string;
  socialLinks?: SocialLink[];
  contactInfo?: ContactInfo;
  footerSections?: FooterSection[];
  features?: Feature[];
  copyrightText?: string;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showFeatures?: boolean;
  showNewsletter?: boolean;
  newsletterSettings?: NewsletterSettings;
  showPaymentMethods?: boolean;
  paymentMethods?: string[];
  legalLinks?: FooterLink[];
}

// دالة للحصول على الميزات الافتراضية مع الترجمة
const getDefaultFeatures = (t: any): Feature[] => {
  const featuresData = t('storeFooter.defaultFeatures', { returnObjects: true });
  
  return featuresData.map((feature: any, index: number) => ({
    id: `${index + 1}`,
    icon: ['Truck', 'CreditCard', 'Heart', 'ShieldCheck'][index] || 'Heart',
    title: feature.title,
    description: feature.description,
  }));
};

// دالة للحصول على إعدادات النشرة البريدية الافتراضية مع الترجمة
const getDefaultNewsletterSettings = (t: any): NewsletterSettings => ({
  enabled: true,
  title: t('storeFooter.newsletter.title'),
  description: t('storeFooter.newsletter.description'),
  placeholder: t('storeFooter.newsletter.placeholder'),
  buttonText: t('storeFooter.newsletter.buttonText'),
});

const CustomizableStoreFooter: React.FC<CustomizableStoreFooterProps> = ({
  storeName,
  logoUrl,
  description,
  socialLinks = [],
  contactInfo = {},
  footerSections = [],
  features = [],
  copyrightText,
  showSocialLinks = true,
  showContactInfo = true,
  showFeatures = true,
  showNewsletter = true,
  newsletterSettings,
  showPaymentMethods = true,
  paymentMethods = ['visa', 'mastercard', 'paypal'],
  legalLinks = []
}) => {
  const { t } = useTranslation();
  
  // استخدام القيم المترجمة أو القيم المرسلة من props
  const displayStoreName = storeName || t('storeFooter.storeName');
  const displayDescription = description || t('storeFooter.description');
  const displayNewsletterSettings = newsletterSettings || getDefaultNewsletterSettings(t);
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // معالجة الاشتراك في النشرة البريدية
    setEmail('');
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      case 'youtube': return Youtube;
      default: return ExternalLink;
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Truck': return Truck;
      case 'CreditCard': return CreditCard;
      case 'Heart': return Heart;
      case 'ShieldCheck': return ShieldCheck;
      case 'Phone': return Phone;
      case 'Clock': return Clock;
      default: return Heart;
    }
  };

  const displayFeatures = features.length > 0 ? features : getDefaultFeatures(t);

  return (
    <footer className="bg-muted/30 border-t border-border/40 pt-16 pb-8">
      {/* قسم الميزات */}
      {showFeatures && (
        <div className="container px-4 mx-auto mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8 border-y border-border/30">
            {displayFeatures.map((feature) => {
              const IconComponent = getFeatureIcon(feature.icon);
              return (
                <div key={feature.id} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* القسم الرئيسي من الفوتر */}
      <div className="container px-4 mx-auto mb-10">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8">
          {/* معلومات المتجر */}
          <div className="md:col-span-6 lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              {logoUrl ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden border border-border/40 bg-card">
                  <img 
                    src={logoUrl} 
                    alt={`${t('storeFooter.logoAlt')} ${displayStoreName}`} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {displayStoreName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {displayStoreName}
              </span>
            </div>
            
            <p className="text-muted-foreground mb-6">{displayDescription}</p>
            
            {/* وسائل التواصل الاجتماعي */}
            {showSocialLinks && socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mb-8">
                {socialLinks.map((social, index) => {
                  const IconComponent = getSocialIcon(social.platform);
                  return (
                    <Link 
                      key={index}
                      to={social.url} 
                      className="h-10 w-10 rounded-full bg-card hover:bg-primary flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-colors border border-border/40 hover:border-primary/30"
                    >
                      <IconComponent className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            )}
          
            {/* معلومات الاتصال */}
            {showContactInfo && (
              <div className="space-y-3">
                {contactInfo.address && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{contactInfo.address}</span>
                  </div>
                )}
                {contactInfo.phone && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="h-5 w-5 text-primary shrink-0" />
                    <span dir="ltr">{contactInfo.phone}</span>
                  </div>
                )}
                {contactInfo.email && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-5 w-5 text-primary shrink-0" />
                    <span>{contactInfo.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* أقسام الروابط المخصصة */}
          {footerSections.length > 0 && (
            <div className="md:col-span-6 lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {footerSections.map((section) => (
                <div key={section.id}>
                  <h4 className="font-bold mb-4 text-lg">{section.title}</h4>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.id}>
                        {link.isExternal ? (
                          <a 
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                          >
                            <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span>{link.text}</span>
                            <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                          </a>
                        ) : (
                          <Link 
                            to={link.url} 
                            className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                          >
                            <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span>{link.text}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        
          {/* النشرة البريدية */}
          {showNewsletter && displayNewsletterSettings.enabled && (
            <div className="md:col-span-6 lg:col-span-3">
              <h4 className="font-bold mb-4 text-lg">{displayNewsletterSettings.title}</h4>
              <p className="text-muted-foreground mb-4">
                {displayNewsletterSettings.description}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="mb-8">
                <div className="flex">
                  <div className="relative flex-grow">
                    <Input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={displayNewsletterSettings.placeholder}
                      className="pr-4 h-11 rounded-l-none rounded-r-lg border-r-0"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="rounded-r-none rounded-l-lg border-l-0"
                  >
                    {displayNewsletterSettings.buttonText}
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </form>
              
              {/* وسائل الدفع */}
              {showPaymentMethods && paymentMethods.length > 0 && (
                <div>
                  <h4 className="font-bold mb-4 text-lg">{t('storeFooter.paymentMethods')}</h4>
                  <div className="flex gap-2 flex-wrap">
                    {paymentMethods.map((method) => (
                      <div 
                        key={method}
                        className="h-8 w-12 bg-card border border-border/40 rounded flex items-center justify-center text-xs text-muted-foreground"
                      >
                        {method.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        
      {/* حقوق النشر والروابط القانونية */}
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-right">
            {copyrightText || `© ${new Date().getFullYear()} ${displayStoreName}. ${t('storeFooter.copyrightText')}`}
          </p>
          
          {legalLinks.length > 0 && (
            <div className="flex items-center gap-4">
              {legalLinks.map((link, index) => (
                <React.Fragment key={link.id}>
                  {link.isExternal ? (
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.text}
                    </a>
                  ) : (
                    <Link 
                      to={link.url} 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.text}
                    </Link>
                  )}
                  {index < legalLinks.length - 1 && (
                    <Separator orientation="vertical" className="h-4" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default CustomizableStoreFooter;
