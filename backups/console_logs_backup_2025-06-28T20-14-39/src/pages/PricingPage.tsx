import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import PricingCards from '@/components/pricing/PricingCards';
import PricingFAQ from '@/components/pricing/PricingFAQ';
import PricingComparison from '@/components/pricing/PricingComparison';
import { SubscriptionPlan } from '@/types/subscription';
import { supabase } from '@/lib/supabase';

const PricingPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب خطط الاشتراك من قاعدة البيانات
  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .neq('code', 'trial')
          .order('display_order', { ascending: true });
          
        if (error) throw error;
        
        if (data) {
          setPlans(data);
        } else {
          setError('لا توجد خطط اشتراك متاحة حالياً');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionPlans();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>الأسعار وخطط الاشتراك | stockiha</title>
        <meta name="description" content="اكتشف خطط أسعار منصة بازار المرنة للأعمال من مختلف الأحجام. خطط اشتراك شفافة بميزات متكاملة تناسب احتياجات عملك." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        {/* قسم الترويسة */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4 mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              خطط أسعار <span className="text-primary">بسيطة وشفافة</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              خطط اشتراك مرنة تناسب جميع أحجام الأعمال، مع فترة تجريبية مجانية لكافة الخطط
            </p>
          </div>
        </section>

        {/* قسم بطاقات الأسعار */}
        <PricingCards plans={plans} isLoading={isLoading} error={error} />

        {/* قسم مقارنة الخطط */}
        <PricingComparison plans={plans} />

        {/* قسم الأسئلة الشائعة */}
        <PricingFAQ />

        {/* قسم الدعوة للعمل */}
        <section className="py-20 bg-primary/5">
          <div className="container px-4 mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">جاهز للبدء مع منصة بازار؟</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              ابدأ اليوم واستمتع بتجربة مجانية كاملة المميزات لمدة 5 أيام. لا حاجة لبطاقة ائتمان، ولا التزامات.
            </p>
            <Link to="/signup" className="bg-primary text-white font-medium py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors">
              جرب المنصة مجاناً لمدة 5 أيام
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;
