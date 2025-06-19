import { motion } from 'framer-motion';
import { Truck, Map, Loader, Rocket, Clock, MapPin } from 'lucide-react';

const DeliveryIntegration = () => {
  const deliveryPartners = [
    {
      name: "ياليدين",
      logo: "/images/partners/yaladeen.png",
      delay: 0.1
    },
    {
      name: "ZR Express",
      logo: "/images/partners/zr-express.png",
      delay: 0.2
    },
    {
      name: "أمانة",
      logo: "/images/partners/amanah.png",
      delay: 0.3
    },
    {
      name: "سبيد",
      logo: "/images/partners/speed.png",
      delay: 0.4
    }
  ];

  const features = [
    {
      icon: Rocket,
      title: "شحن تلقائي",
      description: "إرسال طلبات الشحن تلقائياً لشركة التوصيل المفضلة لديك بمجرد اكتمال الطلب",
      delay: 0.1
    },
    {
      icon: Map,
      title: "تتبع الشحنات",
      description: "تتبع شحناتك مباشرة من نظامك، مع مشاركة رابط التتبع مع العميل تلقائياً",
      delay: 0.2
    },
    {
      icon: Clock,
      title: "جدولة الاستلام",
      description: "تحديد مواعيد استلام الشحنات من مقر عملك بما يناسب جدولك اليومي",
      delay: 0.3
    },
    {
      icon: MapPin,
      title: "تغطية واسعة",
      description: "وصول لمختلف ولايات الجزائر عبر شبكة واسعة من شركات التوصيل المتكاملة",
      delay: 0.4
    }
  ];

  return (
    <section id="delivery-integration" className="py-24 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            قريباً
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            تكامل مع <span className="text-primary">شركات التوصيل</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            قريباً، استمتع بتكامل سلس مع كبرى شركات التوصيل في الجزائر، 
            مما يتيح لك إدارة الشحن والتوصيل بكفاءة عالية من نفس لوحة التحكم.
          </p>
        </motion.div>

        {/* العرض التوضيحي */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto mb-20"
        >
          <div className="relative bg-card border border-border/50 shadow-lg rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-blue-500 to-purple-500"></div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* الجانب الأيمن - لوحة التحكم */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">إدارة الشحن والتوصيل</h3>
                </div>
                
                <div className="bg-background rounded-lg border border-border/70 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium">شركة التوصيل</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">تغيير</span>
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
                          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-card border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center overflow-hidden">
                        <img 
                          src="/images/partners/yaladeen.png" 
                          alt="ياليدين" 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f8fafc'/%3E%3Ctext x='16' y='16' font-family='Arial' font-size='12' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3EYD%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">ياليدين</div>
                        <div className="text-xs text-muted-foreground">الشركة الافتراضية</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/20 border border-border rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center overflow-hidden">
                        <img 
                          src="/images/partners/zr-express.png" 
                          alt="ZR Express" 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f8fafc'/%3E%3Ctext x='16' y='16' font-family='Arial' font-size='12' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3EZR%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium">ZR Express</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">طلب #12345</div>
                        <div className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">قيد التجهيز</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          3 منتجات • أحمد محمد • الرياض
                        </div>
                        <button className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-full">
                          طلب توصيل
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-muted/20 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">طلب #12344</div>
                        <div className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">قيد التوصيل</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          2 منتجات • سارة خالد • جدة
                        </div>
                        <button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                          <Map className="w-3 h-3" />
                          <span>تتبع الشحنة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* الجانب الأيسر - حالة الطلب */}
              <div className="md:col-span-1">
                <div className="bg-background rounded-lg border border-border/70 p-4">
                  <div className="text-sm font-medium mb-4">حالة الطلب #12344</div>
                  
                  <div className="space-y-6 relative">
                    <div className="absolute top-0 bottom-0 right-[10px] w-0.5 bg-muted"></div>
                    
                    <div className="relative flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-500 z-10 mt-0.5"></div>
                      <div>
                        <div className="text-sm font-medium">تم استلام الطلب</div>
                        <div className="text-xs text-muted-foreground">اليوم، 10:24 صباحاً</div>
                      </div>
                    </div>
                    
                    <div className="relative flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-500 z-10 mt-0.5"></div>
                      <div>
                        <div className="text-sm font-medium">تم تجهيز الطلب</div>
                        <div className="text-xs text-muted-foreground">اليوم، 11:45 صباحاً</div>
                      </div>
                    </div>
                    
                    <div className="relative flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 border-2 border-primary z-10 mt-0.5"></div>
                      <div>
                        <div className="text-sm font-medium">جاري التوصيل</div>
                        <div className="text-xs text-muted-foreground">اليوم، 01:30 مساءً</div>
                      </div>
                    </div>
                    
                    <div className="relative flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-muted border-2 border-muted-foreground z-10 mt-0.5"></div>
                      <div className="text-sm text-muted-foreground">تم التسليم</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">رقم التتبع:</span>
                      <span className="font-medium">YD789456123</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <motion.div
              initial={{ width: "0%" }}
              whileInView={{ width: "70%" }}
              transition={{ duration: 2, delay: 0.5 }}
              viewport={{ once: true }}
              className="absolute bottom-0 right-0 left-0 h-1 bg-primary"
            >
              <div className="absolute -top-6 left-[calc(70%-12px)] bg-card border border-primary rounded px-2 py-1 text-xs font-medium text-primary">
                70%
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            viewport={{ once: true }}
            className="absolute -bottom-6 right-6 bg-card p-3 rounded-lg shadow-lg border border-border max-w-[180px] flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
              <Loader className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-medium">قيد التطوير</div>
              <div className="text-muted-foreground">متاح قريباً</div>
            </div>
          </motion.div>
        </motion.div>
        
        {/* شركاء التوصيل */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">شركاء التوصيل</h3>
            <p className="text-sm text-muted-foreground">
              سنوفر تكاملاً مع العديد من شركات التوصيل الرائدة في الجزائر
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deliveryPartners.map((partner, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: partner.delay }}
                viewport={{ once: true }}
                className="bg-background border border-border/40 rounded-lg p-4 flex items-center justify-center h-24"
              >
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const partnerCode = partner.name.slice(0, 2);
                      target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f8fafc'/%3E%3Ctext x='32' y='32' font-family='Arial' font-size='24' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3E${partnerCode}%3C/text%3E%3C/svg%3E`;
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* مميزات التكامل */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: feature.delay }}
              viewport={{ once: true }}
              className="bg-card border border-border/40 p-6 rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeliveryIntegration;
