import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Upload, Eye, EyeOff, Palette, Type, Image as ImageIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { HeroSlide } from './HeroSection';

interface HeroPropertiesPanelProps {
  slides: HeroSlide[];
  onSlidesChange: (slides: HeroSlide[]) => void;
  autoPlay: boolean;
  onAutoPlayChange: (autoPlay: boolean) => void;
  autoPlayInterval: number;
  onAutoPlayIntervalChange: (interval: number) => void;
  showNavigation: boolean;
  onShowNavigationChange: (show: boolean) => void;
  showIndicators: boolean;
  onShowIndicatorsChange: (show: boolean) => void;
  showTrustBadges: boolean;
  onShowTrustBadgesChange: (show: boolean) => void;
  height: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  onHeightChange: (height: 'sm' | 'md' | 'lg' | 'xl' | 'full') => void;
  className?: string;
}

const HeroPropertiesPanel: React.FC<HeroPropertiesPanelProps> = ({
  slides,
  onSlidesChange,
  autoPlay,
  onAutoPlayChange,
  autoPlayInterval,
  onAutoPlayIntervalChange,
  showNavigation,
  onShowNavigationChange,
  showIndicators,
  onShowIndicatorsChange,
  showTrustBadges,
  onShowTrustBadgesChange,
  height,
  onHeightChange,
  className
}) => {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const selectedSlide = slides[selectedSlideIndex];

  const updateSlide = (index: number, updates: Partial<HeroSlide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    onSlidesChange(newSlides);
  };

  const addSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now().toString(),
      title: 'عنوان جديد',
      subtitle: 'عنوان فرعي',
      description: 'وصف السلايد الجديد',
      backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      backgroundColor: 'from-blue-500 to-purple-600',
      primaryButton: {
        text: 'زر رئيسي',
        href: '#',
        style: 'primary'
      },
      trustBadges: ['ميزة 1', 'ميزة 2', 'ميزة 3'],
      overlay: {
        enabled: true,
        opacity: 0.4,
        color: 'black'
      }
    };
    onSlidesChange([...slides, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    onSlidesChange(newSlides);
    setSelectedSlideIndex(Math.max(0, Math.min(selectedSlideIndex, newSlides.length - 1)));
  };

  const addTrustBadge = () => {
    const currentBadges = selectedSlide.trustBadges || [];
    updateSlide(selectedSlideIndex, {
      trustBadges: [...currentBadges, 'ميزة جديدة']
    });
  };

  const removeTrustBadge = (badgeIndex: number) => {
    const currentBadges = selectedSlide.trustBadges || [];
    updateSlide(selectedSlideIndex, {
      trustBadges: currentBadges.filter((_, i) => i !== badgeIndex)
    });
  };

  const updateTrustBadge = (badgeIndex: number, value: string) => {
    const currentBadges = selectedSlide.trustBadges || [];
    const newBadges = [...currentBadges];
    newBadges[badgeIndex] = value;
    updateSlide(selectedSlideIndex, { trustBadges: newBadges });
  };

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-4 space-y-6">
        {/* إعدادات عامة */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            الإعدادات العامة
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">ارتفاع المقطع</Label>
              <Select value={height} onValueChange={onHeightChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">صغير (400px)</SelectItem>
                  <SelectItem value="md">متوسط (500px)</SelectItem>
                  <SelectItem value="lg">كبير (600px)</SelectItem>
                  <SelectItem value="xl">كبير جداً (700px)</SelectItem>
                  <SelectItem value="full">ملء الشاشة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="autoplay-interval">فترة التبديل (ثانية)</Label>
              <Input
                id="autoplay-interval"
                type="number"
                min="1"
                max="30"
                value={autoPlayInterval / 1000}
                onChange={(e) => onAutoPlayIntervalChange(parseInt(e.target.value) * 1000)}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoplay">التشغيل التلقائي</Label>
              <Switch
                id="autoplay"
                checked={autoPlay}
                onCheckedChange={onAutoPlayChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="navigation">أزرار التنقل</Label>
              <Switch
                id="navigation"
                checked={showNavigation}
                onCheckedChange={onShowNavigationChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="indicators">مؤشرات السلايد</Label>
              <Switch
                id="indicators"
                checked={showIndicators}
                onCheckedChange={onShowIndicatorsChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="trust-badges">شارات الثقة</Label>
              <Switch
                id="trust-badges"
                checked={showTrustBadges}
                onCheckedChange={onShowTrustBadgesChange}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* إدارة السلايدات */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              السلايدات ({slides.length})
            </h3>
            <Button onClick={addSlide} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة سلايد
            </Button>
          </div>
          
          {/* قائمة السلايدات */}
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  index === selectedSlideIndex
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
                onClick={() => setSelectedSlideIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                      {slide.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {slide.subtitle}
                    </p>
                  </div>
                  {slides.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSlide(index);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* تحرير السلايد المحدد */}
        {selectedSlide && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              تحرير السلايد {selectedSlideIndex + 1}
            </h3>
            
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">المحتوى</TabsTrigger>
                <TabsTrigger value="design">التصميم</TabsTrigger>
                <TabsTrigger value="buttons">الأزرار</TabsTrigger>
                <TabsTrigger value="badges">الشارات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label htmlFor="title">العنوان الرئيسي</Label>
                  <Input
                    id="title"
                    value={selectedSlide.title}
                    onChange={(e) => updateSlide(selectedSlideIndex, { title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="subtitle">العنوان الفرعي</Label>
                  <Input
                    id="subtitle"
                    value={selectedSlide.subtitle}
                    onChange={(e) => updateSlide(selectedSlideIndex, { subtitle: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={selectedSlide.description}
                    onChange={(e) => updateSlide(selectedSlideIndex, { description: e.target.value })}
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="design" className="space-y-4">
                <div>
                  <Label htmlFor="background-image">صورة الخلفية</Label>
                  <Input
                    id="background-image"
                    value={selectedSlide.backgroundImage}
                    onChange={(e) => updateSlide(selectedSlideIndex, { backgroundImage: e.target.value })}
                    placeholder="رابط الصورة"
                  />
                </div>
                
                <div>
                  <Label htmlFor="background-color">تدرج الخلفية الاحتياطي</Label>
                  <Select
                    value={selectedSlide.backgroundColor}
                    onValueChange={(value) => updateSlide(selectedSlideIndex, { backgroundColor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="from-indigo-600 to-purple-700">أزرق إلى بنفسجي</SelectItem>
                      <SelectItem value="from-red-500 to-pink-600">أحمر إلى وردي</SelectItem>
                      <SelectItem value="from-green-500 to-emerald-600">أخضر إلى زمردي</SelectItem>
                      <SelectItem value="from-yellow-500 to-orange-600">أصفر إلى برتقالي</SelectItem>
                      <SelectItem value="from-gray-600 to-gray-800">رمادي داكن</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>طبقة علوية</Label>
                    <Switch
                      checked={selectedSlide.overlay?.enabled || false}
                      onCheckedChange={(enabled) => 
                        updateSlide(selectedSlideIndex, {
                          overlay: { ...selectedSlide.overlay!, enabled }
                        })
                      }
                    />
                  </div>
                  
                  {selectedSlide.overlay?.enabled && (
                    <div>
                      <Label>شفافية الطبقة العلوية</Label>
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedSlide.overlay.opacity}
                        onChange={(e) => 
                          updateSlide(selectedSlideIndex, {
                            overlay: { 
                              ...selectedSlide.overlay!, 
                              opacity: parseFloat(e.target.value) 
                            }
                          })
                        }
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(selectedSlide.overlay.opacity * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="buttons" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium">الزر الرئيسي</h4>
                  
                  <div>
                    <Label htmlFor="primary-button-text">نص الزر</Label>
                    <Input
                      id="primary-button-text"
                      value={selectedSlide.primaryButton.text}
                      onChange={(e) => 
                        updateSlide(selectedSlideIndex, {
                          primaryButton: { ...selectedSlide.primaryButton, text: e.target.value }
                        })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="primary-button-href">الرابط</Label>
                    <Input
                      id="primary-button-href"
                      value={selectedSlide.primaryButton.href}
                      onChange={(e) => 
                        updateSlide(selectedSlideIndex, {
                          primaryButton: { ...selectedSlide.primaryButton, href: e.target.value }
                        })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label>نمط الزر</Label>
                    <Select
                      value={selectedSlide.primaryButton.style}
                      onValueChange={(value: 'primary' | 'secondary' | 'outline') => 
                        updateSlide(selectedSlideIndex, {
                          primaryButton: { ...selectedSlide.primaryButton, style: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">رئيسي</SelectItem>
                        <SelectItem value="secondary">ثانوي</SelectItem>
                        <SelectItem value="outline">محدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">الزر الثانوي</h4>
                    <Switch
                      checked={!!selectedSlide.secondaryButton}
                      onCheckedChange={(enabled) => {
                        if (enabled) {
                          updateSlide(selectedSlideIndex, {
                            secondaryButton: {
                              text: 'زر ثانوي',
                              href: '#',
                              style: 'outline'
                            }
                          });
                        } else {
                          updateSlide(selectedSlideIndex, { secondaryButton: undefined });
                        }
                      }}
                    />
                  </div>
                  
                  {selectedSlide.secondaryButton && (
                    <>
                      <div>
                        <Label htmlFor="secondary-button-text">نص الزر</Label>
                        <Input
                          id="secondary-button-text"
                          value={selectedSlide.secondaryButton.text}
                          onChange={(e) => 
                            updateSlide(selectedSlideIndex, {
                              secondaryButton: { ...selectedSlide.secondaryButton!, text: e.target.value }
                            })
                          }
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="secondary-button-href">الرابط</Label>
                        <Input
                          id="secondary-button-href"
                          value={selectedSlide.secondaryButton.href}
                          onChange={(e) => 
                            updateSlide(selectedSlideIndex, {
                              secondaryButton: { ...selectedSlide.secondaryButton!, href: e.target.value }
                            })
                          }
                        />
                      </div>
                      
                      <div>
                        <Label>نمط الزر</Label>
                        <Select
                          value={selectedSlide.secondaryButton.style}
                          onValueChange={(value: 'primary' | 'secondary' | 'outline') => 
                            updateSlide(selectedSlideIndex, {
                              secondaryButton: { ...selectedSlide.secondaryButton!, style: value }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">رئيسي</SelectItem>
                            <SelectItem value="secondary">ثانوي</SelectItem>
                            <SelectItem value="outline">محدد</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="badges" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">شارات الثقة</h4>
                  <Button onClick={addTrustBadge} size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(selectedSlide.trustBadges || []).map((badge, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={badge}
                        onChange={(e) => updateTrustBadge(index, e.target.value)}
                        placeholder="نص الشارة"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-700"
                        onClick={() => removeTrustBadge(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {(!selectedSlide.trustBadges || selectedSlide.trustBadges.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      لا توجد شارات ثقة. اضغط "إضافة" لإضافة شارة جديدة.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default HeroPropertiesPanel;