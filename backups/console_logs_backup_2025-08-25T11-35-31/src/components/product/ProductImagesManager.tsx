import { useState, useEffect } from 'react';
import { X, Plus, ArrowUp, ArrowDown, ImageIcon, Image, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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

  // عندما تتغير الصور الإضافية من الخارج، قم بتصفيتها
  useEffect(() => {
    if (Array.isArray(additionalImages)) {
      // فلترة الصور، وتأكد من إزالة الصورة الرئيسية من الصور الإضافية
      const filtered = additionalImages
        .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
        .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
      
      setFilteredAdditionalImages(filtered);
    } else {
      setFilteredAdditionalImages([]);
    }
  }, [additionalImages, mainImage]);

  // عند تغيير الصورة الرئيسية، تأكد من إزالتها من الصور الإضافية أيضًا
  useEffect(() => {
    if (mainImage && Array.isArray(additionalImages) && additionalImages.includes(mainImage)) {
      const filtered = additionalImages.filter(url => url !== mainImage);
      if (filtered.length !== additionalImages.length) {
        onAdditionalImagesChange(filtered);
      }
    }
  }, [mainImage, additionalImages, onAdditionalImagesChange]);

  // معالج تغيير الصورة الرئيسية
  const handleMainImageChange = (url: string) => {
    if (url && url.trim() !== '') {
      // عند تغيير الصورة الرئيسية، قم بإزالتها من الصور الإضافية إن وجدت
      if (Array.isArray(additionalImages) && additionalImages.includes(url)) {
        const filtered = additionalImages.filter(img => img !== url);
        onAdditionalImagesChange(filtered);
      }
      
      onMainImageChange(url);
    }
  };

  // معالج تغيير الصور الإضافية
  const handleAdditionalImagesChange = (urls: string[]) => {
    // التحقق من أن urls مصفوفة
    if (!Array.isArray(urls)) {
      return;
    }
    
    // تأكد من أن الصور الإضافية لا تتضمن الصورة الرئيسية وأن الروابط صالحة
    const filteredUrls = urls
      .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
      .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
    
    if (JSON.stringify(filteredUrls) !== JSON.stringify(additionalImages)) {
      setFilteredAdditionalImages(filteredUrls);
      onAdditionalImagesChange(filteredUrls);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 pt-4 px-5 bg-muted/20 flex flex-row items-center space-y-0 gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">إدارة صور المنتج</h3>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-700">
            <ul className="list-disc mr-5 space-y-1">
              <li>الصورة الرئيسية <span className="font-bold">إلزامية</span> وستظهر كصورة أساسية للمنتج</li>
              <li>يمكنك إضافة حتى 8 صور إضافية للمنتج</li>
              <li>احرص على استخدام صور مربعة بجودة عالية للحصول على أفضل النتائج</li>
            </ul>
          </div>
          
          <div className="space-y-4 border border-muted p-4 rounded-md">
            <div className="flex items-center gap-2 text-lg font-medium text-primary">
              <Image className="h-5 w-5" />
              الصورة الرئيسية*
            </div>
            <ImageUploader
              label=""
              imageUrl={mainImage}
              onImageUploaded={handleMainImageChange}
              folder="product_thumbnails"
              maxSizeInMB={5}
              ref={thumbnailImageRef}
              disableAutoCallback={disableAutoCallback}
              className="border-2 border-dashed border-primary/20 rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-right">
              يفضل استخدام صورة مربعة بدقة عالية للحصول على أفضل عرض
            </p>
          </div>

          <div className="space-y-4 border border-muted p-4 rounded-md">
            <div className="flex items-center gap-2 text-lg font-medium text-primary">
              <ImagePlus className="h-5 w-5" />
              الصور الإضافية (اختياري)
            </div>
            <MultiImageUploader
              label=""
              defaultImages={filteredAdditionalImages}
              onImagesUploaded={handleAdditionalImagesChange}
              folder="product_images"
              maxSizeInMB={5}
              maxImages={8}
              disableAutoCallback={disableAutoCallback}
              className="border-2 border-dashed border-primary/20 rounded-lg"
            />
            {filteredAdditionalImages.length === 0 && additionalImages && additionalImages.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  ⚠️ تم تنظيف بعض الصور المكسورة أو غير المتاحة. إذا كانت الصور لا تظهر، يرجى إعادة رفعها.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">
              يمكنك إضافة حتى 8 صور إضافية وإعادة ترتيبها حسب الحاجة
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
