import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';

interface ProductNavigationBarProps {
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  onShareProduct: () => void;
}

const ProductNavigationBar: React.FC<ProductNavigationBarProps> = React.memo(({
  isInWishlist,
  onToggleWishlist,
  onShareProduct
}) => {
  const navigate = useNavigate();

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            رجوع
          </Button>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleWishlist}
              className="p-2"
            >
              {isInWishlist ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareProduct}
              className="p-2"
            >
              <ShareIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductNavigationBar.displayName = 'ProductNavigationBar';

export default ProductNavigationBar; 