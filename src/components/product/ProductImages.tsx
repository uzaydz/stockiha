import { useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import ProductImagesManager from './ProductImagesManager';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';

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
    <ProductImagesManager
      mainImage={mainImage}
      additionalImages={additionalImages}
      onMainImageChange={handleMainImageChange}
      onAdditionalImagesChange={handleAdditionalImagesChange}
      thumbnailImageRef={thumbnailImageRef}
    />
  );
} 