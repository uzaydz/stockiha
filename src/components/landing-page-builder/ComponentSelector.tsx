import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Layout,
  Type,
  Image as ImageIcon,
  Grid,
  FileText,
  Search,
  Plus,
  ArrowLeftRight,
  Star,
  Sparkles,
  ChevronDown,
  Info,
  Shield,
  Award,
  AlertCircle,
  MousePointer,
  MessageSquare,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

interface ComponentSelectorProps {
  onAddComponent: (type: string) => void;
}

// خصائص إضافية للمكونات
interface ComponentItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  isNew?: boolean;
  isFeatured?: boolean;
}

// تعريف أنواع المكونات المتاحة مع خصائصها
const availableComponents: ComponentItem[] = [
  {
    id: 'hero',
    name: 'قسم رئيسي',
    description: 'قسم رئيسي جذاب في أعلى الصفحة يتضمن عنوان وصورة وأزرار',
    category: 'sections',
    icon: <Layout className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-100',
    isFeatured: true
  },
  {
    id: 'form',
    name: 'نموذج',
    description: 'نموذج تواصل أو تسجيل لجمع معلومات الزوار',
    category: 'interaction',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-100'
  },
  {
    id: 'text',
    name: 'نص',
    description: 'محتوى نصي قابل للتنسيق لعرض المعلومات',
    category: 'content',
    icon: <Type className="h-4 w-4" />,
    color: 'text-green-600 bg-green-100'
  },
  {
    id: 'image',
    name: 'صورة',
    description: 'صورة أو صور متعددة لعرض المنتجات أو الخدمات',
    category: 'content',
    icon: <ImageIcon className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-100'
  },
  {
    id: 'ctaButton',
    name: 'زر دعوة للعمل',
    description: 'زر تفاعلي متطور مع تأثيرات متعددة للدعوة للشراء أو التمرير للنموذج',
    category: 'interaction',
    icon: <MousePointer className="h-4 w-4" />,
    color: 'text-cyan-600 bg-cyan-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'features',
    name: 'ميزات',
    description: 'عرض مميزات المنتج أو الخدمة في تنسيق جذاب',
    category: 'sections',
    icon: <Grid className="h-4 w-4" />,
    color: 'text-rose-600 bg-rose-100'
  },
  {
    id: 'beforeAfter',
    name: 'قبل وبعد',
    description: 'مقارنة مرئية لعرض النتائج قبل وبعد استخدام المنتج',
    category: 'content',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: 'text-indigo-600 bg-indigo-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'productBenefits',
    name: 'فوائد المنتج',
    description: 'عرض فوائد ومميزات منتجك بتصميم عصري وجذاب',
    category: 'sections',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-violet-600 bg-violet-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'guarantees',
    name: 'ضمانات وإسترجاع',
    description: 'إبراز ضمانات المنتج وسياسة الإسترجاع لزيادة ثقة العملاء',
    category: 'sections',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-teal-600 bg-teal-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'productHero',
    name: 'صفحة المنتج الرئيسية',
    description: 'قسم احترافي لعرض المنتج بصورة جذابة مع معلومات السعر والمميزات',
    category: 'sections',
    icon: <Star className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'whyChooseUs',
    name: 'لماذا تختار منتجنا',
    description: 'قسم متميز يوضح أسباب تفضيل منتجك وميزاته التنافسية بتصميم فاخر',
    category: 'sections',
    icon: <Award className="h-4 w-4" />,
    color: 'text-purple-700 bg-purple-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'problemSolution',
    name: 'المشكلة والحل',
    description: 'قسم يعرض مشاكل العملاء والحلول التي يقدمها منتجك بتصميم عصري',
    category: 'sections',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-indigo-600 bg-indigo-100',
    isNew: true,
    isFeatured: true
  },
  {
    id: 'testimonials',
    name: 'آراء العملاء',
    description: 'عرض تقييمات وآراء العملاء لزيادة المصداقية وثقة الزوار',
    category: 'sections',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-100',
    isNew: true,
    isFeatured: true
  },
];

const ComponentSelector: React.FC<ComponentSelectorProps> = ({ onAddComponent }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    featured: true, // المميز مفتوح افتراضيًا
    sections: true,
    content: true,
    interaction: true
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // تحديد ارتفاع منطقة التمرير بناءً على ارتفاع الشاشة
  useEffect(() => {
    const updateScrollHeight = () => {
      if (containerRef.current && scrollAreaRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // الحصول على المساحة المتبقية في الشاشة بعد طرح موضع الحاوية
        const availableHeight = window.innerHeight - containerRect.top - 50; // هامش أمان
        // تعيين ارتفاع منطقة التمرير ليكون على الأقل 350px أو الارتفاع المتاح
        scrollAreaRef.current.style.height = `${Math.max(350, availableHeight)}px`;
      }
    };
    
    // تحديث الارتفاع عند التحميل وتغيير الحجم
    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    
    return () => {
      window.removeEventListener('resize', updateScrollHeight);
    };
  }, []);
  
  // تبديل حالة فتح/إغلاق التصنيف
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // فلترة المكونات حسب البحث والفئة
  const filteredComponents = availableComponents.filter(component => {
    // فلترة حسب البحث
    const matchesSearch = searchQuery === '' || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (component.description && component.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t(component.id).toLowerCase().includes(searchQuery.toLowerCase());
    
    // فلترة حسب الفئة
    const matchesCategory = activeCategory === null || component.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // تجميع المكونات حسب الفئة
  const getComponentsByCategory = (category: string) => {
    return filteredComponents.filter(c => c.category === category);
  };
  
  // تجميع المكونات المميزة
  const featuredComponents = filteredComponents.filter(c => c.isFeatured);
  
  // الفئات الفريدة من المكونات
  const categories = Array.from(new Set(availableComponents.map(c => c.category)));
  
  // الحصول على اسم الفئة المناسب
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'sections': return 'أقسام';
      case 'content': return 'محتوى';
      case 'interaction': return 'تفاعل';
      default: return category;
    }
  };

  // الحصول على أيقونة الفئة المناسبة
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'sections': return <Layout className="h-4 w-4" />;
      case 'content': return <Type className="h-4 w-4" />;
      case 'interaction': return <Grid className="h-4 w-4" />;
      default: return <Layout className="h-4 w-4" />;
    }
  };

  // رسوم متحركة للقائمة
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // رسم مكون مفرد
  const renderComponentItem = (component: ComponentItem) => (
    <motion.div key={component.id} variants={itemVariants} className="h-full">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-full py-3 px-3 flex flex-col items-center justify-center gap-2",
                "border border-primary/10 hover:border-primary/25 hover:bg-primary/5 shadow-sm rounded-xl",
                "transition-all duration-200 group relative"
              )}
              onClick={() => onAddComponent(component.id)}
            >
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center mb-1",
                component.color,
                "group-hover:scale-110 transition-transform duration-200"
              )}>
                {component.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {component.name}
              </span>
              <span className="absolute right-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={12} className="text-primary" />
              </span>
              
              {/* شارة المكونات الجديدة */}
              {component.isNew && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 -right-2 text-[10px] h-5 bg-green-600 hover:bg-green-700"
                >
                  جديد
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center",
                  component.color
                )}>
                  {component.icon}
                </div>
                <span className="font-medium">{component.name}</span>
              </div>
              {component.description && (
                <p className="text-xs text-muted-foreground">
                  {component.description}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );

  // عرض مجموعة من المكونات
  const renderComponentsGroup = (components: ComponentItem[], title: string, icon: React.ReactNode, categoryKey: string) => {
    if (components.length === 0) return null;
    
    return (
      <Collapsible 
        open={expandedCategories[categoryKey]} 
        onOpenChange={() => toggleCategory(categoryKey)}
        className="mb-4"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 py-2 px-1 cursor-pointer hover:bg-muted/50 rounded-md transition-colors">
            <ChevronDown 
              size={16} 
              className={cn(
                "text-muted-foreground transition-transform", 
                expandedCategories[categoryKey] ? "transform rotate-0" : "transform rotate(-90deg)"
              )} 
            />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
              <span className="text-sm font-medium">{title}</span>
            </div>
            <Badge variant="outline" className="ml-auto text-xs px-2 bg-primary/5 border-primary/15 text-primary">
              {components.length}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <AnimatePresence>
            {expandedCategories[categoryKey] && (
              <motion.div 
                className="grid grid-cols-2 gap-3 pl-7"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {components.map(component => renderComponentItem(component))}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* حقل البحث - تصميم محسن */}
      <div className="relative mb-4 flex-shrink-0">
        <div className="absolute left-3 top-2.5 text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
        <Input
          placeholder={t('البحث عن مكون...')}
          className="h-10 pl-9 bg-muted/50 border-primary/10 focus-visible:ring-primary/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* فلترة حسب الفئة - تصميم محسن */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap flex-shrink-0">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 text-xs font-medium px-3 rounded-full",
            activeCategory === null ? "bg-primary/15 text-primary hover:bg-primary/20 border-transparent" : "border-primary/15"
          )}
          onClick={() => setActiveCategory(null)}
        >
          الكل
        </Button>
        
        {categories.map(category => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs font-medium px-3 rounded-full",
              activeCategory === category 
                ? "bg-primary/15 text-primary hover:bg-primary/20 border-transparent" 
                : "border-primary/15 hover:border-primary/30"
            )}
            onClick={() => setActiveCategory(category === activeCategory ? null : category)}
          >
            <span className="mr-1.5">{getCategoryIcon(category)}</span>
            {getCategoryName(category)}
          </Button>
        ))}
      </div>
      
      {/* عرض المكونات - تصميم محسن */}
      <ScrollArea 
        ref={scrollAreaRef} 
        className="flex-grow pr-2 -mr-2 overflow-auto" 
        style={{ minHeight: '350px' }}
      >
        {filteredComponents.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground h-full flex flex-col items-center justify-center">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد نتائج مطابقة</p>
            <p className="text-xs mt-1 opacity-70">جرب استخدام كلمات بحث أخرى</p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {/* مكونات مميزة */}
            {featuredComponents.length > 0 && searchQuery === '' && (
              renderComponentsGroup(
                featuredComponents, 
                'مكونات مميزة', 
                <Sparkles className="h-3 w-3" />,
                'featured'
              )
            )}
            
            {/* مجموعات المكونات حسب الفئة */}
            {categories.map(category => (
              renderComponentsGroup(
                getComponentsByCategory(category),
                getCategoryName(category),
                getCategoryIcon(category),
                category
              )
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ComponentSelector;
