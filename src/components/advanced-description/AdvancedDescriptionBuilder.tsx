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
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [dragOverComponent, setDragOverComponent] = useState<string | null>(null);
  // Broadcast open state to hide global floating actions on mobile
  useEffect(() => {
    try {
      const detail = { open } as any;
      window.dispatchEvent(new CustomEvent('app:dialog-open', { detail }));
      const root = document.documentElement;
      if (open) {
        root.classList.add('app-dialog-open');
      } else {
        root.classList.remove('app-dialog-open');
      }
    } catch (e) {
      // no-op in SSR
    }
    return () => {
      try {
        window.dispatchEvent(new CustomEvent('app:dialog-open', { detail: { open: false } as any }));
        document.documentElement.classList.remove('app-dialog-open');
      } catch {}
    };
  }, [open]);

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

  // Drag & Drop handlers
  const handleDragStart = useCallback((componentId: string) => {
    setDraggedComponent(componentId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, componentId: string) => {
    e.preventDefault();
    setDragOverComponent(componentId);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedComponent && dragOverComponent && draggedComponent !== dragOverComponent) {
      setDescription(prev => {
        const components = [...prev.components];
        const draggedIndex = components.findIndex(c => c.id === draggedComponent);
        const targetIndex = components.findIndex(c => c.id === dragOverComponent);
        
        if (draggedIndex === -1 || targetIndex === -1) return prev;
        
        // Swap components
        const [removed] = components.splice(draggedIndex, 1);
        components.splice(targetIndex, 0, removed);
        
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
    }
    
    setDraggedComponent(null);
    setDragOverComponent(null);
  }, [draggedComponent, dragOverComponent]);

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

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editingComponent) {
          handleSaveComponentEdit();
        } else {
          handleSave();
        }
      }
      
      // Escape to cancel/close
      if (e.key === 'Escape') {
        if (editingComponent) {
          handleCancelEdit();
        } else {
          onOpenChange(false);
        }
      }
      
      // Ctrl/Cmd + Z for undo (future feature)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // TODO: Implement undo functionality
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, editingComponent, handleSave, handleSaveComponentEdit, handleCancelEdit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] sm:max-w-7xl h-[98vh] sm:h-[92vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden z-[10050] border-2 shadow-2xl">
        <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-2xl font-bold truncate bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                منشئ الوصف المتقدم
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium hidden sm:block">
                قم بإنشاء وصف احترافي ومتفاعل لمنتجك بكل سهولة
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 ml-3 sm:ml-4">
              {/* Preview mode toggle - Desktop */}
              <div className="hidden sm:flex gap-1 bg-muted/50 p-1.5 rounded-xl border shadow-sm">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className={cn(
                    "h-9 px-3 gap-2 transition-all duration-200",
                    previewMode === 'desktop' && "shadow-sm"
                  )}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs font-medium">كبيرة</span>
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className={cn(
                    "h-9 px-3 gap-2 transition-all duration-200",
                    previewMode === 'mobile' && "shadow-sm"
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs font-medium">محمول</span>
                </Button>
              </div>
              
              {/* Mobile preview toggle */}
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
                className="sm:hidden h-9 w-9 p-0 shadow-sm"
              >
                {previewMode === 'desktop' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-muted/5 via-background to-muted/10 min-h-0">
          {/* Sidebar - Responsive */}
          <div className={cn(
            "bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 flex flex-col border-b lg:border-b-0 lg:border-r transition-all duration-300 backdrop-blur-sm",
            "w-full lg:w-80 xl:w-96 h-48 sm:h-52 lg:h-auto",
            editingComponent && "hidden lg:flex"
          )}>
            {/* Component Library */}
            <div className="p-3 sm:p-4 lg:p-5 border-b lg:border-b lg:flex-shrink-0 bg-background/30">
              <h3 className="font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">إضافة مكونات</span>
                <span className="sm:hidden">المكونات</span>
                <Badge variant="secondary" className="text-xs lg:hidden ml-auto shadow-sm">
                  {sortedComponents.length}
                </Badge>
              </h3>
              
              {/* Horizontal scroll on mobile, grid on desktop */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-2.5 xl:gap-3 flex lg:flex-none gap-2.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 snap-x snap-mandatory scrollbar-hide">
                {COMPONENT_TYPES.map((componentType) => {
                  const Icon = componentType.icon;
                  return (
                    <Button
                      key={componentType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addComponent(componentType.type)}
                      className={cn(
                        "flex-shrink-0 lg:flex-shrink lg:h-auto lg:p-3.5 lg:flex-col group relative overflow-hidden",
                        "h-14 px-4 flex-row gap-2.5 lg:gap-1.5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300",
                        "min-w-[140px] lg:min-w-0 snap-start shadow-sm hover:shadow-md",
                        "bg-background/80 backdrop-blur-sm hover:scale-105 active:scale-95"
                      )}
                      title={componentType.description}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 text-primary/80 group-hover:text-primary transition-colors relative z-10" />
                      <span className="text-xs lg:text-[11px] xl:text-xs font-medium whitespace-nowrap lg:whitespace-normal leading-tight relative z-10 group-hover:font-semibold transition-all">
                        {componentType.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Components List - Desktop only */}
            <ScrollArea className="flex-1 hidden lg:block">
              <div className="p-3 sm:p-4 lg:p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <List className="w-4 h-4 text-primary" />
                  </div>
                  <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">المكونات</span>
                  <Badge variant="secondary" className="ml-auto shadow-sm font-semibold">
                    {sortedComponents.length}
                  </Badge>
                </h3>
                {sortedComponents.length > 0 && (
                  <div className="mb-3 p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
                    💡 يمكنك سحب وإفلات المكونات لإعادة ترتيبها
                  </div>
                )}
                
                {sortedComponents.length === 0 ? (
                  <div className="text-center py-8 px-4 text-muted-foreground rounded-xl bg-muted/30 border-2 border-dashed">
                    <Palette className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium mb-1">لا توجد مكونات</p>
                    <p className="text-xs opacity-75">ابدأ بإضافة مكونات من الأعلى</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedComponents.map((component, index) => (
                      <div
                        key={component.id}
                        draggable
                        onDragStart={() => handleDragStart(component.id)}
                        onDragOver={(e) => handleDragOver(e, component.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "bg-background border-2 rounded-xl p-2.5 transition-all duration-200 hover:shadow-md group cursor-move",
                          editingComponent?.id === component.id && "ring-2 ring-primary/50 border-primary/50 shadow-lg bg-primary/5",
                          draggedComponent === component.id && "opacity-50 scale-95",
                          dragOverComponent === component.id && "border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveComponent(component.id, 'up')}
                              disabled={index === 0}
                              className="h-5 w-5 p-0 hover:bg-primary/20 disabled:opacity-30 transition-all"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveComponent(component.id, 'down')}
                              disabled={index === sortedComponents.length - 1}
                              className="h-5 w-5 p-0 hover:bg-primary/20 disabled:opacity-30 transition-all"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => editComponent(component)}>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={editingComponent?.id === component.id ? "default" : "secondary"} 
                                className="text-xs font-medium shadow-sm"
                              >
                                {COMPONENT_TYPES.find(t => t.type === component.type)?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-medium">
                                #{component.order + 1}
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editComponent(component)}
                            className="h-7 w-7 p-0 hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteComponent(component.id)}
                            className="h-7 w-7 p-0 hover:bg-destructive/20 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
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
                <div className="p-2 sm:p-3">
                  {sortedComponents.length === 0 ? (
                    <div className="text-center py-6 px-3 text-muted-foreground rounded-xl bg-muted/30 border border-dashed">
                      <Palette className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">لا توجد مكونات</p>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                      {sortedComponents.map((component, index) => (
                        <div
                          key={component.id}
                          className={cn(
                            "flex-shrink-0 bg-background/90 backdrop-blur-sm border-2 rounded-xl p-3 min-w-[140px] cursor-pointer transition-all duration-200 snap-start shadow-sm hover:shadow-md active:scale-95",
                            editingComponent?.id === component.id && "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
                          )}
                          onClick={() => editComponent(component)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge 
                              variant={editingComponent?.id === component.id ? "default" : "secondary"} 
                              className="text-xs font-semibold shadow-sm"
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
                              className="h-5 w-5 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-md"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs font-bold truncate">
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
          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
            {editingComponent ? (
              /* Component Editor */
              <div className="flex-1 overflow-auto overscroll-y-contain">
                {/* Mobile Editor Header */}
                <div className="lg:hidden sticky top-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-md border-b-2 px-4 py-3.5 z-20 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <div>
                        <h3 className="font-bold text-sm">
                          تحرير {COMPONENT_TYPES.find(t => t.type === editingComponent.type)?.label}
                        </h3>
                        <p className="text-xs text-muted-foreground">قم بتعديل الإعدادات أدناه</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveComponentEdit}
                      className="h-9 px-4 gap-2 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      حفظ
                    </Button>
                  </div>
                </div>

                <div className="p-3 sm:p-6">
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
              <div className="flex-1 overflow-auto overscroll-y-contain bg-gradient-to-br from-muted/5 via-muted/10 to-muted/20 relative">
                <div className="p-3 sm:p-5 lg:p-8">
                  {/* Preview Header */}
                  <div className="mb-5 lg:mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 lg:gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Eye className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base lg:text-xl font-bold">معاينة الوصف</h3>
                        <p className="text-xs text-muted-foreground hidden sm:block">شاهد كيف سيظهر وصفك للعملاء</p>
                      </div>
                      <Badge variant="outline" className="text-xs lg:text-sm font-semibold shadow-sm">
                        {previewMode === 'desktop' ? 'شاشة كبيرة' : 'هاتف محمول'}
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
                          className="text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shadow-sm"
                        >
                          مسح الكل
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div 
                    className={cn(
                      "mx-auto bg-background/95 backdrop-blur-sm border-2 rounded-2xl shadow-xl transition-all duration-500 overflow-hidden",
                      previewMode === 'desktop' ? "max-w-4xl" : "max-w-[390px]",
                      "min-h-[360px] lg:min-h-[480px]",
                      sortedComponents.length > 0 && "hover:shadow-2xl"
                    )}
                    style={{ 
                      maxWidth: previewMode === 'desktop' ? `${description.settings.maxWidth}px` : '390px',
                    }}
                  >
                    <div style={{ padding: `${Math.max(16, Math.min(32, description.settings.padding))}px` }}>
                      {sortedComponents.length === 0 ? (
                        <div className="text-center py-14 lg:py-20 px-4">
                          <div className="mb-6 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-primary/10 rounded-full blur-2xl"></div>
                            </div>
                            <Palette className="w-14 h-14 lg:w-20 lg:h-20 mx-auto text-primary/50 relative" />
                          </div>
                          <h3 className="text-lg lg:text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">وصف فارغ</h3>
                          <p className="text-sm lg:text-base text-muted-foreground mb-6 px-4 max-w-md mx-auto">
                            ابدأ بإضافة مكونات لإنشاء وصف احترافي وجذاب لمنتجك
                          </p>
                          
                          {/* Quick Add Buttons */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2.5 justify-center max-w-xl mx-auto">
                            {COMPONENT_TYPES.slice(0, 6).map((type) => {
                              const Icon = type.icon;
                              return (
                                <Button
                                  key={type.type}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addComponent(type.type)}
                                  className="gap-2 text-xs lg:text-sm font-medium hover:scale-105 active:scale-95 transition-all shadow-sm hover:shadow-md hover:bg-primary/5 hover:border-primary/30"
                                >
                                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary/70" />
                                  <span className="hidden sm:inline">{type.label}</span>
                                  <span className="sm:hidden">{type.label.split(' ')[0]}</span>
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
                    <div className="lg:hidden fixed bottom-5 right-4 z-20">
                      <Button
                        onClick={() => setDescription(prev => ({ 
                          ...prev, 
                          components: [],
                          metadata: { ...prev.metadata, updatedAt: new Date().toISOString() }
                        }))}
                        variant="outline"
                        size="sm"
                        className="shadow-xl bg-background/95 backdrop-blur-md border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        مسح الكل
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3.5 sm:py-4 border-t-2 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm">
          <div className="flex items-center justify-between w-full gap-2">
            {/* Stats */}
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-lg">
                <List className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline font-medium">
                  {sortedComponents.length} {sortedComponents.length === 1 ? 'مكون' : 'مكونات'}
                </span>
                <span className="sm:hidden font-semibold">{sortedComponents.length}</span>
              </div>
              
              {editingComponent && (
                <Badge variant="outline" className="text-xs font-medium shadow-sm">
                  <Edit className="w-3 h-3 mr-1" />
                  {COMPONENT_TYPES.find(t => t.type === editingComponent.type)?.label}
                </Badge>
              )}
              
              {/* Keyboard shortcuts hint - Desktop only */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <kbd className="px-1.5 py-0.5 bg-muted/50 rounded border text-[10px] font-mono">Esc</kbd>
                <span>إلغاء</span>
                <span className="mx-1">•</span>
                <kbd className="px-1.5 py-0.5 bg-muted/50 rounded border text-[10px] font-mono">Ctrl+S</kbd>
                <span>حفظ</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 sm:gap-2.5">
              {editingComponent ? (
                /* Editing Mode */
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEdit}
                    className="hidden lg:flex font-medium hover:bg-muted/50"
                  >
                    إلغاء التحرير
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveComponentEdit}
                    className="gap-2 shadow-md hover:shadow-lg font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
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
                    className="font-medium hover:bg-muted/50"
                  >
                    <X className="w-3.5 h-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">إلغاء</span>
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary/95 hover:to-primary/80 shadow-lg hover:shadow-xl font-semibold transition-all duration-300"
                    disabled={sortedComponents.length === 0}
                  >
                    <Save className="w-3.5 h-3.5" />
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
