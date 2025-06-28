import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { SubscriptionServiceCategory } from './types';

interface CategoryManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onCategoriesUpdate: (categories: SubscriptionServiceCategory[]) => void;
}

interface CategoryFormData {
  name: string;
  description: string;
  icon_url: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
  icon_url: ''
};

export const CategoryManagerDialog: React.FC<CategoryManagerDialogProps> = ({
  isOpen,
  onClose,
  organizationId,
  onCategoriesUpdate
}) => {
  const [categories, setCategories] = useState<SubscriptionServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SubscriptionServiceCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<SubscriptionServiceCategory | null>(null);

  // جلب الفئات
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('subscription_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في جلب الفئات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, organizationId]);

  const handleInputChange = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "اسم الفئة مطلوب",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (editingCategory) {
        // تحديث فئة موجودة
        const { error } = await (supabase as any)
          .from('subscription_categories')
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "تم بنجاح",
          description: "تم تحديث الفئة بنجاح",
        });
      } else {
        // إضافة فئة جديدة
        const { error } = await (supabase as any)
          .from('subscription_categories')
          .insert({
            name: formData.name,
            description: formData.description,
            icon: formData.icon_url,
            organization_id: organizationId
          });

        if (error) throw error;

        toast({
          title: "تم بنجاح",
          description: "تم إضافة الفئة بنجاح",
        });
      }

      // إعادة تعيين النموذج
      setFormData(initialFormData);
      setEditingCategory(null);
      setShowAddForm(false);
      
      // إعادة جلب الفئات وتحديث المكون الأساسي
      await fetchCategories();
      
      // الحصول على أحدث البيانات وتمريرها للمكون الأساسي
      const { data: updatedCategories } = await (supabase as any)
        .from('subscription_categories')
        .select('*')
        .order('name');
      
      if (updatedCategories) {
        onCategoriesUpdate(updatedCategories);
      }

    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الفئة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: SubscriptionServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);

      const { error } = await (supabase as any)
        .from('subscription_categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم حذف الفئة بنجاح",
      });

      await fetchCategories();
      
      // الحصول على أحدث البيانات وتمريرها للمكون الأساسي
      const { data: updatedCategories } = await (supabase as any)
        .from('subscription_categories')
        .select('*')
        .order('name');
      
      if (updatedCategories) {
        onCategoriesUpdate(updatedCategories);
      }

    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الفئة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingCategory(null);
    setShowAddForm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إدارة فئات خدمات الاشتراك</DialogTitle>
            <DialogDescription>
              إضافة وتعديل وحذف فئات خدمات الاشتراك
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* زر إضافة فئة جديدة */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">الفئات الحالية</h3>
              <Button 
                onClick={() => setShowAddForm(true)}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                إضافة فئة جديدة
              </Button>
            </div>

            {/* نموذج إضافة/تعديل الفئة */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم الفئة *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="مثال: بث الفيديو"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="icon_url">رابط الأيقونة</Label>
                      <Input
                        id="icon_url"
                        value={formData.icon_url}
                        onChange={(e) => handleInputChange('icon_url', e.target.value)}
                        placeholder="https://example.com/icon.png"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="وصف مختصر للفئة..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      <X className="h-4 w-4 mr-2" />
                      إلغاء
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingCategory ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* جدول الفئات */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center">جاري التحميل...</div>
                ) : categories.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    لا توجد فئات. اضغط "إضافة فئة جديدة" لإنشاء فئة
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم الفئة</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {category.icon && (
                                <img 
                                  src={category.icon} 
                                  alt={category.name}
                                  className="w-6 h-6 rounded object-cover"
                                />
                              )}
                              {category.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {category.description || 'لا يوجد وصف'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCategoryToDelete(category);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفئة "{categoryToDelete?.name}"؟ 
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
