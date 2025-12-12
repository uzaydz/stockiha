import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Wrench, Plus, User, Phone, Smartphone, MapPin,
  FileText, CreditCard, X, Camera, CheckCircle2, AlertCircle, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

// استيراد مدير أماكن التصليح
import RepairLocationManager from '@/components/pos/RepairLocationManager';
import { RepairLocation } from '@/components/pos/RepairLocationManager';
import {
  createLocalRepairOrder,
  updateLocalRepairOrder,
  addLocalRepairHistory,
  addLocalRepairImage,
  listLocalRepairLocations,
  generateRepairIdentifiers
} from '@/api/localRepairService';

// واجهات البيانات
interface RepairServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, trackingCode: string) => void;
  editMode?: boolean;
  repairOrder?: any;
}

const RepairServiceDialog = ({ isOpen, onClose, onSuccess, editMode = false, repairOrder }: RepairServiceDialogProps) => {
  const { user, organizationId } = useUser();

  // حالة النموذج
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [repairLocation, setRepairLocation] = useState<string>('');
  const [customLocation, setCustomLocation] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('نقدًا');
  const [priceToBeDetLater, setPriceToBeDetLater] = useState<boolean>(false);

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
    try {
      const data = await listLocalRepairLocations(organizationId || undefined);
      const typedData = data as unknown as RepairLocation[];
      setRepairLocations(typedData || []);
      const defaultLocation = typedData?.find(loc => loc.is_default);
      if (defaultLocation && !repairLocation) setRepairLocation(defaultLocation.id);
    } catch {
      toast.error('فشل في جلب أماكن التصليح');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRepairLocations();

      // ملء الحقول في حالة التعديل
      if (editMode && repairOrder) {
        setCustomerName(repairOrder.customer_name || '');
        setCustomerPhone(repairOrder.customer_phone || '');
        setDeviceType(repairOrder.device_type || '');

        if (repairOrder.custom_location) {
          setRepairLocation('أخرى');
          setCustomLocation(repairOrder.custom_location);
        } else if (repairOrder.repair_location_id) {
          setRepairLocation(repairOrder.repair_location_id);
          setCustomLocation('');
        } else {
          setRepairLocation('');
          setCustomLocation('');
        }

        setIssueDescription(repairOrder.issue_description || '');
        setTotalPrice(repairOrder.total_price || 0);
        setPaidAmount(repairOrder.paid_amount || 0);
        setPaymentMethod(repairOrder.payment_method || 'نقدًا');
        setPriceToBeDetLater(repairOrder.price_to_be_determined_later || false);
      }
    }
  }, [organizationId, isOpen, editMode, repairOrder]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeviceType('');
    setRepairLocation('');
    setCustomLocation('');
    setIssueDescription('');
    setTotalPrice(0);
    setPaidAmount(0);
    setPaymentMethod('نقدًا');
    setPriceToBeDetLater(false);
    setFileList([]);
    setFilePreview([]);
  };

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

  const removeFile = (index: number) => {
    const newFiles = [...fileList];
    const newPreviews = [...filePreview];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFileList(newFiles);
    setFilePreview(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName?.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    if (!customerPhone?.trim()) {
      toast.error('يرجى إدخال رقم هاتف العميل');
      return;
    }

    if (!deviceType?.trim()) {
      toast.error('يرجى اختيار نوع الجهاز');
      return;
    }

    if (!priceToBeDetLater && (!totalPrice || totalPrice <= 0)) {
      toast.error('يرجى إدخال سعر التصليح أو اختيار "السعر يحدد لاحقاً"');
      return;
    }

    if (!organizationId) {
      toast.error('خطأ في بيانات المؤسسة. يرجى إعادة تسجيل الدخول');
      return;
    }

    if (!repairLocation && repairLocation !== 'أخرى') {
      toast.error('يرجى اختيار مكان التصليح');
      return;
    }

    if (repairLocation === 'أخرى' && !customLocation?.trim()) {
      toast.error('يرجى إدخال مكان التصليح المخصص');
      return;
    }

    setIsSubmitting(true);

    try {
      let repairOrderId: string;
      let orderNumber: string;
      let trackingCode: string;

      if (editMode && repairOrder) {
        repairOrderId = repairOrder.id;
        orderNumber = repairOrder.order_number || '';
        trackingCode = repairOrder.repair_tracking_code || '';

        const patch: any = {
          customer_name: customerName,
          customer_phone: customerPhone,
          device_type: deviceType || null,
          issue_description: issueDescription || null,
          total_price: priceToBeDetLater ? null : totalPrice,
          paid_amount: priceToBeDetLater ? 0 : (paidAmount || 0),
          payment_method: paymentMethod,
          price_to_be_determined_later: priceToBeDetLater,
        };
        if (repairLocation && repairLocation !== 'أخرى') {
          patch.repair_location_id = repairLocation;
          patch.custom_location = null;
        } else if (repairLocation === 'أخرى') {
          patch.repair_location_id = null;
          patch.custom_location = customLocation || null;
        }
        const updated = await updateLocalRepairOrder(repairOrderId, patch);
        if (!updated) throw new Error('تعذر تحديث طلبية التصليح محلياً');
        await addLocalRepairHistory({ orderId: repairOrderId, status: 'تم التحديث', notes: 'تم تحديث بيانات طلبية التصليح', createdBy: user?.id });
      } else {
        const ids = generateRepairIdentifiers();
        const created = await createLocalRepairOrder({
          customer_name: customerName,
          customer_phone: customerPhone,
          device_type: deviceType || undefined,
          repair_location_id: repairLocation === 'أخرى' ? null : repairLocation,
          custom_location: repairLocation === 'أخرى' ? customLocation : null,
          issue_description: issueDescription || undefined,
          total_price: priceToBeDetLater ? null : totalPrice,
          paid_amount: priceToBeDetLater ? 0 : (paidAmount || 0),
          payment_method: paymentMethod,
          price_to_be_determined_later: priceToBeDetLater,
          received_by: user?.id,
          status: 'قيد الانتظار',
          order_number: ids.orderNumber,
          repair_tracking_code: ids.trackingCode,
        });
        repairOrderId = created.id;
        orderNumber = created.order_number || '';
        trackingCode = created.repair_tracking_code || '';
        await addLocalRepairHistory({ orderId: repairOrderId, status: 'قيد الانتظار', notes: 'تم إنشاء طلبية التصليح', createdBy: user?.id });
      }

      if (fileList.length > 0) {
        await Promise.all(
          fileList.map((file) => addLocalRepairImage(repairOrderId, file, { image_type: 'before', description: 'صورة قبل التصليح' }))
        );
      }

      toast.success(editMode ? 'تم تحديث طلبية التصليح بنجاح' : 'تم إضافة طلبية التصليح بنجاح');
      onSuccess(repairOrderId, trackingCode);
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'حدث خطأ أثناء حفظ طلبية التصليح');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (repairLocation === 'add_new') {
      setRepairLocation('');
      setIsLocationManagerOpen(true);
    }
  }, [repairLocation]);

  const handleLocationSelect = (location: RepairLocation) => {
    setRepairLocation(location.id);
    setIsLocationManagerOpen(false);

    if (!repairLocations.some(loc => loc.id === location.id)) {
      setRepairLocations(prev => [location, ...prev]);
    }
  };

  const handleLocationManagerClose = () => {
    setIsLocationManagerOpen(false);
    fetchRepairLocations();
  };

  const remainingAmount = (totalPrice || 0) - (paidAmount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-background" dir="rtl">
        {/* Header - بسيط */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold text-left">
                {editMode ? 'تعديل طلبية التصليح' : 'طلبية تصليح جديدة'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">
                {editMode ? 'تعديل بيانات الطلبية' : 'إدخال بيانات الجهاز والعميل'}
              </DialogDescription>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10">
              <Wrench className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-160px)]">
          <form id="repair-form" onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* معلومات العميل */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                معلومات العميل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">
                    اسم العميل <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسم العميل"
                    className="h-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    رقم الهاتف <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="h-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* معلومات الجهاز */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                معلومات الجهاز
              </h3>
              <div className="space-y-2">
                <Label className="text-sm">
                  نوع الجهاز <span className="text-orange-500">*</span>
                </Label>
                <Input
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  placeholder="مثال: آيفون 14 برو، سامسونغ S24"
                  className="h-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                />
              </div>
            </div>

            {/* تفاصيل التصليح */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                تفاصيل التصليح
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">
                    مكان التصليح <span className="text-orange-500">*</span>
                  </Label>
                  <Select value={repairLocation} onValueChange={setRepairLocation}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="اختر مكان التصليح" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {repairLocations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                            {location.is_default && " (افتراضي)"}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectItem value="أخرى">مكان آخر...</SelectItem>
                      <SelectItem value="add_new">
                        <span className="text-orange-500 flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          إضافة مكان جديد
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {repairLocation === 'أخرى' && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      اسم المكان <span className="text-orange-500">*</span>
                    </Label>
                    <Input
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="أدخل اسم المكان"
                      className="h-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">وصف العطل</Label>
                <Textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="اشرح المشكلة..."
                  className="min-h-[80px] resize-none focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                />
              </div>

              {/* رفع الصور */}
              <div className="space-y-2">
                <Label className="text-sm">صور الجهاز</Label>
                <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-orange-500/50 transition-colors cursor-pointer">
                  <Input
                    id="repair_images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="repair_images" className="cursor-pointer flex flex-col items-center gap-2">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">اضغط لإضافة صور</span>
                  </Label>
                </div>

                {filePreview.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {filePreview.map((url, index) => (
                      <div key={index} className="relative w-16 h-16">
                        <img
                          src={url}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* معلومات الدفع */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                معلومات الدفع
              </h3>

              {/* خيار السعر يحدد لاحقاً */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-orange-500/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={priceToBeDetLater}
                  onChange={(e) => setPriceToBeDetLater(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-orange-500 focus:ring-orange-500/20"
                />
                <span className="text-sm">السعر يحدد لاحقاً</span>
              </label>

              {/* حقول الدفع */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-3 gap-4",
                priceToBeDetLater && "opacity-50 pointer-events-none"
              )}>
                <div className="space-y-2">
                  <Label className="text-sm">
                    السعر الكلي {!priceToBeDetLater && <span className="text-orange-500">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={totalPrice || ''}
                      onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={priceToBeDetLater}
                      className="h-10 pl-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دج</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">المبلغ المدفوع</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={totalPrice}
                      step={100}
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={priceToBeDetLater}
                      className="h-10 pl-10 focus-visible:ring-orange-500/20 focus-visible:border-orange-500"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">دج</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نقدًا">نقدًا</SelectItem>
                      <SelectItem value="تحويل">تحويل بنكي</SelectItem>
                      <SelectItem value="بطاقة">بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ملخص الدفع */}
              {!priceToBeDetLater && totalPrice > 0 && (
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg text-sm",
                  remainingAmount > 0 ? "bg-orange-500/10" : "bg-green-500/10"
                )}>
                  <span className="text-muted-foreground">
                    {remainingAmount > 0 ? 'المبلغ المتبقي' : 'تم الدفع بالكامل'}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    remainingAmount > 0 ? "text-orange-500" : "text-green-500"
                  )}>
                    {remainingAmount.toLocaleString()} دج
                  </span>
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        {/* Footer - بسيط */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button
            type="submit"
            form="repair-form"
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 ml-2" />
                {editMode ? 'تحديث' : 'حفظ'}
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
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
