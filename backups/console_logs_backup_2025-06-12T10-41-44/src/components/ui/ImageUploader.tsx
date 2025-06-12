import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
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
  compact?: boolean;
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
  compact = false
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(imageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentOrganization } = useTenant();
  
  // استخدام Supabase client مباشرة (متاح بشكل متزامن)
  // const supabase متاح من الاستيراد مباشرة
  
  // إعداد مستمعي أحداث السحب والإفلات
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading && !preview) {
        setIsDragging(true);
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (isUploading || !e.dataTransfer) return;
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        // تمرير الملف الأول فقط من المسحوبات
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const fakeEvent = {
            target: {
              files: [file]
            }
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          handleImageSelect(fakeEvent);
        } else {
          toast({
            variant: "destructive",
            title: "نوع ملف غير مدعوم",
            description: "يرجى اختيار ملف صورة فقط.",
          });
        }
      }
    };
    
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
      
      return () => {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      };
    }
  }, [isUploading, preview, toast]);
  
  // تحديث الحالة عندما يتغير imageUrl من الخارج
  useEffect(() => {
    // تجنب طباعة رسائل التصحيح المتكررة في البيئة الإنتاجية
    if (process.env.NODE_ENV !== 'production') {
      
    }
    
    if (imageUrl && imageUrl.trim() !== "") {
      // معالجة الصور المخزنة محليًا باستخدام البروتوكول القديم
      if (imageUrl.startsWith('local:')) {
        const localKey = imageUrl.replace('local:', '');
        const base64Content = localStorage.getItem(localKey);
        if (base64Content) {
          
          setPreview(base64Content);
          setUploadedImageUrl(base64Content);
          // استدعاء callback لتحديث قيمة URL في الكود الخارجي أيضًا
          if (!disableAutoCallback) {
            onImageUploaded(base64Content);
          }
        } else {
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

  // دالة لتخفيض حجم الصورة
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
          const mimeType = file.type; // استخدام نوع الملف الأصلي
          const quality = 0.8;
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('فشل تحويل الصورة المضغوطة إلى ملف'));
                return;
              }
              
              // إنشاء اسم ملف فريد
              const timestamp = Date.now();
              const extension = file.name.split('.').pop() || 'jpg';
              const fileName = `image_${timestamp}.${extension}`;
              
              const compressedFile = new File([blob], fileName, {
                type: file.type,
                lastModified: Date.now()
              });

              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        };
        
        img.onerror = () => {
          resolve(file); // استخدام الملف الأصلي في حالة الفشل
        };
      };
      
      reader.onerror = () => {
        resolve(file); // استخدام الملف الأصلي في حالة الفشل
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
      // للتأكد من أن الملف فعلاً ملف وليس شيئًا آخر
      if (!(file instanceof File)) {
        throw new Error('الملف المقدم ليس ملفًا صالحًا');
      }

      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        throw new Error('نوع الملف غير مدعوم. يرجى اختيار ملف صورة.');
      }

      // إنشاء client منفصل للـ Storage لتجنب مشاكل الـ headers
      const storageClient = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // نسخ session من الـ client الأساسي إذا كان متاحاً
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await storageClient.auth.setSession({
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token
        });
      }

      // رفع الملف إلى Supabase مع تحديد Content-Type بشكل صريح
      const { data, error } = await storageClient.storage
        .from("organization-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type // تحديد نوع المحتوى بوضوح
        });
      
      if (error) {
        throw error;
      }
      
      // الحصول على الرابط العام للصورة
      const { data: urlData } = storageClient.storage
        .from("organization-assets")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
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

    try {
      setIsUploading(true);
      
      const file = event.target.files[0];
      
      // التحقق من حجم الملف
      if (file.size > maxSizeInBytes) {
        toast({
          variant: "destructive",
          title: "الملف كبير جداً",
          description: `حجم الملف ${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت. الحد الأقصى المسموح به هو ${maxSizeInMB} ميجابايت.`,
        });
        return;
      }

      // ضغط الصورة
      const compressedFile = await compressImage(file);

      // توليد اسم فريد للملف
      const fileName = compressedFile.name;
      const uniqueId = v4();
      const organizationFolder = currentOrganization?.id || 'default';
      const filePath = `${folder}/${organizationFolder}/${fileName}`;

      // رفع الصورة إلى Supabase
      const imageUrl = await uploadImageWithOfflineSupport(compressedFile, filePath);

      // تحديث المسار وإبلاغ المكون الأب
      setUploadedImageUrl(imageUrl);
      setPreview(imageUrl);
      onImageUploaded(imageUrl);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم رفع الصورة بنجاح",
        description: "تم رفع الصورة بنجاح والحصول على الرابط",
      });
    } catch (error: any) {
      
      // إظهار رسالة خطأ
      toast({
        variant: "destructive",
        title: "فشل رفع الصورة",
        description: `فشل رفع الصورة: ${error.message || 'خطأ غير معروف'}`,
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
    
    // محاولة فتح مربع حوار اختيار الملفات باستخدام تأخير بسيط
    setTimeout(() => {
      if (fileInputRef.current) {
        try {
          // إعادة تعيين قيمة الإدخال لضمان إمكانية اختيار نفس الملف مرة أخرى
          fileInputRef.current.value = '';
          // محاولة النقر التلقائي
          fileInputRef.current.click();
        } catch (error) {
          // استخدام طريقة بديلة في حالة فشل الطريقة الأولى
          const newInput = document.createElement('input');
          newInput.type = 'file';
          newInput.accept = 'image/*';
          newInput.style.display = 'none';
          newInput.onchange = (event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
              handleImageSelect({ target } as React.ChangeEvent<HTMLInputElement>);
            }
            // إزالة العنصر من DOM بعد الاستخدام
            document.body.removeChild(newInput);
          };
          document.body.appendChild(newInput);
          newInput.click();
        }
      } else {
      }
    }, 10);
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
      {label && !compact && <Label className="block text-right">{label}</Label>}
      
      <div 
        ref={dropAreaRef}
        className={`border rounded-md overflow-hidden relative ${preview ? "p-0" : compact ? "p-2" : "p-6"} ${isDragging ? 'border-primary bg-primary/5' : ''}`}
        onClick={!preview ? handleTriggerFileInput : undefined}
      >
        {preview ? (
          <div className="relative group">
            <img 
              src={getDisplayUrl(preview)} 
              alt="معاينة" 
              className={`w-full h-auto object-contain mx-auto ${compact ? 'max-h-24' : 'max-h-72'}`}
            />
            {isUploading && (
              <div className="absolute inset-0 flex justify-center items-center bg-black/40">
                <Loader2 className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} animate-spin text-white`} />
              </div>
            )}
            <div className="absolute inset-0 flex justify-center items-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="sm"
                variant="destructive" 
                onClick={handleRemoveImage} 
                disabled={isUploading}
                className={compact ? "h-6 px-1.5 text-xs" : ""}
              >
                <X className={compact ? "h-3 w-3 mr-0.5" : "h-4 w-4 mr-1"} /> {compact ? "" : "حذف"}
              </Button>
              <Button 
                size="sm"
                variant="secondary" 
                onClick={handleTriggerFileInput} 
                className={`mr-2 ${compact ? "h-6 px-1.5 text-xs" : ""}`}
              >
                <UploadCloud className={compact ? "h-3 w-3 mr-0.5" : "h-4 w-4 mr-1"} /> {compact ? "" : "تغيير"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full cursor-pointer border-2 border-dashed p-6 rounded-md ${isDragging ? 'border-primary bg-primary/10' : 'hover:border-primary'} transition-colors`}>
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">جاري رفع الصورة...</p>
              </div>
            ) : (
              <>
                <UploadCloud className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'} mb-4`} />
                <p className="text-lg font-medium mb-2 text-center">
                  {isDragging ? 'أفلت الصورة هنا' : 'انقر لاختيار صورة'}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  {isDragging ? 'سيتم رفع الصورة تلقائيًا' : 'أو اسحب الصورة وأفلتها هنا'}
                </p>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  الحد الأقصى للحجم: {maxSizeInMB} ميجابايت
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

export default ImageUploader;
