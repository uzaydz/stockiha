import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CompleteProduct, ProductColor } from '@/lib/api/productComplete';

interface ProductImageGalleryV2Props {
  product: CompleteProduct;
  selectedColor?: ProductColor;
}

const ProductImageGalleryV2: React.FC<ProductImageGalleryV2Props> = ({ 
  product, 
  selectedColor 
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = useMemo(() => {
    const imageList: string[] = [];
    
    if (product.images.thumbnail_image) {
      imageList.push(product.images.thumbnail_image);
    }
    
    if (selectedColor?.image_url && !imageList.includes(selectedColor.image_url)) {
      imageList.unshift(selectedColor.image_url);
    }
    
    product.images.additional_images.forEach(img => {
      if (!imageList.includes(img.url)) {
        imageList.push(img.url);
      }
    });

    return imageList.length > 0 ? imageList : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  useEffect(() => {
    if (selectedColor?.image_url) {
      const colorImageIndex = images.findIndex(img => img === selectedColor.image_url);
      if (colorImageIndex !== -1) {
        setSelectedImageIndex(colorImageIndex);
      }
    }
  }, [selectedColor, images]);

  return (
    <div className="w-full">
      <motion.div 
        className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-gray-100"
        layout
      >
        <motion.img
          key={images[selectedImageIndex]}
          src={images[selectedImageIndex]}
          alt={product.name}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/placeholder-product.jpg';
          }}
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === 0 ? images.length - 1 : prev - 1
              )}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === images.length - 1 ? 0 : prev + 1
              )}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              →
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 4).map((image, index) => (
            <motion.button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                index === selectedImageIndex 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={image}
                alt={`${product.name} - ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder-product.jpg';
                }}
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGalleryV2; 