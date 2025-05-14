import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  mainImage: string;
  additionalImages?: string[];
  productName: string;
}

const ProductGallery = ({ mainImage, additionalImages = [], productName }: ProductGalleryProps) => {
  const [activeImage, setActiveImage] = useState(mainImage);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const allImages = [mainImage, ...(additionalImages || [])];
  const currentIndex = allImages.indexOf(activeImage);
  
  // تحديث الصورة النشطة عندما تتغير الصورة الرئيسية (عند تغيير اللون)
  useEffect(() => {
    setActiveImage(mainImage);
  }, [mainImage]);

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % allImages.length;
    setActiveImage(allImages[nextIndex]);
  };

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setActiveImage(allImages[prevIndex]);
  };

  const handleZoom = (image: string) => {
    setZoomedImage(image);
  };

  const closeZoom = () => {
    setZoomedImage(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* صورة المنتج الرئيسية */}
        <motion.div 
          className="relative aspect-square overflow-hidden rounded-2xl bg-card border border-border shadow-sm group"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full flex items-center justify-center"
            >
              <img
                src={activeImage}
                alt={productName}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </motion.div>
          </AnimatePresence>
          
          {/* زر التكبير */}
          <button 
            onClick={() => handleZoom(activeImage)}
            className="absolute bottom-3 right-3 bg-background/90 dark:bg-background/70 backdrop-blur-sm p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="تكبير الصورة"
          >
            <ZoomIn className="h-5 w-5 text-foreground" />
          </button>
          
          {/* أزرار التنقل */}
          {allImages.length > 1 && (
            <>
              <button 
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 dark:bg-background/70 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="h-6 w-6 text-foreground" />
              </button>
              
              <button 
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 dark:bg-background/70 backdrop-blur-sm shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="h-6 w-6 text-foreground" />
              </button>
            </>
          )}
          
          {/* مؤشر الموقع */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    idx === currentIndex 
                      ? "bg-primary w-4" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>
        
        {/* الصور المصغرة */}
        {allImages.length > 1 && (
          <motion.div 
            className="flex justify-center gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {allImages.map((image, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveImage(image)}
                className={cn(
                  "min-w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300",
                  activeImage === image 
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-105" 
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                )}
                whileHover={{ scale: activeImage === image ? 1.05 : 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <img 
                  src={image} 
                  alt={`${productName} - ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
      
      {/* عرض الصورة المكبرة */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeZoom}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[80vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={zoomedImage} 
                alt={productName} 
                className="w-full h-full object-contain"
              />
              <button 
                onClick={closeZoom}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-full transition-colors duration-200"
              >
                <X className="h-6 w-6 text-white" />
              </button>
              
              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = allImages.indexOf(zoomedImage);
                      const prevIdx = (idx - 1 + allImages.length) % allImages.length;
                      setZoomedImage(allImages[prevIdx]);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors duration-200"
                  >
                    <ChevronRight className="h-8 w-8 text-white" />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = allImages.indexOf(zoomedImage);
                      const nextIdx = (idx + 1) % allImages.length;
                      setZoomedImage(allImages[nextIdx]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors duration-200"
                  >
                    <ChevronLeft className="h-8 w-8 text-white" />
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductGallery; 