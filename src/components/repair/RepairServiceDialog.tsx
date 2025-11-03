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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Loader2, Upload, Wrench, Trash2, Plus, Share2, User, DollarSign } from 'lucide-react';

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
  repairOrder?: any; // سنستخدم any مؤقتاً لتجنب مشاكل الأنواع
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
        
        // التعامل مع مكان التصليح بشكل صحيح
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
    
    // التحقق من صحة البيانات
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
        // تحديث محلي
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
        // إنشاء محلي
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

      // حفظ الصور محلياً للرفع لاحقاً
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
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wrench className="h-5 w-5" />
            {editMode ? 'تعديل طلبية التصليح' : 'إضافة طلبية تصليح جديدة'}
          </DialogTitle>
          <DialogDescription>
            {editMode ? 'قم بتعديل بيانات طلبية التصليح' : 'أدخل بيانات طلبية التصليح الجديدة'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <form id="repair-form" onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* معلومات العميل */}
            <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                معلومات العميل
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-sm font-medium">
                    اسم العميل <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="customer_name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="أدخل اسم العميل" 
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone" className="text-sm font-medium">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="customer_phone" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="أدخل رقم الهاتف" 
                    pattern="^[0-9]{10}$"
                    title="رقم الهاتف يجب أن يتكون من 10 أرقام"
                    required
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            
            {/* معلومات الجهاز */}
            <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-md">
                  <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                معلومات الجهاز
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="device_type" className="text-sm font-medium">
                  نوع الجهاز <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="device_type" 
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  placeholder="أدخل نوع الجهاز (مثل: آيفون 14، لابتوب HP، سامسونغ A54، إلخ)" 
                  required
                  className="h-10"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  أدخل نوع الجهاز بالتفصيل (العلامة التجارية والموديل إن أمكن)
                </p>
              </div>
            </div>
            
            {/* معلومات التصليح */}
            <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-md">
                  <Wrench className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                معلومات التصليح
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repair_location" className="text-sm font-medium">
                      مكان التصليح <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={repairLocation} 
                      onValueChange={setRepairLocation}
                    >
                      <SelectTrigger className="h-10">
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
                      <Label htmlFor="custom_location" className="text-sm font-medium">
                        حدد مكان التصليح <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="custom_location" 
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="أدخل مكان التصليح" 
                        required={repairLocation === 'أخرى'}
                        className="h-10"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="issue_description" className="text-sm font-medium">
                    وصف العطل
                  </Label>
                  <Textarea 
                    id="issue_description" 
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="أدخل وصف العطل" 
                    className="min-h-[100px] resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="repair_images" className="text-sm font-medium">
                    صور للجهاز
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200">
                    <Input
                      id="repair_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="repair_images" className="w-full h-full cursor-pointer flex flex-col items-center justify-center">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                        <Upload className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-200 font-medium">اضغط لإضافة صور</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">أو اسحب الصور وأفلتها هنا</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-2">PNG, JPG, JPEG حتى 10MB</span>
                    </Label>
                  </div>
                  
                  {filePreview.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                      {filePreview.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`صورة ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* معلومات الدفع */}
            <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-md">
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                معلومات الدفع
              </h3>
              
              {/* خيار السعر يحدد لاحقاً */}
              <div className="relative overflow-hidden">
                <div className={`
                  transition-all duration-200 rounded-lg border p-4
                  ${priceToBeDetLater 
                    ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-700 shadow-sm' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                `}>
                  {/* أيقونة الخلفية الزخرفية */}
                  <div className="absolute top-2 right-2 opacity-10 dark:opacity-5">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox 
                        id="price_tbd" 
                        checked={priceToBeDetLater}
                        onCheckedChange={(checked) => {
                          setPriceToBeDetLater(checked as boolean);
                          if (checked) {
                            setTotalPrice(0);
                            setPaidAmount(0);
                          }
                        }}
                        className="w-5 h-5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 dark:data-[state=checked]:bg-amber-600 dark:data-[state=checked]:border-amber-600"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor="price_tbd"
                        className="flex items-center gap-2 text-base font-semibold leading-none cursor-pointer group"
                      >
                        <span className={`
                          transition-colors duration-200
                          ${priceToBeDetLater 
                            ? 'text-orange-700 dark:text-orange-300' 
                            : 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100'
                          }
                        `}>
                          💡 السعر يحدد لاحقاً
                        </span>
                        {priceToBeDetLater && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                            مفعل
                          </span>
                        )}
                      </Label>
                      
                      <p className={`
                        mt-2 text-sm leading-relaxed transition-colors duration-200
                        ${priceToBeDetLater 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        <span className="font-medium">اختر هذا الخيار</span> إذا كان السعر سيتم تحديده بعد فحص الجهاز وتشخيص العطل
                      </p>
                      
                      {priceToBeDetLater && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>سيتم تعطيل حقول السعر والدفع حتى يتم تحديد السعر النهائي</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="total_price" className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    سعر التصليح الكلي 
                    {!priceToBeDetLater && <span className="text-red-500">*</span>}
                  </Label>
                  <Input 
                    id="total_price" 
                    type="number"
                    min={0}
                    step={100}
                    value={totalPrice || ''}
                    onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                    placeholder={priceToBeDetLater ? "سيتم تحديده لاحقاً" : "أدخل السعر الكلي"}
                    disabled={priceToBeDetLater}
                    required={!priceToBeDetLater}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_amount" className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    المبلغ المدفوع الآن
                  </Label>
                  <Input 
                    id="paid_amount" 
                    type="number"
                    min={0}
                    max={totalPrice}
                    step={100}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder={priceToBeDetLater ? "لا يمكن الدفع مسبقاً" : "أدخل المبلغ المدفوع"}
                    disabled={priceToBeDetLater}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method" className="text-sm font-medium">
                    طريقة الدفع
                  </Label>
                  <Select 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="h-10">
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
              
              {!priceToBeDetLater && (
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3 rounded-lg text-center font-medium text-gray-700 dark:text-gray-300">
                  المبلغ المتبقي: {((totalPrice || 0) - (paidAmount || 0)).toLocaleString()} دج
                </div>
              )}
              
              {priceToBeDetLater && (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700 p-3 rounded-lg text-center font-medium text-orange-700 dark:text-orange-300">
                  💡 سيتم تحديد السعر والدفع لاحقاً بعد فحص الجهاز
                </div>
              )}
            </div>
            </form>
        </div>
        
        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="default"
              form="repair-form"
              disabled={isSubmitting}
              className="flex gap-2 items-center w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  {editMode ? 'تحديث الطلبية' : 'حفظ طلبية التصليح'}
                </>
              )}
            </Button>
          </div>
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
