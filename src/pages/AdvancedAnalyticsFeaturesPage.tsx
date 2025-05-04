import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import AdvancedAnalyticsHero from '../components/advanced-analytics-features/AdvancedAnalyticsHero';
import FinancialAnalyticsFeature from '../components/advanced-analytics-features/FinancialAnalyticsFeature';
import SalesAnalyticsFeature from '../components/advanced-analytics-features/SalesAnalyticsFeature';
import InventoryAnalyticsFeature from '../components/advanced-analytics-features/InventoryAnalyticsFeature';
import PredictiveAnalyticsFeature from '../components/advanced-analytics-features/PredictiveAnalyticsFeature';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdvancedAnalyticsFeaturesPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>التحليلات المتقدمة | منصة بازار</title>
        <meta name="description" content="اكتشف نظام التحليلات المتقدمة من منصة بازار، حل متكامل للمحاسبة وتحليل المبيعات والمصاريف والأرباح والمخزون بطريقة ذكية ومتقدمة." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        <AdvancedAnalyticsHero />
        <FinancialAnalyticsFeature />
        <SalesAnalyticsFeature />
        <InventoryAnalyticsFeature />
        <PredictiveAnalyticsFeature />
        
        {/* قسم الدعوة للعمل */}
        <section className="py-20 bg-primary/5">
          <div className="container px-4 mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              جاهز للانطلاق مع <span className="text-primary">التحليلات المتقدمة</span> لعملك؟
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-3xl mx-auto">
              ابدأ اليوم واكتشف القوة الحقيقية للبيانات في تحسين أداء عملك واتخاذ قرارات أفضل.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="gap-2">
                <Link to="/signup">
                  ابدأ الآن مجاناً
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <Link to="/contact">
                  <span>تواصل مع فريق المبيعات</span>
                  <ArrowLeft className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdvancedAnalyticsFeaturesPage; 