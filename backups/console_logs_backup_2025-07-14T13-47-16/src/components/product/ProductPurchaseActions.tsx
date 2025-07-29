import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface ProductPurchaseActionsProps {
  canPurchase: boolean;
  buyingNow: boolean;
  addingToCart: boolean;
  totalPrice: number;
  onBuyNow: () => void;
  onAddToCart: () => void;
}

const ProductPurchaseActions: React.FC<ProductPurchaseActionsProps> = React.memo(({
  canPurchase,
  buyingNow,
  addingToCart,
  totalPrice,
  onBuyNow,
  onAddToCart
}) => {
  const buyNowButtonContent = useMemo(() => {
    if (buyingNow) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          جاري المعالجة...
        </div>
      );
    }
    return `اشتري الآن - ${totalPrice.toLocaleString()} دج`;
  }, [buyingNow, totalPrice]);

  const addToCartButtonContent = useMemo(() => {
    return (
      <>
        <ShoppingCartIcon className="w-5 h-5 ml-2" />
        {addingToCart ? 'جاري الإضافة...' : 'أضف إلى السلة'}
      </>
    );
  }, [addingToCart]);

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Button
        onClick={onBuyNow}
        disabled={!canPurchase || buyingNow}
        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {buyNowButtonContent}
      </Button>
      
      <Button
        variant="outline"
        onClick={onAddToCart}
        disabled={!canPurchase || addingToCart}
        className="w-full h-12 text-lg font-semibold border-2"
        size="lg"
      >
        {addToCartButtonContent}
      </Button>
    </motion.div>
  );
});

ProductPurchaseActions.displayName = 'ProductPurchaseActions';

export default ProductPurchaseActions; 