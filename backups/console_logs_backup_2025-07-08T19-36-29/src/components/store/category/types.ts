export interface ExtendedCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl: string;
  icon?: string;
  color?: string;
}

export interface CategorySettings {
  selectionMethod?: 'automatic' | 'manual' | 'popular' | 'newest';
  selectedCategories?: string[];
  displayCount?: number;
  maxCategories?: number;
  showDescription?: boolean;
  showImages?: boolean;
  displayStyle?: string;
  backgroundStyle?: string;
  showViewAllButton?: boolean;
  _previewCategories?: string[] | ExtendedCategory[];
} 