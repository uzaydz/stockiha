import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Plus, Trash, ChevronUp, ChevronDown } from 'lucide-react';
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

interface HeroEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
}

const HeroEditor: React.FC<HeroEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
  addArrayItem,
  removeArrayItem,
  updateArrayItem
}) => {
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
                  value={settings.title || ''}
                  onChange={(e) => updateSetting('title', e.target.value)}
                  placeholder="أدخل العنوان الرئيسي"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium">الوصف</Label>
                <Textarea
                  id="description"
                  value={settings.description || ''}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  placeholder="أدخل وصفاً للقسم"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-xs font-medium">صورة الخلفية</Label>
                
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
        </AccordionItem>
        
        <AccordionItem value="buttons" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-blue-600">#</div>
              </div>
              <span>الأزرار</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="border p-3 rounded-md space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">الزر الرئيسي</h3>
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
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="primaryButtonText" className="text-xs">نص الزر</Label>
                      <Input
                        id="primaryButtonText"
                        value={settings.primaryButton.text}
                        onChange={(e) => updateNestedSetting(['primaryButton', 'text'], e.target.value)}
                        placeholder="نص الزر الرئيسي"
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="primaryButtonLink" className="text-xs">رابط الزر</Label>
                      <Input
                        id="primaryButtonLink"
                        value={settings.primaryButton.link}
                        onChange={(e) => updateNestedSetting(['primaryButton', 'link'], e.target.value)}
                        placeholder="/products"
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="primaryButtonStyle" className="text-xs">لون الزر</Label>
                      <Select
                        value={settings.primaryButtonStyle || 'primary'}
                        onValueChange={(value) => updateSetting('primaryButtonStyle', value)}
                      >
                        <SelectTrigger id="primaryButtonStyle" className="h-8 text-xs">
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
                  </>
                )}
              </div>
              
              <div className="border p-3 rounded-md space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">الزر الثانوي</h3>
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
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="secondaryButtonText" className="text-xs">نص الزر</Label>
                      <Input
                        id="secondaryButtonText"
                        value={settings.secondaryButton.text}
                        onChange={(e) => updateNestedSetting(['secondaryButton', 'text'], e.target.value)}
                        placeholder="نص الزر الثانوي"
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="secondaryButtonLink" className="text-xs">رابط الزر</Label>
                      <Input
                        id="secondaryButtonLink"
                        value={settings.secondaryButton.link}
                        onChange={(e) => updateNestedSetting(['secondaryButton', 'link'], e.target.value)}
                        placeholder="/offers"
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="secondaryButtonStyle" className="text-xs">لون الزر</Label>
                      <Select
                        value={settings.secondaryButtonStyle || 'primary'}
                        onValueChange={(value) => updateSetting('secondaryButtonStyle', value)}
                      >
                        <SelectTrigger id="secondaryButtonStyle" className="h-8 text-xs">
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
                  </>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="badges" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="bg-green-50 p-1.5 rounded-md">
                <div className="w-3.5 h-3.5 text-green-600">✓</div>
              </div>
              <span>شارات الثقة</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm">شارات الثقة</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addArrayItem('trustBadges', { id: `badge-${Date.now()}`, text: 'شارة جديدة', icon: 'CheckCircle' })}
                  className="flex items-center gap-1 h-8 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>إضافة شارة</span>
                </Button>
              </div>
              
              {!settings.trustBadges || settings.trustBadges.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground text-xs">
                  لا توجد شارات. أضف شارات لزيادة ثقة العملاء.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {settings.trustBadges.map((badge: any, index: number) => (
                    <div key={badge.id} className="border p-3 rounded-md bg-muted/30 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium">شارة #{index + 1}</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hidden group-hover:flex"
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
                            className="h-6 w-6 text-muted-foreground hidden group-hover:flex"
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
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeArrayItem('trustBadges', index)}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor={`badge-text-${index}`} className="text-xs">نص الشارة</Label>
                          <Input
                            id={`badge-text-${index}`}
                            value={badge.text}
                            onChange={(e) => {
                              const updatedBadge = { ...badge, text: e.target.value };
                              updateArrayItem('trustBadges', index, updatedBadge);
                            }}
                            className="h-7 text-xs"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`badge-icon-${index}`} className="text-xs">الأيقونة</Label>
                          <Select
                            value={badge.icon}
                            onValueChange={(value) => {
                              const updatedBadge = { ...badge, icon: value };
                              updateArrayItem('trustBadges', index, updatedBadge);
                            }}
                          >
                            <SelectTrigger id={`badge-icon-${index}`} className="h-7 text-xs">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HeroEditor; 