import React, { createContext, useContext, useMemo } from 'react';
import { Product, Category } from '../types';
import { PRODUCTS as MOCK_PRODUCTS, CATEGORIES as MOCK_CATEGORIES } from '../constants';

interface StoreDataContextType {
    products: Product[];
    categories: Category[];
    storeName: string;
    logoUrl: string;
    currency: string;
}

const StoreDataContext = createContext<StoreDataContextType | null>(null);

export const useStoreData = () => {
    const context = useContext(StoreDataContext);
    if (!context) {
        throw new Error('useStoreData must be used within a StoreDataProvider');
    }
    return context;
};

interface StoreDataProviderProps {
    children: React.ReactNode;
    storeData?: any;
}

export const StoreDataProvider: React.FC<StoreDataProviderProps> = ({ children, storeData }) => {
    const value = useMemo(() => {
        if (!storeData) {
            return {
                products: MOCK_PRODUCTS,
                categories: MOCK_CATEGORIES,
                storeName: 'Aura',
                logoUrl: '',
                currency: 'DZD'
            };
        }

        const { featuredProducts, categories, storeName, logoUrl, organizationSettings } = storeData;

        // Map real products to theme format
        const mappedProducts: Product[] = (featuredProducts || []).map((p: any) => {
            // Extract color names from product_colors array
            let colorNames: string[] = [];
            if (Array.isArray(p.product_colors)) {
                colorNames = p.product_colors.map((c: any) => 
                    typeof c === 'string' ? c : (c.color_name || c.name || '')
                ).filter(Boolean);
            } else if (Array.isArray(p.colors)) {
                colorNames = p.colors.map((c: any) => 
                    typeof c === 'string' ? c : (c.color_name || c.name || '')
                ).filter(Boolean);
            }

            // Extract size names from product_sizes array
            let sizeNames: string[] = [];
            if (Array.isArray(p.product_sizes)) {
                sizeNames = p.product_sizes.map((s: any) => 
                    typeof s === 'string' ? s : (s.size_name || s.name || '')
                ).filter(Boolean);
            } else if (Array.isArray(p.sizes)) {
                sizeNames = p.sizes.map((s: any) => 
                    typeof s === 'string' ? s : (s.size_name || s.name || '')
                ).filter(Boolean);
            }

            // Handle images - support both single imageUrl and multiple images array
            let productImages: string[] = [];
            if (Array.isArray(p.images) && p.images.length > 0) {
                productImages = p.images;
            } else if (p.imageUrl) {
                productImages = [p.imageUrl];
            } else if (p.thumbnail_image) {
                productImages = [p.thumbnail_image];
            }

            return {
                id: p.id,
                name: p.name,
                price: p.price || 0,
                category: p.category || 'Uncategorized',
                images: productImages.length > 0 ? productImages : ['https://via.placeholder.com/600x800'],
                description: p.description || '',
                isNew: p.is_new,
                colors: colorNames.length > 0 ? colorNames : ['Black', 'White'], // Fallback colors
                sizes: sizeNames.length > 0 ? sizeNames : ['S', 'M', 'L']        // Fallback sizes
            };
        });

        // Map real categories to theme format
        const mappedCategories: Category[] = (categories || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            image: c.image_url || 'https://picsum.photos/800/1000', // Fallback image
            description: c.description || ''
        }));

        return {
            products: mappedProducts.length > 0 ? mappedProducts : MOCK_PRODUCTS,
            categories: mappedCategories.length > 0 ? mappedCategories : MOCK_CATEGORIES,
            storeName: storeName || 'Store',
            logoUrl: logoUrl || '',
            currency: organizationSettings?.currency || 'DZD'
        };
    }, [storeData]);

    return (
        <StoreDataContext.Provider value={value}>
            {children}
        </StoreDataContext.Provider>
    );
};
