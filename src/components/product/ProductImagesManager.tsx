import { useState, useEffect } from 'react';
import { X, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ImageUploader, { ImageUploaderRef } from '@/components/ui/ImageUploader';
import MultiImageUploader from '@/components/ui/MultiImageUploader';

export interface ProductImagesManagerProps {
  mainImage?: string;
  additionalImages?: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  thumbnailImageRef?: React.RefObject<ImageUploaderRef>;
  disableAutoCallback?: boolean;
  productId?: string;
}

export default function ProductImagesManager({
  mainImage,
  additionalImages,
  onMainImageChange,
  onAdditionalImagesChange,
  thumbnailImageRef,
  disableAutoCallback = false,
  productId
}: ProductImagesManagerProps) {
  // حفظ نسخة محلية من الصور الإضافية بعد الفلترة
  const [filteredAdditionalImages, setFilteredAdditionalImages] = useState<string[]>([]);
  
  // إضافة سجل للتشخيص
  useEffect(() => {
    console.log('ProductImagesManager mounted/updated:', {
      mainImage,
      additionalImages,
      filteredCount: filteredAdditionalImages.length,
      hasRef: !!thumbnailImageRef
    });
  }, [mainImage, additionalImages, filteredAdditionalImages, thumbnailImageRef]);

  // عندما تتغير الصور الإضافية من الخارج، قم بتصفيتها
  useEffect(() => {
    if (Array.isArray(additionalImages)) {
      // فلترة الصور، وتأكد من إزالة الصورة الرئيسية من الصور الإضافية
      const filtered = additionalImages
        .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
        .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
      
      console.log('ProductImagesManager: تصفية الصور الإضافية:', {
        before: additionalImages.length,
        after: filtered.length,
        mainImageRemoved: additionalImages.includes(mainImage)
      });
      
      setFilteredAdditionalImages(filtered);
    } else {
      console.warn('ProductImagesManager: additionalImages غير صالحة:', additionalImages);
      setFilteredAdditionalImages([]);
    }
  }, [additionalImages, mainImage]);

  // عند تغيير mainImage، سواء من المكون أو من الخارج، قم بتحديثه
  useEffect(() => {
    if (thumbnailImageRef?.current) {
      // إذا كان هناك تحديث للصورة من الخارج ولا تتطابق مع الحالية في المرجع
      const currentImage = thumbnailImageRef.current.getUploadedImageUrl();
      if (mainImage && currentImage !== mainImage) {
        console.log('تحديث الصورة الرئيسية من مصدر خارجي:', mainImage);
        // تدفع عمليًا إلى تحديث المرجع إذا لزم الأمر
      }
    }
    
    // عند تغيير الصورة الرئيسية، تأكد من إزالتها من الصور الإضافية أيضًا
    if (mainImage && Array.isArray(additionalImages) && additionalImages.includes(mainImage)) {
      const filtered = additionalImages.filter(url => url !== mainImage);
      if (filtered.length !== additionalImages.length) {
        console.log('ProductImagesManager: إزالة الصورة الرئيسية من الصور الإضافية بعد تغيير mainImage');
        onAdditionalImagesChange(filtered);
      }
    }
  }, [mainImage, thumbnailImageRef, additionalImages, onAdditionalImagesChange]);

  // معالج تغيير الصورة الرئيسية
  const handleMainImageChange = (url: string) => {
    console.log('ProductImagesManager: تم تحديث الصورة الرئيسية:', url);
    if (url && url.trim() !== '') {
      // عند تغيير الصورة الرئيسية، قم بإزالتها من الصور الإضافية إن وجدت
      if (Array.isArray(additionalImages) && additionalImages.includes(url)) {
        console.log('ProductImagesManager: إزالة الصورة الرئيسية الجديدة من الصور الإضافية');
        const filtered = additionalImages.filter(img => img !== url);
        onAdditionalImagesChange(filtered);
      }
      
      onMainImageChange(url);
    } else {
      console.error('ProductImagesManager: تم استلام URL فارغ للصورة الرئيسية');
    }
  };

  // معالج تغيير الصور الإضافية
  const handleAdditionalImagesChange = (urls: string[]) => {
    console.log('ProductImagesManager: تم تحديث الصور الإضافية:', urls);
    
    // التحقق من أن urls مصفوفة
    if (!Array.isArray(urls)) {
      console.error('ProductImagesManager: urls ليست مصفوفة:', urls);
      return;
    }
    
    // تأكد من أن الصور الإضافية لا تتضمن الصورة الرئيسية وأن الروابط صالحة
    const filteredUrls = urls
      .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
      .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
    
    console.log('ProductImagesManager: الصور الإضافية بعد الفلترة:', {
      before: urls.length,
      after: filteredUrls.length,
      mainImageRemoved: urls.includes(mainImage)
    });
    
    if (JSON.stringify(filteredUrls) !== JSON.stringify(additionalImages)) {
      setFilteredAdditionalImages(filteredUrls);
      onAdditionalImagesChange(filteredUrls);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md mb-4">
        <h4 className="font-bold text-amber-800 mb-2">تعليمات إضافة الصور</h4>
        <ul className="text-sm text-amber-700 space-y-1 list-disc mr-5">
          <li>الصورة الرئيسية <span className="font-bold">إلزامية</span> وستظهر كصورة أساسية للمنتج.</li>
          <li>يمكنك إضافة حتى 8 صور إضافية من قسم "الصور الإضافية".</li>
          <li>انتظر حتى يتم رفع كل صورة بنجاح قبل إضافة صورة أخرى (سترى رسالة "تم رفع الصورة بنجاح").</li>
          <li>تأكد أن حجم الصورة لا يتجاوز 5 ميجابايت.</li>
          <li>إذا واجهت مشكلة، جرب تحديث الصفحة وإعادة المحاولة.</li>
        </ul>
      </div>
      
      <div className="space-y-2">
        <ImageUploader
          label="الصورة الرئيسية*"
          imageUrl={mainImage}
          onImageUploaded={handleMainImageChange}
          folder="product_thumbnails"
          maxSizeInMB={5}
          ref={thumbnailImageRef}
          disableAutoCallback={disableAutoCallback}
        />
        <p className="text-xs text-muted-foreground text-right">
          يفضل استخدام صورة مربعة بدقة عالية للحصول على أفضل عرض للمنتج
        </p>
      </div>

      <div className="space-y-2">
        <div className="mb-2">
          <Label className="block text-right mb-1">الصور الإضافية</Label>
          <div className="p-2 bg-blue-50 text-blue-700 rounded-md text-sm mb-2">
            <strong>ملاحظة:</strong> يمكنك إضافة حتى 8 صور إضافية للمنتج. انقر على "إضافة صورة جديدة" أدناه لإضافة المزيد من الصور.
          </div>
        </div>
        <MultiImageUploader
          label=""
          defaultImages={filteredAdditionalImages}
          onImagesUploaded={handleAdditionalImagesChange}
          folder="product_images"
          maxSizeInMB={5}
          maxImages={8}
          disableAutoCallback={disableAutoCallback}
        />
        <p className="text-xs text-muted-foreground text-right">
          يمكنك إعادة ترتيب الصور عن طريق تحريك المؤشر فوق الصورة واستخدام أزرار الترتيب.
        </p>
      </div>
    </div>
  );
} 