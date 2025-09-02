import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import ImageUploader from "./ImageUploader";

// دالة لحذف الصورة من Supabase Storage
const deleteImageFromStorage = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!imageUrl || !imageUrl.includes('supabase.co')) {
      return true; // الصورة ليست في Supabase، لا حاجة للحذف
    }

    const supabase = getSupabaseClient();

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

interface MultiImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  defaultImages?: string[];
  label?: string;
  folder?: string;
  maxSizeInMB?: number;
  maxImages?: number;
  className?: string;
  disableAutoCallback?: boolean;
}

export default function MultiImageUploader({
  onImagesUploaded,
  defaultImages = [],
  label = "رفع الصور",
  folder = "products",
  maxSizeInMB = 2,
  maxImages = 10,
  className = "",
  disableAutoCallback = false
}: MultiImageUploaderProps) {
  const [images, setImages] = useState<string[]>(defaultImages);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const { toast } = useToast();
  
  // تحسين: استخدام مرجع للاحتفاظ بالقيمة الحالية للصور لتفادي مشاكل الإغلاق
  const imagesRef = useRef<string[]>(defaultImages);
  
  // إضافة useEffect لتحديث الصور عندما تتغير defaultImages من الخارج
  useEffect(() => {
    // تجنب طباعة رسائل التصحيح المتكررة في البيئة الإنتاجية
    if (process.env.NODE_ENV !== 'production') {
      
    }
    
    // التأكد من أن defaultImages مصفوفة
    if (Array.isArray(defaultImages) && JSON.stringify(defaultImages) !== JSON.stringify(images)) {
      setImages(defaultImages);
      imagesRef.current = defaultImages;
    }
  }, [defaultImages]);
  
  const handleImageUploaded = (url: string) => {
    if (process.env.NODE_ENV !== 'production') {
      
    }
    
    if (url && url.trim() !== "") {
      // استخدام وظيفة تحديث الحالة مع وظيفة مرجعية للتأكد من استخدام أحدث القيم
      setImages(prevImages => {
        const newImages = [...prevImages, url];
        // تحديث مرجع الصور
        imagesRef.current = newImages;
        
        if (process.env.NODE_ENV !== 'production') {
          
        }
        
        // تأخير استدعاء onImagesUploaded لضمان اكتمال تحديث الحالة أولاً
        if (!disableAutoCallback) {
          onImagesUploaded(newImages);
        }
        
        return newImages;
      });
    } else {
    }
    setIsAddingImage(false);
  };

  const handleRemoveImage = async (index: number) => {
    if (process.env.NODE_ENV !== 'production') {
    }

    setImages(prevImages => {
      const newImages = [...prevImages];
      const removedUrl = newImages.splice(index, 1)[0];

      // حذف الصورة من Supabase Storage في الخلفية
      if (removedUrl) {
        deleteImageFromStorage(removedUrl).then(success => {
          if (success) {
            toast({
              title: "تم حذف الصورة",
              description: "تم حذف الصورة من التخزين بنجاح",
              variant: "default",
            });
          } else {
            toast({
              title: "تحذير",
              description: "تم حذف الصورة من الواجهة ولكن قد تظل في التخزين",
              variant: "destructive",
            });
          }
        }).catch(error => {
          toast({
            title: "تحذير",
            description: "تم حذف الصورة من الواجهة ولكن قد تظل في التخزين",
            variant: "destructive",
          });
        });
      }

      // تحديث مرجع الصور
      imagesRef.current = newImages;

      if (process.env.NODE_ENV !== 'production') {
      }

      if (!disableAutoCallback) {
        onImagesUploaded(newImages);
      }

      return newImages;
    });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    setImages(prevImages => {
      const newImages = [...prevImages];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      // تحديث مرجع الصور
      imagesRef.current = newImages;
      
      if (process.env.NODE_ENV !== 'production') {
        
      }
      
      if (!disableAutoCallback) {
        onImagesUploaded(newImages);
      }
      
      return newImages;
    });
  };

  const showAddImageForm = () => {
    if (images.length >= maxImages) {
      toast({
        title: "تنبيه",
        description: `الحد الأقصى للصور هو ${maxImages} صورة`,
        variant: "default",
      });
      return;
    }
    
    setIsAddingImage(true);
  };

  // دالة للحصول على جميع روابط الصور
  const getImages = () => {
    return images;
  };

  // دالة للتحقق من صحة الصورة
  const checkImageExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || !url.trim()) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      // تعيين timeout للصور التي لا ترد
      setTimeout(() => resolve(false), 5000);
    });
  };

  // استخدام useEffect للتحقق من الصور وإزالة الروابط الفارغة أو غير الصالحة
  useEffect(() => {
    const validateImages = async () => {
      if (images.length > 0) {
        const validationPromises = images.map(url => checkImageExists(url));
        const validationResults = await Promise.all(validationPromises);

        const validImages = images.filter((url, index) => validationResults[index]);

        if (validImages.length !== images.length) {

          // تحديث الصور المتبقية
          setImages(validImages);
          imagesRef.current = validImages;

          if (!disableAutoCallback) {
            onImagesUploaded(validImages);
          }
        }
      }
    };

    validateImages();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <Label className="block text-right">{label}</Label>}
      
      <div className="space-y-3">
        {/* عرض الصور الحالية */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((url, index) => (
              <div key={index} className="relative group border rounded-md overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img src={url} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <div className="flex space-x-1 space-x-reverse mb-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4 mr-1" /> حذف
                    </Button>
                  </div>
                  <div className="flex space-x-1 space-x-reverse">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white"
                      onClick={() => handleMoveImage(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-white"
                      onClick={() => handleMoveImage(index, 'down')}
                      disabled={index === images.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* زر إضافة صورة جديدة */}
        {!isAddingImage ? (
          <Button 
            variant="outline" 
            className="w-full h-24 border-dashed flex flex-col items-center justify-center gap-2"
            onClick={showAddImageForm}
            disabled={images.length >= maxImages}
          >
            <Upload className="h-5 w-5" />
            <span className="text-sm">إضافة صورة جديدة {images.length > 0 ? `(${images.length}/${maxImages})` : ""}</span>
          </Button>
        ) : (
          <div className="border border-dashed rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsAddingImage(false)}
              >
                <X className="h-4 w-4 mr-1" /> إلغاء
              </Button>
              <span className="text-sm font-medium">إضافة صورة جديدة</span>
            </div>
            <ImageUploader
              onImageUploaded={handleImageUploaded}
              folder={folder}
              maxSizeInMB={maxSizeInMB}
              label=""
              disableAutoCallback={disableAutoCallback}
            />
          </div>
        )}
      </div>
      
      {/* رسالة تنبيه عندما لا توجد صور */}
      {images.length === 0 && !isAddingImage && (
        <p className="text-sm text-muted-foreground text-center">
          لم تقم بإضافة أي صور بعد. يمكنك إضافة حتى {maxImages} صورة للمنتج.
        </p>
      )}
    </div>
  );
}
