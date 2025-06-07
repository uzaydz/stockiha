import React, { useState } from 'react'
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Share2, 
  Star,
  Plus, 
  Trash, 
  ExternalLink, 
  Link2, 
  Edit3,
  CreditCard,
  Layers,
  Settings2,
  Globe,
  FileText
} from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import ImageUploader from '@/components/ui/ImageUploader'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

import { PropertySection } from '../PropertySection'

// Interfaces (same as the original)
interface FooterLink {
  id: string
  text: string
  url: string
  isExternal?: boolean
}

interface FooterSection {
  id: string
  title: string
  links: FooterLink[]
}

interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin' | 'tiktok'
  url: string
}

interface ContactInfo {
  phone?: string
  email?: string
  address?: string
}

interface Feature {
  id: string
  icon: string
  title: string
  description: string
}

interface NewsletterSettings {
  enabled: boolean
  title: string
  description: string
  placeholder: string
  buttonText: string
}

interface FooterEditorProps {
  settings: any
  onUpdate: (key: string, value: any) => void
}

// Static Data
const socialPlatforms = [
  { value: 'facebook', label: 'فيسبوك', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'twitter', label: 'تويتر', icon: '🐦', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'instagram', label: 'إنستجرام', icon: '📷', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'youtube', label: 'يوتيوب', icon: '📺', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'linkedin', label: 'لينكد إن', icon: '💼', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'tiktok', label: 'تيك توك', icon: '🎵', color: 'bg-gray-50 text-gray-700 border-gray-200' }
]

const featureIcons = [
  { value: 'Truck', label: 'شحن مجاني', icon: '🚚' },
  { value: 'CreditCard', label: 'دفع آمن', icon: '💳' },
  { value: 'Heart', label: 'ضمان الجودة', icon: '❤️' },
  { value: 'ShieldCheck', label: 'حماية البيانات', icon: '🛡️' },
  { value: 'Phone', label: 'دعم 24/7', icon: '📞' },
  { value: 'Star', label: 'أفضل خدمة', icon: '⭐' }
]

const paymentMethods = [
  { id: 'visa', name: 'فيزا', icon: '💳' },
  { id: 'mastercard', name: 'ماستركارد', icon: '💳' },
  { id: 'paypal', name: 'باي بال', icon: '🏦' },
  { id: 'mada', name: 'مدى', icon: '💰' },
  { id: 'applepay', name: 'أبل باي', icon: '📱' },
  { id: 'googlepay', name: 'جوجل باي', icon: '📱' }
]

export const FooterEditor: React.FC<FooterEditorProps> = ({
  settings,
  onUpdate
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'contact', 'social', 'sections', 'features', 'newsletter', 'payments'])
  )
  
  const [linkDialog, setLinkDialog] = useState({
    open: false,
    sectionId: '',
    link: { id: '', text: '', url: '', isExternal: false } as FooterLink
  })
  
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: '',
    id: '',
    index: -1
  })

  const { toast } = useToast()

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

  // Helper functions
  const generateId = () => Date.now().toString()

  // إدارة معلومات الاتصال
  const updateContactInfo = (key: string, value: string) => {
    const currentContactInfo = settings.contactInfo || {}
    onUpdate('contactInfo', {
      ...currentContactInfo,
      [key]: value
    })
  }

  // إدارة الروابط الاجتماعية
  const addSocialLink = () => {
    const currentLinks = settings.socialLinks || []
    onUpdate('socialLinks', [...currentLinks, { platform: 'facebook', url: '' }])
  }

  const updateSocialLink = (index: number, updates: Partial<SocialLink>) => {
    const currentLinks = settings.socialLinks || []
    const updatedLinks = [...currentLinks]
    updatedLinks[index] = { ...updatedLinks[index], ...updates }
    onUpdate('socialLinks', updatedLinks)
  }

  const removeSocialLink = (index: number) => {
    const currentLinks = settings.socialLinks || []
    onUpdate('socialLinks', currentLinks.filter((_: any, i: number) => i !== index))
  }

  // إدارة أقسام Footer
  const addFooterSection = () => {
    const currentSections = settings.footerSections || []
    const newSection = {
      id: generateId(),
      title: 'قسم جديد',
      links: []
    }
    onUpdate('footerSections', [...currentSections, newSection])
  }

  const updateFooterSection = (index: number, updates: Partial<FooterSection>) => {
    const currentSections = settings.footerSections || []
    const updatedSections = [...currentSections]
    updatedSections[index] = { ...updatedSections[index], ...updates }
    onUpdate('footerSections', updatedSections)
  }

  const removeFooterSection = (index: number) => {
    const currentSections = settings.footerSections || []
    onUpdate('footerSections', currentSections.filter((_: any, i: number) => i !== index))
  }

  // إدارة روابط الأقسام
  const addLinkToSection = (sectionIndex: number, link: FooterLink) => {
    const currentSections = settings.footerSections || []
    const updatedSections = [...currentSections]
    const newLink = { ...link, id: generateId() }
    updatedSections[sectionIndex].links = [...(updatedSections[sectionIndex].links || []), newLink]
    onUpdate('footerSections', updatedSections)
  }

  const removeLinkFromSection = (sectionIndex: number, linkIndex: number) => {
    const currentSections = settings.footerSections || []
    const updatedSections = [...currentSections]
    updatedSections[sectionIndex].links = updatedSections[sectionIndex].links.filter((_: any, i: number) => i !== linkIndex)
    onUpdate('footerSections', updatedSections)
  }

  // إدارة المميزات
  const addFeature = () => {
    const currentFeatures = settings.features || []
    const newFeature = {
      id: generateId(),
      icon: 'Heart',
      title: 'ميزة جديدة',
      description: 'وصف الميزة'
    }
    onUpdate('features', [...currentFeatures, newFeature])
  }

  const updateFeature = (index: number, updates: Partial<Feature>) => {
    const currentFeatures = settings.features || []
    const updatedFeatures = [...currentFeatures]
    updatedFeatures[index] = { ...updatedFeatures[index], ...updates }
    onUpdate('features', updatedFeatures)
  }

  const removeFeature = (index: number) => {
    const currentFeatures = settings.features || []
    onUpdate('features', currentFeatures.filter((_: any, i: number) => i !== index))
  }

  // إدارة إعدادات النشرة البريدية
  const updateNewsletterSettings = (key: string, value: any) => {
    const currentSettings = settings.newsletterSettings || {}
    onUpdate('newsletterSettings', {
      ...currentSettings,
      [key]: value
    })
  }

  // معالج إضافة الرابط
  const handleAddLink = () => {
    if (!linkDialog.link.text.trim() || !linkDialog.link.url.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نص الرابط والرابط",
        variant: "destructive",
      })
      return
    }

    const sectionIndex = (settings.footerSections || []).findIndex((s: FooterSection) => s.id === linkDialog.sectionId)
    if (sectionIndex >= 0) {
      addLinkToSection(sectionIndex, linkDialog.link)
    }

    setLinkDialog({
      open: false,
      sectionId: '',
      link: { id: '', text: '', url: '', isExternal: false }
    })

    toast({
      title: "تم الإضافة بنجاح",
      description: "تم إضافة الرابط بنجاح",
    })
  }

  // معالج الحذف
  const handleDelete = () => {
    if (deleteDialog.type === 'section') {
      removeFooterSection(deleteDialog.index)
    } else if (deleteDialog.type === 'social') {
      removeSocialLink(deleteDialog.index)
    } else if (deleteDialog.type === 'feature') {
      removeFeature(deleteDialog.index)
    }

    setDeleteDialog({
      open: false,
      type: '',
      id: '',
      index: -1
    })

    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العنصر بنجاح",
    })
  }

  return (
    <div className="space-y-3">
      {/* معلومات المتجر الأساسية */}
      <PropertySection
        title="معلومات المتجر"
        icon={<Building className="w-4 h-4" />}
        expanded={expandedSections.has('basic')}
        onToggle={() => toggleSection('basic')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="text-sm font-medium">اسم المتجر</Label>
                <Input
                  id="storeName"
                  value={settings.storeName || ''}
                  onChange={(e) => onUpdate('storeName', e.target.value)}
                  placeholder="اسم متجرك"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">وصف المتجر</Label>
                <Textarea
                  id="description"
                  value={settings.description || ''}
                  onChange={(e) => onUpdate('description', e.target.value)}
                  placeholder="وصف قصير عن متجرك وما يميزه"
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="copyrightText" className="text-sm font-medium">نص حقوق النشر</Label>
                <Input
                  id="copyrightText"
                  value={settings.copyrightText || ''}
                  onChange={(e) => onUpdate('copyrightText', e.target.value)}
                  placeholder="© 2024 متجرنا. جميع الحقوق محفوظة."
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">شعار المتجر</Label>
                <Card className="border-2 border-dashed border-border/60 bg-muted/20">
                  <CardContent className="p-4">
                    <ImageUploader
                      imageUrl={settings.logoUrl || ''}
                      onImageUploaded={(url) => onUpdate('logoUrl', url)}
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
      </PropertySection>

      {/* معلومات الاتصال */}
      <PropertySection
        title="معلومات الاتصال"
        icon={<Phone className="w-4 h-4" />}
        expanded={expandedSections.has('contact')}
        onToggle={() => toggleSection('contact')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">إظهار معلومات الاتصال</Label>
            <Switch
              checked={settings.showContactInfo !== false}
              onCheckedChange={(checked) => onUpdate('showContactInfo', checked)}
            />
          </div>
          
          {settings.showContactInfo !== false && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    value={settings.contactInfo?.phone || ''}
                    onChange={(e) => updateContactInfo('phone', e.target.value)}
                    placeholder="+966 12 345 6789"
                    className="text-sm"
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
                    onChange={(e) => updateContactInfo('email', e.target.value)}
                    placeholder="info@store.com"
                    className="text-sm"
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
                    onChange={(e) => updateContactInfo('address', e.target.value)}
                    placeholder="123 شارع المتجر، المدينة، البلد"
                    rows={4}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </PropertySection>

      {/* وسائل التواصل الاجتماعي */}
      <PropertySection
        title="وسائل التواصل الاجتماعي"
        icon={<Share2 className="w-4 h-4" />}
        expanded={expandedSections.has('social')}
        onToggle={() => toggleSection('social')}
        action={
          <Switch
            checked={settings.showSocialLinks !== false}
            onCheckedChange={(checked) => onUpdate('showSocialLinks', checked)}
          />
        }
      >
        {settings.showSocialLinks !== false && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                الروابط الاجتماعية ({(settings.socialLinks || []).length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addSocialLink}
                className="flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                إضافة رابط
              </Button>
            </div>

            {(settings.socialLinks || []).length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {(settings.socialLinks || []).map((link: SocialLink, index: number) => {
                    const platform = socialPlatforms.find(p => p.value === link.platform)
                    return (
                      <Card key={index} className="border">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Select
                              value={link.platform}
                              onValueChange={(value) => updateSocialLink(index, { platform: value as any })}
                            >
                              <SelectTrigger className="w-32">
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
                              value={link.url}
                              onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                              placeholder={`رابط ${platform?.label}`}
                              className="flex-1 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSocialLink(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Share2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">لا توجد روابط اجتماعية</p>
                  <p className="text-xs text-muted-foreground">أضف روابط حساباتك الاجتماعية</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PropertySection>

      {/* أقسام الروابط */}
      <PropertySection
        title="أقسام الروابط"
        icon={<Layers className="w-4 h-4" />}
        expanded={expandedSections.has('sections')}
        onToggle={() => toggleSection('sections')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              أقسام Footer ({(settings.footerSections || []).length})
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addFooterSection}
              className="flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              إضافة قسم
            </Button>
          </div>

          {(settings.footerSections || []).length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {(settings.footerSections || []).map((section: FooterSection, sectionIndex: number) => (
                  <Card key={section.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={section.title}
                            onChange={(e) => updateFooterSection(sectionIndex, { title: e.target.value })}
                            placeholder="عنوان القسم"
                            className="flex-1 text-sm font-medium"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLinkDialog({
                              open: true,
                              sectionId: section.id,
                              link: { id: '', text: '', url: '', isExternal: false }
                            })}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            رابط
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFooterSection(sectionIndex)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>

                        {section.links && section.links.length > 0 && (
                          <div className="space-y-2 ml-4">
                            {section.links.map((link: FooterLink, linkIndex: number) => (
                              <div key={link.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                <span className="text-xs font-medium">{link.text}</span>
                                <span className="text-xs text-muted-foreground">→</span>
                                <span className="text-xs text-muted-foreground">{link.url}</span>
                                {link.isExternal && (
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLinkFromSection(sectionIndex, linkIndex)}
                                  className="text-red-600 hover:bg-red-50 ml-auto"
                                >
                                  <Trash className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Layers className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">لا توجد أقسام</p>
                <p className="text-xs text-muted-foreground">أضف أقسام لتنظيم روابط Footer</p>
              </CardContent>
            </Card>
          )}
        </div>
      </PropertySection>

      {/* الميزات */}
      <PropertySection
        title="ميزات المتجر"
        icon={<Star className="w-4 h-4" />}
        expanded={expandedSections.has('features')}
        onToggle={() => toggleSection('features')}
        action={
          <Switch
            checked={settings.showFeatures !== false}
            onCheckedChange={(checked) => onUpdate('showFeatures', checked)}
          />
        }
      >
        {settings.showFeatures !== false && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                المميزات ({(settings.features || []).length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                إضافة ميزة
              </Button>
            </div>

            {(settings.features || []).length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {(settings.features || []).map((feature: Feature, index: number) => (
                    <Card key={feature.id} className="border">
                      <CardContent className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={feature.icon}
                              onValueChange={(value) => updateFeature(index, { icon: value })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {featureIcons.map((icon) => (
                                  <SelectItem key={icon.value} value={icon.value}>
                                    <span>{icon.icon}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={feature.title}
                              onChange={(e) => updateFeature(index, { title: e.target.value })}
                              placeholder="عنوان الميزة"
                              className="flex-1 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFeature(index)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                          <Input
                            value={feature.description}
                            onChange={(e) => updateFeature(index, { description: e.target.value })}
                            placeholder="وصف الميزة"
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">لا توجد مميزات</p>
                  <p className="text-xs text-muted-foreground">أضف مميزات لعرضها في Footer</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PropertySection>

      {/* النشرة البريدية */}
      <PropertySection
        title="النشرة البريدية"
        icon={<Mail className="w-4 h-4" />}
        expanded={expandedSections.has('newsletter')}
        onToggle={() => toggleSection('newsletter')}
        action={
          <Switch
            checked={settings.showNewsletter !== false}
            onCheckedChange={(checked) => onUpdate('showNewsletter', checked)}
          />
        }
      >
        {settings.showNewsletter !== false && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">عنوان النشرة</Label>
              <Input
                value={settings.newsletterSettings?.title || ''}
                onChange={(e) => updateNewsletterSettings('title', e.target.value)}
                placeholder="النشرة البريدية"
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">وصف النشرة</Label>
              <Textarea
                value={settings.newsletterSettings?.description || ''}
                onChange={(e) => updateNewsletterSettings('description', e.target.value)}
                placeholder="اشترك في نشرتنا البريدية للحصول على آخر العروض"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">نص الحقل</Label>
                <Input
                  value={settings.newsletterSettings?.placeholder || ''}
                  onChange={(e) => updateNewsletterSettings('placeholder', e.target.value)}
                  placeholder="البريد الإلكتروني"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">نص الزر</Label>
                <Input
                  value={settings.newsletterSettings?.buttonText || ''}
                  onChange={(e) => updateNewsletterSettings('buttonText', e.target.value)}
                  placeholder="اشتراك"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </PropertySection>

      {/* حوار إضافة الرابط */}
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
                className="text-sm"
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
                className="text-sm"
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

      {/* حوار تأكيد الحذف */}
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
  )
}

export default FooterEditor 