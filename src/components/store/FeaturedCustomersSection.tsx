import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquareQuote, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedCustomer {
  id: string;
  name: string;
  image: string;
  occupation: string;
  story: string;
  testimonial: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}

interface FeaturedCustomersSectionProps {
  title?: string;
  subtitle?: string;
  customers?: FeaturedCustomer[];
}

const defaultCustomers: FeaturedCustomer[] = [
  {
    id: "1",
    name: "سمير العلي",
    image: "https://i.pravatar.cc/300?img=13",
    occupation: "مهندس برمجيات",
    story: "كنت أبحث عن منتجات تقنية عالية الجودة، وقد وفر لي المتجر كل ما أحتاجه بأسعار معقولة وخدمة ممتازة.",
    testimonial: "منتجات ذات جودة استثنائية وموثوقية عالية. أنصح بشدة بالتعامل مع هذا المتجر لكل من يبحث عن الأفضل.",
    socialMedia: {
      instagram: "@samir_tech",
      twitter: "@samirtech"
    }
  },
  {
    id: "2",
    name: "ليلى محمد",
    image: "https://i.pravatar.cc/300?img=32",
    occupation: "مصممة جرافيك",
    story: "بصفتي مصممة، أحتاج إلى منتجات ذات أداء عالي. وجدت ضالتي في هذا المتجر الذي يقدم منتجات تلبي متطلباتي المهنية.",
    testimonial: "الجودة والاحترافية هي أفضل ما يميز هذا المتجر. لقد ساعدتني منتجاتهم على تطوير أعمالي بشكل كبير.",
    socialMedia: {
      instagram: "@leila_designs",
      facebook: "leiladesigns"
    }
  },
  {
    id: "3",
    name: "أحمد العمري",
    image: "https://i.pravatar.cc/300?img=52",
    occupation: "طبيب",
    story: "رغم انشغالي الدائم، استطعت الحصول على كل ما أحتاجه من هذا المتجر بسهولة ويسر. التوصيل السريع والخدمة الممتازة جعلتني زبونًا دائمًا.",
    testimonial: "المتجر يقدم خدمة استثنائية من حيث سرعة التوصيل وجودة المنتجات. تجربة شراء ممتازة من الألف إلى الياء.",
    socialMedia: {
      twitter: "@dr_ahmed",
      facebook: "drahmed"
    }
  }
];

const FeaturedCustomersSection = ({
  title = "قصص نجاح عملائنا",
  subtitle = "تعرف على بعض عملائنا المميزين وقصص نجاحهم مع منتجاتنا",
  customers = defaultCustomers
}: FeaturedCustomersSectionProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev < customers.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : customers.length - 1));
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-muted/20">
      <div className="container px-4 mx-auto">
        {/* عنوان القسم */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* قسم العملاء المميزين */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* صورة العميل والمعلومات */}
          <motion.div 
            className="lg:col-span-5 flex flex-col items-center lg:items-end"
            key={`customer-image-${activeIndex}`}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-primary/10 shadow-xl">
                <img 
                  src={customers[activeIndex].image} 
                  alt={customers[activeIndex].name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-primary text-white px-6 py-2 rounded-full shadow-lg">
                {customers[activeIndex].occupation}
              </div>
            </div>
            <h3 className="text-2xl font-bold mt-6 mb-2">{customers[activeIndex].name}</h3>
            
            {/* روابط التواصل الاجتماعي إذا وجدت */}
            {customers[activeIndex].socialMedia && (
              <div className="flex gap-3 mt-2">
                {customers[activeIndex].socialMedia.instagram && (
                  <span className="text-sm text-muted-foreground">
                    {customers[activeIndex].socialMedia.instagram}
                  </span>
                )}
                {customers[activeIndex].socialMedia.twitter && (
                  <span className="text-sm text-muted-foreground">
                    {customers[activeIndex].socialMedia.twitter}
                  </span>
                )}
              </div>
            )}
          </motion.div>

          {/* قصة العميل والشهادة */}
          <motion.div 
            className="lg:col-span-7"
            key={`customer-story-${activeIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-primary/10 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start mb-6">
                  <MessageSquareQuote className="text-primary h-8 w-8 ml-3 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-xl font-semibold mb-3">قصة النجاح</h4>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {customers[activeIndex].story}
                    </p>
                  </div>
                </div>

                <hr className="my-6 border-muted" />

                <div className="bg-muted/30 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-3">تجربة {customers[activeIndex].name} معنا</h4>
                  <p className="italic text-md text-foreground">
                    "{customers[activeIndex].testimonial}"
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* أزرار التنقل بين العملاء */}
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrev}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                العميل السابق
              </Button>
              
              <div className="flex gap-2">
                {customers.map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all ${
                      index === activeIndex ? 'bg-primary w-6' : 'bg-muted'
                    }`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`عرض العميل ${index + 1}`}
                  />
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                العميل التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCustomersSection;
