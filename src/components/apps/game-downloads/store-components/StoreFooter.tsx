import React from 'react';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StoreSettings } from './types';

interface StoreFooterProps {
  settings: StoreSettings;
}

export default function StoreFooter({ settings }: StoreFooterProps) {
  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return Facebook;
      case 'instagram': return Instagram;
      case 'twitter': return Twitter;
      default: return Facebook;
    }
  };

  const formatWorkingHours = (workingHours: any) => {
    if (!workingHours) return null;
    
    const days = {
      saturday: 'السبت',
      sunday: 'الأحد',
      monday: 'الاثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة'
    };

    return Object.entries(days).map(([key, arabicName]) => {
      const dayInfo = workingHours[key];
      if (!dayInfo) return null;
      
      return (
        <div key={key} className="flex justify-between items-center p-2 bg-background/30 rounded border border-border/30">
          <span className="font-medium">{arabicName}</span>
          <span className="text-sm text-muted-foreground">
            {dayInfo.is_closed ? 'مغلق' : `${dayInfo.open} - ${dayInfo.close}`}
          </span>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <footer className="bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-md border-t border-border/50 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info */}
          {settings.contact_info && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">معلومات الاتصال</h3>
              </div>
              <div className="space-y-4">
                {settings.contact_info.phone && (
                  <Card className="bg-background/50 border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-500/10 rounded-full">
                          <Phone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">هاتف</p>
                          <p className="text-sm text-muted-foreground">{settings.contact_info.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {settings.contact_info.email && (
                  <Card className="bg-background/50 border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-full">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">إيميل</p>
                          <p className="text-sm text-muted-foreground">{settings.contact_info.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {settings.contact_info.address && (
                  <Card className="bg-background/50 border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-500/10 rounded-full">
                          <MapPin className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">العنوان</p>
                          <p className="text-sm text-muted-foreground">{settings.contact_info.address}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Working Hours */}
          {settings.working_hours && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">ساعات العمل</h3>
              </div>
              <div className="space-y-2">
                {formatWorkingHours(settings.working_hours)}
              </div>
            </div>
          )}

          {/* Social Links */}
          {settings.social_links && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Facebook className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">تابعنا</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(settings.social_links).map(([platform, url]) => {
                  if (!url) return null;
                  const IconComponent = getSocialIcon(platform);
                  const platformName = platform === 'facebook' ? 'فيسبوك' : 
                                     platform === 'instagram' ? 'إنستغرام' : 
                                     platform === 'twitter' ? 'تويتر' : platform;
                  
                  return (
                    <Card key={platform} className="bg-background/50 border-border/30 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <a 
                          href={url as string} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 hover:text-primary transition-colors"
                        >
                          <div className="p-2 bg-primary/10 rounded-full">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{platformName}</p>
                            <p className="text-sm text-muted-foreground">تابعنا على {platformName}</p>
                          </div>
                        </a>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {settings.business_name || 'متجر تحميل الألعاب'}. جميع الحقوق محفوظة.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            مدعوم بتقنيات حديثة لتجربة تسوق مميزة
          </p>
        </div>
      </div>
    </footer>
  );
} 