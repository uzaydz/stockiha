import { useState, memo, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Minus, 
  HelpCircle,
  MessageSquare,
  Sparkles,
  Search,
  Star,
  Users,
  Clock,
  Shield,
  CheckCircle,
  Lightbulb,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  popular?: boolean;
}

interface FAQItemProps {
  faq: FAQItem;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}

const FAQItemComponent = ({ faq, isOpen, onClick, index }: FAQItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="group relative"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-darker/20 opacity-0 group-hover:opacity-100 rounded-3xl blur-xl transform scale-110 transition-opacity duration-500" />
      
      {/* Popular Badge */}
      {faq.popular && (
        <div className="absolute -top-3 -right-3 z-20">
          <Badge className="bg-yellow-500 text-white border-0 text-xs font-medium px-3 py-1 shadow-lg">
            <Star className="h-3 w-3 mr-1 fill-current" />
            شائع
          </Badge>
        </div>
      )}
      
      <div className={cn(
        "relative border rounded-3xl overflow-hidden transition-all duration-500 backdrop-blur-sm",
        isOpen 
          ? "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-2xl shadow-primary/20" 
          : "border-border bg-card/50 hover:border-primary/30 hover:shadow-xl hover:bg-card/80"
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='faq-grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='currentColor' stroke-width='1' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23faq-grid)'/%3E%3C/svg%3E")`
        }} />
        
        <button
          onClick={onClick}
          className="relative w-full px-8 py-6 flex items-center justify-between text-left group/button z-10"
        >
          <div className="flex-1 pr-4">
            <div className="flex items-start gap-4 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 group-hover/button:bg-primary/20 transition-colors">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground group-hover/button:text-primary transition-colors leading-relaxed">
                  {faq.question}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-muted/50">
                    {faq.category}
                  </Badge>
                  {faq.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-xs text-muted-foreground">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <motion.div 
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
              isOpen 
                ? "bg-primary text-primary-foreground shadow-primary/20" 
                : "bg-muted group-hover/button:bg-primary group-hover/button:text-primary-foreground"
            )}
          >
            <Plus className="h-5 w-5" />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-8">
                <div className="border-t border-border/50 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="text-muted-foreground leading-relaxed text-lg"
                      >
                        {faq.answer}
                      </motion.p>
                      
                      {/* Helpful Tags */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30"
                      >
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium text-foreground">مفيد؟</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} className="hover:scale-110 transition-transform">
                              <Star className="h-4 w-4 text-yellow-400 hover:fill-yellow-400" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FAQSection = memo(() => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  const faqs: FAQItem[] = [
    {
      id: 1,
      question: "كيف يمكنني البدء باستخدام المنصة؟",
      answer: "البدء سهل للغاية! ما عليك سوى التسجيل في الموقع، والحصول على فترة تجريبية مجانية لمدة 14 يوم. يمكنك إعداد متجرك خلال 3 دقائق فقط، وإضافة المنتجات والخدمات، وتخصيص إعدادات المتجر. لدينا دليل إعداد تفاعلي ومقاطع فيديو توضيحية باللهجة الجزائرية لمساعدتك في كل خطوة.",
      category: "البداية",
      tags: ["تسجيل", "إعداد", "تجربة"],
      popular: true
    },
    {
      id: 2,
      question: "هل أحتاج إلى مهارات تقنية لاستخدام النظام؟",
      answer: "لا على الإطلاق! صممنا النظام ليكون سهل الاستخدام للجميع، حتى غير التقنيين. واجهة المستخدم بسيطة وبديهية، مع إرشادات وتلميحات في كل خطوة. إذا واجهتك أي صعوبات، فريق الدعم الفني متاح 24/7 للمساعدة باللغة العربية.",
      category: "الاستخدام",
      tags: ["سهولة", "دعم", "واجهة"],
      popular: true
    },
    {
      id: 3,
      question: "كيف يعمل المتجر الإلكتروني التلقائي؟",
      answer: "بمجرد التسجيل في المنصة، يتم إنشاء متجر إلكتروني خاص بك تلقائياً مع دومين فرعي مجاني (مثل متجرك.stockiha.com). المنتجات التي تضيفها إلى نظام إدارة المتجر تظهر تلقائياً في متجرك الإلكتروني، والمخزون يتحدث بشكل فوري ومباشر بين المتجر الفعلي والإلكتروني.",
      category: "التجارة الإلكترونية",
      tags: ["متجر", "مزامنة", "دومين"]
    },
    {
      id: 4,
      question: "كيف يمكنني تتبع الطلبات والمبيعات؟",
      answer: "توفر لوحة التحكم الذكية عرضاً شاملاً لجميع الطلبات والمبيعات في الوقت الفعلي، سواء كانت من المتجر الفعلي أو المتجر الإلكتروني. يمكنك تصفية المبيعات حسب التاريخ والمنتجات والعملاء وطرق الدفع. كما يمكنك إنشاء تقارير مخصصة وتصديرها بتنسيقات مختلفة مع إحصائيات مفصلة.",
      category: "التقارير",
      tags: ["تتبع", "مبيعات", "تقارير"]
    },
    {
      id: 5,
      question: "هل يمكن استخدام النظام بدون إنترنت؟",
      answer: "نعم! أحد أهم مميزات منصتنا هو توفر تطبيق سطح مكتب متطور يعمل حتى بدون اتصال بالإنترنت. يمكنك متابعة عمليات البيع وإدارة المخزون بشكل طبيعي، وعند عودة الاتصال بالإنترنت، تتم مزامنة جميع البيانات تلقائياً مع السحابة دون فقدان أي معلومة.",
      category: "التقنية",
      tags: ["أوفلاين", "مزامنة", "تطبيق"],
      popular: true
    },
    {
      id: 6,
      question: "كيف تعمل ميزة تتبع الخدمات بـ QR؟",
      answer: "عندما تسجل خدمة جديدة (مثل صيانة هاتف أو جهاز كهربائي)، ينشئ النظام تلقائياً رمز QR فريد وكود تتبع. يمكنك طباعة إيصال للعميل يحتوي على هذه المعلومات. يمكن للعميل مسح رمز QR أو إدخال كود التتبع في موقعك لمتابعة حالة الخدمة لحظة بلحظة، مع إشعارات تلقائية عند تغيير الحالة.",
      category: "الخدمات",
      tags: ["QR", "تتبع", "صيانة"]
    },
    {
      id: 7,
      question: "هل يدعم النظام تعدد الفروع والموظفين؟",
      answer: "نعم! النظام يدعم إدارة متعددة الفروع وعدد غير محدود من الموظفين مع نظام صلاحيات متقدم. يمكنك تحديد أدوار مختلفة للموظفين وتعيين صلاحيات محددة لكل دور، مثل إدارة المبيعات، إدارة المخزون، أو الوصول إلى التقارير. كل فرع يمكن أن يعمل بشكل مستقل مع مزامنة مركزية.",
      category: "الإدارة",
      tags: ["فروع", "موظفين", "صلاحيات"]
    },
    {
      id: 8,
      question: "ما هي خيارات الدفع والأسعار؟",
      answer: "نقدم خيارات دفع متنوعة تشمل البطاقات الائتمانية، CCP، Baridimob، والتحويل البنكي. الاشتراك شهري بدءاً من 1490 د.ج ويمكن إلغاؤه في أي وقت بدون قيود. نقدم خصم 17% على الاشتراكات السنوية، مع ضمان استرداد كامل خلال 30 يوم إذا لم تكن راضياً عن الخدمة.",
      category: "الأسعار",
      tags: ["دفع", "أسعار", "اشتراك"]
    },
    {
      id: 9,
      question: "كيف يعمل التكامل مع شركات التوصيل؟",
      answer: "منصتنا متكاملة مع أكثر من 20 شركة توصيل جزائرية مثل Yalidine، ZR Express، Procolis وغيرها. عند استلام طلب جديد، يمكنك إرساله تلقائياً لشركة التوصيل المفضلة، مع تتبع حالة الشحنة وإشعارات تلقائية للعميل. حساب تكلفة الشحن يتم أوتوماتيكياً حسب الولاية والوزن.",
      category: "التوصيل",
      tags: ["توصيل", "شحن", "تكامل"],
      popular: true
    },
    {
      id: 10,
      question: "هل البيانات آمنة ومحمية؟",
      answer: "أمان بياناتك أولويتنا القصوى. نستخدم تشفير SSL 256-bit لحماية جميع البيانات، مع نسخ احتياطية كل 6 ساعات على خوادم آمنة. البيانات محفوظة في مراكز بيانات معتمدة عالمياً، مع إمكانية تصدير بياناتك في أي وقت. نحن ملتزمون بقوانين حماية البيانات ولا نشارك معلوماتك مع أي طرف ثالث.",
      category: "الأمان",
      tags: ["حماية", "تشفير", "أمان"]
    }
  ];

  const categories = ['الكل', ...Array.from(new Set(faqs.map(faq => faq.category)))];
  
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'الكل' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      ref={containerRef}
      className="relative py-32 bg-gradient-to-br from-background via-background/98 to-primary/5 dark:from-background dark:via-background/99 dark:to-primary/10 overflow-hidden landing-section"
    >
      
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div
          style={{ y: parallaxY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.4 : 0 }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(parallaxY, y => y * 0.5) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 0.3 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-gradient-radial from-purple-500/15 via-purple-500/5 to-transparent rounded-full blur-3xl"
        />
        
        {/* Floating Question Marks */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 0.3, 0],
              rotate: [0, 360]
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          >
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary/60" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container px-6 mx-auto relative z-10">
        {/* Premium Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <Badge className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 rounded-full mb-6">
            <MessageSquare className="h-4 w-4" />
            الأسئلة الشائعة
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            إجابات على <span className="bg-gradient-to-l from-primary via-primary-darker to-primary-lighter bg-clip-text text-transparent">جميع أسئلتك</span>
          </h2>
          
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            كل ما تحتاج معرفته عن Stockiha لبدء رحلة نجاحك في التجارة الإلكترونية والإدارة الذكية
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span>5000+ عميل راضي</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>دعم 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span>إجابات موثقة</span>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto mb-12"
        >
          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="ابحث في الأسئلة الشائعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pr-12 text-lg bg-card/50 backdrop-blur-sm border border-border rounded-2xl focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "px-6 py-3 rounded-2xl font-medium transition-all duration-300",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card/50 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
                )}
              >
                {category}
              </motion.button>
            ))}
          </div>

          {/* Results Count */}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-4"
            >
              <Badge variant="outline" className="bg-muted/50">
                {filteredFAQs.length} نتيجة للبحث "{searchQuery}"
              </Badge>
            </motion.div>
          )}
        </motion.div>
        
        {/* FAQ Items */}
        <div className="max-w-5xl mx-auto space-y-6 mb-20">
          <AnimatePresence>
            {filteredFAQs.map((faq, index) => (
              <FAQItemComponent
                key={faq.id}
                faq={faq}
                isOpen={openIndex === index}
                onClick={() => handleToggle(index)}
                index={index}
              />
            ))}
          </AnimatePresence>

          {filteredFAQs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="p-6 rounded-3xl bg-muted/30 border border-border inline-block">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">لم نجد نتائج</h3>
                <p className="text-muted-foreground">جرب كلمات بحث أخرى أو تواصل معنا مباشرة</p>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Enhanced Contact Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/50 to-purple-500/10 p-8 lg:p-12 shadow-2xl overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-2xl" />
            
            <div className="relative z-10 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-3xl font-bold text-foreground mb-4">
                ما زلت بحاجة للمساعدة؟
              </h3>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                فريق الدعم الفني متاح 24/7 لمساعدتك. نحن هنا للإجابة على جميع أسئلتك وحل أي مشكلة تواجهها
              </p>

              {/* Contact Options */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">اتصل بنا</h4>
                  <p className="text-sm text-muted-foreground">دعم فوري عبر الهاتف</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">راسلنا</h4>
                  <p className="text-sm text-muted-foreground">إجابة خلال ساعة واحدة</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">دردشة مباشرة</h4>
                  <p className="text-sm text-muted-foreground">تحدث معنا الآن</p>
                </motion.div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button 
                  size="lg"
                  className="min-w-[200px] h-14 text-lg font-semibold bg-primary hover:bg-primary-darker shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                >
                  تواصل معنا الآن
                  <MessageSquare className="h-5 w-5 mr-2" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>إجابة مضمونة خلال 15 دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

FAQSection.displayName = 'FAQSection';

export default FAQSection;
