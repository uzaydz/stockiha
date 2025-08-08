import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/UserContext";
import { Input } from "./input";
import { UploadCloud } from "lucide-react";
import { v4 } from "uuid";

interface GifUploaderProps {
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
export interface GifUploaderRef {
  getUploadedImageUrl: () => string;
  triggerImageUpload: () => void;
}

const GifUploader = forwardRef<GifUploaderRef, GifUploaderProps>(({
  onImageUploaded,
  imageUrl = "",
  label = "رفع GIF",
  folder = "products",
  maxSizeInMB = 5,
  aspectRatio,
  className = "",
  disableAutoCallback = false,
  compact = false
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'compressing' | 'uploading' | 'complete'>('idle');
  const [preview, setPreview] = useState<string>(imageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const tenantContext = useTenant();
  const userContext = useUser();
  
  // استخدام المؤسسة من أي من السياقين المتاحين
  const currentOrganization = tenantContext?.currentOrganization || 
                               userContext?.currentOrganization || 
                               { id: userContext?.organizationId };

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
        const file = files[0];
        if (file.type === 'image/gif') {
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
            description: "يرجى اختيار ملف GIF فقط.",
          });
        }
      }
    };

    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('dragleave', handleDragLeave);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, [isUploading, preview, toast]);

  // دالة لضغط GIF مع الحفاظ على الحركة
  const compressGif = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // التحقق من أن الملف هو GIF
      if (file.type !== 'image/gif') {
        reject(new Error('الملف ليس GIF'));
        return;
      }

      // إذا كان الملف صغير جداً، استخدمه كما هو
      if (file.size <= 1024 * 1024) { // أقل من 1MB
        resolve(file);
        return;
      }

      // للـ GIF، نحن نضغط فقط عن طريق تقليل الأبعاد
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // تحديد أبعاد الصورة المضغوطة
          let width = img.width;
          let height = img.height;
          
          // تحديد الحد الأقصى للأبعاد بناءً على حجم الملف الأصلي
          let MAX_DIMENSION = 800; // أصغر من الصور العادية للـ GIF
          
          if (file.size > 10 * 1024 * 1024) { // أكبر من 10MB
            MAX_DIMENSION = 600;
          } else if (file.size > 5 * 1024 * 1024) { // أكبر من 5MB
            MAX_DIMENSION = 700;
          }
          
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
            reject(new Error('فشل إنشاء سياق الرسم'));
            return;
          }
          
          // تحسين جودة الرسم
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // رسم الصورة
          ctx.drawImage(img, 0, 0, width, height);
          
          // تحويل Canvas إلى Blob بتنسيق GIF
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('فشل تحويل الصورة المضغوطة إلى ملف'));
                return;
              }
              
              // إنشاء اسم ملف بالتنسيق المناسب
              const timestamp = Date.now();
              const baseName = file.name.replace(/\.[^/.]+$/, ''); // إزالة الامتداد الأصلي
              // تنظيف اسم الملف من الأحرف الخاصة والمسافات
              const cleanBaseName = baseName
                .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') // استبدال الأحرف الخاصة بـ _
                .replace(/_+/g, '_') // دمج الشرطات السفلية المتتالية
                .replace(/^_|_$/g, '') // إزالة الشرطات من البداية والنهاية
                .substring(0, 20); // تحديد الطول لتجنب أسماء الملفات الطويلة
              
              const fileName = `${timestamp}_${cleanBaseName || 'gif'}.gif`;
              
              const compressedFile = new File([blob], fileName, {
                type: 'image/gif',
                lastModified: Date.now()
              });

              // حساب نسبة الضغط
              const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(2);

              // تنظيف الذاكرة
              canvas.width = 0;
              canvas.height = 0;
              img.src = '';

              resolve(compressedFile);
            },
            'image/gif',
            0.8 // جودة عالية للـ GIF
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

  const uploadImageWithOfflineSupport = async (file: File, filePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/gif'
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      
      // معالجة أخطاء محددة
      if (error && typeof error === 'object' && 'message' in error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('مجلد التخزين غير موجود. يرجى التواصل مع المسؤول.');
        } else if (error.message.includes('File size')) {
          throw new Error('حجم الملف كبير جداً.');
        } else if (error.message.includes('File type')) {
          throw new Error('نوع الملف غير مدعوم.');
        }
      }
      
      throw error;
    }
  };

  const getDisplayUrl = (imageUrl: string): string => {
    if (!imageUrl) return '';
    
    // إضافة معاملات التحسين للـ GIF مع الحفاظ على التنسيق
    if (imageUrl.includes('supabase.co')) {
      return `${imageUrl}?format=gif&optimize=medium`;
    }
    
    return imageUrl;
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (file.type !== 'image/gif') {
      toast({
        variant: "destructive",
        title: "نوع ملف غير مدعوم",
        description: "يرجى اختيار ملف GIF فقط.",
      });
      return;
    }

    // التحقق من حجم الملف
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "حجم ملف كبير جداً",
        description: `الحد الأقصى للحجم هو ${maxSizeInMB}MB.`,
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStage('compressing');
      setUploadProgress(10);

      // ضغط الصورة
      const compressedFile = await compressGif(file);
      setUploadProgress(30);
      setUploadStage('uploading');

      // إنشاء مسار الملف
      const timestamp = Date.now();
      const fileExtension = '.gif';
      const fileName = `${timestamp}_${file.name.replace(/\.[^/.]+$/, '')}${fileExtension}`;
      const filePath = `${folder}/${currentOrganization?.id || 'default'}/${fileName}`;

      // رفع الصورة
      const uploadedUrl = await uploadImageWithOfflineSupport(compressedFile, filePath);
      
      setUploadProgress(100);
      setUploadStage('complete');

      // تحديث الحالة
      setUploadedImageUrl(uploadedUrl);
      setPreview(getDisplayUrl(uploadedUrl));

      // استدعاء callback
      if (!disableAutoCallback) {
        onImageUploaded(uploadedUrl);
      }

      toast({
        title: "تم رفع GIF بنجاح",
        description: `تم رفع الملف بنجاح. نسبة الضغط: ${((file.size - compressedFile.size) / file.size * 100).toFixed(2)}%`,
      });

    } catch (error) {
      
      let errorMessage = "حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.";
      
      if (error instanceof Error) {
        if (error.message.includes('مجلد التخزين غير موجود')) {
          errorMessage = "مجلد التخزين غير موجود. يرجى التواصل مع المسؤول.";
        } else if (error.message.includes('حجم الملف كبير')) {
          errorMessage = `حجم الملف كبير جداً. الحد الأقصى هو ${maxSizeInMB}MB.`;
        } else if (error.message.includes('نوع الملف غير مدعوم')) {
          errorMessage = "يرجى اختيار ملف GIF فقط.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "خطأ في رفع الملف",
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('idle');
    }
  };

  const handleRemoveImage = () => {
    setPreview('');
    setUploadedImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerFileInput = (e?: React.MouseEvent) => {
    e?.preventDefault();
    fileInputRef.current?.click();
  };

  // تصدير الوظائف للاستخدام الخارجي
  useImperativeHandle(ref, () => ({
    getUploadedImageUrl: () => uploadedImageUrl,
    triggerImageUpload: handleTriggerFileInput
  }));

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        
        <div
          ref={dropAreaRef}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${compact ? 'p-4' : 'p-6'}
            ${preview ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}
          `}
        >
          {preview ? (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="معاينة GIF"
                  className="max-w-full h-auto rounded-lg mx-auto"
                  style={{ maxHeight: '300px' }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                تم رفع GIF بنجاح
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-sm">
                      {uploadStage === 'compressing' && 'جاري ضغط GIF...'}
                      {uploadStage === 'uploading' && 'جاري رفع GIF...'}
                      {uploadStage === 'complete' && 'تم الرفع بنجاح!'}
                    </div>
                    {uploadProgress > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        اسحب وأفلت ملف GIF هنا
                      </p>
                      <p className="text-xs text-muted-foreground">
                        أو اضغط لاختيار ملف
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الحد الأقصى: {maxSizeInMB}MB
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {!isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTriggerFileInput}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  اختيار ملف GIF
                </Button>
              )}
            </div>
          )}
        </div>
        
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/gif"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>
    </div>
  );
});

GifUploader.displayName = 'GifUploader';

export { GifUploader };
