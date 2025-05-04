import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { Input } from "./input";
import { UploadCloud } from "lucide-react";
import { v4 } from "uuid";

interface ImageUploaderProps {
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  className?: string;
  label?: string;
  aspectRatio?: number | string;
  folder?: string;
  maxSizeInMB?: number;
  disableAutoCallback?: boolean;
}

// تصدير واجهة لوظائف المكون التي يمكن استدعاؤها من الخارج
export interface ImageUploaderRef {
  getUploadedImageUrl: () => string;
  triggerImageUpload: () => void;
}

const ImageUploader = forwardRef<ImageUploaderRef, ImageUploaderProps>(({
  onImageUploaded,
  imageUrl = "",
  label = "رفع صورة",
  folder = "products",
  maxSizeInMB = 2,
  aspectRatio,
  className = "",
  disableAutoCallback = false,
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(imageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentOrganization } = useTenant();
  const supabase = getSupabaseClient();
  
  // تحديث الحالة عندما يتغير imageUrl من الخارج
  useEffect(() => {
    console.log("ImageUploader received imageUrl:", imageUrl);
    if (imageUrl && imageUrl.trim() !== "") {
      // معالجة الصور المخزنة محليًا باستخدام البروتوكول القديم
      if (imageUrl.startsWith('local:')) {
        const localKey = imageUrl.replace('local:', '');
        const base64Content = localStorage.getItem(localKey);
        if (base64Content) {
          console.log("تم تحويل الصورة من البروتوكول المحلي إلى base64 مباشر");
          setPreview(base64Content);
          setUploadedImageUrl(base64Content);
          // استدعاء callback لتحديث قيمة URL في الكود الخارجي أيضًا
          if (!disableAutoCallback) {
            onImageUploaded(base64Content);
          }
        } else {
          console.warn('محتوى الصورة المحلية غير موجود في localStorage:', localKey);
          // تعيين صورة فارغة بدلاً من صورة غير موجودة
          const emptyImg = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          setPreview(emptyImg);
          setUploadedImageUrl(emptyImg);
          if (!disableAutoCallback) {
            onImageUploaded(emptyImg);
          }
        }
        return;
      }
      
      setPreview(imageUrl);
      setUploadedImageUrl(imageUrl);
    }
  }, [imageUrl, disableAutoCallback, onImageUploaded]);
  
  // تصدير الدوال للمكونات الخارجية
  useImperativeHandle(ref, () => ({
    getUploadedImageUrl: () => uploadedImageUrl,
    triggerImageUpload: () => handleTriggerFileInput()
  }));
  
  // حجم الملف بالبايت
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  // دالة لتحويل الصورة إلى DataURL لتخزين محلي
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // دالة تخفيض حجم الصورة
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // تحديد أبعاد الصورة المضغوطة
          let width = img.width;
          let height = img.height;
          
          // تحديد الحد الأقصى للأبعاد
          const MAX_DIMENSION = 1200;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          // إنشاء canvas لرسم الصورة المضغوطة
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('فشل إنشاء سياق الرسم للصورة'));
            return;
          }
          
          // رسم الصورة على canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // تحويل Canvas إلى Blob بتنسيق مناسب
          const mimeType = 'image/webp';
          const quality = 0.7;
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('فشل تحويل الصورة المضغوطة إلى ملف'));
                return;
              }
              
              // إنشاء ملف جديد من البلوب مع نوع MIME مناسب
              const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
              
              // استخدام تاريخ محدث في اسم الملف
              const timestamp = Date.now();
              const finalFileName = `${timestamp}_${compressedFileName.replace(/[^a-z0-9.]/gi, '')}`;
              
              const compressedFile = new File([blob], finalFileName, {
                type: mimeType,
                lastModified: Date.now()
              });
              
              // حساب نسبة الضغط
              const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(2);
              
              console.log('تم ضغط الصورة:', {
                originalSize: `${(file.size / 1024).toFixed(2)} KB`,
                compressedSize: `${(compressedFile.size / 1024).toFixed(2)} KB`,
                compressionRatio: `${compressionRatio}%`
              });
              
              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('فشل تحميل الصورة للضغط'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('فشل قراءة الصورة للضغط'));
      };
    });
  };
  
  // دالة لتطبيق مرشح حدة على الصورة
  const applySharpening = (imageData: ImageData, strength: number) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // نسخة مؤقتة من البيانات لمنع تداخل العمليات
    const tempData = new Uint8ClampedArray(data);
    
    // كيرنل لتحسين الحدة (unsharp mask)
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    // تطبيق الكيرنل على كل بكسل (باستثناء الحدود)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // تطبيق الكيرنل على كل قناة لون (RGB) بشكل منفصل
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = ((y + ky) * width + (x + kx)) * 4 + c;
              val += tempData[kidx] * kernel[(ky+1)*3 + (kx+1)];
            }
          }
          // تطبيق التأثير بناءً على قوة المرشح
          data[idx + c] = Math.max(0, Math.min(255, tempData[idx + c] * (1 - strength) + val * strength));
        }
      }
    }
  };

  // دالة لرفع الصورة إلى Supabase فقط
  const uploadImageWithOfflineSupport = async (file: File, filePath: string): Promise<string> => {
    try {
      const supabase = getSupabaseClient();
      
      // للتأكد من أن الملف فعلاً ملف وليس شيئًا آخر
      if (!(file instanceof File)) {
        throw new Error('الملف المقدم ليس ملفًا صالحًا');
      }
      
      console.log('رفع الصورة إلى Supabase - معلومات الملف:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // استخدام formData بدلاً من تمرير الملف مباشرة
      const formData = new FormData();
      formData.append('file', file, file.name);
      
      // رفع الملف إلى Supabase باستخدام FormData
      const { data, error } = await supabase.storage
        .from("organization-assets")
        // استخدام formData بدلاً من file مباشرة
        // وإعادة الخيارات الإضافية
        .upload(filePath, formData, {
          cacheControl: "3600",
          // upsert: true, // <-- تعطيل Upsert للتجربة
        });
      
      if (error) {
        console.error('خطأ Supabase:', error);
        throw error;
      }
      
      // الحصول على الرابط العام للصورة
      const { data: urlData } = supabase.storage
        .from("organization-assets")
        .getPublicUrl(filePath);
      
      console.log('تم رفع الصورة بنجاح إلى Supabase:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('خطأ في رفع الصورة إلى Supabase:', error);
      throw error; // إعادة إلقاء الخطأ ليتم التعامل معه بشكل مناسب
    }
  };

  // دالة لعرض الصورة مع دعم الصور المحلية
  const getDisplayUrl = (imageUrl: string): string => {
    // تحقق من وجود URL
    if (!imageUrl) return '';
    
    // تحقق مما إذا كانت البيانات بالفعل بتنسيق base64
    if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('data:application/')) {
      return imageUrl;
    }
    
    // تحقق مما إذا كانت الصورة بتنسيق local:tempImageKey
    if (imageUrl.startsWith('local:')) {
      const localImageKey = imageUrl.replace('local:', '');
      const base64Image = localStorage.getItem(localImageKey);
      
      if (base64Image) {
        return base64Image;
      } else {
        console.warn('محتوى الصورة المحلية غير موجود في localStorage:', localImageKey);
        // إرجاع صورة فارغة بدلاً من مسار محلي غير صالح
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    }
    
    // إرجاع مسار الصورة العادي إذا لم تكن محلية
    return imageUrl;
  };

  // معالجة اختيار الصورة
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // التحقق من وجود ملفات مختارة
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    // ---> التحقق من المصادقة قبل المتابعة
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: "destructive",
        title: "غير مصادق عليه",
        description: "الرجاء تسجيل الدخول للمتابعة.",
      });
      // إعادة تعيين حقل الإدخال إذا لزم الأمر
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return; // إيقاف التنفيذ إذا لم يكن المستخدم مسجلاً الدخول
    }
    // <--- نهاية التحقق من المصادقة

    try {
      setIsUploading(true);
      
      const file = event.target.files[0];
      
      // تسجيل معلومات الملف الأصلي
      console.log('معلومات الملف الأصلي:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // --- إعادة تمكين الضغط ---
      const compressedFile = await compressImage(file);
      // const compressedFile = file; // استخدام الملف الأصلي مباشرة - تم الإلغاء
      // --------------------------
      
      // توليد اسم فريد للملف
      const fileName = compressedFile.name;
      // استخدام اسم الملف الأصلي مع طابع زمني فريد - تم الإلغاء
      // const timestamp = Date.now();
      // const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-z0-9.]/gi, '')}`;
      
      const uniqueId = v4();
      const organizationFolder = currentOrganization?.id || 'default';
      const filePath = `${folder}/${organizationFolder}/${fileName}`; // استخدام اسم الملف المضغوط
      // const filePath = `${folder}/${organizationFolder}/${uniqueFileName}`; // استخدام الاسم الفريد المولد - تم الإلغاء
      
      // تسجيل معلومات عملية الرفع
      console.log('ImageUploader: جاري رفع الصورة:', { // إعادة تسمية الرسالة
        filePath,
        fileSize: compressedFile.size,
        fileType: compressedFile.type
      });
      
      try {
        // رفع الصورة إلى Supabase
        const imageUrl = await uploadImageWithOfflineSupport(compressedFile, filePath);
        
        // تحديث المسار وإبلاغ المكون الأب
        setUploadedImageUrl(imageUrl);
        onImageUploaded(imageUrl);
        
        // إظهار رسالة نجاح
        toast({
          title: "تم رفع الصورة بنجاح",
          description: "تم رفع الصورة بنجاح والحصول على الرابط",
        });
      } catch (error: any) {
        console.error('خطأ في رفع الصورة إلى Supabase:', error);
        
        // إظهار رسالة خطأ
        toast({
          variant: "destructive",
          title: "فشل رفع الصورة",
          description: `فشل رفع الصورة: ${error.message || 'خطأ غير معروف'}`,
        });
      }
    } catch (error: any) {
      console.error('خطأ في معالجة الصورة:', error);
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "فشل معالجة الصورة",
        description: `فشل معالجة الصورة: ${error.message || 'خطأ غير معروف'}`,
      });
    } finally {
      setIsUploading(false);
      
      // إعادة تعيين حقل إدخال الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreview("");
    setUploadedImageUrl("");
    if (!disableAutoCallback) {
      onImageUploaded("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTriggerFileInput = (e?: React.MouseEvent) => {
    // إيقاف انتشار الحدث لمنع النقرات المزدوجة
    if (e) e.preventDefault();
    // فتح مربع حوار اختيار الملفات مباشرة
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 0);
  };

  const parseAspectRatio = (ratio: number | string | undefined): number | undefined => {
    if (typeof ratio === 'number') return ratio;
    if (!ratio) return undefined;
    
    // تحويل النص مثل "1:1" إلى رقم 1 أو "16:9" إلى 16/9
    const [width, height] = ratio.split(':').map(Number);
    if (width && height) {
      return width / height;
    }
    return undefined;
  };

  const calculatedAspectRatio = parseAspectRatio(aspectRatio);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="block text-right">{label}</Label>}
      
      <div className={`border rounded-md overflow-hidden relative ${preview ? "p-0" : "p-6"}`}>
        {preview ? (
          <div className="relative group">
            <img src={getDisplayUrl(preview)} alt="معاينة" className="w-full h-auto max-h-72 object-contain mx-auto" />
            {isUploading && (
              <div className="absolute inset-0 flex justify-center items-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            <div className="absolute inset-0 flex justify-center items-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="destructive" onClick={handleRemoveImage} disabled={isUploading}>
                <X className="h-4 w-4 mr-1" /> حذف
              </Button>
              <Button size="sm" variant="secondary" onClick={handleTriggerFileInput} className="mr-2" disabled={isUploading}>
                <Upload className="h-4 w-4 mr-1" /> تغيير
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center cursor-pointer min-h-[150px]"
            onClick={handleTriggerFileInput}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-center text-muted-foreground">جاري رفع الصورة...</p>
              </div>
            ) : (
              <>
                <UploadCloud className="h-12 w-12 mb-2 text-muted-foreground" />
                <p className="text-sm text-center text-muted-foreground">
                  انقر هنا لرفع صورة
                  <br />
                  <span className="text-xs">
                    (الحد الأقصى للحجم: {maxSizeInMB} ميجابايت)
                  </span>
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </div>
  );
});

ImageUploader.displayName = "ImageUploader";

export default ImageUploader; 