import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProductPageContextType {
  quantity: number;
  setQuantity: (quantity: number) => void;
  selectedColor: any;
  setSelectedColor: (color: any) => void;
  selectedSize: any;
  setSelectedSize: (size: any) => void;
  selectedOffer: any;
  setSelectedOffer: (offer: any) => void;
}

const ProductPageContext = createContext<ProductPageContextType | undefined>(undefined);

interface ProductPageProviderProps {
  children: ReactNode;
  initialQuantity?: number;
  initialColor?: any;
  initialSize?: any;
  initialOffer?: any;
}

export const ProductPageProvider: React.FC<ProductPageProviderProps> = ({ 
  children, 
  initialQuantity = 1,
  initialColor = undefined,
  initialSize = undefined,
  initialOffer = null
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [selectedOffer, setSelectedOffer] = useState(initialOffer);

  return (
    <ProductPageContext.Provider value={{ 
      quantity, 
      setQuantity,
      selectedColor,
      setSelectedColor,
      selectedSize,
      setSelectedSize,
      selectedOffer,
      setSelectedOffer
    }}>
      {children}
    </ProductPageContext.Provider>
  );
};

export const useProductPageContext = () => {
  const context = useContext(ProductPageContext);
  if (context === undefined) {
    throw new Error('useProductPageContext must be used within a ProductPageProvider');
  }
  return context;
};
