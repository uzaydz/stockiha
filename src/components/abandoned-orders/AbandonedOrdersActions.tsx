import { useState } from "react";
import {
  Mail,
  Trash2,
  FileText,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AbandonedOrder } from "./AbandonedOrdersTable";

// تعريف Props لمكون الإجراءات
interface AbandonedOrdersActionsProps {
  selectedOrders: AbandonedOrder[];
  onSendReminders: (orders: AbandonedOrder[], message?: string) => Promise<void>;
  onRecoverOrders: (orders: AbandonedOrder[]) => Promise<void>;
  onDeleteOrders: (orders: AbandonedOrder[]) => Promise<void>;
  onExportOrders: (orders: AbandonedOrder[]) => Promise<void>;
  loading: boolean;
}

// مكون الإجراءات السريعة للطلبات المتروكة
export function AbandonedOrdersActions({
  selectedOrders,
  onSendReminders,
  onRecoverOrders,
  onDeleteOrders,
  onExportOrders,
  loading
}: AbandonedOrdersActionsProps) {
  const [reminderMessage, setReminderMessage] = useState<string>(
    "لقد لاحظنا أنك لم تكمل طلبك. هل نستطيع مساعدتك في إتمام الطلب؟"
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState<boolean>(false);
  
  // إجمالي قيمة الطلبات المحددة
  const totalValue = selectedOrders.reduce((sum, order) => sum + order.total, 0);
  
  // عدد الطلبات التي تحتوي على معلومات اتصال
  const contactInfoCount = selectedOrders.filter(order => order.customer_contact).length;
  
  // عرض كمية التخفيض بناءً على المتاح
  const getDiscountBadge = () => {
    if (selectedOrders.length > 0) {
      // يمكن تعديل هذا حسب سياسة الشركة
      const discount = selectedOrders.length >= 10 ? "15%" : selectedOrders.length >= 5 ? "10%" : "5%";
      return <Badge variant="outline" className="ml-1">{discount}</Badge>;
    }
    return null;
  };
  
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">الإجراءات السريعة</h3>
              <p className="text-sm text-muted-foreground">
                {selectedOrders.length > 0 
                  ? `${selectedOrders.length} طلب محدد بقيمة ${new Intl.NumberFormat("ar-DZ", {
                      style: "currency",
                      currency: "DZD"
                    }).format(totalValue)}`
                  : "حدد طلبات لتنفيذ إجراءات عليها"
                }
              </p>
            </div>
            
            {selectedOrders.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.dispatchEvent(new CustomEvent("abandoned-orders-deselect-all"))}
              >
                إلغاء التحديد
              </Button>
            )}
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* إرسال تذكير */}
            <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2 space-x-reverse"
                  disabled={selectedOrders.length === 0 || contactInfoCount === 0 || loading}
                >
                  <Mail className="ml-2 h-4 w-4" />
                  <span>إرسال تذكير</span>
                  {contactInfoCount > 0 && (
                    <Badge variant="secondary">{contactInfoCount}</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إرسال تذكير للعملاء</DialogTitle>
                  <DialogDescription>
                    سيتم إرسال رسالة تذكيرية للعملاء المحددين ({contactInfoCount} من {selectedOrders.length})
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-message">نص الرسالة</Label>
                    <Textarea
                      id="reminder-message"
                      placeholder="أدخل نص الرسالة التذكيرية..."
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                    <div className="text-sm">
                      سيتم تضمين رابط إكمال الطلب تلقائياً
                    </div>
                  </div>
                  
                  {contactInfoCount < selectedOrders.length && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 ml-2" />
                      <div className="text-sm">
                        {selectedOrders.length - contactInfoCount} من الطلبات المحددة لا تحتوي على معلومات اتصال
                      </div>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setReminderDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    onClick={async () => {
                      await onSendReminders(selectedOrders, reminderMessage);
                      setReminderDialogOpen(false);
                    }}
                    disabled={loading}
                  >
                    إرسال التذكير
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* استرجاع الطلبات */}
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 space-x-reverse"
              disabled={selectedOrders.length === 0 || loading}
              onClick={() => onRecoverOrders(selectedOrders)}
            >
              <RotateCcw className="ml-2 h-4 w-4" />
              <span>استرجاع الطلبات</span>
              {getDiscountBadge()}
            </Button>
            
            {/* تصدير الطلبات */}
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 space-x-reverse"
              disabled={selectedOrders.length === 0 || loading}
              onClick={() => onExportOrders(selectedOrders)}
            >
              <FileText className="ml-2 h-4 w-4" />
              <span>تصدير للإكسل</span>
            </Button>
            
            {/* حذف الطلبات */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2 space-x-reverse bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800"
                  disabled={selectedOrders.length === 0 || loading}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  <span>حذف الطلبات</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف {selectedOrders.length} طلب متروك نهائياً. لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:text-white dark:hover:bg-red-600"
                    onClick={async () => {
                      await onDeleteOrders(selectedOrders);
                      setDeleteDialogOpen(false);
                    }}
                  >
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          {selectedOrders.length > 0 && (
            <>
              <Separator />
              
              <div className="flex flex-col space-y-2">
                <h4 className="text-sm font-medium">الإجراءات الذكية</h4>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 ml-3 text-primary" />
                      <div>
                        <div className="text-sm font-medium">إرسال عرض خاص</div>
                        <div className="text-xs text-muted-foreground">
                          تحفيز {contactInfoCount} عميل لإكمال الطلبات بقيمة {new Intl.NumberFormat("ar-DZ", {
                            style: "currency",
                            currency: "DZD",
                            maximumFractionDigits: 0,
                          }).format(totalValue)}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" disabled={contactInfoCount === 0 || loading}>
                      إرسال عرض
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                    <div className="flex items-center">
                      <CornerDownLeft className="h-5 w-5 ml-3 text-green-600 dark:text-green-500" />
                      <div>
                        <div className="text-sm font-medium">تحويل إلى طلبات فعلية</div>
                        <div className="text-xs text-muted-foreground">
                          تحويل {selectedOrders.length} طلب متروك إلى طلبات فعلية 
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" disabled={loading}>
                      تحويل
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 