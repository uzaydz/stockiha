import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Star, Check, X, Layout, Palette, Users } from 'lucide-react';
import { TestimonialsSettings, TestimonialItem } from '../landing-page/TestimonialsComponent';
import ImageUploader from "@/components/ui/ImageUploader";
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TestimonialsComponentEditorProps {
  settings: TestimonialsSettings;
  onSettingsChange: (settings: TestimonialsSettings) => void;
}

interface SortableItemProps {
  id: string;
  item: TestimonialItem;
  onEdit: (id: string, field: keyof TestimonialItem, value: any) => void;
  onDelete: (id: string) => void;
  onImageUploaded: (id: string, url: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, item, onEdit, onDelete, onImageUploaded }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4 hover:shadow-lg transition-all w-full max-w-full overflow-hidden"
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            type="button"
            className="cursor-grab text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <span className="font-medium truncate">{item.name || 'تقييم جديد'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full h-8 w-8 p-0 flex-shrink-0"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <div className="space-y-3 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`name-${id}`} className="text-sm font-medium mb-1 block">اسم العميل</Label>
            <Input
              id={`name-${id}`}
              value={item.name}
              onChange={(e) => onEdit(id, 'name', e.target.value)}
              placeholder="اسم العميل"
              className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary h-9"
            />
          </div>
          <div>
            <Label htmlFor={`role-${id}`} className="text-sm font-medium mb-1 block">المسمى الوظيفي</Label>
            <Input
              id={`role-${id}`}
              value={item.role || ''}
              onChange={(e) => onEdit(id, 'role', e.target.value)}
              placeholder="المسمى الوظيفي للعميل (اختياري)"
              className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary h-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`comment-${id}`} className="text-sm font-medium mb-1 block">نص التقييم</Label>
          <Textarea
            id={`comment-${id}`}
            value={item.comment}
            onChange={(e) => onEdit(id, 'comment', e.target.value)}
            placeholder="رأي العميل حول المنتج أو الخدمة"
            rows={2}
            className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <Label htmlFor={`rating-${id}`} className="text-sm font-medium mb-1 block">التقييم ({item.rating})</Label>
          <div className="flex items-center gap-3 mt-1">
            <Slider
              id={`rating-${id}`}
              value={[item.rating]}
              min={1}
              max={5}
              step={0.5}
              onValueChange={(value) => onEdit(id, 'rating', value[0])}
              className="flex-1"
            />
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((val) => (
                <Star
                  key={val}
                  className={`w-4 h-4 ${
                    val <= item.rating
                      ? 'text-yellow-500 fill-yellow-500'
                      : val - 0.5 === item.rating
                      ? 'text-yellow-500 fill-yellow-500 opacity-50'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor={`avatar-${id}`} className="text-sm font-medium mb-1 block">صورة العميل</Label>
          <div className="mt-1 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <ImageUploader
              imageUrl={item.avatar}
              onImageUploaded={(url) => onImageUploaded(id, url)}
              label="اختر صورة"
              folder="testimonials"
              maxSizeInMB={1}
              aspectRatio="1:1"
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialsComponentEditor: React.FC<TestimonialsComponentEditorProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [dbTestimonials, setDbTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useTenant();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch testimonials from the database when component mounts
  useEffect(() => {
    if (tenant?.id) {
      fetchTestimonials();
    }
  }, [tenant?.id]);

  const fetchTestimonials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('customer_testimonials')
        .select('*')
        .eq('organization_id', tenant?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDbTestimonials(data || []);
    } catch (err) {
      setError('حدث خطأ أثناء جلب التقييمات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save testimonial to the database
  const saveTestimonialToDb = async (testimonial: TestimonialItem) => {
    try {
      const { data, error } = await supabase
        .from('customer_testimonials')
        .insert([{
          organization_id: tenant?.id,
          customer_name: testimonial.name,
          customer_avatar: testimonial.avatar,
          rating: testimonial.rating,
          comment: testimonial.comment,
          verified: true,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh the list
      await fetchTestimonials();
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Map database testimonial to component format
  const mapDbTestimonialToItem = (dbTestimonial: any): TestimonialItem => {
    return {
      id: dbTestimonial.id,
      name: dbTestimonial.customer_name,
      role: dbTestimonial.product_name || '',
      avatar: dbTestimonial.customer_avatar || '',
      comment: dbTestimonial.comment,
      rating: dbTestimonial.rating
    };
  };

  // Check if testimonial is already added to the component
  const isTestimonialAdded = (id: string) => {
    return settings.items.some(item => item.id === id);
  };

  // Add testimonial from database to component
  const addTestimonialFromDb = (dbTestimonial: any) => {
    if (isTestimonialAdded(dbTestimonial.id)) return;
    
    const newItem = mapDbTestimonialToItem(dbTestimonial);
    handleSettingsChange('items', [...settings.items, newItem]);
  };

  // Remove testimonial from component (not from database)
  const removeTestimonialFromComponent = (id: string) => {
    const updatedItems = settings.items.filter(item => item.id !== id);
    handleSettingsChange('items', updatedItems);
  };

  const handleSettingsChange = <K extends keyof TestimonialsSettings>(
    key: K,
    value: TestimonialsSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleItemChange = (id: string, field: keyof TestimonialItem, value: any) => {
    const updatedItems = settings.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    handleSettingsChange('items', updatedItems);
  };

  const handleAddItem = () => {
    const newItem: TestimonialItem = {
      id: uuidv4(),
      name: 'عميل جديد',
      role: 'الوظيفة',
      avatar: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70),
      comment: 'أضف رأي العميل هنا...',
      rating: 5,
    };
    handleSettingsChange('items', [...settings.items, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = settings.items.filter((item) => item.id !== id);
    handleSettingsChange('items', updatedItems);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = settings.items.findIndex((item) => item.id === active.id);
      const newIndex = settings.items.findIndex((item) => item.id === over.id);
      const newItems = [...settings.items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      handleSettingsChange('items', newItems);
    }
  };

  const handleImageUploaded = (id: string, url: string) => {
    handleItemChange(id, 'avatar', url);
  };

  // Add new testimonial to database and component
  const handleAddAndSaveItem = async () => {
    try {
      const newItem: TestimonialItem = {
        id: uuidv4(),
        name: 'عميل جديد',
        role: 'الوظيفة',
        avatar: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70),
        comment: 'أضف رأي العميل هنا...',
        rating: 5,
      };

      if (settings.useDbTestimonials) {
        // Save to DB first
        const savedTestimonial = await saveTestimonialToDb(newItem);
        if (savedTestimonial) {
          // Use the ID from the database
          const mappedItem = mapDbTestimonialToItem(savedTestimonial);
          handleSettingsChange('items', [...settings.items, mappedItem]);
        }
      } else {
        // Just add to local items
        handleSettingsChange('items', [...settings.items, newItem]);
      }
    } catch (err) {
    }
  };

  // استخدام أسلوب inline لضمان تحديد الأبعاد بشكل صحيح
  const containerStyle = {
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden' as const,
  };

  return (
    <div style={containerStyle} className="testimonials-editor-container max-w-full">
      <Card className="border border-gray-200 shadow-md w-full overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 py-4">
          <CardTitle className="text-xl font-bold text-emerald-800">تعديل مكون آراء العملاء</CardTitle>
          <CardDescription className="text-emerald-700 text-sm">
            قم بتخصيص مظهر وإعدادات مكون آراء العملاء 
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 w-full flex justify-start bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
              <TabsTrigger 
                value="general" 
                className={cn(
                  "flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5",
                  "transition-all data-[state=active]:text-emerald-700 data-[state=active]:font-medium whitespace-nowrap text-sm"
                )}
              >
                <Layout size={14} />
                إعدادات عامة
              </TabsTrigger>
              <TabsTrigger 
                value="style" 
                className={cn(
                  "flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5",
                  "transition-all data-[state=active]:text-emerald-700 data-[state=active]:font-medium whitespace-nowrap text-sm"
                )}
              >
                <Palette size={14} />
                التصميم
              </TabsTrigger>
              <TabsTrigger 
                value="testimonials" 
                className={cn(
                  "flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5",
                  "transition-all data-[state=active]:text-emerald-700 data-[state=active]:font-medium whitespace-nowrap text-sm"
                )}
              >
                <Users size={14} />
                التقييمات
              </TabsTrigger>
              <TabsTrigger 
                value="database" 
                className={cn(
                  "flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5",
                  "transition-all data-[state=active]:text-emerald-700 data-[state=active]:font-medium whitespace-nowrap text-sm"
                )}
              >
                <Star size={14} />
                تقييمات من قاعدة البيانات
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4 mt-2 overflow-x-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium mb-1 block">العنوان الرئيسي</Label>
                    <Input
                      id="title"
                      value={settings.title}
                      onChange={(e) => handleSettingsChange('title', e.target.value)}
                      placeholder="آراء عملائنا"
                      className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subtitle" className="text-sm font-medium mb-1 block">النص الفرعي</Label>
                    <Textarea
                      id="subtitle"
                      value={settings.subtitle}
                      onChange={(e) => handleSettingsChange('subtitle', e.target.value)}
                      placeholder="تعرف على تجارب عملائنا السابقين مع منتجاتنا وخدماتنا"
                      className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px] resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-medium mb-2 text-gray-700">إعدادات قاعدة البيانات</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="use-db-testimonials" className="text-sm cursor-pointer">استخدام تقييمات قاعدة البيانات</Label>
                        <Switch
                          id="use-db-testimonials"
                          checked={settings.useDbTestimonials || false}
                          onCheckedChange={(checked) => {
                            handleSettingsChange('useDbTestimonials', checked);
                            if (checked && tenant?.id) {
                              handleSettingsChange('organizationId', tenant.id);
                            }
                          }}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                      {settings.useDbTestimonials && (
                        <p className="text-xs text-gray-500 mt-1 border-t border-gray-200 pt-2">
                          سيتم عرض التقييمات النشطة من قاعدة البيانات. يمكنك إدارتها في قسم "تقييمات من قاعدة البيانات".
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="layout" className="text-sm font-medium mb-1 block">نمط العرض</Label>
                    <Select
                      value={settings.layout}
                      onValueChange={(value) => handleSettingsChange('layout', value as 'grid' | 'carousel' | 'masonry')}
                    >
                      <SelectTrigger id="layout" className="border-gray-300 focus:ring-emerald-500 h-9">
                        <SelectValue placeholder="اختر نمط العرض" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">شبكة</SelectItem>
                        <SelectItem value="carousel">شريط متحرك</SelectItem>
                        <SelectItem value="masonry">تدرج عمودي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.layout === 'grid' && (
                    <div>
                      <Label htmlFor="columns" className="text-sm font-medium mb-1 block">عدد الأعمدة</Label>
                      <Select
                        value={settings.columns.toString()}
                        onValueChange={(value) => handleSettingsChange('columns', parseInt(value))}
                      >
                        <SelectTrigger id="columns" className="border-gray-300 focus:ring-emerald-500 h-9">
                          <SelectValue placeholder="اختر عدد الأعمدة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">عمود واحد</SelectItem>
                          <SelectItem value="2">عمودان</SelectItem>
                          <SelectItem value="3">ثلاثة أعمدة</SelectItem>
                          <SelectItem value="4">أربعة أعمدة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-medium mb-2 text-gray-700">خيارات إضافية</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-ratings" className="text-sm cursor-pointer">إظهار التقييمات بالنجوم</Label>
                        <Switch
                          id="show-ratings"
                          checked={settings.showRatings}
                          onCheckedChange={(checked) => handleSettingsChange('showRatings', checked)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-avatars" className="text-sm cursor-pointer">إظهار صور العملاء</Label>
                        <Switch
                          id="show-avatars"
                          checked={settings.showAvatars}
                          onCheckedChange={(checked) => handleSettingsChange('showAvatars', checked)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {settings.showAvatars && (
                    <div>
                      <Label htmlFor="avatar-size" className="text-sm font-medium mb-1 block">حجم صور العملاء</Label>
                      <Select
                        value={settings.avatarSize}
                        onValueChange={(value) => handleSettingsChange('avatarSize', value as 'small' | 'medium' | 'large')}
                      >
                        <SelectTrigger id="avatar-size" className="border-gray-300 focus:ring-emerald-500 h-9">
                          <SelectValue placeholder="اختر حجم الصورة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">صغير</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="large">كبير</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="animation" className="text-sm font-medium mb-1 block">نوع الحركة</Label>
                    <Select
                      value={settings.animation}
                      onValueChange={(value) => handleSettingsChange('animation', value as 'none' | 'fade' | 'slide')}
                    >
                      <SelectTrigger id="animation" className="border-gray-300 focus:ring-emerald-500 h-9">
                        <SelectValue placeholder="اختر نوع الحركة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون حركة</SelectItem>
                        <SelectItem value="fade">تلاشي</SelectItem>
                        <SelectItem value="slide">انزلاق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Style Settings Tab */}
            <TabsContent value="style" className="space-y-4 mt-2 overflow-x-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="background-color" className="text-sm font-medium mb-1 block">لون الخلفية</Label>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="relative">
                        <Input
                          id="background-color"
                          type="color"
                          value={settings.backgroundColor}
                          onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ 
                            backgroundColor: settings.backgroundColor,
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                      </div>
                      <Input
                        type="text"
                        value={settings.backgroundColor}
                        onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                        className="flex-1 min-w-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="text-color" className="text-sm font-medium mb-1 block">لون النص</Label>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="relative">
                        <Input
                          id="text-color"
                          type="color"
                          value={settings.textColor}
                          onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ 
                            backgroundColor: settings.textColor,
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                      </div>
                      <Input
                        type="text"
                        value={settings.textColor}
                        onChange={(e) => handleSettingsChange('textColor', e.target.value)}
                        className="flex-1 min-w-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accent-color" className="text-sm font-medium mb-1 block">اللون المميز</Label>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="relative">
                        <Input
                          id="accent-color"
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ 
                            backgroundColor: settings.accentColor,
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                      </div>
                      <Input
                        type="text"
                        value={settings.accentColor}
                        onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                        className="flex-1 min-w-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cards-background-color" className="text-sm font-medium mb-1 block">لون خلفية البطاقات</Label>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="relative">
                        <Input
                          id="cards-background-color"
                          type="color"
                          value={settings.cardsBackgroundColor}
                          onChange={(e) => handleSettingsChange('cardsBackgroundColor', e.target.value)}
                          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ 
                            backgroundColor: settings.cardsBackgroundColor,
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                      </div>
                      <Input
                        type="text"
                        value={settings.cardsBackgroundColor}
                        onChange={(e) => handleSettingsChange('cardsBackgroundColor', e.target.value)}
                        className="flex-1 min-w-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cards-text-color" className="text-sm font-medium mb-1 block">لون نص البطاقات</Label>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="relative">
                        <Input
                          id="cards-text-color"
                          type="color"
                          value={settings.cardsTextColor}
                          onChange={(e) => handleSettingsChange('cardsTextColor', e.target.value)}
                          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        />
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{ 
                            backgroundColor: settings.cardsTextColor,
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                      </div>
                      <Input
                        type="text"
                        value={settings.cardsTextColor}
                        onChange={(e) => handleSettingsChange('cardsTextColor', e.target.value)}
                        className="flex-1 min-w-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-9"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                    <h3 className="text-sm font-medium mb-2 text-gray-700 pb-1 border-b border-gray-200">معاينة الألوان</h3>
                    <div className="rounded-lg overflow-hidden mt-2">
                      <div 
                        className="p-3 flex justify-center items-center text-center" 
                        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
                      >
                        <div>
                          <h4 className="font-bold text-sm mb-1">عنوان المكون</h4>
                          <p style={{ color: settings.textColor }} className="text-xs opacity-80">لون النص الرئيسي</p>
                        </div>
                      </div>
                      <div 
                        className="p-3 border-t border-l-2 rounded-lg mt-1" 
                        style={{ 
                          backgroundColor: settings.cardsBackgroundColor, 
                          color: settings.cardsTextColor,
                          borderLeftColor: settings.accentColor
                        }}
                      >
                        <p className="text-xs mb-1">نص تقييم العميل سيظهر هنا...</p>
                        <div className="flex justify-end">
                          <p className="text-xs font-bold" style={{ color: settings.cardsTextColor }}>اسم العميل</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Testimonials Items Tab */}
            <TabsContent value="testimonials" className="mt-2 overflow-x-hidden">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-medium text-emerald-800">التقييمات والآراء</h3>
                <Button
                  onClick={settings.useDbTestimonials ? handleAddAndSaveItem : handleAddItem}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 h-8 px-2 text-xs"
                >
                  <Plus size={14} /> إضافة تقييم{settings.useDbTestimonials ? " وحفظه" : ""}
                </Button>
              </div>

              {settings.useDbTestimonials && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>تم تفعيل وضع قاعدة البيانات. سيتم حفظ التقييمات الجديدة في قاعدة البيانات.</span>
                  </p>
                </div>
              )}

              <div className="testimonials-container overflow-hidden w-full">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={settings.items.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 w-full max-w-full">
                      {settings.items.map((item) => (
                        <SortableItem
                          key={item.id}
                          id={item.id}
                          item={item}
                          onEdit={handleItemChange}
                          onDelete={handleDeleteItem}
                          onImageUploaded={handleImageUploaded}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {settings.items.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="flex flex-col items-center justify-center">
                      <Users size={32} className="text-gray-300 mb-2" />
                      <p className="text-gray-500 mb-3 text-sm">لا توجد تقييمات حاليًا</p>
                      <Button
                        onClick={handleAddItem}
                        variant="outline"
                        size="sm"
                        className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 flex items-center gap-1 text-xs"
                      >
                        <Plus size={14} /> إضافة تقييم الآن
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Database Testimonials Tab */}
            <TabsContent value="database" className="mt-2 overflow-x-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium text-emerald-800">تقييمات من قاعدة البيانات</h3>
                <Button
                  onClick={fetchTestimonials}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 h-8 px-2 text-xs"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 
                  تحديث القائمة
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 flex items-center gap-2 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="testimonials-database-container overflow-hidden w-full">
                {isLoading ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-emerald-500" />
                    <p className="text-gray-500 text-sm">جاري تحميل التقييمات...</p>
                  </div>
                ) : dbTestimonials.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="flex flex-col items-center justify-center">
                      <Star size={32} className="text-gray-300 mb-2" />
                      <p className="text-gray-500 mb-3 text-sm">لا توجد تقييمات في قاعدة البيانات</p>
                      <p className="text-gray-400 text-xs max-w-xs mx-auto">
                        أضف تقييمات العملاء في قسم "آراء العملاء" أو أضف تقييمات مخصصة في علامة التبويب "التقييمات"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dbTestimonials.map((testimonial) => (
                      <div 
                        key={testimonial.id} 
                        className={`bg-white rounded-lg shadow-sm border p-3 transition-all hover:shadow-md ${
                          isTestimonialAdded(testimonial.id) ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                              {testimonial.customer_avatar ? (
                                <img
                                  src={testimonial.customer_avatar}
                                  alt={testimonial.customer_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  {testimonial.customer_name.substring(0, 2)}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{testimonial.customer_name}</h4>
                              {testimonial.verified && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 px-1 py-0 h-5">
                                  <Check size={10} className="mr-1" />
                                  موثق
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            {isTestimonialAdded(testimonial.id) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTestimonialFromComponent(testimonial.id)}
                                className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X size={14} className="mr-1" /> إزالة
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addTestimonialFromDb(testimonial)}
                                className="h-7 px-2 text-xs text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Plus size={14} className="mr-1" /> إضافة
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="flex mb-1">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <Star
                                key={val}
                                className={`w-3 h-3 ${
                                  val <= testimonial.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : val - 0.5 === testimonial.rating
                                    ? 'text-yellow-500 fill-yellow-500 opacity-50'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{testimonial.comment}</p>
                        </div>
                        {testimonial.product_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            منتج: {testimonial.product_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestimonialsComponentEditor;
