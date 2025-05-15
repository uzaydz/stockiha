import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
}

interface StoreContactProps {
  title?: string;
  description?: string;
  contactInfo?: ContactInfo;
}

const defaultContactInfo: ContactInfo = {
  email: "info@store.com",
  phone: "+966 123 456 789",
  address: "شارع الملك فهد، الرياض، المملكة العربية السعودية",
  hours: "يومياً من 9 صباحاً حتى 10 مساءً"
};

const StoreContact = ({
  title = "تواصل معنا",
  description = "نحن هنا للإجابة على استفساراتك ومساعدتك في أي وقت",
  contactInfo = defaultContactInfo
}: StoreContactProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    subscribe: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = () => {
    setFormData(prev => ({ ...prev, subscribe: !prev.subscribe }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // يمكن إضافة رمز لمعالجة النموذج هنا (إرسال البيانات إلى الخادم)
    
    
    // إعادة تعيين النموذج بعد الإرسال
    setFormData({
      name: "",
      email: "",
      phone: "",
      message: "",
      subscribe: false
    });
    
    // إظهار رسالة نجاح (يمكن استخدام مكتبة للإشعارات هنا)
    alert("تم إرسال رسالتك بنجاح، وسنرد عليك في أقرب وقت ممكن.");
  };

  // تأثيرات الحركة
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="py-20 bg-muted/20">
      <div className="container px-4 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* معلومات الاتصال */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="overflow-hidden border-0 shadow-lg bg-background/95 backdrop-blur">
              <CardContent className="p-0">
                <div className="bg-primary text-primary-foreground p-6">
                  <h3 className="text-2xl font-bold mb-2">معلومات الاتصال</h3>
                  <p className="text-primary-foreground/80">يسعدنا التواصل معكم عبر القنوات التالية</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {contactInfo.phone && (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">الهاتف</h4>
                        <p className="text-muted-foreground">{contactInfo.phone}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {contactInfo.email && (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">البريد الإلكتروني</h4>
                        <p className="text-muted-foreground">{contactInfo.email}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {contactInfo.address && (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">العنوان</h4>
                        <p className="text-muted-foreground">{contactInfo.address}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {contactInfo.hours && (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      className="flex items-start gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">ساعات العمل</h4>
                        <p className="text-muted-foreground">{contactInfo.hours}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* خريطة الموقع */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="overflow-hidden rounded-lg h-[220px] shadow-md relative"
            >
              <img 
                src="https://maps.googleapis.com/maps/api/staticmap?center=Riyadh,SaudiArabia&zoom=14&size=600x400&key=AIzaSyBQZKTIT2MII0-1kVqGaI0jtJZRQvt_BkE"
                alt="Map Location"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-background p-2 rounded-lg shadow-lg">
                  <Button size="sm" variant="outline">
                    عرض على الخريطة
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* نموذج الاتصال */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="border border-border/50 shadow-lg bg-background p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="الاسم الكامل"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="05xxxxxxxx"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">الرسالة</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="subscribe"
                    checked={formData.subscribe}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="subscribe">أرغب في الاشتراك بالنشرة البريدية لتصلني أحدث العروض والمنتجات</Label>
                </div>
                
                <Button type="submit" className="w-full md:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  إرسال الرسالة
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoreContact; 