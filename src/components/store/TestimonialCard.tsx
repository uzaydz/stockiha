import React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Star, StarHalf, ExternalLink } from "lucide-react";
import { formatDistance } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// تعريف واجهة شهادة العميل
export interface Testimonial {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  verified?: boolean;
  purchaseDate?: string;
  productName?: string;
  productImage?: string;
  productSlug?: string;
}

// وظيفة للحصول على الأحرف الأولى من الاسم
const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
};

// تحويل التقييمات إلى نجوم
const renderStars = (rating: number) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`star-${i}`} className="fill-yellow-400 text-yellow-400 w-4 h-4" />);
  }

  if (hasHalfStar) {
    stars.push(<StarHalf key="half-star" className="fill-yellow-400 text-yellow-400 w-4 h-4" />);
  }

  const emptyStars = 5 - stars.length;
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star
        key={`empty-star-${i}`}
        className="text-gray-300 dark:text-gray-600 w-4 h-4"
      />
    );
  }

  return stars;
};

// تنسيق التاريخ بصيغة عربية مناسبة
const formatDate = (dateString?: string) => {
  if (!dateString) return "تاريخ غير معروف";
  
  try {
    const date = new Date(dateString);
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: ar,
    });
  } catch (error) {
    return "تاريخ غير معروف";
  }
};

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const {
    customerName,
    customerAvatar,
    rating,
    comment,
    verified,
    productName,
    productImage,
    purchaseDate,
    productSlug,
  } = testimonial;

  // تنسيق محتوى المنتج حسب توفر سلاغ للرابط
  const ProductContent = () => (
    <div className="flex items-center">
      {productImage && (
        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 ms-3">
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-grow">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
          المنتج المشترى
        </p>
        <h4 className={cn(
          "font-medium text-right flex items-center gap-1",
          productSlug && "text-primary hover:underline"
        )}>
          {productName}
          {productSlug && (
            <ExternalLink className="h-3.5 w-3.5 inline-flex mb-0.5" />
          )}
        </h4>
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className="relative">
              {customerAvatar ? (
                <img
                  src={customerAvatar}
                  alt={customerName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {getInitials(customerName)}
                </div>
              )}
              {verified && (
                <span className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 text-xs">
                  ✓
                </span>
              )}
            </div>
            <div className="me-3 text-right">
              <h3 className="font-medium">{customerName}</h3>
              {purchaseDate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(purchaseDate)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center">{renderStars(rating)}</div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4 text-right">
          {comment}
        </p>

        {productName && (
          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
            {productSlug ? (
              <Link 
                to={`/products/${productSlug}`}
                className={cn(
                  "block transition-colors rounded-md -mx-2 px-2 py-1",
                  "hover:bg-muted/40 active:bg-muted"
                )}
                title={`عرض تفاصيل المنتج: ${productName}`}
              >
                <ProductContent />
              </Link>
            ) : (
              <ProductContent />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 