import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Monitor, 
  Tablet, 
  Smartphone,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Settings,
  Copy,
  Maximize2,
  Minimize2,
  MoreVertical,
  Save,
  Check,
  X,
  Minus
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
 } from "@/components/ui/dropdown-menu"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { clearStoreCacheByOrganizationId, clearCacheItem } from '@/lib/cache/storeCache'

import { useImprovedStoreEditor } from '../hooks/useImprovedStoreEditor'
import { getCategories } from '@/lib/api/categories'
import { useTenant } from '@/context/TenantContext'
import { StorePageProvider } from '@/context/StorePageContext'

// استيراد مكونات المتجر الفعلية
import PreviewStoreBanner from '@/components/store-preview/PreviewStoreBanner'
import FeaturedProducts from '@/components/store/FeaturedProducts'
import CategorySection from '@/components/store/CategorySection'
import { CustomerTestimonials } from '@/components/store/CustomerTestimonials'
import StoreAbout from '@/components/store/StoreAbout'
import StoreServices from '@/components/store/StoreServices'
import StoreContact from '@/components/store/StoreContact'
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter'
import CountdownOffersSection from '@/components/store/CountdownOffersSection'
import ProductCategories from '@/components/store/ProductCategoriesOptimized'
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface StorePreviewProps {
  organizationId: string
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

// =================================================================
// 🚀 إضافة نظام جلب البيانات للمعاينة
// =================================================================

interface PreviewData {
  categories: any[]
  featuredProducts: any[]
  isLoading: boolean
  error: string | null
}

const useStorePreviewData = (organizationId: string) => {
  const [previewData, setPreviewData] = useState<PreviewData>({
    categories: [],
    featuredProducts: [],
    isLoading: true,
    error: null
  })

  const loadPreviewData = useCallback(async () => {
    if (!organizationId) return

    try {
      setPreviewData(prev => ({ ...prev, isLoading: true, error: null }))

      // جلب الفئات بالتوازي
      const [categoriesResult] = await Promise.all([
        getCategories(organizationId).catch(() => [])
      ])

      setPreviewData({
        categories: categoriesResult || [],
        featuredProducts: [], // يمكن إضافة المنتجات المميزة لاحقاً
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      setPreviewData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'خطأ في تحميل البيانات'
      }))
    }
  }, [organizationId])

  useEffect(() => {
    loadPreviewData()
  }, [loadPreviewData])

  return { ...previewData, refetch: loadPreviewData }
}

// =================================================================
// تعديل واجهة المكون لتشمل البيانات
// =================================================================

// تعريف واجهة للمكون مع إضافة وظائف جديدة
interface ComponentProps {
  component: any;

  isSelected: boolean;
  isHovered: boolean;
  previewMode: boolean;
  selectComponent: (id: string | null) => void;
  hoverComponent: (id: string | null) => void;
  organizationId: string;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  viewport?: ViewportSize;
  previewCategories?: any[];
}

// مكون شريط أدوات المكون
const ComponentToolbar = React.memo(({ 
  component, 
  onDelete, 
  onToggleVisibility, 
  onMoveUp, 
  onMoveDown, 
  onDuplicate,
  canMoveUp,
  canMoveDown,
  isVisible
}: {
  component: any;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isVisible: boolean;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-card/95 dark:bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border dark:border-border p-1">
      <TooltipProvider>
        {/* تحريك للأعلى */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMoveUp(component.id)
              }}
              disabled={!canMoveUp}
              className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>تحريك للأعلى</p>
          </TooltipContent>
        </Tooltip>

        {/* تحريك للأسفل */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMoveDown(component.id)
              }}
              disabled={!canMoveDown}
              className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>تحريك للأسفل</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4" />

        {/* إظهار/إخفاء */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(component.id)
              }}
              className="h-7 w-7 p-0 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            >
              {isVisible ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isVisible ? 'إخفاء المكون' : 'إظهار المكون'}</p>
          </TooltipContent>
        </Tooltip>

        {/* نسخ */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(component.id)
              }}
              className="h-7 w-7 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>نسخ المكون</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4" />

        {/* حذف مباشر */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>حذف المكون</p>
          </TooltipContent>
        </Tooltip>

        {/* خيارات إضافية */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="h-7 w-7 p-0 hover:bg-gray-50 dark:hover:bg-gray-800/20"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>خيارات المكون</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              تعديل الإعدادات
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              حذف المكون
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* حوار تأكيد الحذف */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card dark:bg-card border-border dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-foreground">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground">
              هل أنت متأكد من حذف المكون "{component.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted dark:bg-muted text-foreground dark:text-foreground border-border dark:border-border hover:bg-muted/80 dark:hover:bg-muted/80">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(component.id)
                setShowDeleteDialog(false)
              }}
              className="bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 text-white dark:text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

ComponentToolbar.displayName = 'ComponentToolbar'

// استخدام React.forwardRef مع React.memo لتحسين الأداء ودعم refs
const ComponentWrapper = React.forwardRef<HTMLDivElement, ComponentProps>(({ 
  component, 
  isSelected, 
  isHovered, 
  previewMode, 
  selectComponent, 
  hoverComponent,
  organizationId,
  onDelete,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
  viewport = 'desktop'
}, ref) => {
  const [showToolbar, setShowToolbar] = useState(false)
  // التأكد من حالة الرؤية - افتراضياً مرئي إذا لم تكن محددة
  const isVisible = component.isVisible ?? true

  const wrapperClassName = cn(
    "relative group transition-all duration-300 ease-in-out",
    isSelected && "ring-2 ring-blue-500 ring-offset-2 shadow-lg",
    isHovered && !isSelected && "ring-1 ring-gray-300 ring-offset-1",
    !previewMode && "cursor-pointer hover:ring-1 hover:ring-gray-300",
    !isVisible && "opacity-75 border-2 border-dashed border-orange-300 dark:border-orange-600",
    "hover:shadow-md",
    // إضافة classes للمحاكاة viewport
    viewport === 'mobile' && "viewport-mobile",
    viewport === 'tablet' && "viewport-tablet", 
    viewport === 'desktop' && "viewport-desktop"
  )
  
  const handleClick = useCallback(() => {
    if (!previewMode) {
      selectComponent(component.id)
    }
  }, [previewMode, selectComponent, component.id])
  
  const handleMouseEnter = useCallback(() => {
    if (!previewMode) {
      hoverComponent(component.id)
      setShowToolbar(true)
    }
  }, [previewMode, hoverComponent, component.id])
  
  const handleMouseLeave = useCallback(() => {
    if (!previewMode) {
      hoverComponent(null)
      setShowToolbar(false)
    }
  }, [previewMode, hoverComponent])
  
  // تحويل الإعدادات لتتوافق مع المكونات الموجودة
  const componentProps = useMemo(() => ({
    ...component.settings,
    organizationId,
    storeData: { organization_id: organizationId },
    viewport,
    isMobile: viewport === 'mobile',
    isTablet: viewport === 'tablet',
    isDesktop: viewport === 'desktop'
  }), [component.settings, organizationId, viewport])
  
  // استخدام useMemo لمنع إعادة التصيير غير الضرورية للمكون
  const renderedComponent = useMemo(() => {
    let content = null
    
    switch (component.type) {
      case 'hero':
        content = (
          <PreviewStoreBanner 
            heroData={component.settings}
            key={`hero-${JSON.stringify(component.settings).substring(0, 50)}`}
          />
        )
        break
        
      case 'featured_products':
        const featuredDisplayCount = component.settings.selectionMethod === 'manual' && component.settings.selectedProducts?.length > 0
          ? Math.max(component.settings.selectedProducts.length, component.settings.displayCount || 4)
          : component.settings.displayCount || 4;
        content = (
          <StorePageProvider organizationId={organizationId}>
            <FeaturedProducts 
              title={component.settings.title}
              description={component.settings.description}
              displayCount={featuredDisplayCount}
              selectionMethod={component.settings.selectionMethod}
              selectionCriteria={component.settings.selectionCriteria}
              selectedProducts={component.settings.selectedProducts}
              displayType={component.settings.displayType}
              organizationId={organizationId}
              key={`featured-products-${JSON.stringify(component.settings).substring(0, 50)}`}
            />
          </StorePageProvider>
        )
        break
        
      case 'product_categories':
        // 🚀 تحديث إعدادات المعاينة لتعكس جميع الإعدادات من المحرر
        const categoriesSettings = {
          ...component.settings,
          // إضافة الفئات المحددة للمعاينة إذا كانت متاحة
          _previewCategories: component.settings.selectedCategories || [],
          // التأكد من تمرير جميع إعدادات العرض
          selectionMethod: component.settings.selectionMethod || 'automatic',
          displayCount: component.settings.displayCount || component.settings.maxCategories || 6,
          showDescription: component.settings.showDescription ?? true,
          showProductCount: component.settings.showProductCount ?? true,
          showImages: component.settings.showImages ?? true,
          displayStyle: component.settings.displayStyle || 'cards',
          backgroundStyle: component.settings.backgroundStyle || 'light',
          showViewAllButton: component.settings.showViewAllButton ?? true,
          enableHoverEffects: component.settings.enableHoverEffects ?? true
        }
        
        content = (
          <div className="store-preview-categories">
            <ProductCategories 
              title={component.settings.title}
              description={component.settings.description}
              useRealCategories={component.settings.useRealCategories ?? true}
              selectedCategoryId={component.settings.selectedCategoryId}
              settings={categoriesSettings}
              categories={component.settings._previewCategories || []}
              key={`product-categories-${JSON.stringify(categoriesSettings).substring(0, 50)}`}
            />
          </div>
        )
        break
        
      case 'testimonials':
        content = (
          <CustomerTestimonials 
            title={component.settings.title}
            description={component.settings.description}
            organizationId={organizationId}
            visibleCount={component.settings.visibleCount}
            backgroundColor={component.settings.backgroundColor}
            cardStyle={component.settings.cardStyle}
            testimonials={component.settings.testimonials}
            // ✅ تفعيل جلب البيانات من قاعدة البيانات تلقائياً
            useDbTestimonials={component.settings?.useDbTestimonials !== undefined ? component.settings.useDbTestimonials : !!organizationId}
            key={`testimonials-${JSON.stringify(component.settings).substring(0, 50)}`}
          />
        )
        break
        
      case 'about':
        content = (
          <StoreAbout 
            title={component.settings.title}
            subtitle={component.settings.subtitle}
            description={component.settings.description}
            features={component.settings.features}
            image={component.settings.image}
            storeInfo={component.settings.storeInfo}
            key={`about-${JSON.stringify(component.settings).substring(0, 50)}`}
          />
        )
        break
        
      case 'services':
        content = (
          <div className="p-8 bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🛠️</div>
              <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-foreground">{component.settings.title || 'خدماتنا'}</h3>
              <p className="text-muted-foreground dark:text-muted-foreground text-sm">{component.settings.description || 'الخدمات التي نقدمها'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-muted/50 dark:bg-muted/30 border border-border/50 dark:border-border/30 rounded-lg p-4 text-center hover:bg-muted/70 dark:hover:bg-muted/50 transition-colors">
                  <div className="text-2xl mb-2">🔧</div>
                  <div className="text-sm font-medium text-foreground dark:text-foreground">خدمة {i}</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">وصف الخدمة</div>
                </div>
              ))}
            </div>
          </div>
        )
        break
        
      case 'contact':
        content = (
          <div className="p-8 bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-foreground">{component.settings.title || 'تواصل معنا'}</h3>
              <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-4">{component.settings.description || 'نحن هنا لمساعدتك'}</p>
              <div className="bg-muted/50 dark:bg-muted/30 border border-border/50 dark:border-border/30 rounded-lg p-4 text-xs text-muted-foreground dark:text-muted-foreground hover:bg-muted/70 dark:hover:bg-muted/50 transition-colors">
                نموذج التواصل ومعلومات الاتصال ستظهر هنا
              </div>
            </div>
          </div>
        )
        break
        
      case 'footer':
        content = (
          <CustomizableStoreFooter
            {...component.settings}
          />
        )
        break
        
      case 'countdownoffers':
        content = (
          <div className="p-8 bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-foreground">{component.settings.title || 'عروض محدودة'}</h3>
              <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-4">{component.settings.description || 'لا تفوت هذه الفرصة'}</p>
              <div className="bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-600 dark:to-orange-600 text-white rounded-lg p-4 text-sm shadow-lg">
                عرض خاص ينتهي قريباً! 🔥
              </div>
            </div>
          </div>
        )
        break
        
      default:
        content = (
          <div className="p-8 text-center text-muted-foreground dark:text-muted-foreground bg-muted/30 dark:bg-muted/20 border-2 border-dashed border-border dark:border-border rounded-xl">
            <div className="text-2xl mb-2">📦</div>
            <p className="font-medium">مكون غير مدعوم</p>
            <p className="text-sm">{component.type}</p>
          </div>
        )
    }
    
    return content
  }, [component.type, component.settings, component.id])
  
  return (
    <motion.div
      ref={ref}
      key={component.id}
      layout
      className={wrapperClassName}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isVisible ? 1 : 0.5, 
        y: 0,
        filter: isVisible ? 'none' : 'grayscale(50%)'
      }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2,
        ease: "easeOut"
      }}
    >
      {/* مؤشر المكون المحدد */}
      {isSelected && !previewMode && (
        <motion.div 
          className="absolute -top-8 left-0 z-10"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs shadow-lg">
            {component.name}
          </Badge>
            {!isVisible && (
              <Badge variant="outline" className="text-xs shadow-lg bg-orange-50 dark:bg-orange-900/50 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                مخفي
              </Badge>
            )}
        </div>
        </motion.div>
      )}
      
      {/* شريط أدوات المكون */}
      {!previewMode && (showToolbar || isSelected) && (
        <ComponentToolbar
          component={component}
          onDelete={onDelete}
          onToggleVisibility={onToggleVisibility}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          isVisible={isVisible}
        />
      )}
      
      {/* المكون الفعلي */}
      <div 
        className={cn(
          "transition-all duration-300 preview-container",
          !isVisible && "pointer-events-none",
          // محاكاة viewport للمكونات الداخلية
          "viewport-simulator",
          viewport === 'mobile' && "mobile-viewport",
          viewport === 'tablet' && "tablet-viewport", 
          viewport === 'desktop' && "desktop-viewport"
        )}
        data-viewport={viewport}
        style={{
          // متغيرات CSS للمكونات التي تحتاج viewport info
          ['--viewport-mode' as any]: viewport,
          ['--is-mobile' as any]: viewport === 'mobile' ? '1' : '0',
          ['--is-tablet' as any]: viewport === 'tablet' ? '1' : '0',
          ['--is-desktop' as any]: viewport === 'desktop' ? '1' : '0'
        }}
      >
      {renderedComponent}
      </div>
      
      {/* طبقة التحديد */}
      {!previewMode && (isSelected || isHovered) && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn(
            "absolute inset-0 border-2 transition-all duration-200 rounded-lg",
            isSelected ? "border-blue-500 shadow-lg" : "border-gray-300"
          )} />
          {isSelected && (
            <div className="absolute inset-0 bg-blue-500/5 rounded-lg" />
          )}
        </div>
      )}
      
              {/* مؤشر الإخفاء */}
        {!isVisible && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 dark:bg-gray-100/10 backdrop-blur-[2px] rounded-lg z-10">
            <div className="bg-orange-50/95 dark:bg-orange-900/95 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-xs text-orange-700 dark:text-orange-300 flex items-center gap-2 shadow-lg font-medium">
              <EyeOff className="w-4 h-4" />
              <span>مخفي من المعاينة النهائية</span>
            </div>
        </div>
      )}
    </motion.div>
  )
})

// إضافة displayName وتطبيق React.memo للأداء
ComponentWrapper.displayName = 'ComponentWrapper'
  const MemoizedComponentWrapper = React.memo(ComponentWrapper)

export const StorePreview: React.FC<StorePreviewProps> = React.memo(({ organizationId }) => {
  // 🚀 استخدام نظام البيانات المحسن للمعاينة
  const { categories: previewCategories, isLoading: dataLoading, error: dataError, refetch: refetchData } = useStorePreviewData(organizationId)
  
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // ref لمحاكاة viewport
  const viewportSimulatorRef = React.useRef<HTMLDivElement>(null)
  
  const { toast } = useToast()
  
  const {
    components,
    selectedComponentId,
    hoveredComponentId,
    previewMode,
    selectComponent,
    hoverComponent,
    deleteComponent,
    toggleComponentVisibility,
    reorderComponents,
    duplicateComponent,
    saveToStorage,
    loadFromStorage,
    hasUnsavedChanges,
    isSaving,
    setSaving
  } = useImprovedStoreEditor()
  
  // أحجام المنافذ المحدثة
  const viewportSizes = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' }
  }
  
  // وظائف الزوم المطورة
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 10, 200)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 10, 50)), [])
  const handleResetZoom = useCallback(() => setZoom(100), [])
  
  // تحديث المعاينة
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // محاكاة تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsRefreshing(false)
  }, [])
  
  // المكونات النشطة مرتبة مع memoization (مخفية ومرئية)
  const activeComponents = useMemo(() => 
    components
      .filter(component => component.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    [components]
  )

  // Hook لتطبيق محاكاة الشاشة عند تغيير الviewport - نسخة محسنة
  useEffect(() => {
    const applyViewportSimulationEffect = () => {
      if (!viewportSimulatorRef.current) return
      
      const allElements = viewportSimulatorRef.current.querySelectorAll('*')
      
      allElements.forEach((element) => {
        const classes = Array.from(element.classList)
        const htmlElement = element as HTMLElement
        
        // إعادة ضبط جميع التخصيصات
        htmlElement.style.display = ''
        htmlElement.style.fontSize = ''
        htmlElement.style.padding = ''
        htmlElement.style.margin = ''
        htmlElement.style.width = ''
        htmlElement.style.height = ''
        htmlElement.style.gridTemplateColumns = ''
        htmlElement.style.flexDirection = ''
        
        if (viewport === 'mobile') {
          // التحقق من العناصر المخفية صراحة في الموبايل
          if (classes.includes('sm:hidden')) {
            htmlElement.style.display = 'none'
            return
          }
          
          // إجبار إظهار sm classes أولاً
          const hasSmDisplay = classes.find((cls: string) => 
            cls.match(/^sm:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          
          if (hasSmDisplay) {
            const displayType = hasSmDisplay.split(':')[1]
            htmlElement.style.display = displayType === 'inline-block' ? 'inline-block' : 
                                      displayType === 'inline-flex' ? 'inline-flex' :
                                      displayType
            return
          }
          
          // التحقق من وجود classes أساسية للعرض
          const hasBasicDisplayClass = classes.some((cls: string) => 
            ['block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex'].includes(cls)
          )
          
          // إذا كان للعنصر basic display class، اتركه كما هو
          if (hasBasicDisplayClass) {
            return
          }
          
          // فقط إخفاء العناصر التي تعتمد حصرياً على lg: أو md: للعرض
          const hasDisplayLgClass = classes.some((cls: string) => 
            cls.match(/^lg:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          const hasDisplayMdClass = classes.some((cls: string) => 
            cls.match(/^md:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          
          // إخفاء فقط إذا كان العنصر يعتمد على lg/md classes وليس له basic display class
          if (hasDisplayLgClass || hasDisplayMdClass) {
            htmlElement.style.display = 'none'
          }
          
          // محاكاة أحجام النصوص للموبايل
          classes.forEach((cls: string) => {
            if (cls === 'text-6xl') htmlElement.style.fontSize = '2.25rem'
            if (cls === 'text-5xl') htmlElement.style.fontSize = '1.875rem'
            if (cls === 'text-4xl') htmlElement.style.fontSize = '1.5rem'
            if (cls === 'text-3xl') htmlElement.style.fontSize = '1.25rem'
            if (cls === 'text-2xl') htmlElement.style.fontSize = '1.125rem'
            if (cls === 'text-xl') htmlElement.style.fontSize = '1rem'
          })
          
          // محاكاة المسافات للموبايل
          classes.forEach((cls: string) => {
            if (cls === 'p-8') htmlElement.style.padding = '1rem'
            if (cls === 'p-6') htmlElement.style.padding = '0.75rem'
            if (cls === 'p-4') htmlElement.style.padding = '0.5rem'
            if (cls === 'px-8') htmlElement.style.paddingLeft = htmlElement.style.paddingRight = '1rem'
            if (cls === 'px-6') htmlElement.style.paddingLeft = htmlElement.style.paddingRight = '0.75rem'
            if (cls === 'py-8') htmlElement.style.paddingTop = htmlElement.style.paddingBottom = '1rem'
            if (cls === 'py-6') htmlElement.style.paddingTop = htmlElement.style.paddingBottom = '0.75rem'
            
            if (cls === 'm-8') htmlElement.style.margin = '1rem'
            if (cls === 'm-6') htmlElement.style.margin = '0.75rem'
            if (cls === 'mx-8') htmlElement.style.marginLeft = htmlElement.style.marginRight = '1rem'
            if (cls === 'mx-6') htmlElement.style.marginLeft = htmlElement.style.marginRight = '0.75rem'
            if (cls === 'my-8') htmlElement.style.marginTop = htmlElement.style.marginBottom = '1rem'
            if (cls === 'my-6') htmlElement.style.marginTop = htmlElement.style.marginBottom = '0.75rem'
          })
          
          // محاكاة الشبكات للموبايل
          classes.forEach((cls: string) => {
            if (cls === 'grid-cols-2') htmlElement.style.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))'
            if (cls === 'grid-cols-3') htmlElement.style.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))'
            if (cls === 'grid-cols-4') htmlElement.style.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))'
            if (cls === 'grid-cols-5') htmlElement.style.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))'
            if (cls === 'grid-cols-6') htmlElement.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))'
            
            // محاكاة Gap
            if (cls === 'gap-1') htmlElement.style.gap = '0.25rem'
            if (cls === 'gap-2') htmlElement.style.gap = '0.5rem'
            if (cls === 'gap-3') htmlElement.style.gap = '0.75rem'
            if (cls === 'gap-4') htmlElement.style.gap = '0.5rem' // تقليل للموبايل
            if (cls === 'gap-6') htmlElement.style.gap = '0.75rem' // تقليل للموبايل
            if (cls === 'gap-8') htmlElement.style.gap = '1rem' // تقليل للموبايل
          })
          
          // محاكاة flexbox للموبايل
          classes.forEach((cls: string) => {
            if (cls === 'flex-row') htmlElement.style.flexDirection = 'column'
            if (cls === 'justify-between') htmlElement.style.justifyContent = 'center'
            if (cls === 'justify-around') htmlElement.style.justifyContent = 'center'
            if (cls === 'justify-evenly') htmlElement.style.justifyContent = 'center'
            if (cls === 'items-start') htmlElement.style.alignItems = 'center'
            if (cls === 'items-end') htmlElement.style.alignItems = 'center'
          })
          
          // محاكاة العرض للموبايل
          classes.forEach((cls: string) => {
            if (cls === 'w-1/2') htmlElement.style.width = '100%'
            if (cls === 'w-1/3') htmlElement.style.width = '100%'
            if (cls === 'w-1/4') htmlElement.style.width = '50%'
            if (cls === 'w-2/3') htmlElement.style.width = '100%'
            if (cls === 'w-3/4') htmlElement.style.width = '100%'
            
            // الحد الأقصى للعرض
            if (cls === 'max-w-7xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-6xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-5xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-4xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-3xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-2xl') htmlElement.style.maxWidth = '100%'
            if (cls === 'max-w-xl') htmlElement.style.maxWidth = '100%'
            
            // الحاويات
            if (cls === 'container') {
              htmlElement.style.maxWidth = '100%'
              htmlElement.style.paddingLeft = '1rem'
              htmlElement.style.paddingRight = '1rem'
            }
          })
        }
        
        if (viewport === 'tablet') {
          // التحقق من العناصر المخفية صراحة في التابلت
          if (classes.includes('md:hidden')) {
            htmlElement.style.display = 'none'
            return
          }
          
          // إظهار md classes أولاً
          const hasMdDisplay = classes.find((cls: string) => 
            cls.match(/^md:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          
          if (hasMdDisplay) {
            const displayType = hasMdDisplay.split(':')[1]
            htmlElement.style.display = displayType === 'inline-block' ? 'inline-block' : 
                                      displayType === 'inline-flex' ? 'inline-flex' :
                                      displayType
            return
          }
          
          // التحقق من وجود classes أساسية للعرض
          const hasBasicDisplayClass = classes.some((cls: string) => 
            ['block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex'].includes(cls)
          )
          
          // إذا كان للعنصر basic display class، اتركه كما هو
          if (hasBasicDisplayClass) {
            return
          }
          
          // إخفاء lg classes فقط إذا لم يكن هناك basic display class
          const hasDisplayLgClass = classes.some((cls: string) => 
            cls.match(/^lg:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          
          if (hasDisplayLgClass) {
            htmlElement.style.display = 'none'
          }
          
          // محاكاة أحجام النصوص للتابلت
          classes.forEach((cls: string) => {
            if (cls === 'text-6xl') htmlElement.style.fontSize = '3rem'
            if (cls === 'text-5xl') htmlElement.style.fontSize = '2.25rem'
            if (cls === 'text-4xl') htmlElement.style.fontSize = '1.875rem'
            if (cls === 'text-3xl') htmlElement.style.fontSize = '1.5rem'
          })
          
          // محاكاة الشبكات للتابلت
          classes.forEach((cls: string) => {
            if (cls === 'grid-cols-4') htmlElement.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))'
            if (cls === 'grid-cols-5') htmlElement.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
            if (cls === 'grid-cols-6') htmlElement.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
          })
          
          // محاكاة العرض للتابلت
          classes.forEach((cls: string) => {
            if (cls === 'w-1/4') htmlElement.style.width = '50%'
            if (cls === 'w-1/3') htmlElement.style.width = '50%'
          })
        }
        
        if (viewport === 'desktop') {
          // التحقق من العناصر المخفية صراحة في الدسكتوب
          if (classes.includes('lg:hidden')) {
            htmlElement.style.display = 'none'
            return
          }
          
          // في الدسكتوب، إظهار lg classes
          const hasLgDisplay = classes.find((cls: string) => 
            cls.match(/^lg:(block|flex|grid|inline|inline-block|inline-flex)$/)
          )
          
          if (hasLgDisplay) {
            const displayType = hasLgDisplay.split(':')[1]
            htmlElement.style.display = displayType === 'inline-block' ? 'inline-block' : 
                                      displayType === 'inline-flex' ? 'inline-flex' :
                                      displayType
          }
        }
      })
    }
    
    // تطبيق المحاكاة بعد التحديث
    const timeoutId = setTimeout(applyViewportSimulationEffect, 100)
    
    return () => clearTimeout(timeoutId)
  }, [viewport, activeComponents])
  
  // وظائف إدارة المكونات
  const handleDeleteComponent = useCallback(async (id: string) => {
    try {
      // حذف من قاعدة البيانات أولاً
      const { error } = await supabase
        .from('store_settings')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)
      
      if (error) {
        toast({
          title: "خطأ في الحذف",
          description: "حدث خطأ أثناء حذف المكون",
          variant: "destructive"
        })
        return
      }
      
      // إذا نجح الحذف من قاعدة البيانات، احذف من الذاكرة
      deleteComponent(id)
      selectComponent(null)
      
      // مسح التخزين المؤقت للمتجر
      await clearStoreCacheByOrganizationId(organizationId)
      
      // الحصول على النطاق الفرعي للمنظمة لمسح التخزين المؤقت بشكل كامل
      const { data: orgData } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', organizationId)
        .single()
        
      if (orgData?.subdomain) {
        await clearCacheItem(`store_init_data:${orgData.subdomain}`)
        await clearCacheItem(`store_data:${orgData.subdomain}`)
      }
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف المكون من المتجر",
        variant: "default"
      })
      
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف المكون",
        variant: "destructive"
      })
    }
  }, [deleteComponent, selectComponent, organizationId, toast])
  
  const handleToggleVisibility = useCallback((id: string) => {
    toggleComponentVisibility(id)
  }, [toggleComponentVisibility])
  
  const handleMoveUp = useCallback((id: string) => {
    const componentIndex = activeComponents.findIndex(c => c.id === id)
    if (componentIndex > 0) {
      reorderComponents(componentIndex, componentIndex - 1)
    }
  }, [activeComponents, reorderComponents])
  
  const handleMoveDown = useCallback((id: string) => {
    const componentIndex = activeComponents.findIndex(c => c.id === id)
    if (componentIndex < activeComponents.length - 1) {
      reorderComponents(componentIndex, componentIndex + 1)
    }
  }, [activeComponents, reorderComponents])
  
  const handleDuplicate = useCallback((id: string) => {
    duplicateComponent(id)
  }, [duplicateComponent])
  
  // دالة الحفظ
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges()) return
    
    setSaving(true)
    try {
      // محاكاة تأخير الحفظ
      await new Promise(resolve => setTimeout(resolve, 800))
      saveToStorage()
    } catch (error) {
    } finally {
      setSaving(false)
    }
  }, [hasUnsavedChanges, setSaving, saveToStorage])
  
  // تحميل البيانات عند بداية التطبيق
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])
  
  // اختصار لوحة المفاتيح للحفظ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])
  
  // إحصائيات المكونات
  const componentStats = useMemo(() => {
    const total = activeComponents.length
    const visible = activeComponents.filter(c => c.isVisible !== false).length
    const hidden = total - visible
    return { total, visible, hidden }
  }, [activeComponents])
  
  return (
    <div className={cn(
      "h-full flex flex-col bg-background transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* شريط أدوات المعاينة المطور */}
      <div className="h-14 bg-card dark:bg-card border-b border-border dark:border-border flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* أزرار المنافذ */}
          <div className="flex items-center gap-1 p-1 bg-muted dark:bg-muted rounded-lg shadow-inner">
            <Button
              variant={viewport === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('desktop')}
              className="h-8 px-3 transition-all duration-200"
            >
              <Monitor className="w-4 h-4 mr-1" />
              سطح المكتب
            </Button>
            <Button
              variant={viewport === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('tablet')}
              className="h-8 px-3 transition-all duration-200"
            >
              <Tablet className="w-4 h-4 mr-1" />
              تابلت
            </Button>
            <Button
              variant={viewport === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('mobile')}
              className="h-8 px-3 transition-all duration-200"
            >
              <Smartphone className="w-4 h-4 mr-1" />
              موبايل
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* أدوات الزوم */}
          <div className="flex items-center gap-2 bg-muted dark:bg-muted rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-7 px-2">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <div className="bg-background dark:bg-background rounded px-2 py-1">
            <span className="text-xs font-medium min-w-[40px] text-center">
              {zoom}%
            </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-7 px-2">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetZoom} className="h-7 px-2">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* حالة الحفظ */}
          {hasUnsavedChanges() && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-2 py-1">
              <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
              <span>تغييرات غير محفوظة</span>
            </div>
          )}
          
          {/* إحصائيات المكونات */}
          <div className="flex items-center gap-3 text-xs bg-muted dark:bg-muted rounded-lg px-3 py-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
              <span className="font-medium">{componentStats.visible} مرئي</span>
            </div>
            {componentStats.hidden > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
                <span className="font-medium">{componentStats.hidden} مخفي</span>
              </div>
            )}
            <div className="text-muted-foreground dark:text-muted-foreground">
              ({componentStats.total} إجمالي)
            </div>
          </div>
          
          {/* أدوات إضافية */}
          <div className="flex items-center gap-1">

          {/* شبكة المحاذاة */}
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant={showGrid ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
                  className="h-8 px-2"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>إظهار/إخفاء الشبكة</p>
              </TooltipContent>
            </Tooltip>
            
            {/* شاشة كاملة */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 px-2"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'خروج من الشاشة الكاملة' : 'شاشة كاملة'}</p>
              </TooltipContent>
            </Tooltip>
          
          {/* تحديث */}
            <Tooltip>
              <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
                  className="h-8 px-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>تحديث المعاينة</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* منطقة المعاينة المطورة */}
      <div className="flex-1 overflow-hidden p-4 bg-gradient-to-br from-background to-muted/20">
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center'
          }}
        >
          <div 
            className={cn(
              "bg-card dark:bg-card shadow-xl dark:shadow-2xl dark:shadow-black/20 relative overflow-hidden transition-all duration-300",
              viewport === 'desktop' ? "w-full h-full" : "border-2 border-border dark:border-border rounded-xl",
              "hover:shadow-2xl dark:hover:shadow-black/30"
            )}
            style={viewport !== 'desktop' ? viewportSizes[viewport] : undefined}
          >
            {/* الشبكة المطورة */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-10 z-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            )}
            
            {/* محتوى المتجر */}
            <ScrollArea className="h-full">
              <div ref={viewportSimulatorRef} className="min-h-full rtl text-right" dir="rtl">
                {/* النافبار الثابت - دائماً في الأعلى */}
                <div 
                  className={cn(
                    "relative bg-background/95 border-b border-border/30",
                    viewport === 'mobile' && "px-2",
                    viewport === 'tablet' && "px-3"
                  )}
                  data-viewport={viewport}
                >
                  <div className={cn(
                    "h-16 flex items-center justify-between mx-auto w-full relative bg-gradient-to-r from-background/60 via-background/70 to-background/60 backdrop-blur-lg",
                    viewport === 'mobile' ? "px-2" : viewport === 'tablet' ? "px-3" : "px-4"
                  )}>
                    {/* تأثيرات الخلفية المتحركة */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                      <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <div className="absolute bottom-1/3 left-1/2 w-0.5 h-0.5 bg-primary/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>

                    {/* الشعار والعنوان */}
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="relative">
                        <a href="#" className="flex items-center group relative select-none gap-2.5 animate-in fade-in-50 duration-300 hover:after:opacity-100 after:opacity-0 after:absolute after:-z-10 after:blur-xl after:rounded-full after:w-full after:h-full after:transition-opacity after:duration-500 after:bg-gradient-to-r after:from-primary/20 after:via-primary/10 after:to-transparent">
                          <div className="overflow-hidden rounded-md relative">
                            <img 
                              src="https://wrnssatuvmumsczyldth.supabase.co/storage/v1/object/public/bazaar-public/organizations/fed872f9-1ade-4351-b020-5598fda976fe/logo/1748704162920_lRypmijGTCS6bKyLFt2HOw.svg" 
                              alt="المتجر" 
                              className={cn(
                                "object-contain transition-all duration-500 scale-100 rotate-0 hover:drop-shadow-md",
                                viewport === 'mobile' ? "h-6 w-auto" : viewport === 'tablet' ? "h-7 w-auto" : "h-8 w-auto"
                              )}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 transition-opacity duration-300 rounded-md"></div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 skew-x-12 -translate-x-full"></div>
                          </div>
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-bold transition-all duration-300 text-gradient-fancy drop-shadow-[0_0_0.3px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_0.5px_rgba(255,255,255,0.2)]",
                              viewport === 'mobile' ? "text-base" : viewport === 'tablet' ? "text-lg" : "text-lg"
                            )}>متجرك</span>
                          </div>
                          <div className="absolute inset-0 -z-10 rounded-full bg-primary/5 opacity-0 transition-all duration-500 scale-90"></div>
                        </a>
                      </div>
                    </div>

                    {/* روابط التنقل الوسطى */}
                    <div className={cn(
                      "absolute left-1/2 transform -translate-x-1/2",
                      viewport === 'mobile' ? "hidden" : viewport === 'tablet' ? "hidden" : "block"
                    )}>
                      <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-lg px-2 py-1">
                        <div className="flex items-center gap-1 px-1">
                          <a href="#" className="navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-primary/10 relative overflow-hidden active bg-primary/10 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house h-4 w-4 transition-colors duration-300 text-primary">
                              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
                              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            </svg>
                            <span>الرئيسية</span>
                            <div className="absolute bottom-1.5 left-3 right-3 h-0.5 rounded-full bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                          </a>
                          <a href="#" className="navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-primary relative overflow-hidden text-foreground/90 hover:text-primary-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag h-4 w-4 transition-colors duration-300 text-muted-foreground group-hover:text-primary-foreground">
                              <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path>
                              <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle>
                            </svg>
                            <span className="text-sm font-medium group-hover:text-primary-foreground transition-colors duration-300">المنتجات</span>
                          </a>
                          <a href="#" className="navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-primary relative overflow-hidden text-foreground/90 hover:text-primary-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings h-4 w-4 transition-colors duration-300 text-muted-foreground group-hover:text-primary-foreground">
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>خدمات الإصلاح</span>
                          </a>
                          <a href="#" className="navbar-link group flex items-center gap-2 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-primary relative overflow-hidden text-foreground/90 hover:text-primary-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-truck h-4 w-4 transition-colors duration-300 text-muted-foreground group-hover:text-primary-foreground">
                              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
                              <path d="M15 18H9"></path>
                              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
                              <circle cx="17" cy="18" r="2"></circle>
                              <circle cx="7" cy="18" r="2"></circle>
                            </svg>
                            <span>تتبع الخدمات</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* أدوات الجانب الأيمن */}
                    <div className="flex items-center gap-3 relative z-10">
                      {/* البحث */}
                      <div className={cn(
                        viewport === 'mobile' ? "hidden" : viewport === 'tablet' ? "hidden" : "block"
                      )}>
                        <div className="bg-gradient-to-r from-background/30 to-background/50 backdrop-blur-md rounded-xl border border-border/20 shadow-sm">
                          <div className="relative flex-1 max-w-sm">
                            <form className="group">
                              <div className="relative">
                                <input 
                                  type="search" 
                                  className="flex border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-right dark:border-border dark:placeholder:text-muted-foreground/70 h-9 pr-9 rounded-full border-border/40 bg-background/80 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 placeholder:text-muted-foreground/70 transition-all duration-300 w-full shadow-none" 
                                  dir="rtl" 
                                  placeholder="البحث..." 
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                                  <circle cx="11" cy="11" r="8"></circle>
                                  <path d="m21 21-4.3-4.3"></path>
                                </svg>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                      
                      {/* أزرار التحكم */}
                      <div className={cn(
                        "flex items-center",
                        viewport === 'mobile' ? "gap-1" : "gap-2"
                      )}>
                        <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
                          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground relative overflow-hidden rounded-lg transition-colors duration-200 w-9 h-9 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" title="تفعيل الوضع النهاري">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon absolute transition-all duration-200 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 opacity-100">
                              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                            </svg>
                          </button>
                        </div>
                        
                        <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
                          <div>
                            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-10 w-10 relative rounded-full bg-background/40 backdrop-blur-sm border border-border/20 shadow-sm hover:shadow-md hover:bg-primary/10 transition-all duration-300 group">
                              <div className="transition-all duration-300 relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors duration-300">
                                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                                </svg>
                              </div>
                              <div className="rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-destructive-foreground hover:bg-destructive/80 absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 text-[10px] px-0.5 py-0 bg-rose-500 border-white dark:border-background border-2">3</div>
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-background/40 to-background/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm p-1">
                          <button className="justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground flex items-center gap-2 px-2 py-1 h-auto bg-gradient-to-r from-background/60 to-background/80 backdrop-blur-sm border border-border/30 shadow-sm hover:shadow-lg rounded-full transition-all duration-300 group relative overflow-hidden hover:from-primary/10 hover:to-primary/5 hover:border-primary/30">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="flex shrink-0 overflow-hidden rounded-full h-8 w-8 border-2 transition-all duration-300 relative z-10 border-border/30 group-hover:border-primary/50 group-hover:scale-105">
                              <img className="aspect-square h-full w-full" alt="المستخدم" src="https://wrnssatuvmumsczyldth.supabase.co/storage/v1/object/public/user-avatars/avatars/213f3a14-c076-4cdf-945b-a7e877eab5c9-1748354915478.webp" />
                            </span>
                            <div className="flex items-center gap-1 relative z-10">
                              <span className="hidden md:inline font-medium text-sm max-w-[120px] truncate group-hover:text-primary transition-colors duration-300">المستخدم</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-3.5 w-3.5 text-muted-foreground transition-all duration-300 group-hover:text-primary">
                                <path d="m6 9 6 6 6-6"></path>
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* خط التدرج السفلي */}
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>
                  </div>
                </div>
                
                {/* محتوى المكونات */}
                {activeComponents.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {activeComponents.map((component, index) => {
                      // 🚀 تحديث component settings لتشمل بيانات المعاينة
                      const componentWithPreviewData = component.type === 'product_categories' 
                        ? { ...component, settings: { ...component.settings, _previewCategories: previewCategories } }
                        : component
                      
                      return (
                        <MemoizedComponentWrapper
                          key={component.id}
                          component={componentWithPreviewData}
                          isSelected={selectedComponentId === component.id}
                          isHovered={hoveredComponentId === component.id}
                          previewMode={previewMode}
                          selectComponent={selectComponent}
                          hoverComponent={hoverComponent}
                          organizationId={organizationId}
                          onDelete={handleDeleteComponent}
                          onToggleVisibility={handleToggleVisibility}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onDuplicate={handleDuplicate}
                          canMoveUp={index > 0}
                          canMoveDown={index < activeComponents.length - 1}
                          viewport={viewport}
                        />
                      )
                    })}
                  </AnimatePresence>
                ) : (
                  <motion.div 
                    className="flex items-center justify-center h-full min-h-[500px] text-muted-foreground dark:text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center">
                      <div className="text-8xl mb-6 opacity-60">
                        🏪
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-foreground dark:text-foreground">متجرك فارغ</h3>
                      <p className="text-muted-foreground/80 dark:text-muted-foreground/80 mb-4 max-w-md">
                        ابدأ بناء متجرك الرائع بإضافة مكونات من الشريط الجانبي
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60 dark:text-muted-foreground/60">
                        <div className="w-2 h-2 bg-primary dark:bg-primary rounded-full"></div>
                        <span>اسحب المكونات هنا</span>
                    </div>
                  </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
})
