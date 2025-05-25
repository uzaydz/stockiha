import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Eye,
  ArrowUp,
  ArrowDown,
  Grip,
  Building
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
  updateMultipleSettings
}) => {
  const [activeTab, setActiveTab] = useState('basic');
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

  // Helper Functions
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreatePage = async () => {
    if (!pageDialog.title || !pageDialog.content) {
      toast({
        title: "خطأ",
        description: "يرجى ملء العنوان والمحتوى على الأقل",
        variant: "destructive"
      });
      return;
    }

    const newPage: CustomPage = {
      id: Date.now().toString(),
      title: pageDialog.title,
      slug: pageDialog.slug || generateSlug(pageDialog.title),
      content: pageDialog.content,
      meta_description: pageDialog.meta_description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // إعداد التحديثات الجديدة
    const currentPages = settings.savedPages || [];
    const updatedPages = [...currentPages, newPage];
    let updatedSections = [...(settings.footerSections || [])];

    // Add link to section if specified
    if (pageDialog.targetSectionId) {
      const sectionIndex = updatedSections.findIndex(
        (section: FooterSection) => section.id === pageDialog.targetSectionId
      );

      if (sectionIndex !== -1) {
        const newLink: FooterLink = {
          id: Date.now().toString() + '_page',
          text: newPage.title,
          url: `/page/${newPage.slug}`,
          isExternal: false
        };

        updatedSections[sectionIndex] = {
          ...updatedSections[sectionIndex],
          links: [...(updatedSections[sectionIndex].links || []), newLink]
        };
      }
    }

    // حفظ كلاً من الصفحات والأقسام معاً في تحديث واحد
    const newSettings = {
      ...settings,
      savedPages: updatedPages,
      footerSections: updatedSections
    };
    
    // استخدام updateMultipleSettings إذا كانت متاحة للحفظ المُجمع
    if (updateMultipleSettings) {
      updateMultipleSettings({
        savedPages: updatedPages,
        footerSections: updatedSections
      });
    } else {
      // الطريقة التقليدية مع ضمان حفظ الصفحات أولاً
      updateSetting('savedPages', updatedPages);
      // استخدام Promise للتأكد من التسلسل
      setTimeout(() => {
        updateSetting('footerSections', updatedSections);
      }, 100); // تأخير أطول لضمان الحفظ
    }

    toast({
      title: "تم إنشاء الصفحة",
      description: `تم إنشاء صفحة "${newPage.title}" بنجاح${pageDialog.targetSectionId ? ' وإضافة الرابط للقسم' : ''}`
    });

    setPageDialog({
      open: false,
      title: '',
      slug: '',
      content: '',
      meta_description: '',
      targetSectionId: ''
    });
  };

  const handleAddLink = async () => {
    if (!linkDialog.sectionId || !linkDialog.link.text || !linkDialog.link.url) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const sectionIndex = (settings.footerSections || []).findIndex(
      (section: FooterSection) => section.id === linkDialog.sectionId
    );

    if (sectionIndex !== -1) {
      const newLink = {
        ...linkDialog.link,
        id: Date.now().toString()
      };

      const updatedSections = [...(settings.footerSections || [])];
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        links: [...(updatedSections[sectionIndex].links || []), newLink]
      };

      updateSetting('footerSections', updatedSections);

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الرابط الجديد"
      });
    }

    setLinkDialog({
      open: false,
      sectionId: '',
      link: { id: '', text: '', url: '', isExternal: false }
    });
  };

  const handleAddSavedPageAsLink = async (page: CustomPage, sectionId: string) => {
    const sectionIndex = (settings.footerSections || []).findIndex(
      (section: FooterSection) => section.id === sectionId
    );

    if (sectionIndex !== -1) {
      const newLink: FooterLink = {
        id: Date.now().toString() + '_saved',
        text: page.title,
        url: `/page/${page.slug}`,
        isExternal: false
      };

      const updatedSections = [...(settings.footerSections || [])];
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        links: [...(updatedSections[sectionIndex].links || []), newLink]
      };

      updateSetting('footerSections', updatedSections);

      toast({
        title: "تم إضافة الرابط",
        description: `تم إضافة "${page.title}" إلى القسم`
      });

      setShowSavedPages(false);
    }
  };

  const handleDelete = async () => {
    // Implementation for deleting items based on deleteDialog state
    if (deleteDialog.type === 'feature' && deleteDialog.index >= 0) {
      const updatedFeatures = settings.features.filter((_: any, i: number) => i !== deleteDialog.index);
      updateSetting('features', updatedFeatures);
    } else if (deleteDialog.type === 'social' && deleteDialog.index >= 0) {
      const updatedSocials = settings.socialLinks.filter((_: any, i: number) => i !== deleteDialog.index);
      updateSetting('socialLinks', updatedSocials);
    } else if (deleteDialog.type === 'section' && deleteDialog.index >= 0) {
      const updatedSections = settings.footerSections.filter((_: any, i: number) => i !== deleteDialog.index);
      updateSetting('footerSections', updatedSections);
    } else if (deleteDialog.type === 'page' && deleteDialog.id) {
      const updatedPages = (settings.savedPages || []).filter((p: CustomPage) => p.id !== deleteDialog.id);
      updateSetting('savedPages', updatedPages);
    }

    toast({
      title: "تم الحذف",
      description: "تم حذف العنصر بنجاح"
    });

    setDeleteDialog({
      open: false,
      type: '',
      id: '',
      index: -1
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
    <div className="w-full max-w-none">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2 text-xs">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">أساسي</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2 text-xs">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">اتصال</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2 text-xs">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">تواصل</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="flex items-center gap-2 text-xs">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">أقسام</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2 text-xs">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">ميزات</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2 text-xs">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">متقدم</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-200px)] w-full">
          <div className="space-y-6">
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    معلومات المتجر
                  </CardTitle>
                  <CardDescription>
                    قم بتعديل المعلومات الأساسية للفوتر مثل اسم المتجر والشعار والوصف
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="storeName" className="text-sm font-medium">اسم المتجر</Label>
                        <Input
                          id="storeName"
                          value={settings.storeName || ''}
                          onChange={(e) => updateSetting('storeName', e.target.value)}
                          placeholder="اسم متجرك"
                          className="h-10"
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
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="copyrightText" className="text-sm font-medium">نص حقوق النشر</Label>
                        <Input
                          id="copyrightText"
                          value={settings.copyrightText || ''}
                          onChange={(e) => updateSetting('copyrightText', e.target.value)}
                          placeholder="© 2024 متجرنا. جميع الحقوق محفوظة."
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">شعار المتجر</Label>
                        <div className="border-2 border-dashed rounded-lg p-4">
                          <ImageUploader
                            imageUrl={settings.logoUrl || ''}
                            onImageUploaded={(url) => updateSetting('logoUrl', url)}
                            folder="store-logos"
                            maxSizeInMB={2}
                            label="اختر شعار المتجر"
                            aspectRatio="1:1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Information Tab */}
            <TabsContent value="contact" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        معلومات الاتصال
                      </CardTitle>
                      <CardDescription>
                        أضف معلومات الاتصال التي ستظهر في الفوتر
                      </CardDescription>
                    </div>
                    <Switch
                      checked={settings.showContactInfo !== false}
                      onCheckedChange={(checked) => updateSetting('showContactInfo', checked)}
                    />
                  </div>
                </CardHeader>
                {settings.showContactInfo !== false && (
                  <CardContent className="space-y-6">
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
                            className="h-10"
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
                            className="h-10"
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
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Social Media Tab */}
            <TabsContent value="social" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        وسائل التواصل الاجتماعي
                      </CardTitle>
                      <CardDescription>
                        أضف روابط حساباتك على وسائل التواصل الاجتماعي
                      </CardDescription>
                    </div>
                    <Switch
                      checked={settings.showSocialLinks !== false}
                      onCheckedChange={(checked) => updateSetting('showSocialLinks', checked)}
                    />
                  </div>
                </CardHeader>
                {settings.showSocialLinks !== false && (
                  <CardContent className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">الروابط الاجتماعية</h4>
                        <Badge variant="secondary">{(settings.socialLinks || []).length}</Badge>
                      </div>
                      <Button
                        onClick={() => addArrayItem('socialLinks', { platform: 'facebook', url: '' })}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة رابط
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(settings.socialLinks || []).map((social: SocialLink, index: number) => {
                        const platform = socialPlatforms.find(p => p.value === social.platform);
                        return (
                          <Card key={index} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge className={cn("text-xs", platform?.color)}>
                                  {platform?.icon} {platform?.label}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({
                                    open: true,
                                    type: 'social',
                                    id: social.platform,
                                    index
                                  })}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="space-y-2">
                                <Select
                                  value={social.platform}
                                  onValueChange={(value) => updateNestedSetting(['socialLinks', index.toString(), 'platform'], value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {socialPlatforms.map((platform) => (
                                      <SelectItem key={platform.value} value={platform.value}>
                                        <div className="flex items-center gap-2">
                                          <span>{platform.icon}</span>
                                          <span>{platform.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Input
                                  value={social.url}
                                  onChange={(e) => updateNestedSetting(['socialLinks', index.toString(), 'url'], e.target.value)}
                                  placeholder={`رابط ${platform?.label || 'المنصة'}`}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {(settings.socialLinks || []).length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Share2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">لا توجد روابط اجتماعية</p>
                        <Button
                          onClick={() => addArrayItem('socialLinks', { platform: 'facebook', url: '' })}
                          variant="outline"
                        >
                          إضافة أول رابط
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Sections Tab */}
            <TabsContent value="sections" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        أقسام الروابط
                      </CardTitle>
                      <CardDescription>
                        قم بإنشاء أقسام مختلفة من الروابط في الفوتر
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => addArrayItem('footerSections', {
                        id: Date.now().toString(),
                        title: 'قسم جديد',
                        links: []
                      })}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة قسم
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(settings.footerSections || []).length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">لا توجد أقسام روابط</p>
                      <Button
                        onClick={() => addArrayItem('footerSections', {
                          id: Date.now().toString(),
                          title: 'قسم جديد',
                          links: []
                        })}
                        variant="outline"
                      >
                        إضافة أول قسم
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(settings.footerSections || []).map((section: FooterSection, sectionIndex: number) => (
                        <Card key={section.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 max-w-md">
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateNestedSetting(['footerSections', sectionIndex.toString(), 'title'], e.target.value)}
                                  placeholder="عنوان القسم"
                                  className="h-9 font-medium"
                                />
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSection(sectionIndex, 'up')}
                                  disabled={sectionIndex === 0}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSection(sectionIndex, 'down')}
                                  disabled={sectionIndex === (settings.footerSections || []).length - 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({
                                    open: true,
                                    type: 'section',
                                    id: section.id,
                                    index: sectionIndex
                                  })}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-medium">الروابط</h5>
                                  <Badge variant="outline">{section.links?.length || 0}</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLinkDialog({
                                      open: true,
                                      sectionId: section.id,
                                      link: { id: '', text: '', url: '', isExternal: false }
                                    })}
                                    className="h-8 text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    رابط عادي
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPageDialog({ 
                                      open: true, 
                                      title: '', 
                                      slug: '', 
                                      content: '',
                                      meta_description: '',
                                      targetSectionId: section.id
                                    })}
                                    className="h-8 text-xs"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    صفحة جديدة
                                  </Button>
                                  {(settings.savedPages || []).length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setLinkDialog(prev => ({ ...prev, sectionId: section.id }));
                                        setShowSavedPages(true);
                                      }}
                                      className="h-8 text-xs"
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      صفحة محفوظة
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {section.links?.length > 0 ? (
                                <div className="space-y-2">
                                  {section.links.map((link: FooterLink, linkIndex: number) => (
                                    <div key={link.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Input
                                          value={link.text}
                                          onChange={(e) => updateNestedSetting(['footerSections', sectionIndex.toString(), 'links', linkIndex.toString(), 'text'], e.target.value)}
                                          placeholder="نص الرابط"
                                          className="h-8 text-sm"
                                        />
                                        <Input
                                          value={link.url}
                                          onChange={(e) => updateNestedSetting(['footerSections', sectionIndex.toString(), 'links', linkIndex.toString(), 'url'], e.target.value)}
                                          placeholder="/page أو https://..."
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateNestedSetting(['footerSections', sectionIndex.toString(), 'links', linkIndex.toString(), 'isExternal'], !link.isExternal);
                                        }}
                                        className="h-8 w-8 p-0"
                                        title={link.isExternal ? 'رابط خارجي' : 'رابط داخلي'}
                                      >
                                        {link.isExternal ? <ExternalLink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const updatedLinks = section.links.filter((_, i) => i !== linkIndex);
                                          updateNestedSetting(['footerSections', sectionIndex.toString(), 'links'], updatedLinks);
                                        }}
                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 border border-dashed rounded-lg">
                                  <p className="text-sm text-muted-foreground">لا توجد روابط في هذا القسم</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        ميزات المتجر
                      </CardTitle>
                      <CardDescription>
                        أضف الميزات التي يتمتع بها متجرك مثل الشحن المجاني والدفع الآمن
                      </CardDescription>
                    </div>
                    <Switch
                      checked={settings.showFeatures !== false}
                      onCheckedChange={(checked) => updateSetting('showFeatures', checked)}
                    />
                  </div>
                </CardHeader>
                {settings.showFeatures !== false && (
                  <CardContent className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">الميزات</h4>
                        <Badge variant="secondary">{(settings.features || []).length}</Badge>
                      </div>
                      <Button
                        onClick={() => addArrayItem('features', {
                          id: Date.now().toString(),
                          icon: 'Heart',
                          title: 'ميزة جديدة',
                          description: 'وصف الميزة'
                        })}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة ميزة
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(settings.features || []).map((feature: Feature, index: number) => {
                        const featureIcon = featureIcons.find(icon => icon.value === feature.icon);
                        return (
                          <Card key={feature.id} className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{featureIcon?.icon}</span>
                                  <Badge variant="outline">{featureIcon?.label}</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({
                                    open: true,
                                    type: 'feature',
                                    id: feature.id,
                                    index
                                  })}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                <Select
                                  value={feature.icon}
                                  onValueChange={(value) => updateNestedSetting(['features', index.toString(), 'icon'], value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {featureIcons.map((icon) => (
                                      <SelectItem key={icon.value} value={icon.value}>
                                        <div className="flex items-center gap-2">
                                          <span>{icon.icon}</span>
                                          <span>{icon.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Input
                                  value={feature.title}
                                  onChange={(e) => updateNestedSetting(['features', index.toString(), 'title'], e.target.value)}
                                  placeholder="عنوان الميزة"
                                  className="h-9"
                                />
                                
                                <Textarea
                                  value={feature.description}
                                  onChange={(e) => updateNestedSetting(['features', index.toString(), 'description'], e.target.value)}
                                  placeholder="وصف الميزة"
                                  rows={2}
                                  className="resize-none text-sm"
                                />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {(settings.features || []).length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">لا توجد ميزات</p>
                        <Button
                          onClick={() => addArrayItem('features', {
                            id: Date.now().toString(),
                            icon: 'Heart',
                            title: 'ميزة جديدة',
                            description: 'وصف الميزة'
                          })}
                          variant="outline"
                        >
                          إضافة أول ميزة
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-0">
              <div className="space-y-6">
                {/* Newsletter Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="w-5 h-5" />
                          النشرة البريدية
                        </CardTitle>
                        <CardDescription>
                          إعدادات النشرة البريدية والاشتراك
                        </CardDescription>
                      </div>
                      <Switch
                        checked={settings.newsletter?.enabled !== false}
                        onCheckedChange={(checked) => updateNestedSetting(['newsletter', 'enabled'], checked)}
                      />
                    </div>
                  </CardHeader>
                  {settings.newsletter?.enabled !== false && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">عنوان النشرة</Label>
                          <Input
                            value={settings.newsletter?.title || ''}
                            onChange={(e) => updateNestedSetting(['newsletter', 'title'], e.target.value)}
                            placeholder="اشترك في نشرتنا البريدية"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">نص الزر</Label>
                          <Input
                            value={settings.newsletter?.buttonText || ''}
                            onChange={(e) => updateNestedSetting(['newsletter', 'buttonText'], e.target.value)}
                            placeholder="اشتراك"
                            className="h-9"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">وصف النشرة</Label>
                        <Textarea
                          value={settings.newsletter?.description || ''}
                          onChange={(e) => updateNestedSetting(['newsletter', 'description'], e.target.value)}
                          placeholder="احصل على آخر العروض والأخبار"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">نص حقل البريد الإلكتروني</Label>
                        <Input
                          value={settings.newsletter?.placeholder || ''}
                          onChange={(e) => updateNestedSetting(['newsletter', 'placeholder'], e.target.value)}
                          placeholder="أدخل بريدك الإلكتروني"
                          className="h-9"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          طرق الدفع
                        </CardTitle>
                        <CardDescription>
                          اختر طرق الدفع المقبولة في متجرك
                        </CardDescription>
                      </div>
                      <Switch
                        checked={settings.showPaymentMethods !== false}
                        onCheckedChange={(checked) => updateSetting('showPaymentMethods', checked)}
                      />
                    </div>
                  </CardHeader>
                  {settings.showPaymentMethods !== false && (
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {paymentMethods.map((method) => {
                          const isEnabled = (settings.paymentMethods || []).some((pm: PaymentMethod) => pm.id === method.id && pm.enabled);
                          return (
                            <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                              <input
                                type="checkbox"
                                id={method.id}
                                checked={isEnabled}
                                onChange={(e) => {
                                  const currentMethods = settings.paymentMethods || [];
                                  const existingIndex = currentMethods.findIndex((pm: PaymentMethod) => pm.id === method.id);
                                  
                                  if (existingIndex >= 0) {
                                    updateNestedSetting(['paymentMethods', existingIndex.toString(), 'enabled'], e.target.checked);
                                  } else {
                                    addArrayItem('paymentMethods', {
                                      id: method.id,
                                      name: method.name,
                                      enabled: e.target.checked
                                    });
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={method.id} className="text-sm flex items-center gap-2 cursor-pointer">
                                <span>{method.icon}</span>
                                <span>{method.name}</span>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Saved Pages Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      إدارة الصفحات المحفوظة
                    </CardTitle>
                    <CardDescription>
                      عرض وإدارة جميع الصفحات التي تم إنشاؤها
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">الصفحات المحفوظة</h4>
                        <Badge variant="secondary">{(settings.savedPages || []).length}</Badge>
                      </div>
                    </div>
                    
                    {(settings.savedPages || []).length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg">
                        <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-3">لا توجد صفحات محفوظة</p>
                        <p className="text-xs text-muted-foreground">
                          استخدم زر "صفحة جديدة" في أقسام الروابط لإنشاء صفحات
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(settings.savedPages || []).map((page: CustomPage, index: number) => (
                          <Card key={page.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{page.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">/{page.slug}</p>
                                {page.meta_description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {page.meta_description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  تم الإنشاء: {new Date(page.created_at).toLocaleDateString('ar-SA', {
                                    year: 'numeric',
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex gap-2 ml-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPageDialog({
                                      open: true,
                                      title: page.title,
                                      slug: page.slug,
                                      content: page.content,
                                      meta_description: page.meta_description || '',
                                      targetSectionId: ''
                                    });
                                  }}
                                  className="h-8"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  تعديل
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
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Legal Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      الروابط القانونية
                    </CardTitle>
                    <CardDescription>
                      أضف روابط الصفحات القانونية مثل سياسة الخصوصية وشروط الاستخدام
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">الروابط القانونية</h4>
                        <Badge variant="secondary">{(settings.legalLinks || []).length}</Badge>
                      </div>
                      <Button
                        onClick={() => addArrayItem('legalLinks', {
                          id: Date.now().toString(),
                          text: 'رابط قانوني',
                          url: '/legal',
                          isExternal: false
                        })}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة رابط
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {(settings.legalLinks || []).map((link: FooterLink, index: number) => (
                        <div key={link.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              value={link.text}
                              onChange={(e) => updateNestedSetting(['legalLinks', index.toString(), 'text'], e.target.value)}
                              placeholder="نص الرابط"
                              className="h-8 text-sm"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) => updateNestedSetting(['legalLinks', index.toString(), 'url'], e.target.value)}
                              placeholder="/page أو https://..."
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateNestedSetting(['legalLinks', index.toString(), 'isExternal'], !link.isExternal);
                            }}
                            className="h-8 w-8 p-0"
                            title={link.isExternal ? 'رابط خارجي' : 'رابط داخلي'}
                          >
                            {link.isExternal ? <ExternalLink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeArrayItem('legalLinks', index);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {(settings.legalLinks || []).length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg">
                        <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-3">لا توجد روابط قانونية</p>
                        <Button
                          onClick={() => addArrayItem('legalLinks', {
                            id: Date.now().toString(),
                            text: 'سياسة الخصوصية',
                            url: '/privacy',
                            isExternal: false
                          })}
                          variant="outline"
                          size="sm"
                        >
                          إضافة رابط قانوني
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
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