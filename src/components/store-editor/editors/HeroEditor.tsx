import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Plus, Trash, ChevronUp, ChevronDown, Save, Sparkles, Settings, Palette, Image as ImageIcon } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import ImageUploader from '@/components/ui/ImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface HeroEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  onSave?: () => Promise<void>;
}

const HeroEditor: React.FC<HeroEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
  addArrayItem,
  removeArrayItem,
  updateArrayItem,
  onSave
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // حفظ التغييرات
  const handleSaveChanges = async () => {
    if (!onSave) {
      toast({
        title: "خطأ",
        description: "دالة الحفظ غير متوفرة",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ إعدادات القسم الرئيسي بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Sparkles className="h-5 w-5 text-primary dark:text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير القسم الرئيسي</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">قم بتخصيص المحتوى والتصميم للقسم الرئيسي في متجرك</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Sections */}
      <Accordion type="single" collapsible defaultValue="content" className="w-full space-y-4">
        <AccordionItem value="content" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 rounded-xl shadow-sm">
                  <Settings className="w-4 h-4 text-primary dark:text-primary-foreground" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">المحتوى الرئيسي</span>
                  <p className="text-xs text-muted-foreground mt-0.5">العنوان والوصف والنصوص</p>
                </div>
                <Badge variant="secondary" className="text-xs shadow-sm">مطلوب</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-foreground">العنوان الرئيسي</Label>
                  <Input
                    id="title"
                    value={settings.title || ''}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    placeholder="أدخل العنوان الرئيسي"
                    className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">الوصف</Label>
                  <Textarea
                    id="description"
                    value={settings.description || ''}
                    onChange={(e) => updateSetting('description', e.target.value)}
                    placeholder="أدخل وصفاً للقسم"
                    rows={3}
                    className="resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    صورة الخلفية
                  </Label>
                  
                  <ImageUploader
                    imageUrl={settings.imageUrl || ''}
                    onImageUploaded={(url) => updateSetting('imageUrl', url)}
                    folder="hero-images"
                    maxSizeInMB={5}
                    label="صورة خلفية القسم الرئيسي"
                    aspectRatio="16:9"
                  />
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="buttons" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2 rounded-xl shadow-sm">
                  <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">الأزرار</span>
                  <p className="text-xs text-muted-foreground mt-0.5">أزرار الإجراءات والروابط</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <Card className="border border-border/60 bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-foreground">الزر الرئيسي</h3>
                      <Switch
                        checked={!!settings.primaryButton?.text}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            updateSetting('primaryButton', { ...settings.primaryButton, text: '' });
                          } else {
                            updateSetting('primaryButton', { 
                              ...(settings.primaryButton || {}),
                              text: 'تصفح الآن',
                              link: settings.primaryButton?.link || '/products'
                            });
                          }
                        }}
                      />
                    </div>
                    
                    {settings.primaryButton?.text && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="primaryButtonText" className="text-xs font-medium">نص الزر</Label>
                          <Input
                            id="primaryButtonText"
                            value={settings.primaryButton.text}
                            onChange={(e) => updateNestedSetting(['primaryButton', 'text'], e.target.value)}
                            placeholder="نص الزر الرئيسي"
                            className="h-9 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="primaryButtonLink" className="text-xs font-medium">رابط الزر</Label>
                          <Input
                            id="primaryButtonLink"
                            value={settings.primaryButton.link}
                            onChange={(e) => updateNestedSetting(['primaryButton', 'link'], e.target.value)}
                            placeholder="/products"
                            className="h-9 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="primaryButtonStyle" className="text-xs font-medium">لون الزر</Label>
                          <Select
                            value={settings.primaryButtonStyle || 'primary'}
                            onValueChange={(value) => updateSetting('primaryButtonStyle', value)}
                          >
                            <SelectTrigger id="primaryButtonStyle" className="h-9 text-sm">
                              <SelectValue placeholder="اختر لون الزر" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="max-h-[200px] overflow-y-auto">
                                <SelectItem value="primary">أساسي</SelectItem>
                                <SelectItem value="secondary">ثانوي</SelectItem>
                                <SelectItem value="teal">أزرق مخضر</SelectItem>
                                <SelectItem value="blue">أزرق</SelectItem>
                                <SelectItem value="purple">بنفسجي</SelectItem>
                                <SelectItem value="amber">كهرماني</SelectItem>
                                <SelectItem value="emerald">زمردي</SelectItem>
                                <SelectItem value="rose">وردي</SelectItem>
                                <SelectItem value="indigo">نيلي</SelectItem>
                                <SelectItem value="neutral">محايد</SelectItem>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border border-border/60 bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-foreground">الزر الثانوي</h3>
                      <Switch
                        checked={!!settings.secondaryButton?.text}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            updateSetting('secondaryButton', { ...settings.secondaryButton, text: '' });
                          } else {
                            updateSetting('secondaryButton', { 
                              ...(settings.secondaryButton || {}),
                              text: 'تفاصيل أكثر',
                              link: settings.secondaryButton?.link || '/offers'
                            });
                          }
                        }}
                      />
                    </div>
                    
                    {settings.secondaryButton?.text && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="secondaryButtonText" className="text-xs font-medium">نص الزر</Label>
                          <Input
                            id="secondaryButtonText"
                            value={settings.secondaryButton.text}
                            onChange={(e) => updateNestedSetting(['secondaryButton', 'text'], e.target.value)}
                            placeholder="نص الزر الثانوي"
                            className="h-9 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="secondaryButtonLink" className="text-xs font-medium">رابط الزر</Label>
                          <Input
                            id="secondaryButtonLink"
                            value={settings.secondaryButton.link}
                            onChange={(e) => updateNestedSetting(['secondaryButton', 'link'], e.target.value)}
                            placeholder="/offers"
                            className="h-9 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="secondaryButtonStyle" className="text-xs font-medium">لون الزر</Label>
                          <Select
                            value={settings.secondaryButtonStyle || 'primary'}
                            onValueChange={(value) => updateSetting('secondaryButtonStyle', value)}
                          >
                            <SelectTrigger id="secondaryButtonStyle" className="h-9 text-sm">
                              <SelectValue placeholder="اختر لون الزر" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="max-h-[200px] overflow-y-auto">
                                <SelectItem value="primary">أساسي</SelectItem>
                                <SelectItem value="secondary">ثانوي</SelectItem>
                                <SelectItem value="teal">أزرق مخضر</SelectItem>
                                <SelectItem value="blue">أزرق</SelectItem>
                                <SelectItem value="purple">بنفسجي</SelectItem>
                                <SelectItem value="amber">كهرماني</SelectItem>
                                <SelectItem value="emerald">زمردي</SelectItem>
                                <SelectItem value="rose">وردي</SelectItem>
                                <SelectItem value="indigo">نيلي</SelectItem>
                                <SelectItem value="neutral">محايد</SelectItem>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="trustBadges" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 p-2 rounded-xl shadow-sm">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">شارات الثقة</span>
                  <p className="text-xs text-muted-foreground mt-0.5">عناصر لزيادة ثقة العملاء</p>
                </div>
                <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-foreground">إدارة شارات الثقة</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('trustBadges', {
                      id: Date.now().toString(),
                      text: 'شارة جديدة',
                      icon: 'CheckCircle'
                    })}
                    className="flex items-center gap-2 h-8 px-3 text-xs border-border/60 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-green-50/30 dark:hover:from-emerald-950/20 dark:hover:to-green-950/10 hover:border-emerald-300/50 dark:hover:border-emerald-600/30 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة شارة
                  </Button>
                </div>
                
                {!settings.trustBadges || settings.trustBadges.length === 0 ? (
                  <Card className="border border-dashed border-border/60 bg-muted/20 dark:bg-muted/10">
                    <CardContent className="p-6 text-center">
                      <div className="text-muted-foreground text-sm">
                        <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-medium mb-1">لا توجد شارات ثقة</p>
                        <p className="text-xs">أضف شارات لزيادة ثقة العملاء في متجرك</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {settings.trustBadges.map((badge: any, index: number) => (
                      <Card key={badge.id} className="border border-border/60 bg-gradient-to-r from-muted/30 to-muted/15 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-foreground">شارة #{index + 1}</h4>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                onClick={() => {
                                  const newTrustBadges = [...settings.trustBadges];
                                  if (index > 0) {
                                    [newTrustBadges[index], newTrustBadges[index - 1]] = 
                                    [newTrustBadges[index - 1], newTrustBadges[index]];
                                    updateSetting('trustBadges', newTrustBadges);
                                  }
                                }}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                onClick={() => {
                                  const newTrustBadges = [...settings.trustBadges];
                                  if (index < newTrustBadges.length - 1) {
                                    [newTrustBadges[index], newTrustBadges[index + 1]] = 
                                    [newTrustBadges[index + 1], newTrustBadges[index]];
                                    updateSetting('trustBadges', newTrustBadges);
                                  }
                                }}
                                disabled={index === settings.trustBadges.length - 1}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => removeArrayItem('trustBadges', index)}
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor={`badge-text-${index}`} className="text-xs font-medium">نص الشارة</Label>
                              <Input
                                id={`badge-text-${index}`}
                                value={badge.text}
                                onChange={(e) => {
                                  const updatedBadge = { ...badge, text: e.target.value };
                                  updateArrayItem('trustBadges', index, updatedBadge);
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor={`badge-icon-${index}`} className="text-xs font-medium">الأيقونة</Label>
                              <Select
                                value={badge.icon}
                                onValueChange={(value) => {
                                  const updatedBadge = { ...badge, icon: value };
                                  updateArrayItem('trustBadges', index, updatedBadge);
                                }}
                              >
                                <SelectTrigger id={`badge-icon-${index}`} className="h-8 text-sm">
                                  <SelectValue placeholder="اختر أيقونة" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CheckCircle">تحقق</SelectItem>
                                  <SelectItem value="Truck">شاحنة</SelectItem>
                                  <SelectItem value="ShieldCheck">حماية</SelectItem>
                                  <SelectItem value="Gem">جودة عالية</SelectItem>
                                  <SelectItem value="Clock">توقيت سريع</SelectItem>
                                  <SelectItem value="Award">جائزة</SelectItem>
                                  <SelectItem value="HeartHandshake">رضا العملاء</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Bottom Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              تأكد من حفظ التغييرات قبل مغادرة الصفحة
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroEditor;
