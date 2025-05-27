import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QrCode, MessageSquare, BarChart3, Clock, Calendar, ShieldCheck, Wrench, AlertCircle } from 'lucide-react';

const ServiceManagement = () => {
  const serviceBenefits = [
    {
      title: "تتبع الخدمات",
      description: "منح العملاء رمز QR فريد لتتبع حالة خدماتهم في أي وقت من خلال موقعك.",
      icon: QrCode,
      delay: 0.1,
    },
    {
      title: "إشعارات تلقائية",
      description: "إرسال إشعارات للعملاء تلقائياً عند تحديث حالة الخدمة أو اكتمالها.",
      icon: MessageSquare,
      delay: 0.2,
    },
    {
      title: "جدولة المواعيد",
      description: "إمكانية جدولة المواعيد وإدارتها بكفاءة لتقديم الخدمات في الوقت المناسب.",
      icon: Calendar,
      delay: 0.3,
    },
    {
      title: "تقدير الوقت",
      description: "إخبار العملاء بالوقت المتوقع لإتمام الخدمة وتحديثه عند الحاجة.",
      icon: Clock,
      delay: 0.4,
    }
  ];

  return (
    <section id="services" className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            إدارة الخدمات
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            قدّم خدماتك <span className="text-primary">باحترافية</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            توفر المنصة أدوات متطورة لتقديم وإدارة الخدمات بطريقة احترافية ومتابعة سير العمل، مما يضمن رضا العملاء ويعزز سمعتك.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* نموذج تتبع الخدمات */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:w-1/2 order-2 lg:order-1"
          >
            <div className="relative max-w-lg mx-auto">
              {/* نموذج صفحة تتبع الخدمة */}
              <div className="bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-muted/80 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="text-xs text-muted-foreground">service.stockiha.com/track</div>
                  <div className="w-12"></div>
                </div>
                
                <div className="p-6">
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-semibold mb-1">تتبع الخدمة #SRV-2023145</h3>
                    <p className="text-sm text-muted-foreground">إصلاح جهاز iPhone 13 Pro</p>
                  </div>
                  
                  <div className="flex justify-between mb-8">
                    <div className="text-center px-4">
                      <div className="text-xs text-muted-foreground mb-1">تاريخ الاستلام</div>
                      <div className="font-medium">22 أبريل 2023</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-xs text-muted-foreground mb-1">الحالة الحالية</div>
                      <div className="text-primary font-medium">قيد التنفيذ</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-xs text-muted-foreground mb-1">وقت التسليم المتوقع</div>
                      <div className="font-medium">24 أبريل 2023</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="relative">
                      <div className="flex">
                        <div className="relative flex flex-col items-center mr-4">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center z-10">
                            <ShieldCheck className="h-4 w-4 text-white" />
                          </div>
                          <div className="h-full w-0.5 bg-primary/20 absolute top-8 left-1/2 transform -translate-x-1/2"></div>
                        </div>
                        <div className="pb-6">
                          <div className="flex justify-between">
                            <h4 className="font-medium">استلام الجهاز</h4>
                            <span className="text-xs text-muted-foreground">22 أبريل، 10:30 ص</span>
                          </div>
                          <p className="text-sm text-muted-foreground">تم استلام الجهاز والكشف المبدئي عليه.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex">
                        <div className="relative flex flex-col items-center mr-4">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center z-10">
                            <Wrench className="h-4 w-4 text-white" />
                          </div>
                          <div className="h-full w-0.5 bg-primary/20 absolute top-8 left-1/2 transform -translate-x-1/2"></div>
                        </div>
                        <div className="pb-6">
                          <div className="flex justify-between">
                            <h4 className="font-medium">بدء الإصلاح</h4>
                            <span className="text-xs text-muted-foreground">23 أبريل، 11:15 ص</span>
                          </div>
                          <p className="text-sm text-muted-foreground">جاري إصلاح مشكلة الشاشة واستبدال البطارية.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex">
                        <div className="relative flex flex-col items-center mr-4">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center z-10">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <h4 className="font-medium text-muted-foreground">اختبار الجهاز</h4>
                            <span className="text-xs text-muted-foreground">قيد الانتظار</span>
                          </div>
                          <p className="text-sm text-muted-foreground">سيتم اختبار الجهاز بعد الإصلاح للتأكد من جودة الخدمة.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button>الاتصال بالفني</Button>
                  </div>
                </div>
              </div>
              
              {/* رمز QR عائم */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
                className="absolute -top-10 -left-10 w-28 h-28 rounded-lg bg-background p-2 shadow-lg border border-border transform rotate-6"
              >
                <div className="w-full h-full">
                  <img
                    src="/images/qr-code-placeholder.png"
                    alt="رمز QR لتتبع الخدمة"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f8fafc'/%3E%3Cpath d='M50 50h20v20h-20zm30 0h20v20h-20zm30 0h20v20h-20zm-60 30h20v20h-20zm30 0h20v20h-20zm30 0h20v20h-20zm-60 30h20v20h-20zm30 0h20v20h-20zm30 0h20v20h-20z' fill='%2394a3b8'/%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* المميزات */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:w-1/2 order-1 lg:order-2"
          >
            <div className="space-y-10">
              {serviceBenefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: benefit.delay }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="flex gap-5"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h3 className="text-xl font-semibold mb-4">منصة متكاملة للتواصل</h3>
                <ul className="space-y-3">
                  {[
                    "واجهة مخصصة للعميل لمتابعة حالة الخدمة",
                    "إشعارات بالبريد الإلكتروني أو الرسائل القصيرة",
                    "إمكانية التواصل المباشر مع الفني المسؤول",
                    "تقييم ومراجعة الخدمة بعد الانتهاء"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServiceManagement;
