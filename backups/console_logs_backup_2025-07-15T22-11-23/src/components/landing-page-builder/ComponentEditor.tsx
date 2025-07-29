import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import FormComponentEditor from './FormComponentEditor';
import ImageComponentEditor from './ImageComponentEditor';
import TextComponentEditor from './TextComponentEditor';
import HeroComponentEditor from './HeroComponentEditor';
import BeforeAfterComponentEditor from './BeforeAfterComponentEditor';
import ProductBenefitsComponentEditor from './ProductBenefitsComponentEditor';
import GuaranteesComponentEditor from './GuaranteesComponentEditor';
import ProductHeroComponentEditor from './ProductHeroComponentEditor';
import WhyChooseUsComponentEditor from './WhyChooseUsComponentEditor';
import ProblemSolutionComponentEditor from './ProblemSolutionComponentEditor';
import TestimonialsComponentEditor from './TestimonialsComponentEditor';
import { TestimonialsSettings } from '../landing-page/TestimonialsComponent';
import { CtaButtonComponentEditor } from './CtaButtonComponentEditor';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ComponentType, getDefaultSettingsForType } from './types';

interface LandingPageComponent {
  id: string;
  type: string;
  isActive: boolean;
  settings: Record<string, any>;
}

interface ComponentEditorProps {
  component: LandingPageComponent;
  onUpdateSettings: (settings: Record<string, any>) => void;
}

// تعريف أنواع الإعدادات المطلوبة لكل نوع من المكونات
interface HeroSettings {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  [key: string]: any;
}

interface TextSettings {
  content: string;
  textColor: string;
  alignment: string;
  padding: string;
  [key: string]: any;
}

interface FormSettings {
  title: string;
  productId: string | null;
  formId: string | null;
  buttonText: string;
  backgroundColor: string;
  [key: string]: any;
}

interface ImageSettings {
  imageUrl: string;
  altText: string;
  caption: string;
  maxWidth: string;
  alignment: string;
  border: boolean;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  shadow: boolean;
  shadowIntensity: string;
  overlay: boolean;
  overlayColor: string;
  overlayOpacity: number;
  onClick: string;
  linkUrl: string;
  hoverEffect?: string;
  [key: string]: any;
}

interface GuaranteesSettings {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  layout: string;
  columns: number;
  iconStyle: string;
  borderStyle: string;
  animation: string;
  items: any[];
  [key: string]: any;
}

interface ProductHeroSettings {
  productTitle: string;
  tagline: string;
  description: string;
  price: string;
  currency: string;
  backgroundColor: string;
  textColor: string;
  [key: string]: any;
}

/**
 * مكون محرر المكونات - يختار المحرر المناسب حسب نوع المكون
 */
const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
  onUpdateSettings
}) => {
  const { t } = useTranslation();
  
  // الحصول على أيقونة مناسبة لنوع المكون
  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'form':
        return '📝';
      case 'text':
        return '📄';
      case 'image':
        return '🖼️';
      case 'hero':
        return '🌟';
      case 'beforeAfter':
        return '⟷';
      case 'productBenefits':
        return '✨';
      case 'guarantees':
        return '🔒';
      case 'productHero':
        return '🌟';
      case 'whyChooseUs':
        return '🤔';
      case 'problemSolution':
        return '⚠️';
      case 'ctaButton':
        return '👆';
      case 'testimonials':
        return '💬';
      default:
        return '📦';
    }
  };
  
  // الحصول على لون مناسب لنوع المكون
  const getComponentColor = (type: string) => {
    switch (type) {
      case 'form':
        return 'bg-violet-100 text-violet-900 border-violet-300';
      case 'text':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'image':
        return 'bg-green-100 text-green-900 border-green-300';
      case 'hero':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'beforeAfter':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'productBenefits':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'guarantees':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'productHero':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'whyChooseUs':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'problemSolution':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'ctaButton':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'testimonials':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300';
    }
  };
  
  // Function to update component settings
  const handleUpdateSettings = (settings: Record<string, any>) => {
    // ضمان أن التحديث ينتشر بشكل صحيح
    
    onUpdateSettings(settings);
  };
  
  // دمج الإعدادات الافتراضية مع الإعدادات الحالية للمكون
  const getHeroSettings = (): HeroSettings => {
    const defaultSettings = getDefaultSettingsForType('hero') as HeroSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getTextSettings = (): TextSettings => {
    const defaultSettings = getDefaultSettingsForType('text') as TextSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getFormSettings = (): FormSettings => {
    const defaultSettings = getDefaultSettingsForType('form') as FormSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getImageSettings = (): ImageSettings => {
    const defaultSettings = getDefaultSettingsForType('image') as ImageSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getGuaranteesSettings = (): GuaranteesSettings => {
    const defaultSettings = getDefaultSettingsForType('guarantees') as GuaranteesSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getProductHeroSettings = (): ProductHeroSettings => {
    const defaultSettings = getDefaultSettingsForType('productHero') as ProductHeroSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  const getTestimonialsSettings = (): TestimonialsSettings => {
    const defaultSettings = getDefaultSettingsForType('testimonials') as TestimonialsSettings;
    return { ...defaultSettings, ...component.settings };
  };
  
  // إظهار واجهة المحرر المناسبة
  const renderEditor = () => {
    switch (component.type) {
      case 'hero':
        return (
          <HeroComponentEditor
            settings={component.settings}
            onUpdate={handleUpdateSettings}
          />
        );
      case 'text':
        return <TextComponentEditor 
          settings={getTextSettings()} 
          onUpdate={handleUpdateSettings} 
        />;
      case 'form':
        return <FormComponentEditor 
          settings={getFormSettings()}
          onUpdate={handleUpdateSettings} 
        />;
      case 'image':
        return <ImageComponentEditor 
          settings={getImageSettings()} 
          onUpdate={handleUpdateSettings} 
        />;
      case 'ctaButton':
        return <CtaButtonComponentEditor 
          component={component} 
          onSave={(updatedComponent) => {
            // استخراج الإعدادات من المكون المحدث وتمريرها
            
            handleUpdateSettings(updatedComponent.settings);
          }} 
        />;
      case 'beforeAfter':
        return <BeforeAfterComponentEditor 
          component={component} 
          onUpdate={(updatedComponent) => {
            // استخراج الإعدادات فقط من المكون المحدث وتمريرها
            onUpdateSettings(updatedComponent.settings);
          }} 
        />;
      case 'productBenefits':
        return <ProductBenefitsComponentEditor 
          component={component} 
          onUpdate={(updatedComponent) => {
            // استخراج الإعدادات فقط من المكون المحدث وتمريرها
            onUpdateSettings(updatedComponent.settings);
          }} 
        />;
      case 'guarantees':
        return (
          <GuaranteesComponentEditor
            settings={component.settings}
            onUpdate={handleUpdateSettings}
          />
        );
      case 'productHero':
        return (
          <ProductHeroComponentEditor
            settings={getProductHeroSettings()}
            onUpdate={handleUpdateSettings}
          />
        );
      case 'whyChooseUs':
        return (
          <WhyChooseUsComponentEditor
            settings={component.settings}
            onChange={handleUpdateSettings}
          />
        );
      case 'problemSolution':
        return (
          <ProblemSolutionComponentEditor
            settings={component.settings}
            onChange={handleUpdateSettings}
          />
        );
      case 'testimonials':
        return (
          <TestimonialsComponentEditor
            settings={getTestimonialsSettings()}
            onSettingsChange={handleUpdateSettings}
          />
        );
      default:
        return (
          <div className="p-4 bg-red-50 text-red-500 rounded-md">
            محرر غير متوفر لنوع المكون: {component.type}
          </div>
        );
    }
  };
  
  return (
    <div className="space-y-5">
      {/* معلومات المكون */}
      <Card className={cn(
        "overflow-hidden border",
        component.isActive ? "bg-card" : "bg-muted/50"
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">{getComponentIcon(component.type)}</span>
              <div>
                <h3 className="font-semibold">{t(component.type)}</h3>
                <p className="text-xs text-muted-foreground">ID: {component.id.substring(0, 8)}...</p>
              </div>
            </div>
            <Badge variant="outline" className={cn(
              "px-2 py-1",
              component.isActive ? "bg-green-100 text-green-900 border-green-300" : "bg-red-100 text-red-900 border-red-300"
            )}>
              {component.isActive ? t('نشط') : t('مخفي')}
            </Badge>
          </div>
        </div>
      </Card>
      
      {/* محرر المكون */}
      <AnimatePresence mode="wait">
        <motion.div
          key={component.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="mb-6"
        >
          <div className="border rounded-lg p-1">
            <div className={cn(
              "py-2 px-3 rounded-md flex items-center gap-2 text-sm font-medium mb-2",
              getComponentColor(component.type)
            )}>
              <ChevronRight className="h-4 w-4" />
              <span>{t('إعدادات')} {t(component.type)}</span>
            </div>
            
            <div className="p-3">
              {renderEditor()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ComponentEditor;
