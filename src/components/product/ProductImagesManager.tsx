import { useState, useEffect, useRef } from 'react';
import { X, Plus, ArrowUp, ArrowDown, ImageIcon, Image, ImagePlus, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
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
  
  // إضافة mounted state tracking
  const isMountedRef = useRef(true);

  // إضافة cleanup effect للتحكم في mounted state
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // عندما تتغير الصور الإضافية من الخارج، قم بتصفيتها
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (Array.isArray(additionalImages)) {
      // فلترة الصور، وتأكد من إزالة الصورة الرئيسية من الصور الإضافية
      const filtered = additionalImages
        .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
        .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
      
      if (isMountedRef.current) {
        setFilteredAdditionalImages(filtered);
      }
    } else {
      if (isMountedRef.current) {
        setFilteredAdditionalImages([]);
      }
    }
  }, [additionalImages, mainImage]);

  // عند تغيير الصورة الرئيسية، تأكد من إزالتها من الصور الإضافية أيضًا
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (mainImage && Array.isArray(additionalImages) && additionalImages.includes(mainImage)) {
      const filtered = additionalImages.filter(url => url !== mainImage);
      if (filtered.length !== additionalImages.length && isMountedRef.current) {
        onAdditionalImagesChange(filtered);
      }
    }
  }, [mainImage, additionalImages, onAdditionalImagesChange]);

  // معالج تغيير الصورة الرئيسية
  const handleMainImageChange = (url: string) => {
    if (!isMountedRef.current) return;
    
    if (url && url.trim() !== '') {
      // عند تغيير الصورة الرئيسية، قم بإزالتها من الصور الإضافية إن وجدت
      if (Array.isArray(additionalImages) && additionalImages.includes(url)) {
        const filtered = additionalImages.filter(img => img !== url);
        if (isMountedRef.current) {
          onAdditionalImagesChange(filtered);
        }
      }
      
      if (isMountedRef.current) {
        onMainImageChange(url);
      }
    }
  };

  // معالج تغيير الصور الإضافية
  const handleAdditionalImagesChange = (urls: string[]) => {
    if (!isMountedRef.current) return;
    
    // التحقق من أن urls مصفوفة
    if (!Array.isArray(urls)) {
      return;
    }
    
    // تأكد من أن الصور الإضافية لا تتضمن الصورة الرئيسية وأن الروابط صالحة
    const filteredUrls = urls
      .filter(url => url && url.trim() !== '') // إزالة الروابط الفارغة
      .filter(url => url !== mainImage); // إزالة الصورة الرئيسية
    
    if (JSON.stringify(filteredUrls) !== JSON.stringify(additionalImages) && isMountedRef.current) {
      setFilteredAdditionalImages(filteredUrls);
      onAdditionalImagesChange(filteredUrls);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Main Images Management Card */}
        <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-xs sm:text-sm truncate block">إدارة صور المنتج</span>
                <Badge variant="destructive" className="text-[10px] sm:text-xs mr-0 sm:mr-2 shadow-sm mt-1 sm:mt-0 sm:inline-block">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 bg-gradient-to-b from-background/50 to-background">
            {/* Info Section */}
            <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-2.5 sm:p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2">
                    معلومات مهمة حول صور المنتج
                  </h3>
                  <ul className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 space-y-0.5 sm:space-y-1">
                    <li>• الصورة الرئيسية <span className="font-bold">إلزامية</span> وستظهر كصورة أساسية للمنتج</li>
                    <li>• يمكنك إضافة حتى 8 صور إضافية للمنتج</li>
                    <li className="hidden sm:list-item">• احرص على استخدام صور مربعة بجودة عالية للحصول على أفضل النتائج</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Main Image Section */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-1.5 sm:p-2 rounded-lg shadow-sm">
                  <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">الصورة الرئيسية</span>
                  <span className="text-destructive">*</span>
                  <Badge variant="destructive" className="text-[10px] sm:text-xs shadow-sm">مطلوب</Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center min-h-[44px] sm:min-h-auto p-2 sm:p-0 -m-2 sm:m-0"
                        onClick={(e) => e.preventDefault()}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-[280px] sm:max-w-xs z-50 bg-popover border border-border shadow-lg"
                      side="top"
                      sideOffset={5}
                    >
                      <p className="text-xs">الصورة الرئيسية التي ستظهر في قائمة المنتجات وصفحة المنتج. يجب أن تكون عالية الجودة ومربعة الشكل.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 p-3 sm:p-4 rounded-lg border border-border/60 backdrop-blur-sm">
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
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right mt-2">
                  يفضل استخدام صورة مربعة بدقة عالية للحصول على أفضل عرض
                </p>
              </div>
            </div>

            
            {/* Additional Images Section */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-1.5 sm:p-2 rounded-lg shadow-sm">
                  <ImagePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">الصور الإضافية</span>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs shadow-sm">اختياري</Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center min-h-[44px] sm:min-h-auto p-2 sm:p-0 -m-2 sm:m-0"
                        onClick={(e) => e.preventDefault()}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-[280px] sm:max-w-xs z-50 bg-popover border border-border shadow-lg"
                      side="top"
                      sideOffset={5}
                    >
                      <p className="text-xs">صور إضافية للمنتج تظهر في معرض الصور. يمكنك إضافة حتى 8 صور وإعادة ترتيبها.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 p-3 sm:p-4 rounded-lg border border-border/60 backdrop-blur-sm">
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
                  <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ تم تنظيف بعض الصور المكسورة أو غير المتاحة. إذا كانت الصور لا تظهر، يرجى إعادة رفعها.
                    </p>
                  </div>
                )}
                
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right mt-2">
                  يمكنك إضافة حتى 8 صور إضافية وإعادة ترتيبها حسب الحاجة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
