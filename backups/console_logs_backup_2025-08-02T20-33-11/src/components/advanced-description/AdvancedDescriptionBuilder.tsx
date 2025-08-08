import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  AdvancedDescription, 
  AdvancedDescriptionComponent,
  AdvancedDescriptionComponentType,
  createImageComponent,
  createSlideshowComponent,
  createReviewsComponent,
  createTextComponent,
  createFeaturesComponent,
  createSpecificationsComponent,
  createGifComponent,
  createVideoComponent,
  createBeforeAfterComponent,
  createGalleryComponent,
  createPriceComponent,
  createQuantityComponent,
  createBuyNowComponent
} from '@/types/advanced-description';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ComponentRenderer } from './preview/ComponentRenderer';
import { ImageComponentEditor } from './editors/ImageComponentEditor';
import { SlideshowComponentEditor } from './editors/SlideshowComponentEditor';
import { ReviewsComponentEditor } from './editors/ReviewsComponentEditor';
import { TextComponentEditor } from './editors/TextComponentEditor';
import { FeaturesComponentEditor } from './editors/FeaturesComponentEditor';
import { SpecificationsComponentEditor } from './editors/SpecificationsComponentEditor';
import { GifComponentEditor } from './editors/GifComponentEditor';
import { VideoComponentEditor } from './editors/VideoComponentEditor';
import { BeforeAfterComponentEditor } from './editors/BeforeAfterComponentEditor';
import { GalleryComponentEditor } from './editors/GalleryComponentEditor';
import { PriceComponentEditor } from './editors/PriceComponentEditor';
import { QuantityComponentEditor } from './editors/QuantityComponentEditor';
import { BuyNowComponentEditor } from './editors/BuyNowComponentEditor';
import { 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  ImageIcon, 
  Presentation, 
  MessageSquare, 
  Type, 
  Zap, 
  List, 
  Video, 
  ArrowLeftRight,
  DollarSign,
  Hash,
  ShoppingCart,
  Save,
  Eye,
  Smartphone,
  Monitor,
  Palette,
  Edit,
  X
} from 'lucide-react';
import { ImageComponentPreview } from './preview/ImageComponentPreview';

interface AdvancedDescriptionBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDescription?: AdvancedDescription | null;
  onSave: (description: AdvancedDescription) => void;
}

const COMPONENT_TYPES: Array<{
  type: AdvancedDescriptionComponentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    type: 'image',
    label: 'صورة',
    icon: ImageIcon,
    description: 'إضافة صورة واحدة مع إعدادات متقدمة'
  },
  {
    type: 'slideshow',
    label: 'سلايد شو',
    icon: Presentation,
    description: 'عرض مجموعة من الصور بشكل تفاعلي'
  },
  {
    type: 'gif',
    label: 'GIF',
    icon: ImageIcon,
    description: 'إضافة صورة متحركة'
  },
  {
    type: 'video',
    label: 'فيديو',
    icon: Video,
    description: 'إضافة مقطع فيديو'
  },
  {
    type: 'reviews',
    label: 'آراء العملاء',
    icon: MessageSquare,
    description: 'عرض تقييمات وآراء العملاء'
  },
  {
    type: 'text',
    label: 'نص منسق',
    icon: Type,
    description: 'إضافة نص مع تنسيق متقدم'
  },
  {
    type: 'features',
    label: 'المميزات',
    icon: Zap,
    description: 'عرض مميزات المنتج بشكل منظم'
  },
  {
    type: 'specifications',
    label: 'المواصفات',
    icon: List,
    description: 'جدول المواصفات التقنية'
  },
  {
    type: 'before-after',
    label: 'قبل وبعد',
    icon: ArrowLeftRight,
    description: 'مقارنة بين صورتين'
  },
  {
    type: 'gallery',
    label: 'معرض الصور',
    icon: ImageIcon,
    description: 'عرض صور المنتج (الرئيسية والإضافية)'
  },
  {
    type: 'price',
    label: 'سعر المنتج',
    icon: DollarSign,
    description: 'عرض سعر المنتج الحالي'
  },
  {
    type: 'quantity',
    label: 'محدد الكمية',
    icon: Hash,
    description: 'إضافة محدد كمية المنتج بشكل تلقائي بدون إعدادات'
  },
  {
    type: 'buy-now',
    label: 'أطلب الآن',
    icon: ShoppingCart,
    description: 'زر طلب قابل للتخصيص مع إعدادات متقدمة'
  },
];

export const AdvancedDescriptionBuilder: React.FC<AdvancedDescriptionBuilderProps> = ({
  open,
  onOpenChange,
  initialDescription,
  onSave
}) => {
  // Initialize description state
  const [description, setDescription] = useState<AdvancedDescription>(() => {
    if (initialDescription) {
      return initialDescription;
    }
    
    return {
      version: '1.0',
      components: [],
      settings: {
        padding: 20,
        maxWidth: 800,
        centerContent: true,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };
  });

  const [editingComponent, setEditingComponent] = useState<AdvancedDescriptionComponent | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Update description when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      setDescription(initialDescription);
    }
  }, [initialDescription]);

  // Sort components by order
  const sortedComponents = useMemo(() => {
    return [...description.components].sort((a, b) => a.order - b.order);
  }, [description.components]);

  // Add new component
  const addComponent = useCallback((type: AdvancedDescriptionComponentType) => {
    const order = description.components.length;
    let newComponent: AdvancedDescriptionComponent;

    switch (type) {
      case 'image':
        newComponent = createImageComponent(order);
        break;
      case 'slideshow':
        newComponent = createSlideshowComponent(order);
        break;
      case 'reviews':
        newComponent = createReviewsComponent(order);
        break;
      case 'text':
        newComponent = createTextComponent(order);
        break;
      case 'features':
        newComponent = createFeaturesComponent(order);
        break;
      case 'specifications':
        newComponent = createSpecificationsComponent(order);
        break;
      case 'gif':
        newComponent = createGifComponent(order);
        break;
      case 'video':
        newComponent = createVideoComponent(order);
        break;
      case 'before-after':
        newComponent = createBeforeAfterComponent(order);
        break;
      case 'gallery':
        newComponent = createGalleryComponent(order);
        break;
      case 'price':
        newComponent = createPriceComponent(order);
        break;
              case 'quantity':
          newComponent = createQuantityComponent(order);
          break;
        case 'buy-now':
          newComponent = createBuyNowComponent(order);
          break;
        default:
          return;
    }

    setDescription(prev => ({
      ...prev,
      components: [...prev.components, newComponent],
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));

    // Auto-open editor for new component
    setEditingComponent(newComponent);
  }, [description.components.length]);

  // Delete component
  const deleteComponent = useCallback((componentId: string) => {
    setDescription(prev => {
      const filteredComponents = prev.components.filter(c => c.id !== componentId);
      // Reorder components
      const reorderedComponents = filteredComponents.map((c, index) => ({
        ...c,
        order: index
      }));

      return {
        ...prev,
        components: reorderedComponents,
        metadata: {
          ...prev.metadata,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }, []);

  // Edit component
  const editComponent = useCallback((component: AdvancedDescriptionComponent) => {
    setEditingComponent(component);
  }, []);

  // Update component
  const updateComponent = useCallback((updatedComponent: AdvancedDescriptionComponent) => {
    setDescription(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === updatedComponent.id ? updatedComponent : c
      ),
      metadata: {
        ...prev.metadata,
        updatedAt: new Date().toISOString()
      }
    }));
  }, []);

  // Move component up or down
  const moveComponent = useCallback((componentId: string, direction: 'up' | 'down') => {
    setDescription(prev => {
      const components = [...prev.components];
      const currentIndex = components.findIndex(c => c.id === componentId);
      
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex < 0 || newIndex >= components.length) return prev;
      
      // Swap components
      [components[currentIndex], components[newIndex]] = [components[newIndex], components[currentIndex]];
      
      // Update order property
      const reorderedComponents = components.map((component, index) => ({
        ...component,
        order: index
      }));

      return {
        ...prev,
        components: reorderedComponents,
        metadata: {
          ...prev.metadata,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }, []);

  // Save description
  const handleSave = useCallback(() => {
    onSave(description);
    onOpenChange(false);
  }, [description, onSave, onOpenChange]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingComponent(null);
  }, []);

  // Save component edit
  const handleSaveComponentEdit = useCallback(() => {
    if (editingComponent) {
      updateComponent(editingComponent);
      setEditingComponent(null);
    }
  }, [editingComponent, updateComponent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-semibold truncate">
                منشئ الوصف المتقدم
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                قم بإنشاء وصف احترافي ومتفاعل لمنتجك
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {/* Preview mode toggle */}
              <div className="hidden sm:flex gap-1 bg-muted p-1 rounded-lg">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="h-8 px-2"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="h-8 px-2"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Mobile preview toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
                className="sm:hidden h-8 px-2"
              >
                {previewMode === 'desktop' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar - Responsive */}
          <div className={cn(
            "bg-muted/30 flex flex-col border-b lg:border-b-0 lg:border-r transition-all duration-300",
            "w-full lg:w-80 h-40 lg:h-auto",
            editingComponent && "hidden lg:flex"
          )}>
            {/* Component Library */}
            <div className="p-3 sm:p-4 border-b lg:border-b lg:flex-shrink-0">
              <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة مكونات</span>
                <span className="sm:hidden">المكونات</span>
                <Badge variant="secondary" className="text-xs lg:hidden">
                  {sortedComponents.length}
                </Badge>
              </h3>
              
              {/* Horizontal scroll on mobile, grid on desktop */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-2 flex lg:flex-none gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {COMPONENT_TYPES.map((componentType) => {
                  const Icon = componentType.icon;
                  return (
                    <Button
                      key={componentType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addComponent(componentType.type)}
                      className={cn(
                        "flex-shrink-0 lg:flex-shrink lg:h-auto lg:p-3 lg:flex-col",
                        "h-12 px-3 flex-row gap-2 lg:gap-1 hover:bg-primary/5 transition-all",
                        "min-w-[120px] lg:min-w-0"
                      )}
                    >
                      <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="text-xs whitespace-nowrap lg:whitespace-normal">
                        {componentType.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Components List - Desktop only */}
            <ScrollArea className="flex-1 hidden lg:block">
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <List className="w-4 h-4" />
                  المكونات ({sortedComponents.length})
                </h3>
                
                {sortedComponents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Palette className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">لا توجد مكونات</p>
                    <p className="text-xs opacity-75">ابدأ بإضافة مكونات</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedComponents.map((component, index) => (
                      <div
                        key={component.id}
                        className={cn(
                          "bg-background border rounded-lg p-2 transition-all hover:shadow-sm",
                          editingComponent?.id === component.id && "ring-2 ring-primary/50 border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveComponent(component.id, 'up')}
                              disabled={index === 0}
                              className="h-4 w-4 p-0 hover:bg-primary/10"
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveComponent(component.id, 'down')}
                              disabled={index === sortedComponents.length - 1}
                              className="h-4 w-4 p-0 hover:bg-primary/10"
                            >
                              <ChevronDown className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                          
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => editComponent(component)}>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={editingComponent?.id === component.id ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {COMPONENT_TYPES.find(t => t.type === component.type)?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                #{component.order + 1}
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editComponent(component)}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteComponent(component.id)}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Mobile Components List - Horizontal */}
            <div className="lg:hidden flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {sortedComponents.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-xs">لا توجد مكونات</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sortedComponents.map((component, index) => (
                        <div
                          key={component.id}
                          className={cn(
                            "flex-shrink-0 bg-background border rounded-lg p-2 min-w-[120px] cursor-pointer transition-all",
                            editingComponent?.id === component.id && "ring-2 ring-primary/50 border-primary/50"
                          )}
                          onClick={() => editComponent(component)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge 
                              variant={editingComponent?.id === component.id ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              #{component.order + 1}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteComponent(component.id);
                              }}
                              className="h-4 w-4 p-0 text-destructive/70 hover:text-destructive"
                            >
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                          <p className="text-xs font-medium truncate">
                            {COMPONENT_TYPES.find(t => t.type === component.type)?.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Content - Responsive */}
          <div className="flex-1 flex flex-col min-w-0">
            {editingComponent ? (
              /* Component Editor */
              <div className="flex-1 overflow-auto">
                {/* Mobile Editor Header */}
                <div className="lg:hidden sticky top-0 bg-background border-b px-4 py-3 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <h3 className="font-semibold text-sm">
                        تحرير {COMPONENT_TYPES.find(t => t.type === editingComponent.type)?.label}
                      </h3>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveComponentEdit}
                      className="h-8 px-3"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      حفظ
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {editingComponent.type === 'image' && (
                    <>
                      <ImageComponentEditor
                        component={editingComponent as any}
                        onChange={(updated) => setEditingComponent(updated)}
                        onCancel={handleCancelEdit}
                        onSave={handleSaveComponentEdit}
                      />
                      <div className="mt-6">
                        <h4 className="mb-2 text-sm font-bold">معاينة مباشرة</h4>
                        <ImageComponentPreview
                          component={editingComponent as any}
                          onEdit={() => {}}
                          onDelete={() => {}}
                        />
                      </div>
                    </>
                  )}
                  {editingComponent.type === 'slideshow' && (
                    <SlideshowComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'reviews' && (
                    <ReviewsComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'text' && (
                    <TextComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'features' && (
                    <FeaturesComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'specifications' && (
                    <SpecificationsComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'gif' && (
                    <GifComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'video' && (
                    <VideoComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'before-after' && (
                    <BeforeAfterComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'gallery' && (
                    <GalleryComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                  {editingComponent.type === 'price' && (
                    <PriceComponentEditor
                      component={editingComponent as any}
                      onChange={(updated) => setEditingComponent(updated)}
                      onCancel={handleCancelEdit}
                      onSave={handleSaveComponentEdit}
                    />
                  )}
                                      {editingComponent.type === 'quantity' && (
                      <QuantityComponentEditor
                        component={editingComponent as any}
                        onSave={handleSaveComponentEdit}
                        onCancel={handleCancelEdit}
                      />
                    )}
                    {editingComponent.type === 'buy-now' && (
                      <BuyNowComponentEditor
                        component={editingComponent as any}
                        onSave={handleSaveComponentEdit}
                        onCancel={handleCancelEdit}
                      />
                    )}
                </div>
              </div>
            ) : (
              /* Preview Area - Responsive */
              <div className="flex-1 overflow-auto bg-gradient-to-br from-muted/10 to-muted/30">
                <div className="p-3 sm:p-4 lg:p-6">
                  {/* Preview Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                      <h3 className="text-base lg:text-lg font-semibold">معاينة الوصف</h3>
                      <Badge variant="outline" className="text-xs lg:text-sm">
                        {previewMode === 'desktop' ? 'كبيرة' : 'محمول'}
                      </Badge>
                    </div>

                    {/* Quick Actions - Desktop only */}
                    <div className="hidden lg:flex items-center gap-2">
                      {sortedComponents.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDescription(prev => ({ 
                            ...prev, 
                            components: [],
                            metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
                          }))}
                          className="text-xs"
                        >
                          مسح الكل
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div 
                    className={cn(
                      "mx-auto bg-background border rounded-xl shadow-sm transition-all duration-300 overflow-hidden",
                      previewMode === 'desktop' ? "max-w-4xl" : "max-w-sm",
                      "min-h-[300px] lg:min-h-[400px]"
                    )}
                    style={{ 
                      maxWidth: previewMode === 'desktop' ? `${description.settings.maxWidth}px` : '380px',
                    }}
                  >
                    <div style={{ padding: `${description.settings.padding}px` }}>
                      {sortedComponents.length === 0 ? (
                        <div className="text-center py-12 lg:py-16">
                          <Palette className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-base lg:text-lg font-semibold mb-2">وصف فارغ</h3>
                          <p className="text-sm lg:text-base text-muted-foreground mb-4 px-4">
                            ابدأ بإضافة مكونات لإنشاء وصف احترافي لمنتجك
                          </p>
                          
                          {/* Quick Add Buttons */}
                          <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 justify-center max-w-md mx-auto">
                            {COMPONENT_TYPES.slice(0, 6).map((type) => {
                              const Icon = type.icon;
                              return (
                                <Button
                                  key={type.type}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addComponent(type.type)}
                                  className="gap-2 text-xs lg:text-sm"
                                >
                                  <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                                  <span className="hidden lg:inline">{type.label}</span>
                                  <span className="lg:hidden">{type.label.split(' ')[0]}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 lg:space-y-6">
                          {sortedComponents.map((component) => (
                            <ComponentRenderer
                              key={component.id}
                              component={component}
                              onEdit={() => editComponent(component)}
                              onDelete={() => deleteComponent(component.id)}
                              className={cn(
                                "transition-all duration-200",
                                previewMode === 'mobile' && "text-sm scale-95"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Floating Action */}
                  {sortedComponents.length > 0 && (
                    <div className="lg:hidden fixed bottom-4 right-4 z-20">
                      <Button
                        onClick={() => setDescription(prev => ({ 
                          ...prev, 
                          components: [],
                          metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
                        }))}
                        variant="outline"
                        size="sm"
                        className="shadow-lg bg-background/95 backdrop-blur-sm"
                      >
                        مسح الكل
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/20">
          <div className="flex items-center justify-between w-full">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <List className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {sortedComponents.length} {sortedComponents.length === 1 ? 'مكون' : 'مكونات'}
                </span>
                <span className="sm:hidden">{sortedComponents.length}</span>
              </div>
              
              {editingComponent && (
                <Badge variant="outline" className="text-xs">
                  تحرير: {COMPONENT_TYPES.find(t => t.type === editingComponent.type)?.label}
                </Badge>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {editingComponent ? (
                /* Editing Mode */
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEdit}
                    className="hidden lg:flex"
                  >
                    إلغاء التحرير
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveComponentEdit}
                    className="gap-2"
                  >
                    <Save className="w-3 h-3" />
                    <span className="hidden sm:inline">حفظ المكون</span>
                    <span className="sm:hidden">حفظ</span>
                  </Button>
                </>
              ) : (
                /* Preview Mode */
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="hidden sm:inline">إلغاء</span>
                    <span className="sm:hidden">إغلاق</span>
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                    disabled={sortedComponents.length === 0}
                  >
                    <Save className="w-3 h-3" />
                    <span className="hidden sm:inline">حفظ الوصف</span>
                    <span className="sm:hidden">حفظ</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};