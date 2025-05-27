import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash, ChevronDown, Star, X, Edit, PlusCircle, Save, Search, Check } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

interface TestimonialsEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
}

// Product Picker Component
const ProductPicker = ({ onSelectProduct, currentProductId = null }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { tenant } = useTenant();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!tenant?.id) return;
      
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, images, slug')
          .eq('tenant_id', tenant.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [tenant?.id]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="ابحث عن منتج..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-9"
        />
      </div>
      
      <ScrollArea className="h-[200px] border rounded-md">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              جاري التحميل...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {searchTerm ? 'لا توجد منتجات مطابقة للبحث' : 'لا توجد منتجات'}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  currentProductId === product.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelectProduct(product)}
              >
                <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-xs">
                      صورة
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {product.price.toLocaleString()} دج
                  </p>
                </div>
                {currentProductId === product.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Testimonial Form Component
const TestimonialForm = ({ 
  testimonial = {
    id: `testimonial-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    customerName: '',
    customerAvatar: '',
    rating: 5,
    comment: '',
    verified: true,
    purchaseDate: new Date().toISOString(),
    productId: '',
    productName: '',
    productImage: '',
    productSlug: ''
  }, 
  onSave,
  submitLabel = 'حفظ'
}) => {
  const [formData, setFormData] = useState(testimonial);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] || '',
      productSlug: product.slug || ''
    }));
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setFormData(prev => ({
      ...prev,
      productId: '',
      productName: '',
      productImage: '',
      productSlug: ''
    }));
  };

  return (
    <div className="flex flex-col">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="general">البيانات الأساسية</TabsTrigger>
          <TabsTrigger value="product">المنتج</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-xs font-medium">
                اسم العميل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                placeholder="أدخل اسم العميل"
                className="h-9"
              />
              {!formData.customerName && (
                <p className="text-xs text-muted-foreground">
                  اسم العميل مطلوب
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs font-medium">التقييم</Label>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleChange('rating', i + 1)}
                      className="p-0.5 focus:outline-none"
                    >
                      <Star 
                        className={`h-6 w-6 transition-colors duration-150 ${
                          i < formData.rating 
                            ? 'text-yellow-400 fill-yellow-400' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {formData.rating} من 5
                </span>
              </div>
            </div>
          </div>
        
          <div className="space-y-2 mt-2">
            <Label htmlFor="comment" className="text-xs font-medium">
              نص التعليق <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="أدخل نص التعليق"
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                {!formData.comment ? 
                  "التعليق مطلوب" : 
                  formData.comment.length > 200 ? 
                    "التعليق طويل جداً" : 
                    ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.comment.length}/200
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="space-y-3">
              <Label className="text-xs font-medium">صورة العميل (اختياري)</Label>
              <div className="aspect-square max-w-[140px]">
                <ImageUploader
                  imageUrl={formData.customerAvatar}
                  onImageUploaded={(url) => handleChange('customerAvatar', url)}
                  folder="testimonials"
                  maxSizeInMB={1}
                  aspectRatio="1:1"
                  className="h-full border rounded-full overflow-hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                صورة دائرية، الحجم المفضل 100×100 بكسل
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="verified" 
                  checked={formData.verified}
                  onCheckedChange={(checked) => handleChange('verified', Boolean(checked))}
                />
                <Label 
                  htmlFor="verified" 
                  className="text-sm cursor-pointer"
                >
                  عميل موثق (مؤكد الشراء)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pr-6">
                تظهر علامة التوثيق بجانب اسم العميل كإشارة إلى أنه عميل حقيقي قام بشراء المنتج.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="product" className="space-y-4">
          <div className="p-3 bg-muted/20 border rounded-md mb-4">
            <h3 className="text-sm font-medium mb-1">اختيار المنتج</h3>
            <p className="text-xs text-muted-foreground">
              اختر المنتج الذي قام العميل بشرائه وتقييمه. يساعد ذلك في زيادة مصداقية الرأي وتحسين تجربة المتسوق.
            </p>
          </div>
          
          {selectedProduct || formData.productId ? (
            <div className="space-y-4">
              <div className="border p-4 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {formData.productImage ? (
                        <img 
                          src={formData.productImage} 
                          alt={formData.productName} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-xs">
                          صورة
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{formData.productName}</h3>
                      {selectedProduct && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedProduct.price.toLocaleString()} دج
                        </p>
                      )}
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={handleClearProduct}
                        >
                          <X className="h-3.5 w-3.5" /> 
                          <span>إزالة المنتج</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchaseDate" className="text-xs font-medium">تاريخ الشراء</Label>
                <Input
                  type="date"
                  id="purchaseDate"
                  value={formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('purchaseDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="h-9"
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium mb-2">اختر منتجاً</h3>
              <ProductPicker 
                onSelectProduct={handleSelectProduct}
                currentProductId={formData.productId}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="mt-6 gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">إلغاء</Button>
        </DialogClose>
        <Button 
          onClick={() => onSave(formData)}
          className="gap-1"
          disabled={!formData.customerName || !formData.comment}
        >
          <Save className="h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
};

// عنصر عرض تقييم النجوم
const StarRating = ({ rating }) => {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star 
          key={i}
          className={`h-3 w-3 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
};

const TestimonialsEditor: React.FC<TestimonialsEditorProps> = ({
  settings,
  updateSetting,
  addArrayItem,
  removeArrayItem,
  updateArrayItem,
}) => {
  const [editIndex, setEditIndex] = useState(null);
  
  // إضافة رأي جديد
  const handleAddTestimonial = (testimonial) => {
    addArrayItem('testimonials', testimonial);
  };
  
  // تعديل رأي موجود
  const handleUpdateTestimonial = (testimonial, index) => {
    updateArrayItem('testimonials', index, testimonial);
    setEditIndex(null);
  };

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible defaultValue="content" className="w-full">
        <AccordionItem value="content" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-primary">Aa</div>
              </div>
              <span>المحتوى الرئيسي</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-medium">العنوان الرئيسي</Label>
                <Input
                  id="title"
                  value={settings.title || 'آراء عملائنا'}
                  onChange={(e) => updateSetting('title', e.target.value)}
                  placeholder="أدخل العنوان الرئيسي"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium">الوصف</Label>
                <Textarea
                  id="description"
                  value={settings.description || 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا'}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  placeholder="أدخل وصفاً للقسم"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="visibleCount" className="text-xs font-medium">عدد العناصر المرئية</Label>
                <Select
                  value={String(settings.visibleCount || '3')}
                  onValueChange={(value) => updateSetting('visibleCount', Number(value))}
                >
                  <SelectTrigger id="visibleCount" className="h-9">
                    <SelectValue placeholder="عدد العناصر المرئية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">عنصر واحد</SelectItem>
                    <SelectItem value="2">عنصران</SelectItem>
                    <SelectItem value="3">ثلاثة عناصر</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  سيتم عرض هذا العدد من آراء العملاء في كل شريحة، وسيتغير تلقائيًا حسب حجم الشاشة.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="testimonials" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-blue-600">👤</div>
              </div>
              <span>آراء العملاء</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm">قائمة آراء العملاء ({settings.testimonials?.length || 0})</h3>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 h-8 text-xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>إضافة رأي</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>إضافة رأي جديد</DialogTitle>
                    </DialogHeader>
                    <TestimonialForm 
                      onSave={handleAddTestimonial}
                      submitLabel="إضافة الرأي"
                    />
                  </DialogContent>
                </Dialog>
              </div>
              
              {!settings.testimonials || settings.testimonials.length === 0 ? (
                <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Star className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">لا توجد آراء مضافة</h3>
                  <p className="text-xs max-w-xs mx-auto mb-4">أضف آراء العملاء لزيادة الثقة في متجرك وتحسين تجربة العملاء.</p>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>إضافة أول رأي</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>إضافة رأي جديد</DialogTitle>
                      </DialogHeader>
                      <TestimonialForm 
                        onSave={handleAddTestimonial}
                        submitLabel="إضافة الرأي"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-md border">
                  <div className="p-2">
                    <ScrollArea className="h-[320px] pr-2">
                      <div className="space-y-1.5">
                        {settings.testimonials.map((testimonial, index) => (
                          <div 
                            key={testimonial.id} 
                            className="bg-background border rounded-md p-3 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden">
                                  {testimonial.customerAvatar ? (
                                    <img 
                                      src={testimonial.customerAvatar} 
                                      alt={testimonial.customerName} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    testimonial.customerName.substring(0, 2)
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{testimonial.customerName}</div>
                                  <div className="flex items-center gap-2">
                                    <StarRating rating={testimonial.rating} />
                                    {testimonial.verified && (
                                      <Badge variant="outline" className="h-5 text-[10px] bg-green-50 text-green-700 hover:bg-green-50">
                                        موثق
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full hover:bg-muted"
                                    >
                                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="sr-only">تعديل</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                      <DialogTitle>تعديل رأي العميل</DialogTitle>
                                    </DialogHeader>
                                    <TestimonialForm 
                                      testimonial={testimonial}
                                      onSave={(updatedTestimonial) => handleUpdateTestimonial(updatedTestimonial, index)}
                                      submitLabel="تحديث الرأي"
                                    />
                                  </DialogContent>
                                </Dialog>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full hover:bg-red-50 hover:text-red-600"
                                  onClick={() => removeArrayItem('testimonials', index)}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                  <span className="sr-only">حذف</span>
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-sm my-2 text-muted-foreground">
                              {testimonial.comment}
                            </div>
                            
                            {(testimonial.productName || testimonial.productImage) && (
                              <div className="flex gap-3 mt-3 pt-2 border-t text-xs">
                                {testimonial.productImage && (
                                  <div className="w-10 h-10 rounded-md border overflow-hidden flex-shrink-0">
                                    <img 
                                      src={testimonial.productImage} 
                                      alt={testimonial.productName || "المنتج"} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col justify-center">
                                  <div className="text-muted-foreground">المنتج:</div>
                                  <div className={`font-medium ${testimonial.productSlug ? 'text-primary' : ''}`}>
                                    {testimonial.productName}
                                    {testimonial.productSlug && (
                                      <Badge variant="secondary" className="mr-2 h-5 text-[10px]">
                                        يدعم الانتقال
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="styles" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-purple-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-purple-600">🎨</div>
              </div>
              <span>المظهر والأنماط</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundColor" className="text-xs font-medium">خلفية القسم</Label>
                <Select
                  value={settings.backgroundColor || 'default'}
                  onValueChange={(value) => updateSetting('backgroundColor', value)}
                >
                  <SelectTrigger id="backgroundColor" className="h-9">
                    <SelectValue placeholder="اختر لون الخلفية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">افتراضية</SelectItem>
                    <SelectItem value="light">فاتحة</SelectItem>
                    <SelectItem value="dark">داكنة</SelectItem>
                    <SelectItem value="primary">رئيسية</SelectItem>
                    <SelectItem value="accent">مميزة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardStyle" className="text-xs font-medium">نمط البطاقات</Label>
                <Select
                  value={settings.cardStyle || 'default'}
                  onValueChange={(value) => updateSetting('cardStyle', value)}
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TestimonialsEditor;
