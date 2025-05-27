import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-24 bg-primary/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            ابدأ رحلتك مع نظام متجر الألعاب الشامل اليوم
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            انضم إلى آلاف المتاجر التي تستخدم نظامنا لتنمية أعمالها وزيادة كفاءتها. جرب النظام مجانًا لمدة 14 يومًا دون أي التزام.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="min-w-[180px] text-lg">
              <Link to="/auth/signup">
                ابدأ الآن مجانًا
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-[180px] text-lg">
              <Link to="/contact">
                <span>تواصل مع المبيعات</span>
                <ArrowLeft className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          <div className="mt-10 flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <span>تجربة مجانية لمدة 14 يومًا</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-amber-500"></div>
              <span>لا حاجة لبطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-500"></div>
              <span>دعم فني مجاني أثناء الإعداد</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-purple-500"></div>
              <span>يمكنك الإلغاء في أي وقت</span>
            </div>
          </div>
        </div>
        
        <div className="mt-24 max-w-3xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12 text-primary"
                >
                  <path d="M4 21v-4a3 3 0 0 1 3-3h5" />
                  <path d="M9 17h6" />
                  <path d="M9 3v2" />
                  <path d="M9 9v2" />
                  <path d="M15 3v2" />
                  <path d="M15 9v2" />
                  <path d="M9 17v4" />
                  <path d="M15 17v4" />
                  <rect x="4" y="8" width="16" height="4" rx="1" />
                  <path d="M2 6h2v1H2" />
                  <path d="M20 6h2v1h-2" />
                </svg>
              </div>
              <div className="flex-1 text-center md:text-right">
                <h3 className="text-2xl font-bold mb-4">أنشئ نطاقك الفرعي الخاص</h3>
                <p className="text-muted-foreground mb-6">
                  هل تريد نظامًا خاصًا بمؤسستك؟ احصل على نطاق فرعي خاص بك (yourname.example.com) مع لوحة تحكم مخصصة لإدارة متجرك بشكل احترافي.
                </p>
                <Button asChild size="lg" className="min-w-[180px]">
                  <Link to="/tenant/signup">
                    أنشئ نطاقك الفرعي الآن
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto bg-card rounded-xl border border-border p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="rounded-full bg-primary/10 p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-primary"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h3 className="text-xl font-bold mb-2">تعهدنا بنجاحك</h3>
              <p className="text-muted-foreground">
                نلتزم بتوفير حل متكامل يساعدك على تنمية متجرك. إذا لم تكن راضيًا خلال أول 30 يومًا، سنعيد لك كامل المبلغ دون أي أسئلة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
