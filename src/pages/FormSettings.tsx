import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Trash } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import FormBuilderForm from '@/components/form-settings/FormBuilderForm';
import EmptyState from '@/components/EmptyState';
import { FormSettings, getFormSettings, deleteFormSettings } from '@/api/form-settings';
import Layout from '@/components/Layout';

export default function FormSettingsPage() {
  const { currentOrganization } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formSettings, setFormSettings] = useState<FormSettings[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);

  const fetchFormSettings = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const settings = await getFormSettings(currentOrganization.id);
      setFormSettings(settings);
    } catch (error) {
      console.error('Error fetching form settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل إعدادات النماذج',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchFormSettings();
    }
  }, [currentOrganization]);

  const handleCreateForm = () => {
    navigate('/form-builder/new');
  };

  const handleEditForm = (id: string) => {
    navigate(`/form-builder/${id}`);
  };

  const handleDeleteForm = async () => {
    if (!formToDelete) return;

    try {
      const success = await deleteFormSettings(formToDelete);
      if (success) {
        setFormSettings(prev => prev.filter(form => form.id !== formToDelete));
        setIsDeleteDialogOpen(false);
        setFormToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف النموذج',
        variant: 'destructive',
      });
    }
  };

  // محتوى الصفحة
  const pageContent = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إعدادات النماذج</h1>
          <p className="text-muted-foreground mt-2">
            قم بإنشاء وتخصيص نماذج الطلب التي تظهر للعملاء عند شراء المنتجات.
          </p>
        </div>
        <Button onClick={handleCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          نموذج جديد
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-0">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : formSettings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Settings className="h-10 w-10 mb-4 text-muted-foreground" />
          <h3 className="text-2xl font-semibold">لا توجد نماذج حتى الآن</h3>
          <p className="text-muted-foreground mt-2 mb-6">
            قم بإنشاء نموذج طلب جديد لبدء تخصيص تجربة العملاء.
          </p>
          <Button onClick={handleCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            إنشاء نموذج
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formSettings.map((form) => (
            <Card key={form.id} className="overflow-hidden border-primary/20 transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{form.name}</CardTitle>
                  {form.is_default && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      افتراضي
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  تم التحديث: {new Date(form.updated_at).toLocaleDateString('ar-SA')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">عدد الحقول:</span>
                    <span className="font-medium">{form.fields.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">المنتجات:</span>
                    <span className="font-medium">
                      {form.product_ids.length === 0
                        ? 'جميع المنتجات'
                        : `${form.product_ids.length} منتج`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الحالة:</span>
                    <Badge
                      variant={form.is_active ? 'default' : 'secondary'}
                      className="font-normal"
                    >
                      {form.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormToDelete(form.id);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash className="h-4 w-4 ml-2" />
                  حذف
                </Button>
                <Button onClick={() => handleEditForm(form.id)}>
                  <Settings className="h-4 w-4 ml-2" />
                  تعديل
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* حوار تأكيد الحذف */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف النموذج</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا النموذج؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setFormToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteForm}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Layout>
      {pageContent}
    </Layout>
  );
} 