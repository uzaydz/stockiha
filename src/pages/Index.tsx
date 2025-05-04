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
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="relative rounded-lg overflow-hidden shadow-xl h-[500px]">
            <div 
              className="absolute inset-0 bg-center bg-cover transition-opacity duration-1000"
              style={{ 
                backgroundImage: `url(${heroSlides[activeSlide].image})`,
                opacity: 1 // Keep opacity 1, gradient handles dimming
              }}
            />
            {/* Adjusted gradient for potentially better contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/10" />
            
            <div className="relative h-full flex flex-col justify-center px-6 md:px-12 text-white max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">{heroSlides[activeSlide].title}</h1>
              <p className="text-lg md:text-xl mb-6 drop-shadow-sm">{heroSlides[activeSlide].description}</p>
              <div>
                <Button asChild size="lg" className="font-bold pulse-glow">
                  <Link to={heroSlides[activeSlide].buttonLink}>
                    {heroSlides[activeSlide].buttonText}
                    <ArrowRight className="mr-2 h-5 w-5 flip-x" />
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Improved slide indicators */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-2 rtl:space-x-reverse">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`h-3 w-3 rounded-full transition-colors duration-300 ${
                    index === activeSlide ? 'bg-primary' : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
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
      </main>
    </Layout>
  );
};

export default Home;
