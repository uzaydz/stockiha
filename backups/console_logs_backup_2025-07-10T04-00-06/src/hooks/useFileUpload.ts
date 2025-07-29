import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { uploadStorageFile } from '@/lib/api/settings';

interface FileUploadProps {
  /**
   * مسار التخزين في السحابة حيث سيتم حفظ الملف
   */
  uploadPath: string;
  
  /**
   * أنواع الملفات المسموح رفعها (اختياري)
   * @default 'image/*'
   * @example 'image/png,image/jpeg'
   */
  acceptedFileTypes?: string;
  
  /**
   * دالة تستدعى بعد نجاح عملية الرفع مع رابط الملف المرفوع
   */
  onSuccess: (url: string) => void;
  
  /**
   * دالة تستدعى عند حدوث خطأ أثناء الرفع (اختيارية)
   */
  onError?: (error: Error) => void;
}

/**
 * هوك مخصص لتحميل الملفات إلى السحابة
 */
export const useFileUpload = ({
  uploadPath,
  acceptedFileTypes = 'image/*',
  onSuccess,
  onError,
}: FileUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  /**
   * التحقق من نوع الملف
   */
  const validateFileType = (file: File): boolean => {
    // تحويل أنواع الملفات المقبولة إلى مصفوفة للفحص
    const acceptedTypes = acceptedFileTypes
      .split(',')
      .map(type => type.trim().toLowerCase());
    
    // إذا كان النوع عام مثل image/* فنفحص فقط الجزء الرئيسي
    if (acceptedTypes.includes('image/*') && file.type.startsWith('image/')) {
      return true;
    }
    
    // فحص إذا كان نوع الملف مطابق تمامًا لأحد الأنواع المقبولة
    return acceptedTypes.includes(file.type.toLowerCase());
  };

  /**
   * معالج رفع الملف
   */
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!validateFileType(file)) {
      toast({
        title: 'خطأ',
        description: `نوع الملف غير مدعوم. الأنواع المدعومة: ${acceptedFileTypes}`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // استدعاء وظيفة رفع الملف من API
      const uploadedFile = await uploadStorageFile(file, uploadPath);
      
      if (uploadedFile?.url) {
        // استدعاء دالة النجاح مع رابط الملف
        onSuccess(uploadedFile.url);
        
        toast({
          title: 'تم بنجاح',
          description: 'تم رفع الملف بنجاح',
        });
      } else {
        throw new Error('لم يتم استلام رابط الملف المرفوع');
      }
    } catch (error) {
      
      // استدعاء دالة الخطأ إذا تم توفيرها
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      toast({
        title: 'خطأ',
        description: 'فشل في رفع الملف، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * معالج تغيير عنصر إدخال الملف
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    handleFileUpload(file);
    
    // إعادة تعيين حقل الإدخال بعد الرفع
    e.target.value = '';
  };

  return {
    isUploading,
    handleFileUpload,
    handleInputChange,
  };
};

export default useFileUpload;
