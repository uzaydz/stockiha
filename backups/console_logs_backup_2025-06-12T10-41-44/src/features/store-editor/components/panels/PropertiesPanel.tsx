import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, Type, Palette, Layout, Eye } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { HeroProperties } from '../properties/HeroProperties'

export const PropertiesPanel = () => {
  const { 
    selectedElementId, 
    currentPage, 
    updateElement,
    isPropertiesPanelOpen 
  } = useEditorStore()

  // إذا لم تكن اللوحة مفتوحة، لا نعرض شيئاً
  if (!isPropertiesPanelOpen) {
    return null
  }

  // العثور على العنصر المحدد
  const selectedElement = currentPage?.elements.find(el => el.id === selectedElementId)

  // إذا لم يكن هناك عنصر محدد
  if (!selectedElement) {
    return (
      <div className="w-80 bg-background border-l border-border flex flex-col h-full">
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                لوحة الخصائص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">لا يوجد عنصر محدد</p>
                <p className="text-xs mt-1">اختر عنصراً من الصفحة لتعديل خصائصه</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // معالج تحديث العنصر
  const handleUpdateElement = (updates: any) => {
    updateElement(selectedElement.id, updates)
  }

  // تحديد لوحة الخصائص المناسبة بناءً على نوع العنصر
  const renderPropertiesForElement = () => {
    switch (selectedElement.type) {
      case 'hero':
        return (
          <HeroProperties
            element={selectedElement}
            onUpdate={handleUpdateElement}
          />
        )
      
      case 'text':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                خصائص النص
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="text">المحتوى</Label>
                <Textarea
                  id="text"
                  value={selectedElement.properties.text || ''}
                  onChange={(e) => handleUpdateElement({
                    properties: {
                      ...selectedElement.properties,
                      text: e.target.value,
                    },
                  })}
                  placeholder="أدخل النص..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )
      
      case 'button':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Button className="h-5 w-5" />
                خصائص الزر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="buttonText">نص الزر</Label>
                <Input
                  id="buttonText"
                  value={selectedElement.properties.text || ''}
                  onChange={(e) => handleUpdateElement({
                    properties: {
                      ...selectedElement.properties,
                      text: e.target.value,
                    },
                  })}
                  placeholder="نص الزر"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="buttonLink">الرابط</Label>
                <Input
                  id="buttonLink"
                  value={selectedElement.properties.href || ''}
                  onChange={(e) => handleUpdateElement({
                    properties: {
                      ...selectedElement.properties,
                      href: e.target.value,
                    },
                  })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )
      
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                خصائص العنصر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="elementName">اسم العنصر</Label>
                <Input
                  id="elementName"
                  value={selectedElement.name}
                  onChange={(e) => handleUpdateElement({
                    name: e.target.value,
                  })}
                  placeholder="اسم العنصر"
                  className="mt-1"
                />
              </div>

              <Separator />

              <div className="text-center py-4 text-muted-foreground">
                <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">خصائص هذا العنصر</p>
                <p className="text-xs">غير متاحة حالياً</p>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      {/* رأس ثابت */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">العنصر المحدد</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{selectedElement.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedElement.type === 'hero' && 'البانر الأساسي'}
                  {selectedElement.type === 'text' && 'نص'}
                  {selectedElement.type === 'button' && 'زر'}
                  {selectedElement.type === 'featured_products' && 'منتجات مميزة'}
                  {selectedElement.type === 'categories' && 'فئات المنتجات'}
                  {!['hero', 'text', 'button', 'featured_products', 'categories'].includes(selectedElement.type) && selectedElement.type}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                #{selectedElement.order}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المحتوى القابل للتمرير */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* خصائص العنصر المخصصة */}
          {renderPropertiesForElement()}

          {/* خصائص التخطيط العامة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layout className="h-4 w-4" />
                التخطيط والموضع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="order" className="text-xs">الترتيب</Label>
                  <Input
                    id="order"
                    type="number"
                    value={selectedElement.order}
                    onChange={(e) => handleUpdateElement({
                      order: parseInt(e.target.value) || 0,
                    })}
                    className="h-8 text-xs"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">الحالة</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Switch
                      checked={!selectedElement.properties.hidden}
                      onCheckedChange={(checked) => handleUpdateElement({
                        properties: {
                          ...selectedElement.properties,
                          hidden: !checked,
                        },
                      })}
                      className="scale-75"
                    />
                    <span className="text-xs">
                      {selectedElement.properties.hidden ? 'مخفي' : 'مرئي'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
