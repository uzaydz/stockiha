import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Layers3,
  Component,
  Layout,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Copy,
  Trash2,
  Search,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import { 
  useImprovedStoreEditor,
  ComponentType,
  getComponentDisplayName,
  getComponentIcon
} from '../hooks/useImprovedStoreEditor'

interface ComponentsSidebarProps {
  organizationId: string
}

export const ComponentsSidebar: React.FC<ComponentsSidebarProps> = React.memo(({ organizationId }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['store', 'basic']))
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // استرجاع حالة التوسيع من localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('componentsSidebar.collapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })

  // حفظ حالة التوسيع في localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('componentsSidebar.collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])
  
  const {
    components,
    selectedComponentId,
    activeTab,
    addComponent,
    selectComponent,
    deleteComponent,
    duplicateComponent,
    toggleComponentVisibility,
    reorderComponents,
    setActiveTab
  } = useImprovedStoreEditor()

  // تعريف animation variants
  const sidebarVariants = {
    expanded: {
      width: 280,
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    collapsed: {
      width: 60,
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.15 }
    }
  }

  // دالة تبديل حالة التوسيع
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // دالة التوسيع التلقائي عند الضغط على أيقونة
  const expandOnAction = (action?: () => void) => {
    if (isCollapsed) {
      setIsCollapsed(false)
      if (action) {
        setTimeout(action, 300)
      }
    } else if (action) {
      action()
    }
  }
  
  // مجموعات المكونات
  const componentGroups = [
    {
      id: 'store',
      title: 'مكونات المتجر',
      icon: '🏪',
      components: [
        'hero',
        'featured_products',
        'product_categories',
        'testimonials'
      ] as ComponentType[]
    },
    {
      id: 'content',
      title: 'المحتوى',
      icon: '📝',
      components: [
        'about',
        'services',
        'contact'
      ] as ComponentType[]
    },
    {
      id: 'marketing',
      title: 'التسويق',
      icon: '📢',
      components: [
        'countdownoffers'
      ] as ComponentType[]
    },
    {
      id: 'layout',
      title: 'التخطيط',
      icon: '🔗',
      components: [
        'footer'
      ] as ComponentType[]
    }
  ]
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }
  
  const handleAddComponent = (type: ComponentType) => {
    addComponent(type)
  }
  
  const handleComponentClick = (componentId: string) => {
    selectComponent(componentId)
  }
  
  const handleDeleteComponent = (componentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteComponent(componentId)
  }
  
  const handleDuplicateComponent = (componentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateComponent(componentId)
  }
  
  const handleToggleVisibility = (componentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleComponentVisibility(componentId)
  }
  
  // فلترة المكونات حسب البحث مع memoization
  const filteredComponents = useMemo(() => 
    components.filter(component =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getComponentDisplayName(component.type).toLowerCase().includes(searchQuery.toLowerCase())
    ), [components, searchQuery]
  )

  // رندر النسخة المضغوطة (الأيقونات فقط)
  const renderCollapsedView = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-muted/20">
      {/* زر التوسيع */}
      <div className="p-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="w-full h-10 p-0 hover:bg-primary/10 transition-all duration-200"
          title="توسيع الشريط الجانبي"
        >
          <PanelRightOpen className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* أيقونات التبويبات */}
      <div className="flex-1 p-2 space-y-2">
        <div className="space-y-1">
          <Button
            variant={activeTab === 'components' ? "default" : "ghost"}
            size="sm"
            onClick={() => expandOnAction(() => setActiveTab('components'))}
            className="w-full h-10 p-0 transition-all duration-200"
            title="المكونات"
          >
            <Component className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'layers' ? "default" : "ghost"}
            size="sm"
            onClick={() => expandOnAction(() => setActiveTab('layers'))}
            className="w-full h-10 p-0 transition-all duration-200"
            title="الطبقات"
          >
            <Layers3 className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'templates' ? "default" : "ghost"}
            size="sm"
            onClick={() => expandOnAction(() => setActiveTab('templates'))}
            className="w-full h-10 p-0 transition-all duration-200"
            title="القوالب"
          >
            <Layout className="w-4 h-4" />
          </Button>
        </div>

        {/* أيقونات سريعة للمكونات الشائعة */}
        <div className="mt-4 pt-4 border-t border-border/30 space-y-1">
          {['hero', 'featured_products', 'testimonials'].map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => expandOnAction(() => handleAddComponent(type as ComponentType))}
              className="w-full h-10 p-0 transition-all duration-200"
              title={`إضافة ${getComponentDisplayName(type as ComponentType)}`}
            >
              <span className="text-lg">{getComponentIcon(type as ComponentType)}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
  
  return (
    <motion.div 
      className="h-full flex flex-col bg-gradient-to-b from-card via-card/95 to-muted/30 border-l border-border/50 components-sidebar-rtl"
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      initial={false}
      style={{ 
        direction: 'ltr',
        transformOrigin: 'right center'
      }}
    >
      {/* رندر المحتوى حسب الحالة */}
      {isCollapsed ? (
        renderCollapsedView()
      ) : (
        <>
          {/* رأس الشريط الجانبي المحسن */}
          <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <motion.h2 
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                className="text-sm font-semibold text-foreground"
              >
                أدوات التصميم
              </motion.h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
                title="تضييق الشريط الجانبي"
              >
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            
            {/* شريط البحث المحسن */}
            <motion.div 
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="البحث في المكونات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm bg-background/50 border-border/60 hover:border-primary/60 focus:border-primary transition-all duration-200"
              />
            </motion.div>
          </div>
          
          {/* التبويبات المحسنة */}
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            className="flex-1"
          >
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
              <div className="px-4 pt-4 pb-2">
                <TabsList className="w-full grid grid-cols-3 h-10 bg-muted/30 border border-border/30 rounded-lg p-1">
                  <TabsTrigger 
                    value="components" 
                    className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Component className="w-4 h-4 mr-1" />
                    المكونات
                  </TabsTrigger>
                  <TabsTrigger 
                    value="layers" 
                    className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Layers3 className="w-4 h-4 mr-1" />
                    الطبقات
                  </TabsTrigger>
                  <TabsTrigger 
                    value="templates" 
                    className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Layout className="w-4 h-4 mr-1" />
                    القوالب
                  </TabsTrigger>
                </TabsList>
              </div>
        
        {/* تبويب المكونات */}
        <TabsContent value="components" className="flex-1 mt-0">
          <ScrollArea className="h-full px-4 properties-scrollbar">
            <div className="space-y-4 pb-6">
              {componentGroups.map((group) => (
                <motion.div 
                  key={group.id} 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <button
                    onClick={() => toggleSection(group.id)}
                    className="flex items-center justify-between w-full p-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200 border border-transparent hover:border-border/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-base">{group.icon}</span>
                      </div>
                      <span className="font-medium">{group.title}</span>
                    </div>
                    {expandedSections.has(group.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.has(group.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pl-4 pr-2">
                          {group.components.map((type) => (
                            <Button
                              key={type}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddComponent(type)}
                              className="w-full justify-start gap-3 h-12 text-sm hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all duration-200 rounded-lg"
                            >
                              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
                                <span className="text-lg">{getComponentIcon(type)}</span>
                              </div>
                              <span className="flex-1 text-right">{getComponentDisplayName(type)}</span>
                              <Plus className="w-4 h-4 text-primary/60" />
                            </Button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* تبويب الطبقات */}
        <TabsContent value="layers" className="flex-1 mt-0">
          <ScrollArea className="h-full px-4 properties-scrollbar">
            <div className="space-y-2 pb-6">
              {searchQuery ? (
                // عرض النتائج المفلترة
                filteredComponents.length > 0 ? (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {filteredComponents.map((component, index) => (
                      <ComponentLayerItem
                        key={component.id}
                        component={component}
                        isSelected={selectedComponentId === component.id}
                        onClick={() => handleComponentClick(component.id)}
                        onDelete={(e) => handleDeleteComponent(component.id, e)}
                        onDuplicate={(e) => handleDuplicateComponent(component.id, e)}
                        onToggleVisibility={(e) => handleToggleVisibility(component.id, e)}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <div className="w-16 h-16 mx-auto bg-muted/30 rounded-2xl flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">لا توجد نتائج للبحث</p>
                    <p className="text-xs mt-1 text-muted-foreground/70">جرب مصطلحات بحث مختلفة</p>
                  </div>
                )
              ) : (
                // عرض جميع المكونات مرتبة
                components.length > 0 ? (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {[...components]
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((component, index) => (
                        <ComponentLayerItem
                          key={component.id}
                          component={component}
                          isSelected={selectedComponentId === component.id}
                          onClick={() => handleComponentClick(component.id)}
                          onDelete={(e) => handleDeleteComponent(component.id, e)}
                          onDuplicate={(e) => handleDuplicateComponent(component.id, e)}
                          onToggleVisibility={(e) => handleToggleVisibility(component.id, e)}
                        />
                      ))}
                  </motion.div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <Layers3 className="w-8 h-8 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">لا توجد مكونات</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">ابدأ بإضافة مكونات للمتجر</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* تبويب القوالب */}
        <TabsContent value="templates" className="flex-1 mt-0">
          <div className="h-full flex items-center justify-center text-muted-foreground p-6">
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <Layout className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">القوالب الجاهزة</p>
                <p className="text-xs mt-1 text-muted-foreground/70">قريباً سيتم إضافة قوالب جاهزة للمتجر</p>
              </div>
            </motion.div>
          </div>
        </TabsContent>
          </Tabs>
          </motion.div>
        </>
      )}
    </motion.div>
  )
})

// مكون عنصر الطبقة
interface ComponentLayerItemProps {
  component: any
  isSelected: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onDuplicate: (e: React.MouseEvent) => void
  onToggleVisibility: (e: React.MouseEvent) => void
}

const ComponentLayerItem: React.FC<ComponentLayerItemProps> = ({
  component,
  isSelected,
  onClick,
  onDelete,
  onDuplicate,
  onToggleVisibility
}) => {
  return (
    <motion.div
      layout
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border",
        isSelected 
          ? "bg-primary/10 border-primary/30 shadow-sm"
          : "hover:bg-muted/50 border-transparent hover:border-border/60",
        !component.isActive && "opacity-60"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* أيقونة السحب */}
      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      {/* أيقونة المكون */}
      <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
        <span className="text-base">{getComponentIcon(component.type)}</span>
      </div>
      
      {/* معلومات المكون */}
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground truncate">
          {component.name}
        </span>
        <span className="block text-xs text-muted-foreground truncate">
          {getComponentDisplayName(component.type)}
        </span>
      </div>
      
      {/* الحالة */}
      {!component.isActive && (
        <Badge variant="secondary" className="text-xs font-medium">
          مخفي
        </Badge>
      )}
      
      {/* أدوات التحكم */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="h-8 w-8 p-0 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors duration-200"
          title={component.isVisible ? "إخفاء المكون" : "إظهار المكون"}
        >
          {component.isVisible ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-500" />
          )}
        </Button>
        
        {/* زر الحذف المباشر */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200"
          title="حذف المكون"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/50">
              <span className="sr-only">خيارات إضافية</span>
              <span className="text-muted-foreground font-bold">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem onClick={onDuplicate} className="gap-2">
              <Copy className="w-4 h-4" />
              نسخ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
              <Trash2 className="w-4 h-4" />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}