import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HeroComponentPreview from './HeroComponentPreview';
import FormComponentPreview from './FormComponentPreview';
import TextComponentPreview from './TextComponentPreview';
import ImageComponentPreview from './ImageComponentPreview';
import BeforeAfterComponentPreview from './BeforeAfterComponentPreview';
import ProductBenefitsComponentPreview from './ProductBenefitsComponentPreview';
import GuaranteesComponentPreview from './GuaranteesComponentPreview';
import ProductHeroComponentPreview from './ProductHeroComponentPreview';
import WhyChooseUsComponentPreview from './WhyChooseUsComponentPreview';
import ProblemSolutionComponentPreview from './ProblemSolutionComponentPreview';
import { CtaButtonComponentPreview } from './CtaButtonComponentPreview';
import TestimonialsComponentPreview from './TestimonialsComponentPreview';
import { LandingPageComponent } from './types';

interface ComponentPreviewProps {
  component: LandingPageComponent;
}

/**
 * مكون معاينة لمكونات صفحة الهبوط
 * يعرض المكون بشكل مشابه لما سيظهر في صفحة العرض النهائية
 */
const ComponentPreview: React.FC<ComponentPreviewProps> = ({ component }) => {
  const { t } = useTranslation();
  
  // التأكد من أن المكون يتم تحديثه بشكل صحيح عند تغيير الإعدادات
  useEffect(() => {
    
  }, [component.settings]);
  
  if (!component.isActive) {
    return (
      <div className="bg-muted/30 border border-dashed border-muted-foreground/30 p-4 text-center text-muted-foreground rounded-lg">
        <p>{t('هذا المكون مخفي ولن يظهر في الصفحة')}</p>
      </div>
    );
  }
  
  // تحديد نوع المكون المراد عرضه
  switch (component.type) {
    case 'hero':
      return <HeroComponentPreview settings={component.settings} />;
    case 'form':
      return <FormComponentPreview settings={component.settings} />;
    case 'text':
      return <TextComponentPreview settings={component.settings} />;
    case 'image':
      return <ImageComponentPreview settings={component.settings} />;
    case 'ctaButton':
      // تمرير الوضع كمحرر لعرض معلومات إضافية في المعاينة
      return <CtaButtonComponentPreview component={component} isEditor={true} />;
    case 'beforeAfter':
      return <BeforeAfterComponentPreview component={component} />;
    case 'productBenefits':
      return <ProductBenefitsComponentPreview component={component} />;
    case 'guarantees':
      return <GuaranteesComponentPreview component={component} />;
    case 'productHero':
      return <ProductHeroComponentPreview settings={component.settings} />;
    case 'whyChooseUs':
      // استخدام تحويل النوع لتجاوز مشكلة التوافق
      return <WhyChooseUsComponentPreview settings={component.settings as any} />;
    case 'problemSolution':
      // استخدام تحويل النوع لتجاوز مشكلة التوافق
      return <ProblemSolutionComponentPreview settings={component.settings as any} />;
    case 'testimonials':
      return <TestimonialsComponentPreview component={component} />;
    default:
      return (
        <div className="p-4 text-center bg-muted/20 rounded-md border border-dashed">
          {t('preview_not_available', 'معاينة غير متوفرة لهذا المكون')}
        </div>
      );
  }
};

export default ComponentPreview; 
 
 