import { motion } from 'framer-motion';
import { Package, CheckCircle, Truck, Inbox, Bell, Filter, Search, ListFilter } from 'lucide-react';

const OrderManagement = () => {
  const orderStatuses = [
    { name: "جديد", color: "bg-blue-100 text-blue-700", count: 5 },
    { name: "قيد التجهيز", color: "bg-amber-100 text-amber-700", count: 3 },
    { name: "جاهز للشحن", color: "bg-purple-100 text-purple-700", count: 2 },
    { name: "قيد التوصيل", color: "bg-indigo-100 text-indigo-700", count: 4 },
    { name: "تم التسليم", color: "bg-green-100 text-green-700", count: 12 },
    { name: "ملغي", color: "bg-red-100 text-red-700", count: 1 }
  ];

  const orders = [
    {
      id: "#12345",
      customer: "ياسين بن عيسى",
      date: "قبل 2 ساعة",
      status: "جديد",
      statusColor: "bg-blue-100 text-blue-700",
      items: 3,
      total: "359 دج"
    },
    {
      id: "#12344",
      customer: "فاطمة الزهراء بوعلام",
      date: "قبل 5 ساعات",
      status: "قيد التجهيز",
      statusColor: "bg-amber-100 text-amber-700",
      items: 2,
      total: "245 دج"
    },
    {
      id: "#12343",
      customer: "عبد القادر قشي",
      date: "قبل 8 ساعات",
      status: "قيد التوصيل",
      statusColor: "bg-indigo-100 text-indigo-700",
      items: 1,
      total: "120 دج"
    }
  ];

  return (
    <section id="order-management" className="py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      {/* عناصر الخلفية الزخرفية */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-30"></div>
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
            إدارة الطلبات
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            تحكم <span className="text-primary">كامل</span> في جميع طلبات متجرك
          </h2>
          <p className="text-lg text-muted-foreground">
            إدارة سلسة وفعالة لجميع طلبات متجرك الإلكتروني من خلال لوحة تحكم متكاملة 
            تتيح لك متابعة الطلبات وتغيير حالتها في أي وقت.
          </p>
        </motion.div>

        {/* لوحة إدارة الطلبات */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto mb-20"
        >
          <div className="bg-card border border-border/50 shadow-lg rounded-xl overflow-hidden">
            {/* شريط العنوان */}
            <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">إدارة الطلبات</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="بحث في الطلبات..."
                    className="w-48 md:w-64 h-9 rounded-md bg-background border border-border px-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <button className="h-9 w-9 rounded-md border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Bell className="w-4 h-4" />
                </button>
                
                <button className="h-9 w-9 rounded-md border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* حالة الطلبات */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 md:gap-2 p-4 bg-background">
              {orderStatuses.map((status, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="bg-card border border-border/50 rounded-lg p-3 text-center hover:border-primary/50 transition-all duration-200 cursor-pointer"
                >
                  <div className={`inline-block rounded-full px-2 py-1 text-xs ${status.color} mb-1`}>
                    {status.count}
                  </div>
                  <div className="text-sm font-medium">{status.name}</div>
                </motion.div>
              ))}
            </div>
            
            {/* قائمة الطلبات */}
            <div className="p-4">
              <div className="bg-muted/20 rounded-lg p-3 mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
                <div className="w-20 md:w-24">رقم الطلب</div>
                <div className="flex-1 hidden md:block">العميل</div>
                <div className="flex-1">التاريخ</div>
                <div className="flex-1">الحالة</div>
                <div className="w-20 md:w-24 text-center">المنتجات</div>
                <div className="w-20 md:w-28 text-left">الإجمالي</div>
                <div className="w-10"></div>
              </div>
              
              {orders.map((order, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  viewport={{ once: true }}
                  className={`bg-card border border-border/40 rounded-lg p-4 mb-2 flex items-center justify-between text-sm hover:shadow-md transition-all duration-200 ${index === 0 ? 'border-primary/50' : ''}`}
                >
                  <div className="w-20 md:w-24 font-medium">{order.id}</div>
                  <div className="flex-1 hidden md:block">{order.customer}</div>
                  <div className="flex-1 text-muted-foreground">{order.date}</div>
                  <div className="flex-1">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs ${order.statusColor}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="w-20 md:w-24 text-center">{order.items}</div>
                  <div className="w-20 md:w-28 text-left font-medium">{order.total}</div>
                  <div className="w-10 flex justify-end">
                    <button className="text-muted-foreground hover:text-primary">
                      <ListFilter className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* شريط معلومات */}
            <div className="bg-muted/20 border-t border-border px-6 py-3 flex flex-wrap gap-y-2 items-center justify-between text-sm">
              <div className="text-muted-foreground">
                إظهار <span className="font-medium text-foreground">3</span> من <span className="font-medium text-foreground">27</span> طلب
              </div>
              
              <div className="flex items-center gap-1">
                <button className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <button className="h-8 w-8 rounded-md border border-primary/50 bg-primary/5 flex items-center justify-center text-primary font-medium">
                  1
                </button>
                <button className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground">
                  2
                </button>
                <button className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground">
                  3
                </button>
                <button className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* مميزات إدارة الطلبات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">إدارة مركزية</h3>
            <p className="text-sm text-muted-foreground">
              إدارة جميع طلبات المتجر الإلكتروني من مكان واحد وعرض تفاصيل كاملة لكل طلب.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">تغيير الحالة</h3>
            <p className="text-sm text-muted-foreground">
              تحديث حالة الطلبات بضغطة زر واحدة، مع إشعار العملاء تلقائياً بالتغييرات.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">متابعة الشحن</h3>
            <p className="text-sm text-muted-foreground">
              ربط معلومات الشحن والتوصيل مع كل طلب، لمتابعة دقيقة وشفافة للطلبات.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-card border border-border/40 p-6 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">إشعارات فورية</h3>
            <p className="text-sm text-muted-foreground">
              استلام إشعارات فورية عند وصول طلبات جديدة أو تحديث حالة الطلبات الحالية.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OrderManagement;
