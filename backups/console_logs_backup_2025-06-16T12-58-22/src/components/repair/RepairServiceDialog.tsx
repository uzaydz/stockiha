import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase'; // استيراد كائن supabase مباشرة
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

// مكونات واجهة المستخدم
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, Wrench, Trash2, Plus, Share2 } from 'lucide-react';

// استيراد مدير أماكن التصليح
import RepairLocationManager from '@/components/pos/RepairLocationManager';
import { RepairLocation } from '@/components/pos/RepairLocationManager';

// واجهات البيانات
interface RepairServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, trackingCode: string) => void;
}

const RepairServiceDialog = ({ isOpen, onClose, onSuccess }: RepairServiceDialogProps) => {
  const { user, organizationId } = useUser();
  
  // حالة النموذج
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [repairLocation, setRepairLocation] = useState<string>('');
  const [customLocation, setCustomLocation] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('نقدًا');
  
  // حالة رفع الصور
  const [fileList, setFileList] = useState<File[]>([]);
  const [filePreview, setFilePreview] = useState<string[]>([]);
  
  // حالة تحميل البيانات
  const [repairLocations, setRepairLocations] = useState<RepairLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالة مدير أماكن التصليح
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  
  // جلب قائمة أماكن التصليح
  const fetchRepairLocations = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('repair_locations')
        .select('id, name, is_default')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      // تحويل البيانات إلى النوع RepairLocation
      const typedData = data as unknown as RepairLocation[];
      setRepairLocations(typedData || []);
      
      // تعيين المكان الافتراضي إذا وجد
      const defaultLocation = typedData?.find(loc => loc.is_default);
      if (defaultLocation && !repairLocation) {
        setRepairLocation(defaultLocation.id);
      }
    } catch (error) {
      toast.error('فشل في جلب أماكن التصليح');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRepairLocations();
    }
  }, [supabase, organizationId, isOpen]);

  // إعادة تعيين النموذج عند الإغلاق
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // إعادة تعيين النموذج
  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setRepairLocation('');
    setCustomLocation('');
    setIssueDescription('');
    setTotalPrice(0);
    setPaidAmount(0);
    setPaymentMethod('نقدًا');
    setFileList([]);
    setFilePreview([]);
  };

  // معالجة تغيير الملفات
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;

      if (!isImage) {
        toast.error('يمكنك رفع ملفات الصور فقط!');
        continue;
      }

      if (!isLt5M) {
        toast.error('يجب أن يكون حجم الصورة أقل من 5 ميجابايت!');
        continue;
      }

      newFiles.push(file);
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
    }

    setFileList([...fileList, ...newFiles]);
    setFilePreview([...filePreview, ...newPreviews]);
  };

  // حذف ملف
  const removeFile = (index: number) => {
    const newFiles = [...fileList];
    const newPreviews = [...filePreview];
    
    // تحرير عنوان URL للمعاينة
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFileList(newFiles);
    setFilePreview(newPreviews);
  };

  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerPhone || !totalPrice) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // إنشاء معرّف فريد للطلبية
      const repairOrderId = uuidv4();
      
      // توليد رقم الطلبية ورمز التتبع
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const orderNumber = `RPR-${year}${month}-${randomDigits}`;
      const trackingCode = `TR-${year}${month}-${randomDigits}-${repairOrderId.slice(0, 4)}`;

      // إعداد بيانات الطلبية
      const repairOrderData = {
        id: repairOrderId,
        organization_id: organizationId,
        customer_name: customerName,
        customer_phone: customerPhone,
        repair_location_id: repairLocation === 'أخرى' ? null : repairLocation,
        custom_location: repairLocation === 'أخرى' ? customLocation : null,
        issue_description: issueDescription,
        total_price: totalPrice,
        paid_amount: paidAmount || 0,
        payment_method: paymentMethod,
        received_by: user?.id,
        status: 'قيد الانتظار',
        order_number: orderNumber,
        repair_tracking_code: trackingCode,
      };

      // إدراج الطلبية في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('repair_orders')
        .insert(repairOrderData as any);

      if (insertError) {
        throw new Error(`فشل في إضافة طلبية التصليح: ${insertError.message}`);
      }

      // إنشاء سجل تاريخ الحالة الأولي
      const historyEntry = {
        repair_order_id: repairOrderId,
        status: 'قيد الانتظار',
        notes: 'تم إنشاء طلبية التصليح',
        created_by: user?.id,
      };

      const { error: historyError } = await supabase
        .from('repair_status_history')
        .insert(historyEntry as any);

      if (historyError) {
      }

      // رفع الصور إذا كانت موجودة
      if (fileList.length > 0) {
        const imagePromises = fileList.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${repairOrderId}/${uuidv4()}.${fileExt}`;
          const filePath = `repair_images/${fileName}`;

          // رفع الملف إلى التخزين
          const { error: uploadError } = await supabase.storage
            .from('repair_images')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`فشل في رفع الصورة: ${uploadError.message}`);
          }

          // الحصول على رابط عام للصورة
          const { data: urlData } = await supabase.storage
            .from('repair_images')
            .getPublicUrl(filePath);

          // إضافة الصورة إلى جدول صور التصليح
          const imageData = {
            repair_order_id: repairOrderId,
            image_url: urlData.publicUrl,
            image_type: 'before',
            description: 'صورة قبل التصليح'
          };

          const { error: imageInsertError } = await supabase
            .from('repair_images')
            .insert(imageData as any);

          if (imageInsertError) {
            throw new Error(`فشل في تسجيل بيانات الصورة: ${imageInsertError.message}`);
          }

          return urlData.publicUrl;
        });

        // انتظار اكتمال رفع جميع الصور
        await Promise.all(imagePromises);
      }

      toast.success('تم إضافة طلبية التصليح بنجاح');
      
      // استدعاء دالة النجاح مع معرّف الطلبية ورمز التتبع
      onSuccess(repairOrderId, trackingCode);
      
      // إغلاق النافذة وإعادة تعيين النموذج
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة طلبية التصليح');
    } finally {
      setIsSubmitting(false);
    }
  };

  // التعامل مع اختيار إضافة مكان جديد
  useEffect(() => {
    if (repairLocation === 'add_new') {
      // إعادة تعيين الاختيار وفتح مدير المواقع
      setRepairLocation('');
      setIsLocationManagerOpen(true);
    }
  }, [repairLocation]);

  // التعامل مع اختيار مكان من مدير المواقع
  const handleLocationSelect = (location: RepairLocation) => {
    setRepairLocation(location.id);
    setIsLocationManagerOpen(false);
    
    // تحديث قائمة الأماكن إذا لم يكن المكان موجودًا بالفعل
    if (!repairLocations.some(loc => loc.id === location.id)) {
      setRepairLocations(prev => [location, ...prev]);
    }
  };

  // تحديث قائمة الأماكن عند إغلاق مدير الأماكن
  const handleLocationManagerClose = () => {
    setIsLocationManagerOpen(false);
    fetchRepairLocations();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wrench className="h-5 w-5" />
            إضافة طلبية تصليح جديدة
          </DialogTitle>
          <DialogDescription>
            أدخل بيانات طلبية التصليح الجديدة
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh] overflow-y-auto px-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* معلومات العميل */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <h3 className="text-lg font-medium border-b pb-2">معلومات العميل</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">اسم العميل <span className="text-red-500">*</span></Label>
                  <Input 
                    id="customer_name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسم العميل" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">رقم الهاتف <span className="text-red-500">*</span></Label>
                  <Input 
                    id="customer_phone" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="أدخل رقم الهاتف" 
                    pattern="^[0-9]{10}$"
                    title="رقم الهاتف يجب أن يتكون من 10 أرقام"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* معلومات التصليح */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <h3 className="text-lg font-medium border-b pb-2">معلومات التصليح</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repair_location">مكان التصليح <span className="text-red-500">*</span></Label>
                  <Select 
                    value={repairLocation} 
                    onValueChange={setRepairLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مكان التصليح" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>أماكن التصليح</SelectLabel>
                        {repairLocations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectItem value="أخرى">مكان آخر (أدخل الاسم)</SelectItem>
                        <SelectItem value="add_new" className="text-primary flex items-center gap-1">
                          <Plus className="h-4 w-4" /> إضافة مكان جديد
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {repairLocation === 'أخرى' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom_location">حدد مكان التصليح <span className="text-red-500">*</span></Label>
                    <Input 
                      id="custom_location" 
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="أدخل مكان التصليح" 
                      required={repairLocation === 'أخرى'}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="issue_description">وصف العطل</Label>
                  <Textarea 
                    id="issue_description" 
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="أدخل وصف العطل" 
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="repair_images">صور للجهاز</Label>
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Input
                      id="repair_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="repair_images" className="w-full h-full cursor-pointer flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                      <span className="text-muted-foreground">اضغط لإضافة صور</span>
                      <span className="text-xs text-muted-foreground">أو اسحب الصور وأفلتها هنا</span>
                    </Label>
                  </div>
                  
                  {filePreview.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                      {filePreview.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`صورة ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* معلومات الدفع */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <h3 className="text-lg font-medium border-b pb-2">معلومات الدفع</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_price">سعر التصليح الكلي <span className="text-red-500">*</span></Label>
                  <Input 
                    id="total_price" 
                    type="number"
                    min={0}
                    step={100}
                    value={totalPrice || ''}
                    onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                    placeholder="أدخل السعر الكلي" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_amount">المبلغ المدفوع الآن</Label>
                  <Input 
                    id="paid_amount" 
                    type="number"
                    min={0}
                    max={totalPrice}
                    step={100}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="أدخل المبلغ المدفوع" 
                  />
                </div>
              </div>
              
              <div className="bg-background p-3 rounded-md text-center font-medium">
                المبلغ المتبقي: {(totalPrice - (paidAmount || 0)).toLocaleString()} دج
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدًا">نقدًا</SelectItem>
                    <SelectItem value="تحويل">تحويل</SelectItem>
                    <SelectItem value="بطاقة">بطاقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </ScrollArea>
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex gap-2 items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                حفظ طلبية التصليح
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* مدير أماكن التصليح */}
      <RepairLocationManager
        isOpen={isLocationManagerOpen}
        onClose={handleLocationManagerClose}
        onSelectLocation={handleLocationSelect}
      />
    </Dialog>
  );
};

export default RepairServiceDialog;
