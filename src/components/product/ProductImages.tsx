import { useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import ProductImagesManager from './ProductImagesManager';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Image, Plus } from 'lucide-react';

interface ProductImagesProps {
  form: UseFormReturn<ProductFormValues>;
  mainImage: string;
  additionalImages: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  thumbnailImageRef?: React.RefObject<ImageUploaderRef>;
}

export default function ProductImages({ 
  form, 
  mainImage, 
  additionalImages, 
  onMainImageChange, 
  onAdditionalImagesChange,
  thumbnailImageRef
}: ProductImagesProps) {
  // إضافة useEffect لضمان مزامنة الصورة الرئيسية مع النموذج عند الانتقال بين التبويبات
  useEffect(() => {
    // التأكد من تحديث mainImage في الفورم عند التنقل بين التبويبات
    if (mainImage && mainImage !== form.getValues('thumbnail_image')) {
      form.setValue('thumbnail_image', mainImage);
    }

    // التأكد من تحديث additionalImages في الفورم عند التنقل بين التبويبات
    if (additionalImages.length > 0 && form.getValues('additional_images')?.length !== additionalImages.length) {
      form.setValue('additional_images', additionalImages);
    }
  }, [mainImage, additionalImages, form]);

  // معالج لتغيير الصورة الرئيسية يقوم بتحديث النموذج مباشرة
  const handleMainImageChange = (url: string) => {
    form.setValue('thumbnail_image', url);
    onMainImageChange(url);
  };

  // معالج لتغيير الصور الإضافية يقوم بتحديث النموذج مباشرة
  const handleAdditionalImagesChange = (urls: string[]) => {
    form.setValue('additional_images', urls);
    onAdditionalImagesChange(urls);
  };

  return (
    <div className="space-y-6">
      {/* Main Image Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            الصورة الرئيسية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <div className="bg-blue-100 p-1.5 rounded-full">
                <Image className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span>صورة رئيسية واضحة وجذابة للمنتج</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Images Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-full">
              <Plus className="h-4 w-4 text-green-600" />
            </div>
            الصور الإضافية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="bg-purple-100 p-1.5 rounded-full">
                <Image className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span>صور إضافية لإظهار تفاصيل أكثر للمنتج</span>
            </div>
          </div>
          
          {/* Images Manager Component */}
          <ProductImagesManager
            mainImage={mainImage}
            additionalImages={additionalImages}
            onMainImageChange={handleMainImageChange}
            onAdditionalImagesChange={handleAdditionalImagesChange}
            thumbnailImageRef={thumbnailImageRef}
          />
        </CardContent>
      </Card>
    </div>
  );
}
