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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ComponentType, getDefaultSettingsForType } from './types';
import './ComponentEditor.css';

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
    <div className="component-editor component-editor-in-modal flex flex-col space-y-4">
      {/* معلومات المكون - رأس ثابت */}
      <Card className={cn(
        "flex-shrink-0 overflow-hidden border-0 shadow-sm",
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        component.isActive ? "ring-2 ring-green-500/20" : "ring-1 ring-gray-200 dark:ring-gray-700"
      )}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-lg",
                "bg-gradient-to-br from-blue-500 to-purple-500"
              )}>
                <span className="text-white" aria-hidden="true">{getComponentIcon(component.type)}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {t(component.type)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {component.id.substring(0, 8)}...
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full",
              component.isActive 
                ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700" 
                : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
            )}>
              {component.isActive ? t('نشط') : t('مخفي')}
            </Badge>
          </div>
        </div>
      </Card>
      
      {/* محرر المكون - قابل للتمرير */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
                      <motion.div
              key={component.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full flex flex-col motion-div"
            >
            <Card className={cn(
              "h-full border-0 shadow-sm overflow-hidden",
              "bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700"
            )}>
              {/* شريط العنوان */}
              <div className={cn(
                "py-3 px-4 border-b border-gray-100 dark:border-gray-700",
                "bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700",
                "flex items-center gap-2 text-sm font-semibold flex-shrink-0"
              )}>
                <div className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs",
                  getComponentColor(component.type).split(' ')[0]
                )}>
                  <ChevronRight className="h-3 w-3" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('إعدادات')} {t(component.type)}
                </span>
              </div>
              
              {/* محتوى المحرر - قابل للتمرير */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-4">
                  {renderEditor()}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ComponentEditor;
