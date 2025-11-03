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
import { uploadFileWithAuth, validateCurrentSession, debugAuthState } from "@/utils/authHelpers";
import { useAuth } from "@/context/AuthContext";

// دالة لحذف الصورة من Supabase Storage
const deleteImageFromStorage = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!imageUrl || !imageUrl.includes('supabase.co')) {
      return true; // الصورة ليست في Supabase، لا حاجة للحذف
    }

    // استخراج مسار الملف من URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('organization-assets') + 1).join('/');

    if (!filePath) {
      return true; // لا يمكن استخراج المسار، لكن لا نعتبرها خطأ
    }

    // حذف الملف من Supabase Storage
    const { error } = await supabase.storage
      .from('organization-assets')
      .remove([filePath]);

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'compressing' | 'uploading' | 'complete'>('idle');
  const [preview, setPreview] = useState<string>(imageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  
  // إضافة refs للتحكم في mounted state و cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const tenantContext = useTenant();
  const userContext = useUser();
  const authContext = useAuth();
  
  // استخدام المؤسسة من سياق المؤسسة أو معرف المؤسسة من سياق المستخدم
  const currentOrganization = tenantContext?.currentOrganization ||
                               (userContext?.organizationId ? { id: userContext.organizationId } : null);
  
  // استخدام Supabase client مباشرة (متاح بشكل متزامن)
  // const supabase متاح من الاستيراد مباشرة
  
  // إعداد مستمعي أحداث السحب والإفلات مع cleanup
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading && !preview && isMountedRef.current) {
        setIsDragging(true);
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMountedRef.current) {
        setIsDragging(false);
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMountedRef.current) {
        setIsDragging(false);
      }
      
      if (isUploading || !e.dataTransfer || !isMountedRef.current) return;
      
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
          if (isMountedRef.current) {
            toast({
              variant: "destructive",
              title: "نوع ملف غير مدعوم",
              description: "يرجى اختيار ملف صورة فقط.",
            });
          }
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

  // إضافة cleanup effect للتحكم في mounted state
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // إلغاء العمليات المعلقة
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // إلغاء timeouts
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };
  }, []);
  
  // تحديث الحالة عندما يتغير imageUrl من الخارج
  useEffect(() => {
    // تجنب طباعة رسائل التصحيح المتكررة في البيئة الإنتاجية
    if (process.env.NODE_ENV !== 'production') {
      
    }
    
    if (!isMountedRef.current) return;
    
    if (imageUrl && imageUrl.trim() !== "") {
      // معالجة الصور المخزنة محليًا باستخدام البروتوكول القديم
      if (imageUrl.startsWith('local:')) {
        const localKey = imageUrl.replace('local:', '');
        const base64Content = localStorage.getItem(localKey);
        if (base64Content) {
          
          if (isMountedRef.current) {
            setPreview(base64Content);
            setUploadedImageUrl(base64Content);
          }
          // استدعاء callback لتحديث قيمة URL في الكود الخارجي أيضًا
          if (!disableAutoCallback && isMountedRef.current) {
            onImageUploaded(base64Content);
          }
        } else {
          // تعيين صورة فارغة بدلاً من صورة غير موجودة
          const emptyImg = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          if (isMountedRef.current) {
            setPreview(emptyImg);
            setUploadedImageUrl(emptyImg);
          }
          if (!disableAutoCallback && isMountedRef.current) {
            onImageUploaded(emptyImg);
          }
        }
        return;
      }
      
      if (isMountedRef.current) {
        setPreview(imageUrl);
        setUploadedImageUrl(imageUrl);
      }
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
          
          // تحديد الحد الأقصى للأبعاد بناءً على حجم الملف الأصلي
          let MAX_DIMENSION = 1200;
          
          // ضغط تكيفي: صور أكبر تحتاج ضغط أكثر
          if (file.size > 5 * 1024 * 1024) { // أكبر من 5MB
            MAX_DIMENSION = 800;
          } else if (file.size > 2 * 1024 * 1024) { // أكبر من 2MB
            MAX_DIMENSION = 1000;
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
          
          // تطبيق تحسينات إضافية للصور الكبيرة فقط
          if (file.size > 1024 * 1024) { // أكبر من 1MB
            optimizeImageBeforeCompression(canvas, ctx);
          }
          
          // تحديد جودة الضغط بناءً على حجم الملف
          let quality = 0.85; // جودة افتراضية عالية
          if (file.size > 5 * 1024 * 1024) {
            quality = 0.6; // ضغط أكثر للملفات الكبيرة جداً
          } else if (file.size > 2 * 1024 * 1024) {
            quality = 0.7; // ضغط متوسط
          } else if (file.size < 500 * 1024) {
            quality = 0.9; // جودة عالية للملفات الصغيرة
          }
          
          // تحويل Canvas إلى Blob بتنسيق WebP
          const mimeType = 'image/webp';
          
          // التحقق من دعم WebP في المتصفح
          const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
          
          const finalMimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
          const finalExtension = supportsWebP ? '.webp' : '.jpg';
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('فشل تحويل الصورة المضغوطة إلى ملف'));
                return;
              }
              
              // التحقق من نوع blob الفعلي
              
              // إنشاء اسم ملف بالتنسيق المناسب
              const timestamp = Date.now();
              const baseName = file.name.replace(/\.[^/.]+$/, ''); // إزالة الامتداد الأصلي
              // تنظيف اسم الملف من الأحرف الخاصة والمسافات
              const cleanBaseName = baseName
                .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') // استبدال الأحرف الخاصة بـ _
                .replace(/_+/g, '_') // دمج الشرطات السفلية المتتالية
                .replace(/^_|_$/g, '') // إزالة الشرطات من البداية والنهاية
                .substring(0, 20); // تحديد الطول لتجنب أسماء الملفات الطويلة
              
              const fileName = `${timestamp}_${cleanBaseName || 'image'}${finalExtension}`;
              
              // استخدام نوع blob الفعلي أو النوع المطلوب
              const actualMimeType = blob.type || finalMimeType;
              
              const compressedFile = new File([blob], fileName, {
                type: actualMimeType,
                lastModified: Date.now()
              });

              // التحقق من نوع MIME للملف المضغوط

              // التأكد من أن نوع MIME صحيح
              if (!compressedFile.type.startsWith('image/')) {
                // إنشاء ملف جديد بنوع MIME صحيح
                const correctedFile = new File([blob], fileName, {
                  type: finalMimeType,
                  lastModified: Date.now()
                });
                
                // حساب نسبة الضغط
                const compressionRatio = ((file.size - correctedFile.size) / file.size * 100).toFixed(2);

                // تنظيف الذاكرة
                canvas.width = 0;
                canvas.height = 0;
                img.src = '';

                resolve(correctedFile);
                return;
              }

              // حساب نسبة الضغط
              const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(2);

              // تنظيف الذاكرة
              canvas.width = 0;
              canvas.height = 0;
              img.src = '';

              resolve(compressedFile);
            },
            finalMimeType,
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

  // دالة لتحسين الصورة قبل الضغط
  const optimizeImageBeforeCompression = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // تطبيق تقليل الضوضاء البسيط
    applyNoiseReduction(imageData);
    
    // تطبيق تحسين الحدة الخفيف
    applySharpening(imageData, 0.1);
    
    // إعادة رسم البيانات المحسنة
    ctx.putImageData(imageData, 0, 0);
  };

  // دالة لتقليل الضوضاء
  const applyNoiseReduction = (imageData: ImageData) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);
    
    // تطبيق مرشح gaussian blur خفيف
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let count = 0;
          
          // نافذة 3x3
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIdx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += tempData[neighborIdx];
              count++;
            }
          }
          
          data[idx + c] = Math.round(sum / count);
        }
      }
    }
  };

  // دالة لرفع الصورة إلى Supabase فقط - محسنة مع دعم AbortSignal
  const uploadImageWithOfflineSupport = async (file: File, filePath: string, signal?: AbortSignal): Promise<string> => {
    try {
      // فحص إذا تم إلغاء العملية
      if (signal?.aborted) {
        throw new Error('تم إلغاء عملية الرفع');
      }
      
      // للتأكد من أن الملف فعلاً ملف وليس شيئًا آخر
      if (!(file instanceof File)) {
        throw new Error('الملف المقدم ليس ملفًا صالحًا');
      }

      // التحقق من نوع MIME قبل الرفع
      if (!file.type.startsWith('image/')) {
        throw new Error(`نوع الملف غير مدعوم: ${file.type}`);
      }

      // التحقق من حجم الملف (الحد الأقصى 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 10MB.');
      }

      // عرض معلومات التشخيص في بيئة التطوير
      if (process.env.NODE_ENV === 'development') {
      }

      // فحص إلغاء العملية مرة أخرى
      if (signal?.aborted) {
        throw new Error('تم إلغاء عملية الرفع');
      }

      // التحقق من وجود المستخدم في AuthContext
      if (!authContext?.user || !authContext?.session) {
        console.warn('⚠️ لا يوجد مستخدم مصادق في AuthContext');
        
        // محاولة استخدام المساعدة التقليدية
        const result = await uploadFileWithAuth('organization-assets', filePath, file, {
          cacheControl: '31536000',
          upsert: false,
          contentType: file.type
        });

        if (!result.success) {
          throw new Error(result.error || 'فشل في رفع الصورة');
        }

        return result.publicUrl || '';
      }

      
      
      // الحصول على الجلسة الحالية مباشرة من Supabase (تجاهل AuthContext)
      
      const { data: { session: currentSupabaseSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ خطأ في الحصول على الجلسة:', sessionError);
        throw new Error('فشل في الحصول على جلسة المصادقة');
      }
      
      let validSession = currentSupabaseSession || authContext.session;
      
      // معلومات تشخيصية لمقارنة الجلسات
      if (process.env.NODE_ENV === 'development') {
      }
      
      // فحص إذا كان token منتهي الصلاحية
      if (validSession?.expires_at) {
        const expiresAt = new Date(validSession.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        
        // إذا كان token سينتهي خلال دقيقة أو انتهت صلاحيته
        if (timeUntilExpiry <= 60000) {
          
          
          try {
            // استخدام sessionMonitor لتحديث الجلسة بطريقة موحدة
            const { sessionMonitor } = await import('@/lib/session-monitor');
            const refreshSuccess = await sessionMonitor.manualRefresh();
            
            if (refreshSuccess) {
              const { session: newSession } = sessionMonitor.getCurrentSession();
              if (newSession) {
                validSession = newSession;
                
                
                // إجبار تحديث AuthContext
                if ((authContext as any).updateAuthState) {
                  (authContext as any).updateAuthState(validSession, validSession.user, false);
                }
              } else {
                throw new Error('فشل في الحصول على الجلسة المحدثة');
              }
            } else {
              // المحاولة التقليدية كخيار احتياطي
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (!refreshError && refreshData?.session) {
                validSession = refreshData.session;
                
              } else {
                console.warn('⚠️ فشل تحديث الجلسة:', refreshError?.message);
                
                // إذا كانت الجلسة مفقودة تماماً، المستخدم يحتاج لتسجيل الدخول مرة أخرى
                if (refreshError?.message?.includes('Auth session missing')) {
                  throw new Error('انتهت صلاحية جلسة الدخول. يرجى تحديث الصفحة وتسجيل الدخول مرة أخرى.');
                }
                throw new Error('فشل في تحديث الجلسة. يرجى تحديث الصفحة.');
              }
            }
          } catch (refreshErr) {
            console.warn('⚠️ خطأ في تحديث الجلسة:', refreshErr);
            
            // في حالة فشل تحديث الجلسة، طلب إعادة تسجيل الدخول
            if (String(refreshErr).includes('Auth session missing') || String(refreshErr).includes('refresh_token')) {
              throw new Error('انتهت صلاحية جلسة الدخول. يرجى تحديث الصفحة وتسجيل الدخول مرة أخرى.');
            }
            throw refreshErr;
          }
        }
      }
      if (!validSession?.access_token) {
        throw new Error('الجلسة غير صالحة أو منتهية الصلاحية');
      }

      // استخدام الوظيفة الموحّدة للرفع مع cacheControl طويل
      const uploaded = await uploadFileWithAuth('organization-assets', filePath, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type
      });
      if (!uploaded.success) {
        throw new Error(uploaded.error || 'فشل رفع الصورة');
      }
      
      return uploaded.publicUrl || '';

    } catch (error: any) {
      console.error('❌ خطأ في uploadImageWithOfflineSupport:', error);
      throw error; // إعادة إلقاء الخطأ الأصلي
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

  // معالجة اختيار الصورة مع دعم cleanup
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isMountedRef.current) return;

    // إلغاء أي عملية رفع سابقة
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // إنشاء AbortController جديد
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (!isMountedRef.current) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('compressing');

    try {
      // حذف الصورة السابقة إذا كانت موجودة
      if (uploadedImageUrl && uploadedImageUrl.trim() !== '') {
        try {
          await deleteImageFromStorage(uploadedImageUrl);
        } catch (deleteError) {
          // لا نرمي خطأ هنا لأننا لا نريد إيقاف عملية رفع الصورة الجديدة
        }
      }

      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        throw new Error('يرجى اختيار ملف صورة صالح');
      }

      // التحقق من حجم الملف
      if (file.size > maxSizeInBytes) {
        throw new Error(`حجم الملف كبير جداً. الحد الأقصى ${maxSizeInMB}MB`);
      }

      if (!isMountedRef.current) return;
      setUploadProgress(20);

      // ضغط الصورة
      const compressedFile = await compressImage(file);
      
      if (!isMountedRef.current) return;
      setUploadProgress(50);
      setUploadStage('uploading');

      // إذا كنا أوفلاين، خزّن الصورة محلياً وتخطّ الرفع
      const offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      if (offline) {
        const base64 = await convertImageToBase64(compressedFile);
        const localKey = `local_img_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        try { localStorage.setItem(localKey, base64); } catch {}
        if (isMountedRef.current) {
          setPreview(base64);
          setUploadedImageUrl(`local:${localKey}`);
        }
        if (!disableAutoCallback && isMountedRef.current) {
          onImageUploaded(`local:${localKey}`);
        }
        if (isMountedRef.current) {
          toast({ title: 'تم حفظ الصورة محليًا', description: 'سيتم رفعها عند الاتصال بالإنترنت' });
        }
        setUploadProgress(100);
        setUploadStage('complete');
        return;
      }

      // إنشاء مسار الملف مع تنظيف الاسم
      const fileExtension = compressedFile.name.split('.').pop();

      // تنظيف اسم الملف من الأحرف غير المسموحة
      const cleanFileName = (fileName: string): string => {
        return fileName
          .replace(/[^a-zA-Z0-9._-]/g, '_') // استبدال الأحرف غير المسموحة بشرطة سفلية
          .replace(/_{2,}/g, '_') // تقليل الشرطات المتعددة إلى واحدة
          .replace(/^_+|_+$/g, '') // إزالة الشرطات من البداية والنهاية
          .toLowerCase(); // تحويل إلى أحرف صغيرة
      };

      // حساب hash للمحتوى لتمكين cache-busting الآمن
      const computeFileHash = async (f: File): Promise<string> => {
        const buf = await f.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const arr = Array.from(new Uint8Array(hashBuf)).slice(0, 8); // 8 bytes -> 16 hex chars
        return arr.map(b => b.toString(16).padStart(2, '0')).join('');
      };

      const contentHash = await computeFileHash(compressedFile);

      // إنشاء اسم ملف جديد مع الطابع الزمني + hash
      const timestamp = Date.now();
      const baseName = compressedFile.name.replace(/\.[^/.]+$/, ''); // إزالة الامتداد
      const cleanBaseName = cleanFileName(baseName);
      const fileName = `${timestamp}_${cleanBaseName}_${contentHash}.${fileExtension}`;
      const filePath = `${folder}/${currentOrganization?.id}/${fileName}`;

      if (!isMountedRef.current) return;
      setUploadProgress(70);

      // رفع الصورة مع AbortSignal
      const imageUrl = await uploadImageWithOfflineSupport(compressedFile, filePath, signal);
      
      if (!isMountedRef.current) return;
      setUploadProgress(90);

      // تحديث الحالة
      if (isMountedRef.current) {
        setPreview(imageUrl);
        setUploadedImageUrl(imageUrl);
      }
      
      if (!isMountedRef.current) return;
      setUploadProgress(100);
      setUploadStage('complete');

      // استدعاء callback
      if (!disableAutoCallback && isMountedRef.current) {
        onImageUploaded(imageUrl);
      }

      if (isMountedRef.current) {
        toast({
          title: "تم رفع الصورة بنجاح",
          description: `تم ضغط الصورة وتوفير ${((file.size - compressedFile.size) / file.size * 100).toFixed(1)}% من المساحة`,
        });
      }

    } catch (error: any) {
      // تجاهل الأخطاء إذا تم إلغاء العملية أو unmount المكون
      if (error.message?.includes('تم إلغاء عملية الرفع') || !isMountedRef.current) {
        return;
      }
      
      console.error('❌ خطأ نهائي في رفع الصورة:', error);
      
      // كحل أوفلاين: في حال فشل الرفع لأي سبب، خزّن الصورة محليًا كنسخة احتياطية
      try {
        const inputEl = event?.target as HTMLInputElement | undefined;
        const f = inputEl?.files?.[0] || null;
        if (f) {
          const base64 = await convertImageToBase64(f);
          const localKey = `local_img_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          try { localStorage.setItem(localKey, base64); } catch {}
          if (isMountedRef.current) {
            setPreview(base64);
            setUploadedImageUrl(`local:${localKey}`);
          }
          if (!disableAutoCallback && isMountedRef.current) {
            onImageUploaded(`local:${localKey}`);
          }
          if (isMountedRef.current) {
            toast({ title: 'تم حفظ الصورة محليًا', description: 'تعذر الرفع الآن، سنحاول لاحقًا' });
          }
          return;
        }
      } catch {}

      // معالجة أخطاء المصادقة بشكل خاص
      if (error.message?.includes('تسجيل الدخول') || 
          error.message?.includes('مصادقة') ||
          error.message?.includes('صلاحية')) {
        if (isMountedRef.current) {
          toast({
            variant: "destructive",
            title: "مطلوب تسجيل الدخول",
            description: (error instanceof Error ? error.message : (typeof error === 'string' ? error : 'خطأ غير معروف')) + " يرجى تحديث الصفحة وتسجيل الدخول مرة أخرى.",
          });
          
          // إضافة زر تحديث بعد 3 ثوانٍ
          uploadTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && confirm('هل تريد تحديث الصفحة لتسجيل الدخول مرة أخرى؟')) {
              window.location.reload();
            }
          }, 3000);
        }
      } else {
        if (isMountedRef.current) {
          toast({
            variant: "destructive",
            title: "فشل رفع الصورة",
            description: error instanceof Error ? error.message : (typeof error === 'string' ? error : "حدث خطأ غير متوقع"),
          });
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('idle');
      }
      // إعادة تعيين input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    if (!isMountedRef.current) return;
    
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
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <div className="text-sm mb-2">
                    {uploadStage === 'compressing' && 'جاري ضغط الصورة...'}
                    {uploadStage === 'uploading' && 'جاري رفع الصورة...'}
                    {uploadStage === 'complete' && 'تم بنجاح!'}
                  </div>
                  {uploadProgress > 0 && (
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
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
                <p className="text-sm text-gray-500 mt-2">
                  اسحب وأفلت صورة هنا أو انقر للاختيار
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  يدعم: JPG, PNG, WebP • الحد الأقصى: {maxSizeInMB}MB
                </p>
                <p className="text-xs text-green-600 mt-1">
                  💡 سيتم ضغط الصورة تلقائياً لتوفير المساحة
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
