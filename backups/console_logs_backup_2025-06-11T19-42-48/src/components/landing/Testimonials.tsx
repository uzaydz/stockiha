import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  id: number;
  content: string;
  author: {
    name: string;
    role: string;
    company: string;
    avatar: string;
  };
  rating: number;
}

const Testimonials = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      content:
        "منظومة متجر الألعاب الشامل غيرت طريقة إدارتنا للمخزون ونقاط البيع. أصبحنا أكثر كفاءة وتنظيمًا، وازدادت مبيعاتنا بنسبة 40% خلال الأشهر الستة الأولى من استخدام النظام. الدعم الفني ممتاز ويستجيب بسرعة لأي استفسار.",
      author: {
        name: "أحمد الشمري",
        role: "مدير المبيعات",
        company: "متجر ألعاب المستقبل",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
      },
      rating: 5,
    },
    {
      id: 2,
      content:
        "لقد كنا نستخدم برنامجًا آخر لإدارة متجرنا، لكننا واجهنا العديد من المشاكل. بعد التحول إلى متجر الألعاب الشامل، أصبحت عمليات المخزون أكثر دقة واستطعنا تتبع المبيعات وتحليلها بشكل أفضل. الواجهة العربية سهلة الاستخدام والتقارير مفصلة.",
      author: {
        name: "نورة الكعبي",
        role: "صاحبة المتجر",
        company: "ركن الألعاب",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
      },
      rating: 5,
    },
    {
      id: 3,
      content:
        "نظام متكامل يوفر حلولًا لجميع احتياجات متجر الألعاب. أعجبتني خاصية إدارة المخزون والتنبيهات التلقائية عند انخفاض الكميات. كما أن التكامل مع أنظمة الدفع الإلكتروني سهل علينا العمل كثيرًا. توفير الوقت والجهد كان له أثر إيجابي على نمو متجرنا.",
      author: {
        name: "خالد العتيبي",
        role: "المدير التنفيذي",
        company: "عالم الألعاب",
        avatar: "https://randomuser.me/api/portraits/men/3.jpg",
      },
      rating: 4,
    },
    {
      id: 4,
      content:
        "كصاحبة متجر صغير، كنت قلقة من تكلفة أنظمة إدارة المتاجر المتقدمة. لكن باقة الأساسي من متجر الألعاب الشامل كانت في متناول ميزانيتنا وتحتوي على كل ما نحتاجه. الدعم الفني ممتاز والتحديثات المستمرة تضيف ميزات جديدة مفيدة.",
      author: {
        name: "سارة المنصور",
        role: "مالكة المتجر",
        company: "ألعاب المرح",
        avatar: "https://randomuser.me/api/portraits/women/4.jpg",
      },
      rating: 5,
    },
    {
      id: 5,
      content:
        "بصفتي مديرًا لسلسلة متاجر، كنت أبحث عن نظام يساعدنا في إدارة عدة فروع بسهولة. متجر الألعاب الشامل قدم لنا الحل الأمثل مع إمكانية متابعة أداء جميع الفروع من لوحة تحكم واحدة. التقارير المقارنة بين الفروع ساعدتنا في اتخاذ قرارات أفضل.",
      author: {
        name: "محمد الدوسري",
        role: "مدير العمليات",
        company: "شبكة متاجر اللعبة",
        avatar: "https://randomuser.me/api/portraits/men/5.jpg",
      },
      rating: 5,
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const goToPrevious = () => {
    setDirection("right");
    setActiveIndex((current) =>
      current === 0 ? testimonials.length - 1 : current - 1
    );
  };

  const goToNext = () => {
    setDirection("left");
    setActiveIndex((current) =>
      current === testimonials.length - 1 ? 0 : current + 1
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating
            ? "text-amber-400 fill-amber-400"
            : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <section id="اراء-العملاء" className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4">آراء العملاء</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ماذا يقول عملاؤنا عن النظام
          </h2>
          <p className="text-lg text-muted-foreground">
            آلاف المتاجر في جميع أنحاء الوطن العربي تثق بنا في إدارة أعمالها
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto overflow-hidden">
          <div
            className="relative transition-all duration-500 ease-in-out flex"
            style={{
              transform: `translateX(${activeIndex * 100 * (direction === "left" ? 1 : -1)}%)`,
            }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`w-full shrink-0 ${
                  index === activeIndex ? "block" : "hidden md:block"
                }`}
              >
                <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
                  <div className="flex items-center gap-1 mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/20" />
                    <p className="text-lg leading-relaxed mb-6 relative z-10 pr-4">
                      "{testimonial.content}"
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={testimonial.author.avatar} alt={testimonial.author.name} />
                      <AvatarFallback>
                        {testimonial.author.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mr-4">
                      <h4 className="font-medium">{testimonial.author.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.author.role}، {testimonial.author.company}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8 gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={goToPrevious}
            >
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">السابق</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={goToNext}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">التالي</span>
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">يثق بنا أكثر من 1000+ متجر في المنطقة</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-70">
            {/* Company logos would go here */}
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
