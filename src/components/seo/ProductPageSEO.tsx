import React from 'react';
import SEOHead from './SEOHead';

interface ProductPageSEOProps {
  productName: string;
  productDescription: string;
  productPrice?: number;
  productImage?: string;
  productCategory?: string;
  productUrl: string;
}

const ProductPageSEO: React.FC<ProductPageSEOProps> = ({
  productName,
  productDescription,
  productPrice,
  productImage,
  productCategory,
  productUrl
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productName,
    "description": productDescription,
    "url": productUrl,
    "image": productImage || "https://stockiha.com/images/default-product.webp",
    "category": productCategory || "منتجات",
    "brand": {
      "@type": "Brand",
      "name": "سطوكيها"
    },
    "offers": productPrice ? {
      "@type": "Offer",
      "price": productPrice,
      "priceCurrency": "DZD",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "سطوكيها"
      }
    } : undefined,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    }
  };

  return (
    <SEOHead
      title={`${productName} | سطوكيها`}
      description={productDescription}
      keywords={`${productName}، منتج، سطوكيها، ${productCategory || ''}، تسوق، شراء`}
      url={productUrl}
      image={productImage}
      type="product"
      structuredData={structuredData}
    />
  );
};

export default ProductPageSEO;
