import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { productMarketingSettingsSchema } from '@/types/product';

// Infer the type from the Zod schema
type ProductMarketingSettingsType = z.infer<typeof productMarketingSettingsSchema>;

// Define a more comprehensive product type for this component's props
// This should ideally come from your main types definition (e.g., src/types/product.ts)
// and include data fetched from product_marketing_settings and product_reviews.
interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  user_name?: string | null; // Or a more complex user object
  created_at: string; // ISO date string
  is_verified_purchase?: boolean;
}

interface ProductWithAllDetails {
  id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  description?: string | null;
  isNew?: boolean;
  stock_quantity: number;
  slug?: string; // Assuming you have a slug for navigation or other purposes
  thumbnail_image?: string; // Useful for context, though not directly used in this component based on previous structure
  // marketingSettings should be the direct object from product_marketing_settings table
  product_marketing_settings?: Partial<ProductMarketingSettingsType> | null;
  // reviews should be an array of APPROVED reviews
  reviews?: Review[] | null;
  // Add any other product fields that might be relevant for ProductInfo
  // e.g. category, brand, etc. if they need to be displayed.
}

interface ProductInfoProps {
  product: ProductWithAllDetails;
  currentPrice?: number; // To reflect price changes from variants/colors if applicable
}

const ProductInfo = ({ product, currentPrice }: ProductInfoProps) => {
  // Log received product prop safely

  const {
    name,
    price,
    discountPrice,
    description,
    isNew = false,
    stock_quantity,
    product_marketing_settings: marketingSettings,
    reviews,
  } = product;

  const actualDiscountPrice = discountPrice ?? undefined; // Convert null to undefined for consistency
  const discountPercentage = actualDiscountPrice
    ? Math.round(((price - actualDiscountPrice) / price) * 100)
    : 0;

  const displayPrice = currentPrice !== undefined ? currentPrice : (actualDiscountPrice || price);
  const hasDiscount = actualDiscountPrice && actualDiscountPrice < price && currentPrice === undefined; // Show main discount only if not overridden by variant price

  // Rating and review count logic
  let finalRating = 0;
  let finalRatingCount = 0;
  const useFakeRatings = marketingSettings?.enable_fake_star_ratings ?? false;
  const reviewsEnabled = marketingSettings?.enable_reviews ?? false;

  if (useFakeRatings) {
    finalRating = marketingSettings?.fake_star_rating_value ?? 0;
    finalRatingCount = marketingSettings?.fake_star_rating_count ?? 0;
  } else if (reviews && reviews.length > 0) {
    finalRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    finalRatingCount = reviews.length;
  }
  // If !useFakeRatings and no real reviews, finalRating and finalRatingCount remain 0.

  // Log derived values safely

  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{name}</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          {isNew && (
            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-full px-3 py-1">
              جديد
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-full px-3 py-1">
              خصم {discountPercentage}%
            </Badge>
          )}
          <Badge className={`${stock_quantity > 0 ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'} rounded-full px-3 py-1`}>
            {stock_quantity > 0 ? 'متوفر' : 'غير متوفر'}
          </Badge>
        </div>
      </div>

      {/* Rating Section: Display if reviews are generally enabled OR fake ratings are on */}
      {(reviewsEnabled || useFakeRatings) && (
        <div className="mt-4">
          <div className="flex items-center">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(finalRating) // Use Math.round for fuller stars based on average
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="mr-2 text-sm text-muted-foreground">
              {finalRating.toFixed(1)} ({finalRatingCount} تقييم)
            </span>
          </div>

          {/* Fake Purchase Counter */}
          {marketingSettings?.enable_fake_purchase_counter && marketingSettings.fake_purchase_count != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              لقد اشترى {marketingSettings.fake_purchase_count} شخص هذا المنتج من الجزائر.
            </p>
          )}
        </div>
      )}

      {/* Price Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border shadow-sm p-5"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-foreground">
            {displayPrice.toLocaleString()} د.ج
          </span>
          {hasDiscount && (
            <span className="text-base text-muted-foreground line-through">
              {price.toLocaleString()} د.ج
            </span>
          )}
        </div>
        <div className="text-sm flex items-center mt-3">
          {stock_quantity > 0 ? (
            <div className="flex items-center text-green-600">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2"></span>
              متوفر في المخزون
              <span className="font-medium mx-1">({stock_quantity})</span>
              قطعة
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full ml-2"></span>
              غير متوفر حالياً
            </div>
          )}
        </div>
      </motion.div>

      {/* Product Description */}
      {description && (
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed pt-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">وصف المنتج</h2>
          {description}
        </div>
      )}

      {/* Real Reviews List Section */}
      {reviewsEnabled && reviews && reviews.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            تقييمات العملاء ({reviews.length})
          </h3>
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  {marketingSettings?.reviews_verify_purchase && review.is_verified_purchase && (
                    <Badge variant="outline" className="mr-2 text-xs border-green-500 text-green-600 py-0.5 px-1.5">
                      شراء موثوق
                    </Badge>
                  )}
                </div>
                {/* Optional: Display reviewer's name if available and desired */} 
                {/* {review.user_name && <p className="font-semibold text-sm text-foreground mb-0.5">{review.user_name}</p>} */} 
                <p className="text-xs text-muted-foreground mb-1">
                  {new Date(review.created_at).toLocaleDateString('ar-DZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {review.comment && <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
