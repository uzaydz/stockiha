import { gradientColors } from './constants';
import { optimizeStoreImage } from '@/lib/imageOptimization';
import type { ExtendedCategory } from './types';

export const getRandomGradient = (): string => {
  return gradientColors[Math.floor(Math.random() * gradientColors.length)];
};

export const optimizeImageUrl = (url: string): string => {
  return optimizeStoreImage(url, 'category');
};

export const getDefaultCategories = (t: any): ExtendedCategory[] => [
  {
    id: '1',
    name: t('productCategories.defaultCategories.electronics.name'),
    description: t('productCategories.defaultCategories.electronics.description'),
    slug: 'electronics',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1901'),
    icon: 'devices',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: '2',
    name: t('productCategories.defaultCategories.computers.name'),
    description: t('productCategories.defaultCategories.computers.description'),
    slug: 'computers',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471'),
    icon: 'laptops',
    color: 'from-sky-500 to-cyan-600'
  },
  {
    id: '3',
    name: t('productCategories.defaultCategories.smartphones.name'),
    description: t('productCategories.defaultCategories.smartphones.description'),
    slug: 'smartphones',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1580'),
    icon: 'phones',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: '4',
    name: t('productCategories.defaultCategories.headphones.name'),
    description: t('productCategories.defaultCategories.headphones.description'),
    slug: 'headphones',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470'),
    icon: 'headphones',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: '5',
    name: t('productCategories.defaultCategories.monitors.name'),
    description: t('productCategories.defaultCategories.monitors.description'),
    slug: 'monitors',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1527219525722-f9767a7f2884?q=80&w=1473'),
    icon: 'monitors',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: '6',
    name: t('productCategories.defaultCategories.accessories.name'),
    description: t('productCategories.defaultCategories.accessories.description'),
    slug: 'accessories',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399'),
    icon: 'accessories',
    color: 'from-rose-500 to-pink-600'
  }
];

export const mapRealCategoriesToExtended = (categories: any[], t: any): ExtendedCategory[] => {
  
  return categories
    .filter(cat => cat.is_active !== false)
    .map(category => {
      let iconKey = 'layers';
      if (category.icon && typeof category.icon === 'string') {
        iconKey = category.icon;
      }
      
      let finalImageUrl = '';
      if (category.imageUrl) {
        finalImageUrl = category.imageUrl;
      } else if (category.image_url) {
        const rawImageUrl = category.image_url;
        
        if (rawImageUrl.includes('?v=') || rawImageUrl.includes('&v=')) {
          finalImageUrl = rawImageUrl;
        } else {
          finalImageUrl = optimizeImageUrl(rawImageUrl);
        }
      }
      
      return {
        id: category.id,
        name: category.name,
        description: category.description || t('productCategories.fallbackDescription'),
        slug: category.slug,
        imageUrl: finalImageUrl, 
        icon: iconKey as any,
        color: getRandomGradient()
      };
    });
};
