import { useState } from 'react';
import type { Product } from '@/lib/api/products';
import BulkBarcodePrinter from './barcode/BulkBarcodePrinter';

interface BulkBarcodePrintProps {
  products: Product[];
  isButtonVisible?: boolean;
  defaultSelectedProducts?: string[];
}

const BulkBarcodePrint = ({ 
  products, 
  isButtonVisible = true,
  defaultSelectedProducts = []
}: BulkBarcodePrintProps) => {
  return (
    <BulkBarcodePrinter 
      products={products}
      isButtonVisible={isButtonVisible}
      defaultSelectedProducts={defaultSelectedProducts}
      title="طباعة الباركود للمنتجات"
      buttonText="طباعة الباركود"
    />
  );
};

export default BulkBarcodePrint; 