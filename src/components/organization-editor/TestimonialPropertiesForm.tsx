import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Star, 
  Eye, 
  Settings, 
  Plus, 
  X, 
  Search, 
  CheckCircle, 
  AlertCircle,
  User,
  MessageSquare,
  ThumbsUp,
  Clock,
  Image as ImageIcon,
  GripVertical,
  Play,
  Pause,
  Navigation,
  BarChart3
} from 'lucide-react';
import { TestimonialSectionSettings, Testimonial, TestimonialEditorProps } from './types';
import { getTestimonials, createTestimonial } from '@/lib/api/testimonials';
import { useTenant } from '@/context/TenantContext';

export const TestimonialPropertiesForm: React.FC<TestimonialEditorProps> = ({
  settings,
  onChange,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const { currentOrganization } = useTenant();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedTestimonials, setSelectedTestimonials] = useState<Testimonial[]>([]);
  const [showTestimonialPicker, setShowTestimonialPicker] = useState(false);
  const [testimonialSearchQuery, setTestimonialSearchQuery] = useState('');
  const [testimonialPickerView, setTestimonialPickerView] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    customer_name: '',
    customer_avatar: '',
    rating: 5,
    comment: '',
    product_name: '',
    product_image: '',
    verified: false
  });

  // تحميل الشهادات من قاعدة البيانات
  const loadTestimonials = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const data = await getTestimonials(currentOrganization.id, {
        active: true,
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      setTestimonials(data || []);
    } catch (error) {
      console.error('خطأ في جلب الشهادات:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadTestimonials();
    }
  }, [currentOrganization?.id, loadTestimonials]);

  // تحديث الشهادات المحددة عند تغيير الإعدادات
  useEffect(() => {
    if (settings.selectedTestimonials && Array.isArray(settings.selectedTestimonials)) {
      const testimonialsFromSettings = settings.selectedTestimonials
        .map(testimonialId => testimonials.find(testimonial => testimonial.id === testimonialId))
        .filter(testimonial => testimonial !== undefined) as Testimonial[];
      
      setSelectedTestimonials(testimonialsFromSettings);
    }
  }, [settings.selectedTestimonials, testimonials]);

  // تصفية الشهادات حسب البحث
  const filteredTestimonials = useMemo(() => {
    if (!testimonialSearchQuery) return testimonials;
    
    return testimonials.filter(testimonial =>
      testimonial.customer_name.toLowerCase().includes(testimonialSearchQuery.toLowerCase()) ||
      testimonial.comment.toLowerCase().includes(testimonialSearchQuery.toLowerCase()) ||
      testimonial.product_name?.toLowerCase().includes(testimonialSearchQuery.toLowerCase())
    );
  }, [testimonials, testimonialSearchQuery]);

  // إضافة شهادة للاختيار
  const addTestimonialToSelection = useCallback((testimonial: Testimonial) => {
    if (!selectedTestimonials.find(t => t.id === testimonial.id)) {
      const newSelection = [...selectedTestimonials, testimonial];
      setSelectedTestimonials(newSelection);
      const testimonialIds = newSelection.map(t => t.id);
      onChange({ selectedTestimonials: testimonialIds });
    }
  }, [selectedTestimonials, onChange]);

  // إزالة شهادة من الاختيار
  const removeTestimonialFromSelection = useCallback((testimonialId: string) => {
    const newSelection = selectedTestimonials.filter(t => t.id !== testimonialId);
    setSelectedTestimonials(newSelection);
    onChange({ selectedTestimonials: newSelection.map(t => t.id) });
  }, [selectedTestimonials, onChange]);

  // إنشاء شهادة جديدة
  const handleCreateTestimonial = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setIsCreating(true);
    try {
      const createdTestimonial = await createTestimonial(currentOrganization.id, newTestimonial);
      
      // إضافة الشهادة الجديدة للقائمة
      setTestimonials(prev => [createdTestimonial, ...prev]);
      
      // إضافة الشهادة للاختيار تلقائياً
      addTestimonialToSelection(createdTestimonial);
      
      // إعادة تعيين النموذج
      setNewTestimonial({
        customer_name: '',
        customer_avatar: '',
        rating: 5,
        comment: '',
        product_name: '',
        product_image: '',
        verified: false
      });
      
      setShowCreateForm(false);
    } catch (error) {
      console.error('خطأ في إنشاء الشهادة:', error);
    } finally {
      setIsCreating(false);
    }
  }, [currentOrganization?.id, newTestimonial, addTestimonialToSelection]);

  // الحصول على قائمة الشهادات المناسبة للعرض
  const getTestimonialsToDisplay = useCallback(() => {
    return selectedTestimonials;
  }, [selectedTestimonials]);

  // رندر بطاقة شهادة صغيرة
  const renderTestimonialCard = (testimonial: Testimonial, isSelected: boolean = false, compact: boolean = false) => {
    const hasAvatar = testimonial.customer_avatar && testimonial.customer_avatar.trim() !== '';
    
    return (
      <div className={`border rounded-lg p-3 transition-all duration-200 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      } ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-start gap-3">
          {/* صورة العميل */}
          <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden bg-muted flex-shrink-0`}>
            {hasAvatar ? (
              <img
                src={testimonial.customer_avatar}
                alt={testimonial.customer_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <User className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
              </div>
            )}
          </div>

          {/* محتوى الشهادة */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`font-medium text-foreground truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {testimonial.customer_name}
              </h4>
              {testimonial.verified && (
                <Badge variant="secondary" className="text-xs">
                  ✓ موثق
                </Badge>
              )}
            </div>
            
            {/* التقييم */}
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${
                    star <= testimonial.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                {testimonial.rating}/5
              </span>
            </div>

            {/* التعليق */}
            <p className={`text-muted-foreground line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
              "{testimonial.comment}"
            </p>

            {/* معلومات المنتج */}
            {testimonial.product_name && (
              <div className="mt-2 flex items-center gap-2">
                <ImageIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
                <span className={`text-muted-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {testimonial.product_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* العنوان والوصف */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">عنوان القسم</Label>
          <Input
            value={settings.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="أدخل عنوان القسم"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">الوصف</Label>
          <Textarea
            value={settings.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="أدخل وصف القسم"
            className="text-sm min-h-[80px]"
          />
        </div>
      </section>

      <Separator />

      {/* إعدادات العرض */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">إعدادات العرض</Label>
        </div>

        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-1' : 
          isTablet ? 'grid-cols-2' : 
          isDesktop && "grid-cols-3"
        }`}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs sm:text-sm">طريقة العرض</Label>
              <Select
                value={settings.displayStyle}
                onValueChange={(value) => onChange({ displayStyle: value as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر طريقة العرض" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carousel">عرض متحرك</SelectItem>
                  <SelectItem value="grid">شبكة</SelectItem>
                  <SelectItem value="list">قائمة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs sm:text-sm">عدد الشهادات المعروضة</Label>
              <div className="mt-2">
                <Slider
                  value={[settings.maxTestimonials]}
                  onValueChange={(value) => onChange({ maxTestimonials: value[0] })}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span className="font-medium">{settings.maxTestimonials} شهادة</span>
                  <span>20</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">التشغيل التلقائي</Label>
              <Switch
                checked={settings.autoPlay}
                onCheckedChange={(checked) => onChange({ autoPlay: checked })}
              />
            </div>

            {settings.autoPlay && (
              <div>
                <Label className="text-xs sm:text-sm">مدة الانتظار (ثانية)</Label>
                <div className="mt-2">
                  <Slider
                    value={[settings.autoPlayDelay / 1000]}
                    onValueChange={(value) => onChange({ autoPlayDelay: value[0] * 1000 })}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1</span>
                    <span className="font-medium">{settings.autoPlayDelay / 1000} ثانية</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار التقييمات</Label>
              <Switch
                checked={settings.showRating}
                onCheckedChange={(checked) => onChange({ showRating: checked })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">أزرار التنقل</Label>
              <Switch
                checked={settings.showNavigation}
                onCheckedChange={(checked) => onChange({ showNavigation: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">إظهار الإحصائيات</Label>
              <Switch
                checked={settings.showStats}
                onCheckedChange={(checked) => onChange({ showStats: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">معلومات المنتج</Label>
              <Switch
                checked={settings.showProductInfo}
                onCheckedChange={(checked) => onChange({ showProductInfo: checked })}
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs sm:text-sm">لون الخلفية</Label>
          <Select
            value={settings.backgroundStyle}
            onValueChange={(value) => onChange({ backgroundStyle: value as any })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="اختر لون الخلفية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">فاتح</SelectItem>
              <SelectItem value="dark">داكن</SelectItem>
              <SelectItem value="muted">هادئ</SelectItem>
              <SelectItem value="gradient">متدرج</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      {/* اختيار الشهادات */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">اختيار الشهادات</Label>
        </div>

        {/* عرض الشهادات المحددة */}
        {selectedTestimonials.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs sm:text-sm font-medium">الشهادات المحددة</Label>
                <Badge variant="secondary" className="text-xs">
                  {selectedTestimonials.length} شهادة
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTestimonials([]);
                  onChange({ selectedTestimonials: [] });
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                مسح الكل
              </Button>
            </div>
            <ScrollArea className="h-48 border rounded-lg p-3 bg-muted/20">
              <div className="space-y-3">
                {selectedTestimonials.map((testimonial, index) => (
                  <div key={testimonial.id} className="flex items-center gap-3 p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                      <div className="w-1 h-6 bg-primary/30 rounded-full"></div>
                    </div>
                    {renderTestimonialCard(testimonial, false, true)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestimonialFromSelection(testimonial.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="إزالة الشهادة"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* أزرار إدارة الشهادات */}
        <div className="flex gap-2">
          <Dialog open={showTestimonialPicker} onOpenChange={setShowTestimonialPicker}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? 'جاري التحميل...' : 'اختيار شهادات'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>اختيار الشهادات</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* شريط البحث */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الشهادات..."
                      value={testimonialSearchQuery}
                      onChange={(e) => setTestimonialSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={testimonialPickerView === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestimonialPickerView('grid')}
                      className="h-8 w-8 p-0"
                      title="عرض شبكة"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-1 h-1 bg-current rounded"></div>
                        <div className="w-1 h-1 bg-current rounded"></div>
                        <div className="w-1 h-1 bg-current rounded"></div>
                        <div className="w-1 h-1 bg-current rounded"></div>
                      </div>
                    </Button>
                    <Button
                      variant={testimonialPickerView === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestimonialPickerView('list')}
                      className="h-8 w-8 p-0"
                      title="عرض قائمة"
                    >
                      <div className="space-y-1">
                        <div className="w-3 h-0.5 bg-current rounded"></div>
                        <div className="w-3 h-0.5 bg-current rounded"></div>
                        <div className="w-3 h-0.5 bg-current rounded"></div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* قائمة الشهادات */}
                <ScrollArea className="h-96">
                  {filteredTestimonials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد شهادات متاحة</p>
                    </div>
                  ) : (
                    <div className={`gap-3 ${
                      testimonialPickerView === 'grid' 
                        ? 'grid grid-cols-2 md:grid-cols-3' 
                        : 'space-y-2'
                    }`}>
                      {filteredTestimonials.map(testimonial => {
                        const isSelected = selectedTestimonials.some(t => t.id === testimonial.id);
                        return (
                          <TooltipProvider key={testimonial.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`relative cursor-pointer transition-all duration-200 ${
                                    isSelected ? 'opacity-50' : 'hover:scale-105'
                                  }`}
                                  onClick={() => {
                                    if (!isSelected) {
                                      addTestimonialToSelection(testimonial);
                                    }
                                  }}
                                >
                                  {renderTestimonialCard(testimonial, isSelected, testimonialPickerView === 'list')}
                                  {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg z-10">
                                      <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {isSelected ? 'تم اختيار هذه الشهادة' : 'انقر لاختيار هذه الشهادة'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* معلومات إضافية */}
                <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                  <span>تم اختيار {selectedTestimonials.length} شهادة</span>
                  <div className="flex items-center gap-2">
                    <span>متاح {filteredTestimonials.length} شهادة</span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowTestimonialPicker(false)}
                      className="h-8"
                    >
                      تم
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="default" 
            onClick={() => setShowCreateForm(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            إنشاء شهادة جديدة
          </Button>
        </div>

        {/* نموذج إنشاء شهادة جديدة */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>إنشاء شهادة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">اسم العميل *</Label>
                  <Input
                    value={newTestimonial.customer_name}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="أدخل اسم العميل"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">صورة العميل</Label>
                  <Input
                    value={newTestimonial.customer_avatar}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, customer_avatar: e.target.value }))}
                    placeholder="رابط الصورة (اختياري)"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">التقييم *</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[newTestimonial.rating]}
                    onValueChange={(value) => setNewTestimonial(prev => ({ ...prev, rating: value[0] }))}
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= newTestimonial.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm font-medium ml-2">{newTestimonial.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">التعليق *</Label>
                <Textarea
                  value={newTestimonial.comment}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="أدخل تعليق العميل"
                  className="text-sm min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">اسم المنتج</Label>
                  <Input
                    value={newTestimonial.product_name}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="اسم المنتج (اختياري)"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">صورة المنتج</Label>
                  <Input
                    value={newTestimonial.product_image}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, product_image: e.target.value }))}
                    placeholder="رابط صورة المنتج (اختياري)"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="verified"
                    checked={newTestimonial.verified}
                    onCheckedChange={(checked) => setNewTestimonial(prev => ({ ...prev, verified: checked }))}
                  />
                  <Label htmlFor="verified" className="text-sm">شهادة موثقة</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreateTestimonial}
                  disabled={isCreating || !newTestimonial.customer_name.trim() || !newTestimonial.comment.trim()}
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الشهادة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* حالة فارغة */}
        {selectedTestimonials.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لم يتم اختيار أي شهادات. انقر على "اختيار شهادات" لبدء الاختيار أو "إنشاء شهادة جديدة" لإضافة شهادة.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <Separator />

      {/* Preview Section */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">معاينة الشهادات</Label>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              معاينة مبسطة لكيفية ظهور الشهادات.
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 sm:text-[10px] sm:px-2 sm:py-1 w-fit">
            {getTestimonialsToDisplay().length} شهادة
          </Badge>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-sm font-semibold mb-2">{settings.title}</h3>
          <p className="text-xs text-muted-foreground mb-4">{settings.subtitle}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getTestimonialsToDisplay().slice(0, settings.maxTestimonials).map((testimonial) => (
              <div key={testimonial.id} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs">{testimonial.customer_name}</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= testimonial.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  "{testimonial.comment}"
                </p>
              </div>
            ))}
          </div>
          
          {settings.showStats && (
            <div className="mt-4 p-3 bg-muted/20 rounded text-center">
              <div className="text-xs text-muted-foreground">إحصائيات التقييمات</div>
              <div className="text-lg font-bold">4.8/5</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};