import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/context/SupabaseContext';
import { useOrganization } from '@/hooks/useOrganization';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, ExternalLink, Trash2, Edit3, LayoutTemplate, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { buildPreviewUrl, canPreviewPage, getPreviewUnavailableMessage } from '@/utils/previewUrl';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  components_count: number;
}

interface LandingPagesManagerProps extends POSSharedLayoutControls {}

const LandingPagesManager: React.FC<LandingPagesManagerProps> = ({ useStandaloneLayout = true } = {}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { organization } = useOrganization();
  
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPageData, setNewPageData] = useState({
    name: '',
    slug: '',
    title: '',
    description: '',
    isPublished: false
  });
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // جلب صفحات الهبوط
  const fetchLandingPages = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select(`
          id, 
          name, 
          slug, 
          title, 
          is_published, 
          created_at, 
          updated_at,
          landing_page_components(id)
        `)
        .eq('organization_id', organization.id)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // تحويل البيانات لتناسب الواجهة المطلوبة
      const formattedPages = data.map(page => ({
        ...page,
        components_count: Array.isArray(page.landing_page_components) ? 
                         page.landing_page_components.length : 0
      }));
      
      setPages(formattedPages || []);
    } catch (error) {
      toast.error(t('حدث خطأ أثناء جلب صفحات الهبوط'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // إنشاء صفحة هبوط جديدة
  const createLandingPage = async () => {
    if (!organization?.id) return;
    
    try {
      // تحقق من البيانات المطلوبة
      if (!newPageData.name || !newPageData.slug) {
        toast.error(t('يرجى إدخال اسم ورابط الصفحة'));
        return;
      }
      
      // إنشاء الصفحة - استخدام طريقة مباشرة بدلاً من RPC
      const { data, error } = await supabase
        .from('landing_pages')
        .insert({
          organization_id: organization.id,
          name: newPageData.name,
          slug: newPageData.slug,
          title: newPageData.title || newPageData.name,
          description: newPageData.description,
          is_published: newPageData.isPublished,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();
      
      if (error) {
        if (error.message.includes('violates unique constraint') || 
            error.message.includes('duplicate key value')) {
          toast.error(t('يوجد صفحة هبوط أخرى بنفس الرابط'));
        } else {
          throw error;
        }
        return;
      }
      
      toast.success(t('تم إنشاء صفحة الهبوط بنجاح'));
      setCreateDialogOpen(false);
      
      // إعادة تعيين بيانات الصفحة الجديدة
      setNewPageData({
        name: '',
        slug: '',
        title: '',
        description: '',
        isPublished: false
      });
      
      // إعادة جلب الصفحات
      fetchLandingPages();
      
      // الانتقال إلى محرر الصفحة مع تمرير البيانات عبر URL
      const params = new URLSearchParams({
        from_create: 'true',
        name: newPageData.name,
        title: newPageData.title || newPageData.name,
        description: newPageData.description || '',
        is_published: newPageData.isPublished ? 'true' : 'false'
      });
      
      navigate(`/landing-page-builder/${data.id}?${params.toString()}`);
    } catch (error) {
      toast.error(t('حدث خطأ أثناء إنشاء صفحة الهبوط'));
    }
  };
  
  // تبديل حالة النشر
  const togglePagePublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ is_published: !isPublished })
        .eq('id', id);
      
      if (error) throw error;
      
      // تحديث القائمة محليًا
      setPages(pages.map(page => 
        page.id === id ? { ...page, is_published: !isPublished } : page
      ));
      
      toast.success(
        !isPublished
          ? t('تم نشر الصفحة بنجاح')
          : t('تم إلغاء نشر الصفحة')
      );
    } catch (error) {
      toast.error(t('حدث خطأ أثناء تغيير حالة النشر'));
    }
  };
  
  // حذف صفحة
  const deletePage = async () => {
    if (!pageToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ is_deleted: true })
        .eq('id', pageToDelete);
      
      if (error) throw error;
      
      toast.success(t('تم حذف الصفحة بنجاح'));
      // إزالة الصفحة من القائمة المحلية
      setPages(pages.filter(page => page.id !== pageToDelete));
    } catch (error) {
      toast.error(t('حدث خطأ أثناء حذف الصفحة'));
    } finally {
      setIsDeleting(false);
      setPageToDelete(null);
    }
  };
  
  // تحويل الاسم إلى سلاق (slug)
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[\s_]+/g, '-') // استبدال المسافات والشرطة السفلية بواصلة
      .replace(/[^\u0621-\u064A\u0660-\u0669a-z0-9-]/g, '') // إزالة الأحرف غير العربية أو الانجليزية أو الأرقام
      .replace(/-+/g, '-') // استبدال الواصلات المتكررة بواصلة واحدة
      .replace(/^-+|-+$/g, ''); // إزالة الواصلات من البداية والنهاية
  };
  
  // معالجة تغيير اسم الصفحة وإنشاء السلاق تلقائيًا
  const handleNameChange = (value: string) => {
    setNewPageData({
      ...newPageData,
      name: value,
      slug: generateSlug(value)
    });
  };
  
  // جلب الصفحات عند تحميل الصفحة
  useEffect(() => {
    if (organization?.id) {
      fetchLandingPages();
    }
  }, [organization?.id]);
  
  const content = (
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('صفحات الهبوط')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('إنشاء وإدارة صفحات الهبوط الخاصة بمتجرك')}
            </p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('إنشاء صفحة جديدة')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('إنشاء صفحة هبوط جديدة')}</DialogTitle>
                <DialogDescription>
                  {t('أدخل معلومات صفحة الهبوط الجديدة. يمكنك تعديل هذه المعلومات لاحقًا.')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('اسم الصفحة')}</Label>
                  <Input
                    id="name"
                    value={newPageData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t('مثال: عرض رمضان')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('اسم داخلي للصفحة يساعدك على تمييزها')}
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="slug">{t('رابط الصفحة')}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/</span>
                    <Input
                      id="slug"
                      value={newPageData.slug}
                      onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value })}
                      placeholder={t('مثال: ramadan-offer')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('سيكون هذا جزءًا من عنوان URL الخاص بالصفحة')}
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="title">{t('عنوان الصفحة')}</Label>
                  <Input
                    id="title"
                    value={newPageData.title}
                    onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                    placeholder={t('مثال: عرض رمضان الخاص - خصومات حصرية')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('سيظهر هذا العنوان في المتصفح ونتائج البحث')}
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('وصف الصفحة')}</Label>
                  <Input
                    id="description"
                    value={newPageData.description}
                    onChange={(e) => setNewPageData({ ...newPageData, description: e.target.value })}
                    placeholder={t('مثال: احصل على خصومات حصرية...')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('سيظهر هذا الوصف في نتائج البحث')}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="is-published"
                    checked={newPageData.isPublished}
                    onCheckedChange={(checked) => setNewPageData({ ...newPageData, isPublished: checked })}
                  />
                  <Label htmlFor="is-published" className="font-normal">
                    {t('نشر الصفحة فور إنشائها')}
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t('إلغاء')}
                </Button>
                <Button onClick={createLandingPage}>
                  {t('إنشاء صفحة')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          {isLoading ? (
            <CardContent className="p-6 text-center">
              <p>{t('جاري تحميل صفحات الهبوط...')}</p>
            </CardContent>
          ) : pages.length === 0 ? (
            <div className="p-6 text-center">
              <LayoutTemplate className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg mb-2">{t('لا توجد صفحات هبوط')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('لم تقم بإنشاء أي صفحات هبوط بعد. أنشئ صفحة جديدة للبدء.')}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('إنشاء صفحة جديدة')}
              </Button>
            </div>
          ) : (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('الاسم')}</TableHead>
                    <TableHead>{t('الرابط')}</TableHead>
                    <TableHead className="text-center">{t('المكونات')}</TableHead>
                    <TableHead className="text-center">{t('الحالة')}</TableHead>
                    <TableHead className="text-center">{t('تاريخ التعديل')}</TableHead>
                    <TableHead className="text-right">{t('الإجراءات')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.name}</TableCell>
                      <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                      <TableCell className="text-center">{page.components_count}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={page.is_published}
                            onCheckedChange={() => togglePagePublished(page.id, page.is_published)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/landing-page-builder/${page.id}`)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const previewUrl = buildPreviewUrl(page.slug, organization, 'landing');
                              window.open(previewUrl, '_blank');
                            }}
                            disabled={!canPreviewPage(page.is_published, organization)}
                            title={!canPreviewPage(page.is_published, organization) ? 
                              getPreviewUnavailableMessage(page.is_published, organization) : 
                              'معاينة الصفحة'
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setPageToDelete(page.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('حذف صفحة الهبوط')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('هل أنت متأكد من رغبتك في حذف هذه الصفحة؟ لا يمكن التراجع عن هذا الإجراء.')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>
                                  {t('إلغاء')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deletePage();
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? t('جاري الحذف...') : t('حذف')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default LandingPagesManager;
