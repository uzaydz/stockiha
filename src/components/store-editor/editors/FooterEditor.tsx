import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash, 
  ExternalLink, 
  Link2, 
  Save, 
  Settings, 
  Share2, 
  Phone, 
  Mail, 
  MapPin,
  Star,
  Globe,
  CreditCard,
  ShieldCheck,
  Heart,
  FileText,
  Edit3,
  ArrowUp,
  ArrowDown,
  Grip,
  Building,
  Layers
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import ImageUploader from '@/components/ui/ImageUploader';
import { cn } from '@/lib/utils';
import { generateSlug } from '@/lib/customPages';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

// Interfaces
interface FooterLink {
  id: string;
  text: string;
  url: string;
  isExternal?: boolean;
}

interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin' | 'tiktok';
  url: string;
}

interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface NewsletterSettings {
  enabled: boolean;
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

interface FooterEditorProps {
  settings: any;
  updateSetting: (key: string, value: any) => void;
  updateNestedSetting: (path: string[], value: any) => void;
  addArrayItem: (key: string, item: any) => void;
  removeArrayItem: (key: string, index: number) => void;
  updateArrayItem: (key: string, index: number, value: any) => void;
  updateMultipleSettings?: (updates: Record<string, any>) => void;
  onSave?: () => Promise<void>;
}

// Static Data
const socialPlatforms = [
  { value: 'facebook', label: 'فيسبوك', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'twitter', label: 'تويتر', icon: '🐦', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'instagram', label: 'إنستجرام', icon: '📷', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'youtube', label: 'يوتيوب', icon: '📺', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'linkedin', label: 'لينكد إن', icon: '💼', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'tiktok', label: 'تيك توك', icon: '🎵', color: 'bg-gray-50 text-gray-700 border-gray-200' }
];

const featureIcons = [
  { value: 'Truck', label: 'شحن مجاني', icon: '🚚' },
  { value: 'CreditCard', label: 'دفع آمن', icon: '💳' },
  { value: 'Heart', label: 'ضمان الجودة', icon: '❤️' },
  { value: 'ShieldCheck', label: 'حماية البيانات', icon: '🛡️' },
  { value: 'Phone', label: 'دعم 24/7', icon: '📞' },
  { value: 'Star', label: 'أفضل خدمة', icon: '⭐' }
];

const paymentMethods = [
  { id: 'visa', name: 'فيزا', icon: '💳' },
  { id: 'mastercard', name: 'ماستركارد', icon: '💳' },
  { id: 'paypal', name: 'باي بال', icon: '🏦' },
  { id: 'mada', name: 'مدى', icon: '💰' },
  { id: 'applepay', name: 'أبل باي', icon: '📱' },
  { id: 'googlepay', name: 'جوجل باي', icon: '📱' }
];

const FooterEditor: React.FC<FooterEditorProps> = ({
  settings,
  updateSetting,
  updateNestedSetting,
  addArrayItem,
  removeArrayItem,
  updateArrayItem,
  updateMultipleSettings,
  onSave
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [pageDialog, setPageDialog] = useState({
    open: false,
    title: '',
    slug: '',
    content: '',
    meta_description: '',
    targetSectionId: ''
  });
  const [linkDialog, setLinkDialog] = useState({
    open: false,
    sectionId: '',
    link: { id: '', text: '', url: '', isExternal: false } as FooterLink
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: '',
    id: '',
    index: -1
  });
  const [showSavedPages, setShowSavedPages] = useState(false);

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
        description: "تم حفظ إعدادات التذييل بنجاح",
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

  // Helper Functions
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreatePage = async () => {
    if (!pageDialog.title.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان الصفحة",
        variant: "destructive",
      });
      return;
    }

    const slug = pageDialog.slug || generateSlug(pageDialog.title);
    
    // Check if slug already exists
    const existingPage = (settings.savedPages || []).find((page: CustomPage) => page.slug === slug);
    if (existingPage) {
      toast({
        title: "خطأ",
        description: "يوجد صفحة بنفس الرابط المختصر",
        variant: "destructive",
      });
      return;
    }

    const newPage: CustomPage = {
      id: Date.now().toString(),
      title: pageDialog.title,
      slug,
      content: pageDialog.content,
      meta_description: pageDialog.meta_description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to saved pages
    const updatedPages = [...(settings.savedPages || []), newPage];
    updateSetting('savedPages', updatedPages);

    // If target section is specified, add as link
    if (pageDialog.targetSectionId) {
      const sectionIndex = (settings.footerSections || []).findIndex((s: FooterSection) => s.id === pageDialog.targetSectionId);
      if (sectionIndex >= 0) {
        const newLink: FooterLink = {
          id: Date.now().toString(),
          text: newPage.title,
          url: `/${newPage.slug}`,
          isExternal: false
        };
        
        const currentLinks = settings.footerSections[sectionIndex].links || [];
        updateNestedSetting(['footerSections', sectionIndex.toString(), 'links'], [...currentLinks, newLink]);
      }
    }

    setPageDialog({
      open: false,
      title: '',
      slug: '',
      content: '',
      meta_description: '',
      targetSectionId: ''
    });

    toast({
      title: "تم الإنشاء بنجاح",
      description: `تم إنشاء الصفحة "${newPage.title}" بنجاح`,
    });
  };

  const handleAddLink = async () => {
    if (!linkDialog.link.text.trim() || !linkDialog.link.url.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نص الرابط والرابط",
        variant: "destructive",
      });
      return;
    }

    const sectionIndex = (settings.footerSections || []).findIndex((s: FooterSection) => s.id === linkDialog.sectionId);
    if (sectionIndex >= 0) {
      const newLink: FooterLink = {
        ...linkDialog.link,
        id: Date.now().toString()
      };
      
      const currentLinks = settings.footerSections[sectionIndex].links || [];
      updateNestedSetting(['footerSections', sectionIndex.toString(), 'links'], [...currentLinks, newLink]);
    }

    setLinkDialog({
      open: false,
      sectionId: '',
      link: { id: '', text: '', url: '', isExternal: false }
    });

    toast({
      title: "تم الإضافة بنجاح",
      description: "تم إضافة الرابط بنجاح",
    });
  };

  const handleAddSavedPageAsLink = async (page: CustomPage, sectionId: string) => {
    const sectionIndex = (settings.footerSections || []).findIndex((s: FooterSection) => s.id === sectionId);
    if (sectionIndex >= 0) {
      const newLink: FooterLink = {
        id: Date.now().toString(),
        text: page.title,
        url: `/${page.slug}`,
        isExternal: false
      };
      
      const currentLinks = settings.footerSections[sectionIndex].links || [];
      updateNestedSetting(['footerSections', sectionIndex.toString(), 'links'], [...currentLinks, newLink]);
      
      setShowSavedPages(false);
      
      toast({
        title: "تم الإضافة بنجاح",
        description: `تم إضافة رابط "${page.title}" بنجاح`,
      });
    }
  };

  const handleDelete = async () => {
    if (deleteDialog.type === 'section') {
      removeArrayItem('footerSections', deleteDialog.index);
    } else if (deleteDialog.type === 'social') {
      removeArrayItem('socialLinks', deleteDialog.index);
    } else if (deleteDialog.type === 'feature') {
      removeArrayItem('features', deleteDialog.index);
    }

    setDeleteDialog({
      open: false,
      type: '',
      id: '',
      index: -1
    });

    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العنصر بنجاح",
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(settings.footerSections || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < sections.length) {
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      updateSetting('footerSections', sections);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-50/60 via-gray-50/40 to-transparent dark:from-slate-950/30 dark:via-gray-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-900/60 dark:to-gray-900/60 p-2.5 rounded-xl shadow-sm">
                <Layers className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">تحرير التذييل</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">قم بتخصيص محتوى وروابط التذييل في متجرك</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 h-9 px-4 text-sm bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Sections */}
      <Accordion type="single" collapsible defaultValue="basic" className="w-full space-y-4">
        {/* Basic Information */}
        <AccordionItem value="basic" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 rounded-xl shadow-sm">
                  <Building className="w-4 h-4 text-primary dark:text-primary-foreground" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">معلومات المتجر</span>
                  <p className="text-xs text-muted-foreground mt-0.5">الاسم والشعار والوصف</p>
                </div>
                <Badge variant="secondary" className="text-xs shadow-sm">مطلوب</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="storeName" className="text-sm font-medium">اسم المتجر</Label>
                      <Input
                        id="storeName"
                        value={settings.storeName || ''}
                        onChange={(e) => updateSetting('storeName', e.target.value)}
                        placeholder="اسم متجرك"
                        className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">وصف المتجر</Label>
                      <Textarea
                        id="description"
                        value={settings.description || ''}
                        onChange={(e) => updateSetting('description', e.target.value)}
                        placeholder="وصف قصير عن متجرك وما يميزه"
                        rows={4}
                        className="resize-none text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copyrightText" className="text-sm font-medium">نص حقوق النشر</Label>
                      <Input
                        id="copyrightText"
                        value={settings.copyrightText || ''}
                        onChange={(e) => updateSetting('copyrightText', e.target.value)}
                        placeholder="© 2024 متجرنا. جميع الحقوق محفوظة."
                        className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">شعار المتجر</Label>
                      <Card className="border-2 border-dashed border-border/60 bg-muted/20 dark:bg-muted/10">
                        <CardContent className="p-4">
                          <ImageUploader
                            imageUrl={settings.logoUrl || ''}
                            onImageUploaded={(url) => updateSetting('logoUrl', url)}
                            folder="store-logos"
                            maxSizeInMB={2}
                            label="اختر شعار المتجر"
                            aspectRatio="1:1"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Contact Information */}
        <AccordionItem value="contact" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2 rounded-xl shadow-sm">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">معلومات الاتصال</span>
                  <p className="text-xs text-muted-foreground mt-0.5">الهاتف والإيميل والعنوان</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.showContactInfo !== false}
                    onCheckedChange={(checked) => updateSetting('showContactInfo', checked)}
                  />
                  <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
                </div>
              </div>
            </AccordionTrigger>
            {settings.showContactInfo !== false && (
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          رقم الهاتف
                        </Label>
                        <Input
                          value={settings.contactInfo?.phone || ''}
                          onChange={(e) => updateNestedSetting(['contactInfo', 'phone'], e.target.value)}
                          placeholder="+213 123 456 789"
                          className="h-10 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          البريد الإلكتروني
                        </Label>
                        <Input
                          type="email"
                          value={settings.contactInfo?.email || ''}
                          onChange={(e) => updateNestedSetting(['contactInfo', 'email'], e.target.value)}
                          placeholder="info@store.com"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          العنوان
                        </Label>
                        <Textarea
                          value={settings.contactInfo?.address || ''}
                          onChange={(e) => updateNestedSetting(['contactInfo', 'address'], e.target.value)}
                          placeholder="123 شارع المتجر، المدينة، البلد"
                          rows={4}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            )}
          </Card>
        </AccordionItem>

        {/* Social Media */}
        <AccordionItem value="social" className="border-0">
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 dark:hover:bg-muted/20 transition-all duration-300 [&[data-state=open]]:bg-muted/40 dark:[&[data-state=open]]:bg-muted/25">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/60 dark:to-rose-900/60 p-2 rounded-xl shadow-sm">
                  <Share2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">وسائل التواصل الاجتماعي</span>
                  <p className="text-xs text-muted-foreground mt-0.5">روابط حساباتك الاجتماعية</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.showSocialLinks !== false}
                    onCheckedChange={(checked) => updateSetting('showSocialLinks', checked)}
                  />
                  <Badge variant="outline" className="text-xs shadow-sm">اختياري</Badge>
                </div>
              </div>
            </AccordionTrigger>
            {settings.showSocialLinks !== false && (
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">الروابط الاجتماعية</h4>
                      <Badge variant="secondary" className="text-xs">{(settings.socialLinks || []).length}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newLink = { platform: 'facebook', url: '' };
                        addArrayItem('socialLinks', newLink);
                      }}
                      className="flex items-center gap-2 h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      إضافة رابط
                    </Button>
                  </div>

                  {settings.socialLinks && settings.socialLinks.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {settings.socialLinks.map((link: SocialLink, index: number) => {
                        const platform = socialPlatforms.find(p => p.value === link.platform);
                        return (
                          <Card key={index} className="border border-border/60 bg-gradient-to-r from-muted/30 to-muted/15 dark:from-muted/20 dark:to-muted/10 backdrop-blur-sm shadow-sm group hover:shadow-md transition-all duration-300">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={cn("px-2 py-1 rounded-md text-xs font-medium border", platform?.color)}>
                                  {platform?.icon} {platform?.label}
                                </div>
                                <Input
                                  value={link.url}
                                  onChange={(e) => updateArrayItem('socialLinks', index, { ...link, url: e.target.value })}
                                  placeholder={`رابط ${platform?.label}`}
                                  className="h-8 text-sm flex-1"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeArrayItem('socialLinks', index)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="border border-dashed border-border/60 bg-muted/20 dark:bg-muted/10">
                      <CardContent className="p-6 text-center">
                        <div className="text-muted-foreground text-sm">
                          <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-medium mb-1">لا توجد روابط اجتماعية</p>
                          <p className="text-xs">أضف روابط حساباتك على وسائل التواصل</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </AccordionContent>
            )}
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
              className="flex items-center gap-2 px-6 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for selecting saved pages */}
      <Dialog open={showSavedPages} onOpenChange={setShowSavedPages}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              اختيار صفحة محفوظة
            </DialogTitle>
            <DialogDescription>
              اختر صفحة من الصفحات المحفوظة لإضافتها كرابط في القسم
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {(settings.savedPages || []).length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد صفحات محفوظة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(settings.savedPages || []).map((page: CustomPage) => (
                  <Card key={page.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{page.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">/{page.slug}</p>
                        {page.meta_description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {page.meta_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          تم الإنشاء: {new Date(page.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <Button
                          size="sm"
                          onClick={() => handleAddSavedPageAsLink(page, linkDialog.sectionId)}
                          className="h-8"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          إضافة
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedPages = (settings.savedPages || []).filter((p: CustomPage) => p.id !== page.id);
                            updateSetting('savedPages', updatedPages);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavedPages(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating new page */}
      <Dialog open={pageDialog.open} onOpenChange={(open) => setPageDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              إنشاء صفحة جديدة
              {pageDialog.targetSectionId && (
                <Badge variant="outline" className="mr-2">
                  سيتم إضافتها لقسم: {(settings.footerSections || []).find((s: FooterSection) => s.id === pageDialog.targetSectionId)?.title}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              أنشئ صفحة جديدة لإضافتها إلى روابط الفوتر
              {pageDialog.targetSectionId ? ' وستُضاف تلقائياً كرابط في القسم المحدد' : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-1">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pageTitle" className="text-sm font-medium">عنوان الصفحة</Label>
                  <Input
                    id="pageTitle"
                    value={pageDialog.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setPageDialog(prev => ({
                        ...prev,
                        title,
                        slug: generateSlug(title)
                      }));
                    }}
                    placeholder="مثال: سياسة الخصوصية"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageSlug" className="text-sm font-medium">رابط الصفحة (Slug)</Label>
                  <Input
                    id="pageSlug"
                    value={pageDialog.slug}
                    onChange={(e) => setPageDialog(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="مثال: privacy-policy"
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pageMetaDescription" className="text-sm font-medium">وصف الصفحة (SEO)</Label>
                <Input
                  id="pageMetaDescription"
                  value={pageDialog.meta_description}
                  onChange={(e) => setPageDialog(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="وصف مختصر للصفحة لمحركات البحث"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pageContent" className="text-sm font-medium">محتوى الصفحة</Label>
                <Textarea
                  id="pageContent"
                  value={pageDialog.content}
                  onChange={(e) => setPageDialog(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="محتوى الصفحة بصيغة HTML أو نص عادي..."
                  rows={8}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPageDialog({
                open: false,
                title: '',
                slug: '',
                content: '',
                meta_description: '',
                targetSectionId: ''
              })}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleCreatePage} 
              disabled={!pageDialog.title || !pageDialog.content}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              إنشاء الصفحة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding links */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              إضافة رابط جديد
            </DialogTitle>
            <DialogDescription>
              أضف رابط جديد للقسم المحدد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkText" className="text-sm font-medium">نص الرابط</Label>
              <Input
                id="linkText"
                value={linkDialog.link.text}
                onChange={(e) => setLinkDialog(prev => ({
                  ...prev,
                  link: { ...prev.link, text: e.target.value }
                }))}
                placeholder="مثال: اتصل بنا"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkUrl" className="text-sm font-medium">عنوان الرابط</Label>
              <Input
                id="linkUrl"
                value={linkDialog.link.url}
                onChange={(e) => setLinkDialog(prev => ({
                  ...prev,
                  link: { ...prev.link, url: e.target.value }
                }))}
                placeholder="/contact أو https://example.com"
                className="h-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isExternal"
                checked={linkDialog.link.isExternal}
                onChange={(e) => setLinkDialog(prev => ({
                  ...prev,
                  link: { ...prev.link, isExternal: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isExternal" className="text-sm">
                رابط خارجي (يفتح في نافذة جديدة)
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLinkDialog(prev => ({ ...prev, open: false }))}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleAddLink} 
              disabled={!linkDialog.link.text || !linkDialog.link.url}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة الرابط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FooterEditor;
