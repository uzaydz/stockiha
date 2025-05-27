import Image from 'next/image';
import { motion } from 'framer-motion';
import { Boxes, Search, Tag, ShoppingBag, Truck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductCatalogFeature = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            كتالوج منتجات <span className="text-primary">متكامل ومرن</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            إدارة كاملة للمنتجات بكافة أنواعها وتصنيفاتها، مع دعم المتغيرات والباركود وأسعار الجملة والتجزئة.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* صورة توضيحية */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="bg-gradient-to-tr from-primary/10 via-card to-background p-6 rounded-2xl border border-border shadow-lg">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* شريط البحث والتصفية */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="ابحث عن منتج..."
                        className="w-full py-2 pl-3 pr-9 bg-muted/30 border border-border rounded-md text-sm" 
                      />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Tag className="h-4 w-4" />
                      <span>التصنيفات</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>المخزون</span>
                    </Button>
                  </div>
                  
                  {/* أشرطة التصنيف */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {['الكل', 'إلكترونيات', 'ملابس', 'أحذية', 'مستلزمات منزلية', 'هدايا'].map((cat, i) => (
                      <div
                        key={i}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                          i === 0
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-muted/50 text-muted-foreground border border-border/50'
                        }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* شبكة المنتجات */}
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div 
                        key={i}
                        className="bg-background rounded-lg p-3 border border-border hover:border-primary/20 hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <div className="bg-muted/40 rounded-md h-24 mb-2 flex items-center justify-center relative">
                          {/* صورة المنتج */}
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-primary/70" />
                          </div>
                          
                          {/* علامات المنتج */}
                          {i % 3 === 0 && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500/90 text-white text-xs rounded">
                              جديد
                            </span>
                          )}
                          
                          {i % 4 === 0 && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500/90 text-white text-xs rounded">
                              تخفيض
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">منتج #{i}</h4>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">الكمية: {i * 7}</p>
                            <p className="text-xs text-muted-foreground">الباركود: P{i}00{i}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm font-semibold">{i * 950} دج</p>
                            {i % 2 === 0 && (
                              <p className="text-xs text-primary">سعر الجملة: {i * 750} دج</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* النص والميزات */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="space-y-8">
              <div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                    <Boxes className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">تنظيم المنتجات بشكل احترافي</h3>
                    <p className="text-muted-foreground">
                      قم بتصنيف منتجاتك في مجموعات وفئات، وأضف خصائص متنوعة لكل منتج مثل الألوان، الأحجام، والمواصفات الخاصة.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "ملصقات الباركود", desc: "طباعة وفحص الباركود" },
                    { title: "المنتجات الرقمية", desc: "بيع المنتجات غير المادية" },
                    { title: "متغيرات المنتجات", desc: "ألوان، أحجام، موديلات" },
                    { title: "صور متعددة", desc: "عرض المنتج من عدة زوايا" }
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
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">أسعار مرنة وخيارات متعددة</h3>
                    <p className="text-muted-foreground">
                      حدد أسعار مختلفة للتجزئة والجملة، وأنشئ عروض وخصومات خاصة بتواريخ محددة، وتتبع هوامش الربح بدقة.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "أسعار الجملة والتجزئة", desc: "أسعار مختلفة لفئات العملاء" },
                    { title: "خصومات وعروض", desc: "حملات ترويجية بتواريخ محددة" },
                    { title: "أسعار خاصة", desc: "أسعار مخصصة لعملاء معينين" },
                    { title: "عملات متعددة", desc: "دعم مختلف العملات" }
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
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">إدارة المخزون بشكل متكامل</h3>
                    <p className="text-muted-foreground">
                      تتبع المخزون في الوقت الفعلي، وتلقي إشعارات عند انخفاض المستويات، وإدارة التوريدات والجرد والتحويلات بين الفروع.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 mr-[60px]">
                  {[
                    { title: "تنبيهات المخزون", desc: "إشعارات عند انخفاض الكمية" },
                    { title: "طلبات التوريد", desc: "إدارة طلبات الشراء والموردين" },
                    { title: "جرد المنتجات", desc: "تسوية وتعديل المخزون" },
                    { title: "نقل بين الفروع", desc: "تحويل المنتجات بين المخازن" }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border border-border rounded-lg bg-card">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProductCatalogFeature;
