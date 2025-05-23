import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Layout, Layers, ShoppingBag, MessageSquare, Info, Image, Grid, Star, Watch, Tag, Clock } from 'lucide-react';
import { ComponentType } from '@/types/store-editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComponentSelectorProps {
  onAddComponent: (type: ComponentType) => void;
}

interface ComponentTypeOption {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'content' | 'commerce' | 'marketing';
  popular?: boolean;
}

// خيارات المكونات مقسمة حسب الفئات
const componentOptions: ComponentTypeOption[] = [
  {
    type: 'hero',
    label: 'قسم الهيرو',
    icon: <Layout className="h-4 w-4" />,
    description: 'صورة مع نص ترويجي وأزرار دعوة للعمل',
    category: 'basic',
    popular: true
  },
  {
    type: 'category_section',
    label: 'فئات المنتجات',
    icon: <Layers className="h-4 w-4" />,
    description: 'عرض فئات المنتجات للتصفح',
    category: 'commerce'
  },
  {
    type: 'featured_products',
    label: 'المنتجات المميزة',
    icon: <ShoppingBag className="h-4 w-4" />,
    description: 'عرض المنتجات المميزة أو الأكثر مبيعاً',
    category: 'commerce',
    popular: true
  },
  {
    type: 'countdownoffers',
    label: 'عروض محدودة بوقت',
    icon: <Clock className="h-4 w-4" />,
    description: 'عرض المنتجات بأسعار تخفيضية لفترة محدودة مع عداد تنازلي',
    category: 'commerce',
    popular: true
  },
  {
    type: 'testimonials',
    label: 'آراء العملاء',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'عرض تقييمات وآراء العملاء',
    category: 'marketing'
  },
  {
    type: 'about',
    label: 'عن المتجر',
    icon: <Info className="h-4 w-4" />,
    description: 'معلومات عن المتجر وميزاته',
    category: 'content'
  },
  {
    type: 'services',
    label: 'الخدمات',
    icon: <Star className="h-4 w-4" />,
    description: 'عرض الخدمات التي يقدمها المتجر',
    category: 'content'
  },
  {
    type: 'contact',
    label: 'اتصل بنا',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'نموذج اتصال ومعلومات التواصل',
    category: 'basic'
  },
  {
    type: 'product_categories',
    label: 'تصنيفات المنتجات',
    icon: <Layers className="h-4 w-4" />,
    description: 'عرض تصنيفات المنتجات بطريقة مختلفة',
    category: 'commerce'
  }
];

// تصنيف المكونات
const categories = {
  basic: {
    label: 'أساسي',
    icon: <Layout className="h-4 w-4" />,
    color: 'bg-blue-50 text-blue-600'
  },
  content: {
    label: 'محتوى',
    icon: <Image className="h-4 w-4" />,
    color: 'bg-purple-50 text-purple-600'
  },
  commerce: {
    label: 'منتجات',
    icon: <Tag className="h-4 w-4" />,
    color: 'bg-emerald-50 text-emerald-600'
  },
  marketing: {
    label: 'تسويق',
    icon: <Star className="h-4 w-4" />,
    color: 'bg-amber-50 text-amber-600'
  }
};

const ComponentSelector: React.FC<ComponentSelectorProps> = ({ onAddComponent }) => {
  const [isOpen, setIsOpen] = useState(false);

  // تجميع المكونات حسب الفئة
  const getComponentsByCategory = (category: string) => {
    return componentOptions.filter(comp => comp.category === category);
  };

  // الحصول على المكونات الشائعة
  const getPopularComponents = () => {
    return componentOptions.filter(comp => comp.popular);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start border-dashed border-2 hover:border-primary/40 hover:bg-muted/50 group"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:text-primary" />
                <span>إضافة مكون جديد</span>
                <ChevronDown className="h-4 w-4 mr-auto opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">استعرض وأضف مكونات جديدة لواجهة متجرك</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel className="font-bold text-base flex items-center gap-2 py-3">
          <Grid className="h-4 w-4" />
          <span>إضافة مكون جديد</span>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* المكونات الشائعة */}
        <DropdownMenuGroup className="px-1 py-2">
          <p className="px-2 text-xs font-medium text-muted-foreground mb-2">الأكثر استخداماً</p>
          <div className="grid grid-cols-2 gap-1">
            {getPopularComponents().map((option) => (
              <DropdownMenuItem
                key={option.type}
                className="cursor-pointer p-2 hover:bg-muted rounded-md h-auto flex flex-col items-start gap-1"
                onClick={() => {
                  onAddComponent(option.type);
                  setIsOpen(false);
                }}
              >
                <div className={`p-1.5 rounded-md ${categories[option.category].color} mb-1`}>
                  {option.icon}
                </div>
                <div>
                  <p className="font-medium text-xs">{option.label}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* جميع المكونات حسب الفئة */}
        <div className="px-1 py-2">
          <p className="px-2 text-xs font-medium text-muted-foreground mb-2">جميع المكونات</p>
          
          {/* فئة أساسي */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 data-[highlighted]:bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${categories.basic.color}`}>
                    {categories.basic.icon}
                  </div>
                  <span className="text-sm">{categories.basic.label}</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[220px]">
                  {getComponentsByCategory('basic').map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      className="cursor-pointer py-2"
                      onClick={() => {
                        onAddComponent(option.type);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${categories.basic.color}`}>
                          {option.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          
          {/* فئة محتوى */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 data-[highlighted]:bg-muted rounded-md mt-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${categories.content.color}`}>
                    {categories.content.icon}
                  </div>
                  <span className="text-sm">{categories.content.label}</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[220px]">
                  {getComponentsByCategory('content').map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      className="cursor-pointer py-2"
                      onClick={() => {
                        onAddComponent(option.type);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${categories.content.color}`}>
                          {option.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          
          {/* فئة منتجات */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 data-[highlighted]:bg-muted rounded-md mt-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${categories.commerce.color}`}>
                    {categories.commerce.icon}
                  </div>
                  <span className="text-sm">{categories.commerce.label}</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[220px]">
                  {getComponentsByCategory('commerce').map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      className="cursor-pointer py-2"
                      onClick={() => {
                        onAddComponent(option.type);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${categories.commerce.color}`}>
                          {option.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          
          {/* فئة تسويق */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 data-[highlighted]:bg-muted rounded-md mt-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${categories.marketing.color}`}>
                    {categories.marketing.icon}
                  </div>
                  <span className="text-sm">{categories.marketing.label}</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[220px]">
                  {getComponentsByCategory('marketing').map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      className="cursor-pointer py-2"
                      onClick={() => {
                        onAddComponent(option.type);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${categories.marketing.color}`}>
                          {option.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ComponentSelector; 