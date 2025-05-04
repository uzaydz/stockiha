import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getSubscriptionPlans } from '@/api/subscription';
import PricingCards from '@/components/pricing/PricingCards';
import PricingComparison from '@/components/pricing/PricingComparison';
import PricingFAQ from '@/components/pricing/PricingFAQ';
import { SubscriptionPlan } from '@/types/subscription';
import PricingCTA from '@/components/pricing/PricingCTA';

export default function Pricing() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await getSubscriptionPlans();
        setPlans(data);
      } catch (err) {
        console.error('Error loading plans:', err);
        setError('حدث خطأ أثناء تحميل خطط الاشتراك. يرجى المحاولة مرة أخرى لاحقاً.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlans();
  }, []);

  return (
    <>
      <Helmet>
        <title>الباقات والأسعار - بازار</title>
        <meta name="description" content="اختر خطة اشتراك مناسبة لعملك مع بازار. خطط مرنة لإدارة نقاط البيع والمخزون ونمو أعمالك." />
      </Helmet>

      <div className="gradient-background min-h-screen">
        {/* خلفية مخصصة */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950 opacity-[0.6] [mask-image:radial-gradient(at_top_center,white,transparent_70%)]"></div>
        
        {/* رأس الصفحة */}
        <section className="pt-16 md:pt-24 pb-12 md:pb-20 overflow-hidden">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                اختر الخطة المناسبة لأعمالك
              </h1>
              <p className="text-xl text-muted-foreground">
                خطط مرنة تلبي احتياجاتك، ابدأ مجاناً وانمو معنا
              </p>
            </motion.div>
          </div>
        </section>

        {/* بطاقات الأسعار */}
        <PricingCards 
          plans={plans} 
          isLoading={isLoading} 
          error={error} 
        />

        {/* جدول مقارنة الخطط */}
        {!isLoading && !error && plans.length > 0 && (
          <PricingComparison plans={plans} />
        )}

        {/* الأسئلة الشائعة */}
        <PricingFAQ />

        {/* دعوة للعمل */}
        <PricingCTA />
      </div>
    </>
  );
} 