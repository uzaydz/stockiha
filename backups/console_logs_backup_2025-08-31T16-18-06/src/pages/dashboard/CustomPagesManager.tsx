import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Eye, 
  Calendar,
  ExternalLink,
  Save,
  X
} from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { 
  getCustomPages, 
  saveCustomPage, 
  updateCustomPage, 
  deleteCustomPage,
  generateSlug,
  validateCustomPage,
  CustomPage 
} from '@/lib/customPages';
import { buildPreviewUrl, canPreviewPage, getPreviewUnavailableMessage } from '@/utils/previewUrl';
import { useTenant } from '@/context/TenantContext';

const CustomPagesManager: React.FC = () => {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState({
    open: false,
    page: null as CustomPage | null,
    isEditing: false
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    page: null as CustomPage | null
  });
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    meta_description: ''
  });
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();
  const { currentOrganization } = useTenant();

  // تحميل الصفحات
  const loadPages = async () => {
    try {
      setLoading(true);
      const pagesData = await getCustomPages();
      setPages(pagesData);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الصفحات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  // فتح حوار الإنشاء/التعديل
  const openEditDialog = (page?: CustomPage) => {
    if (page) {
      setFormData({
        title: page.title,
        slug: page.slug,
        content: page.content,
        meta_description: page.meta_description || ''
      });
      setEditDialog({ open: true, page, isEditing: true });
    } else {
      setFormData({
        title: '',
        slug: '',
        content: '',
        meta_description: ''
      });
      setEditDialog({ open: true, page: null, isEditing: false });
    }
  };

  // إغلاق حوار التعديل
  const closeEditDialog = () => {
    setEditDialog({ open: false, page: null, isEditing: false });
    setFormData({
      title: '',
      slug: '',
      content: '',
      meta_description: ''
    });
  };

  // تحديث الـ slug تلقائياً عند تغيير العنوان
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  // حفظ الصفحة
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // التحقق من صحة البيانات
      const errors = validateCustomPage(formData);
      if (errors.length > 0) {
        toast({
          title: "خطأ في البيانات",
          description: errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // التحقق من عدم تكرار الـ slug
      const existingPage = pages.find(p => 
        p.slug === formData.slug && 
        (!editDialog.isEditing || p.id !== editDialog.page?.id)
      );
      
      if (existingPage) {
        toast({
          title: "خطأ",
          description: "رابط الصفحة مستخدم بالفعل، يرجى اختيار رابط آخر",
          variant: "destructive"
        });
        return;
      }

      let success = false;
      
      if (editDialog.isEditing && editDialog.page) {
        // تعديل صفحة موجودة
        success = await updateCustomPage(editDialog.page.id, formData);
      } else {
        // إنشاء صفحة جديدة
        const newPage = await saveCustomPage(formData);
        success = !!newPage;
      }

      if (success) {
        toast({
          title: "تم بنجاح",
          description: editDialog.isEditing ? "تم تعديل الصفحة" : "تم إنشاء الصفحة"
        });
        closeEditDialog();
        loadPages();
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حفظ الصفحة",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الصفحة",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // حذف الصفحة
  const handleDelete = async () => {
    if (!deleteDialog.page) return;

    try {
      const success = await deleteCustomPage(deleteDialog.page.id);
      
      if (success) {
        toast({
          title: "تم الحذف",
          description: "تم حذف الصفحة بنجاح"
        });
        setDeleteDialog({ open: false, page: null });
        loadPages();
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حذف الصفحة",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الصفحة",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الصفحات المخصصة</h1>
          <p className="text-gray-600 mt-1">
            إنشاء وإدارة الصفحات المخصصة مثل سياسة الخصوصية وشروط الاستخدام
          </p>
        </div>
        <Button onClick={() => openEditDialog()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          إنشاء صفحة جديدة
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">إجمالي الصفحات</p>
                <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600" />
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">آخر صفحة</p>
                <p className="text-sm text-gray-900">
                  {pages.length > 0 
                    ? new Date(Math.max(...pages.map(p => new Date(p.created_at).getTime()))).toLocaleDateString('ar-SA')
                    : 'لا توجد صفحات'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">الصفحات المرتبطة</p>
                <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الصفحات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            الصفحات المخصصة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صفحات</h3>
              <p className="text-gray-600 mb-6">ابدأ بإنشاء أول صفحة مخصصة لمتجرك</p>
              <Button onClick={() => openEditDialog()} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إنشاء صفحة جديدة
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pages.map((page) => (
                <div key={page.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {page.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        /page/{page.slug}
                      </p>
                      {page.meta_description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {page.meta_description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(page.created_at).toLocaleDateString('ar-SA')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const previewUrl = buildPreviewUrl(page.slug, currentOrganization, 'custom');
                          window.open(previewUrl, '_blank');
                        }}
                        disabled={!canPreviewPage(true, currentOrganization)}
                        title={!canPreviewPage(true, currentOrganization) ? 
                          getPreviewUnavailableMessage(true, currentOrganization) : 
                          'معاينة الصفحة'
                        }
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        معاينة
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(page)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, page })}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* حوار الإنشاء/التعديل */}
      <Dialog open={editDialog.open} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editDialog.isEditing ? 'تعديل الصفحة' : 'إنشاء صفحة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isEditing 
                ? 'قم بتعديل بيانات الصفحة' 
                : 'أنشئ صفحة جديدة مثل سياسة الخصوصية أو شروط الاستخدام'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الصفحة</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="مثال: سياسة الخصوصية"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">رابط الصفحة</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="مثال: privacy-policy"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meta_description">وصف الصفحة (SEO)</Label>
              <Input
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="وصف مختصر للصفحة لمحركات البحث"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">محتوى الصفحة</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="محتوى الصفحة... يمكن استخدام HTML للتنسيق"
                rows={10}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'جاري الحفظ...' : (editDialog.isEditing ? 'حفظ التعديل' : 'إنشاء الصفحة')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الصفحة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف صفحة "{deleteDialog.page?.title}"؟ 
              لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الروابط المرتبطة بهذه الصفحة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف الصفحة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomPagesManager;
