import { useState, useEffect, useCallback } from 'react';
import { 
  Gamepad2, 
  ShoppingBag, 
  Wrench, 
  TrendingUp,
  ArrowRight,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ProductCard from '@/components/product/ProductCard';
import { useShop } from '@/context/ShopContext';
import Layout from '@/components/Layout';
import { HomePageSEO } from '@/components/seo';

const Home = () => {
  const { products, services } = useShop();
  const featuredProducts = products.filter(product => product.isFeatured);
  const newProducts = products.filter(product => product.isNew).slice(0, 8);
  
  // Categories
  const categories = [
    {
      name: 'أجهزة الألعاب',
      icon: Gamepad2,
      description: 'أحدث أجهزة الألعاب من إكس بوكس وبلاي ستيشن ونينتندو',
      linkTo: '/category/consoles',
      bgClass: 'bg-game-purple-800'
    },
    {
      name: 'الإكسسوارات',
      icon: ShoppingBag,
      description: 'إكسسوارات وملحقات أصلية لجميع أجهزة الألعاب',
      linkTo: '/category/accessories',
      bgClass: 'bg-game-purple-700'
    },
    {
      name: 'خدمات الإصلاح',
      icon: Wrench,
      description: 'خدمات إصلاح وصيانة احترافية لجميع أجهزة الألعاب',
      linkTo: '/services',
      bgClass: 'bg-game-purple-600'
    },
    {
      name: 'العروض الخاصة',
      icon: TrendingUp,
      description: 'أقوى العروض والتخفيضات على منتجات مختارة',
      linkTo: '/offers',
      bgClass: 'bg-game-purple-500'
    }
  ];
  
  // Hero slides
  const heroSlides = [
    {
      title: 'إكس بوكس سيريس إكس',
      description: 'أقوى جهاز ألعاب من مايكروسوفت الآن متوفر',
      image: '/xbox-series-x.jpg',
      buttonText: 'تسوق الآن',
      buttonLink: '/product/1'
    },
    {
      title: 'خدمات إصلاح احترافية',
      description: 'إصلاح جميع أجهزة الألعاب بأيدي خبراء متخصصين',
      image: '/repair-service.jpg',
      buttonText: 'احجز الآن',
      buttonLink: '/services'
    },
    {
      title: 'أحدث الألعاب',
      description: 'استمتع بأحدث إصدارات الألعاب لجميع المنصات',
      image: '/latest-games.jpg',
      buttonText: 'تصفح الألعاب',
      buttonLink: '/category/games'
    }
  ];
  
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-play hero slider
  const nextSlide = useCallback(() => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  }, [heroSlides.length]);

  useEffect(() => {
    const slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    return () => clearInterval(slideInterval); // Clear interval on component unmount
  }, [nextSlide]);
  
  return (
    <Layout>
      <HomePageSEO />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section - Modern Design */}
        <section className="mb-16 relative">
          <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900 rounded-3xl overflow-hidden shadow-2xl min-h-[600px] border border-slate-200/50 dark:border-slate-700/50">
            
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/10 to-blue-400/10 rounded-full blur-2xl animate-spin" style={{ animationDuration: '20s' }}></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-12">
              <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[500px]">
                
                {/* Content Side */}
                <div className="text-center lg:text-right space-y-8">
                  
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-medium text-sm">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    منصة إدارة المتاجر الرائدة في الجزائر
                  </div>

                  {/* Main Heading */}
                  <div className="space-y-4">
                    <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight">
                      <span className="bg-gradient-to-l from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                        قيادة التجارة
                      </span>
                      <br />
                      <span className="text-slate-800 dark:text-white">
                        الرقمية
                      </span>
                    </h1>
                    <div className="flex justify-center lg:justify-start">
                      <div className="w-32 h-1.5 bg-gradient-to-r from-primary to-purple-600 rounded-full"></div>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    حوّل متجرك إلى إمبراطورية رقمية مع أقوى نظام إدارة متكامل. 
                    <span className="text-primary font-semibold"> كل ما تحتاجه في منصة واحدة</span>
                  </p>

                  {/* Key Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto lg:mx-0">
                    {[
                      { icon: "⚡", text: "إعداد فوري في دقائق" },
                      { icon: "🛡️", text: "أمان على أعلى مستوى" },
                      { icon: "🌐", text: "متجر إلكتروني احترافي" },
                      { icon: "📊", text: "تحليلات ذكية فورية" }
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 backdrop-blur-sm border border-white/20 dark:border-slate-700/20">
                        <span className="text-2xl">{feature.icon}</span>
                        <span className="font-medium">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Button size="lg" className="min-w-[200px] h-14 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transform hover:scale-105">
                      🚀 ابدأ رحلتك الآن
                      <ArrowRight className="h-5 w-5 mr-2" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="min-w-[200px] h-14 text-lg font-bold border-2 border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
                    >
                      🎬 شاهد العرض التوضيحي
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-4">
                    {[
                      { value: "10K+", label: "تاجر نشط", icon: "👥" },
                      { value: "500K+", label: "معاملة شهرية", icon: "💰" },
                      { value: "99%", label: "نسبة الرضا", icon: "⭐" }
                    ].map((stat, index) => (
                      <div key={index} className="text-center bg-white/30 dark:bg-slate-800/30 rounded-2xl p-4 backdrop-blur-sm border border-white/20 dark:border-slate-700/20">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-2xl font-bold text-primary">{stat.value}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Side */}
                <div className="relative">
                  
                  {/* Main Dashboard Preview */}
                  <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 rounded-3xl blur-2xl"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden backdrop-blur-sm">
                      
                      {/* Browser Header */}
                      <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300 text-center font-mono">
                            متجري.دز
                          </div>
                        </div>
                      </div>
                      
                      {/* Dashboard Content */}
                      <div className="p-6 space-y-6">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">لوحة التحكم الذكية</h3>
                          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                            🟢 متصل
                          </div>
                        </div>
                        
                        {/* Modern Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: "المبيعات اليوم", value: "15,750 دج", color: "from-blue-500 to-blue-600", icon: "💰" },
                            { label: "الطلبات الجديدة", value: "42", color: "from-green-500 to-green-600", icon: "📦" },
                            { label: "المنتجات", value: "256", color: "from-purple-500 to-purple-600", icon: "🛍️" },
                            { label: "العملاء النشطين", value: "128", color: "from-orange-500 to-orange-600", icon: "👥" }
                          ].map((card, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{card.icon}</span>
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${card.color}`}></div>
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{card.label}</div>
                              <div className="text-xl font-bold text-slate-800 dark:text-white">{card.value}</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Modern Chart */}
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">📈 نمو المبيعات</span>
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded-full font-medium">+35%</span>
                          </div>
                          <div className="flex items-end gap-1 h-16">
                            {[40, 65, 45, 80, 60, 95, 75, 85].map((height, index) => (
                              <div 
                                key={index}
                                className="bg-gradient-to-t from-primary to-blue-400 rounded-sm flex-1 transition-all duration-500 hover:scale-110" 
                                style={{ height: `${height * 0.6}px` }}
                              ></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Notifications */}
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-2xl shadow-lg text-sm font-bold animate-bounce">
                    🎉 طلب جديد وصل!
                  </div>

                  <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2 rounded-2xl shadow-lg text-sm font-bold flex items-center gap-2">
                    📊 +47% هذا الشهر
                  </div>

                  <div className="absolute top-1/3 -left-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-2xl shadow-lg text-xs font-bold">
                    💫 AI تحليل ذكي
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Categories Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">تصفح حسب الفئة</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <Link 
                to={category.linkTo} 
                key={index} 
                // Added hover:shadow-lg and hover:brightness-110 for better interaction
                className={`${category.bgClass} p-6 rounded-lg text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:brightness-110`}
              >
                <category.icon className="h-10 w-10 mb-4" />
                <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                <p className="text-white/80 mb-4">{category.description}</p>
                <div className="flex items-center text-white group-hover:underline">
                  <span>استكشف</span>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
        
        {/* Featured Products Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">منتجات مميزة</h2>
            <Link to="/products" className="text-primary flex items-center hover:underline">
              <span>عرض الكل</span>
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Link>
          </div>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {featuredProducts.map((product) => (
                <CarouselItem key={product.id} className="md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-1" />
            <CarouselNext className="right-1" />
          </Carousel>
        </section>
        
        {/* Services Banner */}
        <section className="mb-12">
          <div className="bg-game-purple-900 rounded-lg overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-white mb-4">خدمات إصلاح احترافية</h2>
                <p className="text-white/80 mb-6">
                  نقدم خدمات إصلاح احترافية لجميع أجهزة الألعاب بأيدي فنيين متخصصين.
                  استعد جهازك بسرعة وبضمان الجودة.
                </p>
                <div>
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/services">
                      <Wrench className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
                      استكشف خدماتنا
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2 h-64 md:h-auto bg-center bg-cover" style={{ backgroundImage: 'url(/repair-service.jpg)' }} />
            </div>
          </div>
        </section>
        
        {/* New Arrivals Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">وصل حديثاً</h2>
            <Link to="/new-arrivals" className="text-primary flex items-center hover:underline">
              <span>عرض الكل</span>
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">آراء العملاء</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "أحمد محمد",
                rating: 5,
                text: "خدمة ممتازة وسرعة في التوصيل. الجهاز وصل بحالة ممتازة وبدأت اللعب فوراً!"
              },
              {
                name: "سارة عبدالله",
                rating: 5,
                text: "قمت بإصلاح جهاز البلاي ستيشن الخاص بي وتمت الخدمة باحترافية عالية وبوقت قياسي."
              },
              {
                name: "خالد العمري",
                rating: 4,
                text: "أسعار ممتازة مقارنة بالمتاجر الأخرى، والتشكيلة واسعة من المنتجات."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-card p-6 rounded-lg shadow">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="mb-4">{testimonial.text}</p>
                <p className="font-bold">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* Newsletter Section */}
        <section className="bg-muted p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">اشترك في نشرتنا البريدية</h2>
          <p className="text-muted-foreground mb-6">
            احصل على آخر العروض والتحديثات مباشرة إلى بريدك الإلكتروني
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="border border-primary/20 px-4 py-2 rounded-md flex-grow text-right"
              dir="rtl"
            />
            <Button>اشترك</Button>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="mt-16 mb-8">
          <div className="prose prose-lg max-w-none text-center">
            <h2 className="text-3xl font-bold mb-6">لماذا تختار سطوكيها لإدارة متجرك؟</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-primary">🚀 إعداد سريع</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  ابدأ في دقائق معدودة مع نظام إعداد مبسط ومفهوم. لا تحتاج خبرة تقنية لاستخدام سطوكيها.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-primary">🛡️ أمان متقدم</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  حماية شاملة لبياناتك وبيانات عملائك مع تشفير متقدم ونسخ احتياطية تلقائية.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-primary">📊 تحليلات ذكية</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  تقارير مفصلة وإحصائيات دقيقة تساعدك في اتخاذ قرارات مدروسة لمتجرك.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">منصة شاملة لإدارة المتاجر في الجزائر</h3>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                سطوكيها هي المنصة الأولى في الجزائر التي تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون في مكان واحد. 
                مصممة خصيصاً لاحتياجات التجار الجزائريين مع دعم كامل للغة العربية والديار الجزائرية.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 text-right">
                <div>
                  <h4 className="font-bold mb-2">🎯 ميزات نقطة البيع</h4>
                  <ul className="text-slate-600 dark:text-slate-300 space-y-1">
                    <li>• واجهة سهلة الاستخدام</li>
                    <li>• دعم جميع وسائل الدفع</li>
                    <li>• طباعة الفواتير فوراً</li>
                    <li>• إدارة العملاء والمخزون</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-bold mb-2">🌐 متجر إلكتروني احترافي</h4>
                  <ul className="text-slate-600 dark:text-slate-300 space-y-1">
                    <li>• تصميم متجاوب مع جميع الأجهزة</li>
                    <li>• تحسين محركات البحث (SEO)</li>
                    <li>• تكامل مع وسائل الدفع المحلية</li>
                    <li>• إدارة الطلبات التلقائية</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Home;
