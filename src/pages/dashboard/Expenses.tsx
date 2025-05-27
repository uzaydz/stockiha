import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseSummary } from "@/components/expenses/ExpenseSummary";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseFormData } from "@/types/expenses";
import { useExpenses } from "@/hooks/useExpenses";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from '@/components/Layout';

export default function ExpensesPage() {
  const { useCreateExpenseMutation } = useExpenses();
  const createExpenseMutation = useCreateExpenseMutation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();

  // تأكد من جلسة المستخدم وإعداد البيانات الأساسية عند تحميل الصفحة
  useEffect(() => {
    const setupExpenseData = async () => {
      // التحقق من الجلسة والحصول عليها
      const { data } = await supabase.auth.getSession();
      
      // إذا لم تكن هناك جلسة، حاول تحديث الجلسة
      if (!data.session) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
        }
      } else if (data.session) {
        // قم بتخزين معرف المنظمة للمستخدم الحالي في localStorage
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', data.session.user.id)
          .single();
        
        if (userData && userData.organization_id) {
          localStorage.setItem('currentOrganizationId', userData.organization_id);

          // بعد الحصول على معرف المنظمة، تحقق من وجود فئات المصروفات
          await ensureExpenseCategories(userData.organization_id);
        } else if (!userData && !userError) {
          // إذا لم يكن هناك معرف منظمة للمستخدم، قم بتخزين القيمة الافتراضية
          const defaultOrgId = '11111111-1111-1111-1111-111111111111';
          localStorage.setItem('currentOrganizationId', defaultOrgId);

          // استخدم معرف المنظمة الافتراضي لإنشاء فئات المصروفات
          await ensureExpenseCategories(defaultOrgId);
        }
      }
    };
    
    // التأكد من وجود فئات المصروفات الأساسية
    const ensureExpenseCategories = async (organizationId: string) => {
      try {
        // تحقق من وجود فئات المصروفات
        const { data: existingCategories } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('organization_id', organizationId);
          
        // إذا لم تكن هناك فئات، قم بإنشاء الفئات الافتراضية
        if (!existingCategories || existingCategories.length === 0) {

          const defaultCategories = [
            { name: 'الرواتب', organization_id: organizationId },
            { name: 'إيجار', organization_id: organizationId },
            { name: 'مرافق', organization_id: organizationId },
            { name: 'مشتريات', organization_id: organizationId },
            { name: 'نقل ومواصلات', organization_id: organizationId },
            { name: 'تسويق وإعلان', organization_id: organizationId },
            { name: 'أخرى', organization_id: organizationId }
          ];
          
          const { error } = await supabase
            .from('expense_categories')
            .insert(defaultCategories);
            
          if (error) {
          } else {
            
          }
        } else {
          
        }
      } catch (error) {
      }
    };
    
    setupExpenseData();
  }, []);

  const handleCreateExpense = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      // تأكد من وجود جلسة مصادقة قبل إضافة المصروف
      if (!session) {
        toast.error("يجب تسجيل الدخول لإضافة مصروف");
        return;
      }
      
      await createExpenseMutation.mutateAsync(data);
      toast.success("تم إضافة المصروف بنجاح");
      setIsFormOpen(false);
    } catch (error) {
      toast.error("فشل في إضافة المصروف. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">المصروفات</h1>
            <p className="text-muted-foreground">
              إدارة ومتابعة مصروفات مؤسستك
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مصروف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة مصروف جديد</DialogTitle>
                <DialogDescription>
                  أضف سجل مصروف جديد لتتبع إنفاقك
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm onSubmit={handleCreateExpense} isSubmitting={isSubmitting} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="expenses">جميع المصروفات</TabsTrigger>
            <TabsTrigger value="recurring">المصروفات المتكررة</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ExpenseSummary />
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>جميع المصروفات</CardTitle>
                <CardDescription>عرض وإدارة سجلات المصروفات الخاصة بك</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurring">
            <Card>
              <CardHeader>
                <CardTitle>المصروفات المتكررة</CardTitle>
                <CardDescription>إدارة مدفوعات المصروفات المتكررة</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList showRecurringOnly={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
