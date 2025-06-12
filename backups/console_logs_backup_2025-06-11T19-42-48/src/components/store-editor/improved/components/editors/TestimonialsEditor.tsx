import React, { useState, useEffect, useMemo } from 'react'
import { MessageCircle, Settings2, Users, Search, Plus, X, Edit, Trash, Star, Shield, Package, Calendar, User, AlertCircle } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { PropertySection } from '../PropertySection'
import { getTestimonials } from '@/lib/api/testimonials'
import { useTenant } from '@/context/TenantContext'

interface Testimonial {
  id: string
  customerName: string
  customerAvatar?: string
  rating: number
  comment: string
  verified?: boolean
  productName?: string
  productImage?: string
  purchaseDate?: string
}

interface TestimonialsEditorProps {
  settings: any
  onUpdate: (key: string, value: any) => void
}

export const TestimonialsEditor: React.FC<TestimonialsEditorProps> = ({
  settings,
  onUpdate
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content', 'display', 'testimonials'])
  )
  
  // حالة الشهادات
  const [availableTestimonials, setAvailableTestimonials] = useState<Testimonial[]>([])
  const [selectedTestimonials, setSelectedTestimonials] = useState<Testimonial[]>([])
  const [testimonialsLoading, setTestimonialsLoading] = useState(false)
  const [testimonialsError, setTestimonialsError] = useState<string | null>(null)
  const [testimonialSearchQuery, setTestimonialSearchQuery] = useState('')
  const [showTestimonialPicker, setShowTestimonialPicker] = useState(false)
  const [showAddTestimonialForm, setShowAddTestimonialForm] = useState(false)
  
  // نموذج إضافة شهادة جديدة
  const [newTestimonial, setNewTestimonial] = useState<Partial<Testimonial>>({
    customerName: '',
    rating: 5,
    comment: '',
    verified: true,
    customerAvatar: '',
    productName: '',
    productImage: ''
  })
  
  const { currentOrganization } = useTenant()
  const organizationId = currentOrganization?.id || localStorage.getItem('bazaar_organization_id')

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

  // تحميل الشهادات المتاحة
  const loadAvailableTestimonials = async () => {
    if (!organizationId) {
      console.log('لا يوجد معرف مؤسسة متاح')
      setTestimonialsError('لا يوجد معرف مؤسسة متاح')
      return
    }
    
    console.log('بدء تحميل الشهادات للمؤسسة:', organizationId)
    setTestimonialsLoading(true)
    setTestimonialsError(null)
    
    try {
      const testimonials = await getTestimonials(organizationId, { active: true })
      console.log('تم تحميل الشهادات:', testimonials?.length || 0)
      
      // تحويل البيانات من صيغة API إلى صيغة المكون
      const formattedTestimonials = (testimonials || []).map((t: any) => ({
        id: t.id,
        customerName: t.customer_name || t.customerName || '',
        customerAvatar: t.customer_avatar || t.customerAvatar || '',
        rating: t.rating || 5,
        comment: t.comment || '',
        verified: t.verified ?? true,
        productName: t.product_name || t.productName || '',
        productImage: t.product_image || t.productImage || '',
        purchaseDate: t.purchase_date || t.purchaseDate || t.created_at
      }))
      
      setAvailableTestimonials(formattedTestimonials)
      
      if (!testimonials || testimonials.length === 0) {
        setTestimonialsError('لا توجد شهادات متاحة')
      }
    } catch (error) {
      console.error('خطأ في تحميل الشهادات:', error)
      setTestimonialsError('فشل في تحميل الشهادات. تأكد من الاتصال بالشبكة.')
    } finally {
      setTestimonialsLoading(false)
    }
  }

  // تحميل الشهادات المحددة من الإعدادات
  useEffect(() => {
    if (settings.testimonials && Array.isArray(settings.testimonials)) {
      setSelectedTestimonials(settings.testimonials)
    }
  }, [settings.testimonials])

  // تحميل الشهادات عند تحميل المكون
  useEffect(() => {
    if (organizationId) {
      loadAvailableTestimonials()
    }
  }, [organizationId])

  // تصفية الشهادات حسب البحث
  const filteredTestimonials = useMemo(() => {
    if (!testimonialSearchQuery) return availableTestimonials
    
    return availableTestimonials.filter(testimonial =>
      testimonial.customerName.toLowerCase().includes(testimonialSearchQuery.toLowerCase()) ||
      testimonial.comment?.toLowerCase().includes(testimonialSearchQuery.toLowerCase()) ||
      testimonial.productName?.toLowerCase().includes(testimonialSearchQuery.toLowerCase())
    )
  }, [availableTestimonials, testimonialSearchQuery])

  // إضافة شهادة للاختيار
  const addTestimonialToSelection = (testimonial: Testimonial) => {
    if (!selectedTestimonials.find(t => t.id === testimonial.id)) {
      const newSelection = [...selectedTestimonials, testimonial]
      setSelectedTestimonials(newSelection)
      onUpdate('testimonials', newSelection)
    }
  }

  // إزالة شهادة من الاختيار
  const removeTestimonialFromSelection = (testimonialId: string) => {
    const newSelection = selectedTestimonials.filter(t => t.id !== testimonialId)
    setSelectedTestimonials(newSelection)
    onUpdate('testimonials', newSelection)
  }

  // إضافة شهادة جديدة
  const handleAddNewTestimonial = () => {
    if (!newTestimonial.customerName || !newTestimonial.comment) {
      return
    }

    const testimonial: Testimonial = {
      id: `testimonial-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      customerName: newTestimonial.customerName || '',
      customerAvatar: newTestimonial.customerAvatar || '',
      rating: newTestimonial.rating || 5,
      comment: newTestimonial.comment || '',
      verified: newTestimonial.verified ?? true,
      productName: newTestimonial.productName || '',
      productImage: newTestimonial.productImage || '',
      purchaseDate: new Date().toISOString()
    }

    const newSelection = [...selectedTestimonials, testimonial]
    setSelectedTestimonials(newSelection)
    onUpdate('testimonials', newSelection)

    // إعادة تعيين النموذج
    setNewTestimonial({
      customerName: '',
      rating: 5,
      comment: '',
      verified: true,
      customerAvatar: '',
      productName: '',
      productImage: ''
    })
    
    setShowAddTestimonialForm(false)
  }

  // رندر نجوم التقييم
  const renderStarRating = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const stars = []
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${iconSize} ${
            i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      )
    }
    
    return <div className="flex items-center gap-0.5">{stars}</div>
  }

  // رندر بطاقة شهادة
  const renderTestimonialCard = (testimonial: Testimonial, isSelected: boolean = false) => {
    return (
      <Card className={`overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md border-border'
      }`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0">
              {testimonial.customerAvatar ? (
                <img 
                  src={testimonial.customerAvatar} 
                  alt={testimonial.customerName || 'عميل'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                (testimonial.customerName || 'عميل').substring(0, 2)
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-medium text-sm">{testimonial.customerName || 'عميل'}</div>
                {testimonial.verified && (
                  <Badge variant="outline" className="h-5 text-[10px] bg-green-50 text-green-700">
                    <Shield className="w-2.5 h-2.5 mr-1" />
                    موثق
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                {renderStarRating(testimonial.rating || 5)}
                <span className="text-xs text-muted-foreground">
                  {testimonial.rating || 5}/5
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {testimonial.comment}
              </p>
              
              {testimonial.productName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{testimonial.productName}</span>
                </div>
              )}
            </div>
            
            {!isSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTestimonialToSelection(testimonial)}
                className="flex-shrink-0"
              >
                <Plus className="w-3 h-3 mr-1" />
                إضافة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* قسم المحتوى */}
      <PropertySection
        title="المحتوى"
        icon={<MessageCircle className="w-4 h-4" />}
        expanded={expandedSections.has('content')}
        onToggle={() => toggleSection('content')}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">العنوان</Label>
            <Input
              id="title"
              value={settings.title || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="آراء عملائنا"
              className="text-sm h-9"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">الوصف</Label>
            <Textarea
              id="description"
              value={settings.description || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
      </PropertySection>

      {/* قسم إعدادات العرض */}
      <PropertySection
        title="إعدادات العرض"
        icon={<Settings2 className="w-4 h-4" />}
        expanded={expandedSections.has('display')}
        onToggle={() => toggleSection('display')}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">عدد الشهادات المرئية</Label>
            <div className="space-y-2">
              <Slider
                value={[settings.visibleCount || 3]}
                onValueChange={(value) => onUpdate('visibleCount', value[0])}
                max={6}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-medium">{settings.visibleCount || 3}</span>
                <span>6</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="backgroundColor" className="text-sm font-medium">لون الخلفية</Label>
            <Select
              value={settings.backgroundColor || 'default'}
              onValueChange={(value) => onUpdate('backgroundColor', value)}
            >
              <SelectTrigger id="backgroundColor" className="h-9">
                <SelectValue placeholder="اختر لون الخلفية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">افتراضي</SelectItem>
                <SelectItem value="light">فاتح</SelectItem>
                <SelectItem value="dark">داكن</SelectItem>
                <SelectItem value="primary">رئيسي</SelectItem>
                <SelectItem value="accent">مميز</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardStyle" className="text-sm font-medium">نمط البطاقات</Label>
            <Select
              value={settings.cardStyle || 'default'}
              onValueChange={(value) => onUpdate('cardStyle', value)}
            >
              <SelectTrigger id="cardStyle" className="h-9">
                <SelectValue placeholder="اختر نمط البطاقات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">افتراضي</SelectItem>
                <SelectItem value="outline">إطار</SelectItem>
                <SelectItem value="elevated">مرتفع</SelectItem>
                <SelectItem value="minimal">مبسط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PropertySection>

      {/* قسم الشهادات */}
      <PropertySection
        title="إدارة الشهادات"
        icon={<Users className="w-4 h-4" />}
        expanded={expandedSections.has('testimonials')}
        onToggle={() => toggleSection('testimonials')}
      >
        <div className="space-y-3">
          {/* الشهادات المحددة */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                الشهادات المحددة ({selectedTestimonials.length})
              </Label>
              <div className="flex gap-2">
                <Dialog open={showTestimonialPicker} onOpenChange={setShowTestimonialPicker}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Search className="w-3 h-3 mr-1" />
                      اختيار من الموجود
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] sm:max-h-[700px]">
                    <DialogHeader>
                      <DialogTitle>اختيار الشهادات</DialogTitle>
                      <DialogDescription>
                        اختر الشهادات التي تريد عرضها في هذا القسم
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="البحث في الشهادات..."
                          value={testimonialSearchQuery}
                          onChange={(e) => setTestimonialSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {testimonialsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">جاري تحميل الشهادات...</p>
                          </div>
                        </div>
                      ) : testimonialsError ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{testimonialsError}</AlertDescription>
                        </Alert>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {filteredTestimonials.length > 0 ? (
                              filteredTestimonials.map((testimonial) => (
                                <div key={testimonial.id}>
                                  {renderTestimonialCard(testimonial, selectedTestimonials.some(t => t.id === testimonial.id))}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-8 h-8 mx-auto mb-2" />
                                <p>لا توجد شهادات متاحة</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTestimonialPicker(false)}>
                        إغلاق
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showAddTestimonialForm} onOpenChange={setShowAddTestimonialForm}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <Plus className="w-3 h-3 mr-1" />
                      إضافة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>إضافة شهادة جديدة</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerName" className="text-sm font-medium">اسم العميل</Label>
                          <Input
                            id="customerName"
                            value={newTestimonial.customerName || ''}
                            onChange={(e) => setNewTestimonial(prev => ({...prev, customerName: e.target.value}))}
                            placeholder="أحمد محمد"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="rating" className="text-sm font-medium">التقييم</Label>
                          <Select
                            value={String(newTestimonial.rating || 5)}
                            onValueChange={(value) => setNewTestimonial(prev => ({...prev, rating: Number(value)}))}
                          >
                            <SelectTrigger id="rating">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                              <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                              <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                              <SelectItem value="2">⭐⭐ (2)</SelectItem>
                              <SelectItem value="1">⭐ (1)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="comment" className="text-sm font-medium">نص الشهادة</Label>
                        <Textarea
                          id="comment"
                          value={newTestimonial.comment || ''}
                          onChange={(e) => setNewTestimonial(prev => ({...prev, comment: e.target.value}))}
                          placeholder="منتج رائع! أنصح به بشدة..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productName" className="text-sm font-medium">اسم المنتج (اختياري)</Label>
                        <Input
                          id="productName"
                          value={newTestimonial.productName || ''}
                          onChange={(e) => setNewTestimonial(prev => ({...prev, productName: e.target.value}))}
                          placeholder="سماعات بلوتوث لاسلكية"
                        />
                      </div>

                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Switch
                          id="verified"
                          checked={newTestimonial.verified ?? true}
                          onCheckedChange={(checked) => setNewTestimonial(prev => ({...prev, verified: checked}))}
                        />
                        <Label htmlFor="verified" className="text-sm">شهادة موثقة</Label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddTestimonialForm(false)}>
                        إلغاء
                      </Button>
                      <Button 
                        onClick={handleAddNewTestimonial}
                        disabled={!newTestimonial.customerName || !newTestimonial.comment}
                      >
                        إضافة الشهادة
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {selectedTestimonials.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {selectedTestimonials.map((testimonial, index) => (
                    <Card key={testimonial.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0">
                            {testimonial.customerAvatar ? (
                              <img 
                                src={testimonial.customerAvatar} 
                                alt={testimonial.customerName || 'عميل'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (testimonial.customerName || 'عميل').substring(0, 2)
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-sm">{testimonial.customerName || 'عميل'}</div>
                              {testimonial.verified && (
                                <Badge variant="outline" className="h-5 text-[10px] bg-green-50 text-green-700">
                                  <Shield className="w-2.5 h-2.5 mr-1" />
                                  موثق
                                </Badge>
                              )}
                              {renderStarRating(testimonial.rating || 5)}
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {testimonial.comment}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestimonialFromSelection(testimonial.id)}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">لم يتم اختيار أي شهادات بعد</p>
                  <p className="text-xs text-muted-foreground">
                    اختر من الشهادات الموجودة أو أضف شهادات جديدة
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PropertySection>
    </div>
  )
}

export default TestimonialsEditor 