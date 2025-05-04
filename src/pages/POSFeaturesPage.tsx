import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import POSHero from '@/components/pos-features/POSHero';
import POSCashierFeature from '@/components/pos-features/POSCashierFeature';
import POSInventoryFeature from '@/components/pos-features/POSInventoryFeature';
import POSReportsFeature from '@/components/pos-features/POSReportsFeature';
import POSLoyaltyFeature from '@/components/pos-features/POSLoyaltyFeature';
import ProductCatalogFeature from '@/components/pos-features/ProductCatalogFeature';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const POSFeaturesPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>نظام نقاط البيع | منصة بازار</title>
        <meta name="description" content="اكتشف نظام نقاط البيع المتكامل من منصة بازار، حل متكامل يدعم المبيعات المباشرة والخدمات مع إدارة المخزون والعملاء والمدفوعات." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        <POSHero />
        <POSCashierFeature />
        <ProductCatalogFeature />
        <POSInventoryFeature />
        <POSReportsFeature />
        <POSLoyaltyFeature />
        
        {/* قسم الدعوة للعمل */}
        <section className="py-20 bg-primary/5">
          <div className="container px-4 mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              جاهز للانطلاق مع <span className="text-primary">نظام نقاط البيع</span> المتكامل؟
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-3xl mx-auto">
              ابدأ اليوم واستمتع بتجربة مجانية لمدة 14 يوماً. لا حاجة لبطاقة ائتمان، ولا التزامات.
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

export default POSFeaturesPage; 