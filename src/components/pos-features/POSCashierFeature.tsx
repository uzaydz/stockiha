import { motion } from 'framer-motion';
import { 
  ReceiptText, 
  MonitorSmartphone, 
  CreditCard, 
  Banknote, 
  Smartphone,
  QrCode, 
  PrinterIcon, 
  Inbox, 
  ShieldCheck, 
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSCashierFeature = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            نظام <span className="text-primary">نقاط البيع المتكامل</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            تجربة بيع سلسة وسريعة مع واجهة سهلة الاستخدام تناسب جميع أنواع المتاجر، من المحلات الصغيرة وحتى السلاسل التجارية الكبرى.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* صورة النظام */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden order-2 lg:order-1"
          >
            <div className="relative">
              {/* شريط عنوان التطبيق */}
              <div className="bg-primary p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  <span className="font-semibold text-sm">بازار | نقطة البيع</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs bg-primary-foreground/20 rounded-md px-2 py-1">
                    الفرع الرئيسي
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <span className="text-xs">أ ع</span>
                  </div>
                </div>
              </div>

              {/* واجهة نقطة البيع */}
              <div className="flex h-[450px]">
                {/* الجانب الأيمن - المنتجات والفئات */}
                <div className="w-7/12 p-4 overflow-y-auto border-l border-border">
                  {/* شريط البحث */}
                  <div className="mb-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="بحث عن منتج..." 
                        className="w-full bg-muted/40 border border-border rounded-lg text-sm px-4 py-2.5 pl-10"
                      />
                      <span className="absolute left-3 top-2.5 text-muted-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* الفئات */}
                  <div className="mb-4">
                    <div className="flex overflow-x-auto gap-2 pb-2 mb-2">
                      {["الكل", "إلكترونيات", "اكسسوارات", "أجهزة", "عروض"].map((category, i) => (
                        <div 
                          key={i} 
                          className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap cursor-pointer ${
                            i === 0 
                              ? 'bg-primary text-white' 
                              : 'bg-muted/40 border border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* المنتجات */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { name: "هاتف سامسونج A53", price: "45,000 دج", img: "phone" },
                      { name: "سماعات بلوتوث", price: "3,500 دج", img: "headphones" },
                      { name: "شاحن لاسلكي", price: "2,500 دج", img: "charger" },
                      { name: "حافظة هاتف مغناطيسية", price: "1,200 دج", img: "case" },
                      { name: "ساعة ذكية", price: "12,000 دج", img: "watch" },
                      { name: "سماعات أذن", price: "2,800 دج", img: "earbuds" },
                    ].map((product, i) => (
                      <div 
                        key={i} 
                        className="border border-border hover:border-primary/50 bg-card rounded-lg p-2 cursor-pointer transition-all hover:shadow-sm"
                      >
                        <div className="h-20 mb-2 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
                          <span className="text-xs">{product.img}</span>
                        </div>
                        <div className="text-xs font-medium line-clamp-2 mb-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-primary font-bold">
                          {product.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* الجانب الأيسر - سلة المشتريات */}
                <div className="w-5/12 bg-muted/10 p-3 flex flex-col">
                  {/* عنوان السلة */}
                  <div className="flex justify-between items-center pb-3 border-b border-border mb-3">
                    <div className="text-sm font-semibold">سلة المشتريات</div>
                    <div className="text-xs text-primary font-bold">3 منتجات</div>
                  </div>

                  {/* قائمة المنتجات في السلة */}
                  <div className="flex-grow overflow-y-auto space-y-2 mb-3">
                    {[
                      { name: "هاتف سامسونج A53", price: "45,000 دج", qty: 1 },
                      { name: "سماعات بلوتوث", price: "3,500 دج", qty: 2 },
                      { name: "شاحن لاسلكي", price: "2,500 دج", qty: 1 },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-background border border-border">
                        <div className="w-10 h-10 bg-muted/40 rounded flex items-center justify-center text-muted-foreground">
                          <span className="text-xs">{i+1}</span>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-medium mb-1">{item.name}</div>
                            <div className="flex gap-1 items-center">
                              <button className="w-5 h-5 rounded bg-muted/40 text-xs flex items-center justify-center">-</button>
                              <span className="text-xs px-1">{item.qty}</span>
                              <button className="w-5 h-5 rounded bg-muted/40 text-xs flex items-center justify-center">+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-primary font-semibold">{item.price}</div>
                            <button className="text-destructive/70 text-xs">حذف</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* معلومات الطلب */}
                  <div className="border-t border-border pt-3 mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">المجموع</span>
                      <span>54,500 دج</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">الضريبة (19%)</span>
                      <span>10,355 دج</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-2">
                      <span>الإجمالي</span>
                      <span className="text-primary">64,855 دج</span>
                    </div>
                  </div>

                  {/* طرق الدفع */}
                  <div className="flex gap-2 mb-3">
                    {[
                      { icon: <Banknote className="h-3 w-3" />, label: "نقدي" },
                      { icon: <CreditCard className="h-3 w-3" />, label: "بطاقة" },
                      { icon: <QrCode className="h-3 w-3" />, label: "تحويل" },
                    ].map((method, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 flex flex-col items-center justify-center px-2 py-1.5 rounded-lg border text-xs ${
                          i === 0 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-border bg-muted/10 text-muted-foreground'
                        }`}
                      >
                        {method.icon}
                        <span className="mt-1">{method.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* زر الدفع */}
                  <button className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold">
                    إتمام عملية الدفع
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* المميزات */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="space-y-8 order-1 lg:order-2"
          >
            <div>
              <div className="flex gap-3 items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                  <MonitorSmartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">تجربة بيع سريعة ومرنة</h3>
                  <p className="text-muted-foreground">
                    واجهة سهلة الاستخدام تعمل على جميع الأجهزة، مع خيارات بحث سريعة وإدارة فعالة للمنتجات والخصومات.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                {[
                  { title: "تصميم متجاوب", desc: "يعمل على الأجهزة اللوحية والحواسيب" },
                  { title: "بحث سريع للمنتجات", desc: "باركود، اسم، رمز المنتج" },
                  { title: "إدارة سلسة للخصومات", desc: "خصومات على المنتج أو الفاتورة" },
                  { title: "متعدد المستخدمين", desc: "صلاحيات مختلفة لكل موظف" }
                ].map((item, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg bg-card">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex gap-3 items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">خيارات دفع متعددة ومرنة</h3>
                  <p className="text-muted-foreground">
                    تقبل مدفوعات متنوعة بدءاً من النقدي إلى البطاقات والمحافظ الإلكترونية، مع إمكانية تقسيم الدفع بين عدة طرق.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                {[
                  { title: "دفع متعدد الطرق", desc: "نقدي، بطاقات، تحويل بنكي، والمزيد" },
                  { title: "تقسيم المدفوعات", desc: "إمكانية الدفع بأكثر من طريقة" },
                  { title: "رصيد متبقي", desc: "إدارة الديون والمدفوعات الجزئية" },
                  { title: "الإيصالات الرقمية", desc: "إرسال عبر البريد أو الواتساب" }
                ].map((item, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg bg-card">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex gap-3 items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                  <PrinterIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">طباعة سريعة وإدارة فواتير</h3>
                  <p className="text-muted-foreground">
                    طباعة فواتير واستلام سريع بتصاميم قابلة للتخصيص، مع دعم للطابعات الحرارية والرسائل المخصصة للعملاء.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                {[
                  { title: "تصاميم فواتير متعددة", desc: "قابلة للتخصيص بالكامل" },
                  { title: "دعم الطابعات الحرارية", desc: "متوافق مع معظم الطابعات الشائعة" },
                  { title: "رسائل مخصصة", desc: "إضافة عروض ومعلومات للعملاء" },
                  { title: "شعار الشركة والضرائب", desc: "عرض تلقائي للبيانات الضريبية" }
                ].map((item, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg bg-card">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">يعمل حتى بدون إنترنت</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                استمر في البيع حتى عند انقطاع الإنترنت. يقوم نظام بازار بمزامنة البيانات تلقائياً عند استعادة الاتصال، لتضمن عدم توقف مبيعاتك أبداً.
              </p>
              <Button className="w-full">جرّب نظام نقاط البيع مجاناً</Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default POSCashierFeature; 