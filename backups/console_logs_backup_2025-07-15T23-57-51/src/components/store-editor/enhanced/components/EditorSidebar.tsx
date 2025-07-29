import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers3,
  Component,
  Settings2,
  Palette,
  Image,
  Type,
  Square,
  Circle,
  Star,
  ShoppingBag,
  MessageSquare,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Plus
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useEnhancedStoreEditor } from '../store'
import { SUPPORTED_ELEMENT_TYPES } from '../index'
import type { ElementType, ElementConfig } from '../types'

// دوال مساعدة لعرض العناصر
const getElementIcon = (type: string) => {
  const icons: Record<string, string> = {
    hero: '🌟',
    featured_products: '⭐',
    product_categories: '🏷️',
    testimonials: '💬',
    about: '📖',
    services: '🛠️',
    contact: '📞',
    footer: '🔗',
    countdownoffers: '⏰',
    newsletter: '📧',
    gallery: '🖼️',
    text: '📝',
    image: '🖼️',
    button: '🔘',
    spacer: '📏',
    divider: '➖',
    video: '🎥',
    map: '🗺️',
    social_links: '🔗',
    custom_html: '💻',
  }
  return icons[type] || '📦'
}

const getElementDisplayName = (type: string) => {
  const names: Record<string, string> = {
    hero: 'البانر الرئيسي',
    featured_products: 'المنتجات المميزة',
    product_categories: 'فئات المنتجات',
    testimonials: 'آراء العملاء',
    about: 'عن المتجر',
    services: 'الخدمات',
    contact: 'تواصل معنا',
    footer: 'التذييل',
    countdownoffers: 'العروض المحدودة',
    newsletter: 'النشرة البريدية',
    gallery: 'معرض الصور',
    text: 'نص',
    image: 'صورة',
    button: 'زر',
    spacer: 'مساحة فارغة',
    divider: 'فاصل',
    video: 'فيديو',
    map: 'خريطة',
    social_links: 'روابط التواصل',
    custom_html: 'HTML مخصص',
  }
  return names[type] || type
}

export const EditorSidebar: React.FC = () => {
  const {
    currentPage,
    selectedElementIds,
    activePanels,
    components,
    createElement,
    selectElement,
    updateElement,
    deleteElements,
    duplicateElements,
    togglePanel,
  } = useEnhancedStoreEditor()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['components', 'layers'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  // إنشاء عنصر جديد
  const handleAddElement = (type: ElementType) => {
    const elementNames: Record<string, string> = {
      hero: 'البانر الرئيسي',
      featured_products: 'المنتجات المميزة',
      product_categories: 'فئات المنتجات',
      testimonials: 'آراء العملاء',
      about: 'عن المتجر',
      services: 'الخدمات',
      contact: 'تواصل معنا',
      footer: 'التذييل',
      countdownoffers: 'العروض المحدودة',
      newsletter: 'النشرة البريدية',
      text: 'نص',
      image: 'صورة',
      button: 'زر',
      spacer: 'مساحة فارغة',
      divider: 'فاصل',
      video: 'فيديو',
      map: 'خريطة',
      social_links: 'روابط التواصل',
      custom_html: 'HTML مخصص',
    }

    const defaultProperties: Record<string, any> = {
      hero: {
        title: 'عنوان رئيسي جديد',
        description: 'وصف للقسم الرئيسي',
      },
      featured_products: {
        title: 'منتجات مميزة',
        description: 'اكتشف أفضل منتجاتنا',
        displayCount: 4,
      },
      product_categories: {
        title: 'فئات المنتجات',
        description: 'تصفح جميع الفئات',
        displayCount: 6,
      },
      testimonials: {
        title: 'آراء العملاء',
        description: 'ماذا يقول عملاؤنا',
      },
      about: {
        title: 'عن متجرنا',
        description: 'تعرف علينا أكثر',
      },
      services: {
        title: 'خدماتنا',
        description: 'الخدمات التي نقدمها',
      },
      contact: {
        title: 'تواصل معنا',
        description: 'نحن هنا لمساعدتك',
      },
      footer: {
        storeName: 'متجرنا',
        description: 'وصف المتجر',
      },
      countdownoffers: {
        title: 'عروض محدودة',
        description: 'استغل الفرصة الآن',
      },
      newsletter: {
        title: 'النشرة البريدية',
        description: 'اشترك في نشرتنا',
      },
      text: {
        text: 'نص جديد',
      },
      image: {
        src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop',
        alt: 'صورة جديدة',
      },
      button: {
        text: 'انقر هنا',
        link: '#',
      },
      spacer: {
        height: '50px',
      },
      divider: {},
      video: {
        url: '',
        title: 'فيديو جديد',
      },
      map: {
        location: '',
        title: 'خريطة',
      },
      social_links: {
        links: [],
      },
      custom_html: {
        html: '<div>HTML مخصص</div>',
      },
    }

    const element = {
      type,
      name: elementNames[type] || type,
      properties: defaultProperties[type] || {},
      styles: {
        desktop: {},
        tablet: {},
        mobile: {},
      },
      order: currentPage?.elements.length || 0,
      isVisible: true,
      isLocked: false,
    }

    createElement(element)
  }

  // مجموعات العناصر
  const elementGroups = [
    {
      id: 'store',
      title: 'عناصر المتجر',
      icon: ShoppingBag,
      elements: [
        'hero',
        'featured_products', 
        'product_categories',
        'countdownoffers',
        'testimonials',
        'about',
        'services',
        'contact',
        'footer',
        'newsletter'
      ] as ElementType[]
    },
    {
      id: 'basic',
      title: 'عناصر أساسية',
      icon: Square,
      elements: [
        'text',
        'image', 
        'button',
        'spacer',
        'divider'
      ] as ElementType[]
    },
    {
      id: 'media',
      title: 'الوسائط',
      icon: Image,
      elements: [
        'video',
        'gallery',
        'map'
      ] as ElementType[]
    },
    {
      id: 'social',
      title: 'التواصل',
      icon: MessageSquare,
      elements: [
        'social_links',
        'custom_html'
      ] as ElementType[]
    }
  ]

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-full">
      {/* رأس الشريط الجانبي */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">أدوات التحرير</h2>
        <p className="text-sm text-muted-foreground">إضافة وتحرير عناصر المتجر</p>
      </div>

      <ScrollArea className="flex-1">
        {/* لوحة المكونات */}
        {activePanels.has('components') && (
          <Collapsible
            open={expandedSections.has('components')}
            onOpenChange={() => toggleSection('components')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Component className="w-4 h-4" />
                  <span className="font-medium">المكونات</span>
                </div>
                {expandedSections.has('components') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2">
              {elementGroups.map((group) => (
                <div key={group.id} className="px-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <group.icon className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">{group.title}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {group.elements.map((elementType) => (
                      <Button
                        key={elementType}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddElement(elementType)}
                        className="h-16 flex flex-col gap-1 text-xs hover:bg-muted/50"
                      >
                        <span className="text-lg">
                          {getElementIcon(elementType)}
                        </span>
                        <span className="text-[10px] leading-tight text-center">
                          {getElementDisplayName(elementType)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* لوحة الطبقات */}
        {activePanels.has('layers') && (
          <Collapsible
            open={expandedSections.has('layers')}
            onOpenChange={() => toggleSection('layers')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Layers3 className="w-4 h-4" />
                  <span className="font-medium">الطبقات</span>
                  {currentPage?.elements.length && (
                    <Badge variant="secondary" className="text-xs">
                      {currentPage.elements.length}
                    </Badge>
                  )}
                </div>
                {expandedSections.has('layers') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-1">
                {currentPage?.elements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد عناصر</p>
                    <p className="text-xs">ابدأ بإضافة عناصر من اللوحة أعلاه</p>
                  </div>
                ) : (
                  currentPage?.elements
                    .sort((a, b) => (b.order || 0) - (a.order || 0))
                    .map((element) => (
                      <LayerItem
                        key={element.id}
                        element={element}
                        isSelected={selectedElementIds.includes(element.id)}
                        onSelect={() => selectElement(element.id)}
                        onToggleVisibility={() => updateElement(element.id, {
                          isVisible: !element.isVisible
                        })}
                        onToggleLock={() => updateElement(element.id, {
                          isLocked: !element.isLocked
                        })}
                        onDelete={() => deleteElements([element.id])}
                        onDuplicate={() => duplicateElements([element.id])}
                      />
                    ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* لوحة الخصائص */}
        {activePanels.has('properties') && (
          <Collapsible
            open={expandedSections.has('properties')}
            onOpenChange={() => toggleSection('properties')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span className="font-medium">الخصائص</span>
                </div>
                {expandedSections.has('properties') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="px-4 pb-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">حدد عنصر لتحرير خصائصه</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </ScrollArea>
    </div>
  )
}

// مكون عنصر الطبقة
interface LayerItemProps {
  element: ElementConfig
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onDelete: () => void
  onDuplicate: () => void
}

const LayerItem: React.FC<LayerItemProps> = ({
  element,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50",
        !element.isVisible && "opacity-50"
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* أيقونة العنصر */}
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        <span className="text-sm">{getElementIcon(element.type)}</span>
      </div>

      {/* اسم العنصر */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{element.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {getElementDisplayName(element.type)}
        </p>
      </div>

      {/* أدوات التحكم */}
      <AnimatePresence>
        {(isHovered || isSelected) && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility()
              }}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {element.isVisible ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock()
              }}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {element.isLocked ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Copy className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="h-6 w-6 p-0 hover:bg-destructive/20 text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
