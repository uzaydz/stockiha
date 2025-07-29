import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { useSupabase } from '@/context/SupabaseContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

// استيراد مكونات محرر صفحة الهبوط
import LandingPageEditor from '@/components/landing-page-builder/LandingPageEditor';
import PageSettingsForm from '@/components/landing-page-builder/PageSettingsForm';

// استيراد الأنواع والوظائف المساعدة
import { LandingPage } from '@/components/landing-page-builder/types';

/**
 * صفحة محرر صفحة الهبوط الرئيسية
 */
const LandingPageBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { id: pageId } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // التحقق من صحة المعرف
  const isValidUUID = (id?: string) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  const isNewPage = !pageId || pageId === 'new' || pageId === 'new-page' || !isValidUUID(pageId);
  
  // حالة الصفحة الحالية
  const [currentPage, setCurrentPage] = useState<LandingPage>({
    id: pageId || 'new-page',
    name: 'صفحة هبوط جديدة',
    slug: 'new-landing-page',
    components: [],
    settings: {
      title: 'صفحة هبوط جديدة',
      description: '',
      keywords: '',
      isPublished: false
    }
  });
  
  // جلب بيانات الصفحة إذا كان هناك معرّف موجود
  useEffect(() => {
    if (pageId && isValidUUID(pageId) && !dataLoaded) {
      fetchLandingPage(pageId);
    }
  }, [pageId, dataLoaded]);
  
  // تحقق من وجود معلومات منقولة من صفحة القائمة
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromCreate = searchParams.get('from_create');
    
    if (fromCreate === 'true' && pageId) {
      // استخراج المعلومات من URL إذا وجدت
      const name = searchParams.get('name');
      const title = searchParams.get('title') || name;
      const description = searchParams.get('description') || '';
      const isPublished = searchParams.get('is_published') === 'true';
      
      // تحديث الصفحة الحالية بالمعلومات المنقولة
      if (name && !dataLoaded) {
        const updatedPage = {
          id: pageId,
          name: name,
          slug: currentPage.slug,
          components: currentPage.components,
          settings: {
            title: title || name,
            description: description || '',
            keywords: '',
            isPublished: isPublished
          }
        };
        
        setCurrentPage(updatedPage);
        
        // أيضًا، قم بتحديث العنوان في واجهة المستخدم
        document.title = `${name} - محرر صفحة الهبوط`;
      }
      
      // إزالة البارامترات من URL بعد استخدامها
      window.history.replaceState(null, '', `/landing-page-builder/${pageId}`);
    }
  }, [pageId, dataLoaded]);
  
  // جلب بيانات صفحة الهبوط
  const fetchLandingPage = async (landingPageId: string) => {
    try {
      const { data: pageData, error: pageError } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', landingPageId)
        .eq('is_deleted', false)
        .single();
      
      if (pageError) {
        throw pageError;
      }
      
      // جلب مكونات الصفحة
      const { data: componentsData, error: componentsError } = await supabase
        .from('landing_page_components')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .order('position', { ascending: true });
      
      if (componentsError) {
        throw componentsError;
      }
      
      // تحويل البيانات إلى الشكل المطلوب
      const formattedComponents = componentsData.map(comp => ({
        id: comp.id,
        type: comp.type,
        isActive: comp.is_active,
        settings: comp.settings || {}
      }));
      
      // تأكد من أن جميع البيانات موجودة وصحيحة
      const updatedPage = {
        id: pageData.id,
        name: pageData.name || 'صفحة هبوط',
        slug: pageData.slug || '',
        components: formattedComponents,
        settings: {
          title: pageData.title || pageData.name || '',
          description: pageData.description || '',
          keywords: pageData.keywords || '',
          isPublished: pageData.is_published || false
        }
      };
      
      setCurrentPage(updatedPage);
      setDataLoaded(true);
      
      // تحديث العنوان في المتصفح
      document.title = `${pageData.name} - محرر صفحة الهبوط`;
      
    } catch (error) {
      toast.error(t('حدث خطأ أثناء تحميل صفحة الهبوط'));
    }
  };
  
  // حفظ صفحة الهبوط
  const saveLandingPage = async () => {
    if (!organization?.id) {
      toast.error(t('لم يتم العثور على المؤسسة'));
      return;
    }
    
    setIsSaving(true);
    try {
      // تنفيذ عملية الحفظ - سأحتفظ بها مفصلة لأهميتها
      await saveLandingPageData(currentPage, organization.id);
      toast.success(t('تم حفظ الصفحة بنجاح'));
    } catch (error) {
      toast.error(t('حدث خطأ أثناء حفظ صفحة الهبوط'));
    } finally {
      setIsSaving(false);
    }
  };

  // وظيفة مساعدة لحفظ البيانات
  const saveLandingPageData = async (page: LandingPage, orgId: string) => {
    let landingPageId = page.id;
      const isNewPage = !isValidUUID(landingPageId);
      
    if (isNewPage) {
      // إنشاء صفحة جديدة
      const uniqueSlug = await generateUniqueSlug(page.slug || page.name);
      
        const { data: newPage, error: pageError } = await supabase
          .from('landing_pages')
          .insert({
          organization_id: orgId,
          name: page.name,
          slug: uniqueSlug,
          title: page.settings.title,
          description: page.settings.description,
          keywords: page.settings.keywords,
          is_published: page.settings.isPublished,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select('id, slug')
          .single();
        
        if (pageError) {
          if (pageError.code === '23505') {
            toast.error(t('يوجد صفحة أخرى بنفس الرابط، تم توليد رابط جديد'));
        }
            throw pageError;
        }
        
        landingPageId = newPage.id;
        
      // تحديث الرابط والمعرف في واجهة المستخدم
          setCurrentPage(prev => ({ ...prev, id: landingPageId, slug: uniqueSlug }));
      
      // تغيير عنوان URL مباشرة
      window.history.replaceState(null, '', `/landing-page-builder/${landingPageId}`);
      
      // إضافة المكونات
      if (page.components.length > 0) {
        const componentsToInsert = page.components.map((comp, index) => ({
          landing_page_id: landingPageId,
          type: comp.type,
          position: index,
          is_active: comp.isActive,
          settings: comp.settings
        }));
        
        await supabase.from('landing_page_components').insert(componentsToInsert);
      }
      } else {
      // تحديث صفحة موجودة
      try {
        const { error: updateError } = await supabase
          .from('landing_pages')
          .update({
            name: page.name,
            title: page.settings.title,
            description: page.settings.description,
            keywords: page.settings.keywords,
            is_published: page.settings.isPublished,
            updated_at: new Date().toISOString()
          })
          .eq('id', landingPageId);
        
        if (updateError) throw updateError;
        
        // تحديث المكونات
        await updateComponents(landingPageId, page.components);
        
      } catch (error: any) {
        // إذا لم يتم العثور على الصفحة، إنشاء صفحة جديدة
        if (error.code === 'PGRST116') {
          await createNewPageWithComponents(page, orgId);
        } else {
          throw error;
        }
      }
    }
  };
  
  // إنشاء صفحة جديدة مع مكوناتها
  const createNewPageWithComponents = async (page: LandingPage, orgId: string) => {
    const uniqueSlug = await generateUniqueSlug(page.slug || page.name);
            
            const { data: newPage, error: pageError } = await supabase
              .from('landing_pages')
              .insert({
        organization_id: orgId,
        name: page.name,
                slug: uniqueSlug,
        title: page.settings.title,
        description: page.settings.description,
        keywords: page.settings.keywords,
        is_published: page.settings.isPublished,
                created_by: (await supabase.auth.getUser()).data.user?.id
              })
              .select('id, slug')
              .single();
            
    if (pageError) throw pageError;
    
    const landingPageId = newPage.id;
            setCurrentPage(prev => ({ ...prev, id: landingPageId, slug: uniqueSlug }));
            
    // تغيير عنوان URL
            window.history.replaceState(null, '', `/landing-page-builder/${landingPageId}`);
            
            // إضافة المكونات
    if (page.components.length > 0) {
      const componentsToInsert = page.components.map((comp, index) => ({
                landing_page_id: landingPageId,
                type: comp.type,
                position: index,
                is_active: comp.isActive,
                settings: comp.settings
              }));
              
      await supabase.from('landing_page_components').insert(componentsToInsert);
    }
  };
  
  // تحديث مكونات الصفحة
  const updateComponents = async (pageId: string, components: any[]) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    try {
      if (components.length > 0) {
        // الحصول على قائمة بالمكونات الحالية في قاعدة البيانات
        const { data: existingComponents, error: fetchError } = await supabase
          .from('landing_page_components')
          .select('id')
          .eq('landing_page_id', pageId);
        
        if (fetchError) throw fetchError;
        
        const existingDbIds = existingComponents?.map(c => c.id) || [];
        
        // تحديد المكونات الموجودة والجديدة
        const componentsWithIds = components.filter(c => c.id && uuidRegex.test(c.id));
        const componentsWithoutIds = components.filter(c => !c.id || !uuidRegex.test(c.id));
        const existingComponentIds = componentsWithIds.map(c => c.id);
        
        // 1. تحديث المكونات الموجودة
        for (let i = 0; i < componentsWithIds.length; i++) {
          const comp = componentsWithIds[i];
          await supabase
            .from('landing_page_components')
            .update({
              position: i,
              is_active: comp.isActive,
              settings: comp.settings,
              updated_at: new Date().toISOString()
            })
            .eq('id', comp.id);
        }
        
        // 2. إضافة المكونات الجديدة
        if (componentsWithoutIds.length > 0) {
          const componentsToInsert = componentsWithoutIds.map((comp, index) => ({
            landing_page_id: pageId,
            type: comp.type,
            position: componentsWithIds.length + index,
            is_active: comp.isActive,
            settings: comp.settings
          }));
          
          await supabase
            .from('landing_page_components')
            .insert(componentsToInsert);
        }
        
        // 3. حذف المكونات التي لم تعد موجودة
        const idsToKeep = new Set(existingComponentIds);
        const idsToDelete = existingDbIds.filter(id => !idsToKeep.has(id));
        
        if (idsToDelete.length > 0) {
          await supabase
            .from('landing_page_components')
            .delete()
            .in('id', idsToDelete);
        }
      } else {
        // إذا لم تكن هناك مكونات، حذف جميع المكونات
        await supabase
          .from('landing_page_components')
          .delete()
          .eq('landing_page_id', pageId);
      }
    } catch (error) {
      throw error;
    }
  };
  
  // توليد رابط فريد
  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    // تحويل الاسم إلى رابط أساسي
    let baseSlug = baseName
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\u0621-\u064A\u0660-\u0669a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'صفحة-هبوط';
    
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;
    
    // التحقق من فرادة الرابط
    while (!isUnique) {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('organization_id', organization?.id)
        .eq('slug', slug)
        .eq('is_deleted', false);
      
      if (error) {
        return `${baseSlug}-${Date.now()}`;
      }
      
      if (data && data.length === 0) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    
    return slug;
  };

  // معالج تغيير التبويب
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('إنشاء صفحة هبوط')}</h1>
          <div>
            <Button 
              size="sm" 
              onClick={saveLandingPage}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('جاري الحفظ...') : t('حفظ')}
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              {t('المحرر')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              {t('إعدادات الصفحة')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor">
            <LandingPageEditor 
              page={currentPage}
              onPageUpdate={setCurrentPage}
            />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardContent className="p-6">
                <PageSettingsForm 
                  settings={currentPage.settings} 
                  onUpdate={(settings) => setCurrentPage({...currentPage, settings})} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default LandingPageBuilder;
