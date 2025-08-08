import { z } from 'zod';

// Zod schemas for validation
export const specialOfferSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'اسم العرض مطلوب' }),
  description: z.string().optional(),
  quantity: z.number().int().positive({ message: 'الكمية يجب أن تكون عدد صحيح موجب' }),
  bonusQuantity: z.number().int().nonnegative().optional(),
  originalPrice: z.number().positive({ message: 'السعر الأصلي يجب أن يكون موجب' }),
  discountedPrice: z.number().positive({ message: 'السعر بعد الخصم يجب أن يكون موجب' }),
  discountPercentage: z.number().min(0).max(100),
  freeShipping: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  savings: z.number().nonnegative(),
  pricePerUnit: z.number().positive(),
  features: z.array(z.string()).default([]),
  badgeText: z.string().optional(),
  badgeColor: z.enum(['default', 'primary', 'secondary', 'success', 'warning', 'danger']).default('default')
});

export const specialOffersConfigSchema = z.object({
  enabled: z.boolean().default(false),
  offers: z.array(specialOfferSchema).default([]),
  displayStyle: z.enum(['cards', 'grid', 'list']).default('cards'),
  showSavings: z.boolean().default(true),
  showUnitPrice: z.boolean().default(true),
  currency: z.string().default('دج')
});

// TypeScript interfaces (derived from schemas)
export type SpecialOffer = z.infer<typeof specialOfferSchema>;
export type SpecialOffersConfig = z.infer<typeof specialOffersConfigSchema>;
