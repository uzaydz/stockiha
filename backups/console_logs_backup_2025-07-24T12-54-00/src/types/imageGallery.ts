export interface ImageInfo {
  url: string;
  type: 'main' | 'color' | 'additional';
  colorInfo?: {
    name: string;
    colorCode: string;
    isDefault: boolean;
    isSelected: boolean;
  };
}

export interface ImageControlsProps {
  totalImages: number;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onGoToImage: (index: number) => void;
  isMobile: boolean;
  className?: string;
}

export interface MainImageDisplayProps {
  currentImage: string;
  imageInfo?: ImageInfo;
  productName: string;
  currentIndex: number;
  onImageLoad: () => void;
  onImageError: (url: string) => void;
  hasError: boolean;
  isLoaded: boolean;
  isMobile: boolean;
  className?: string;
}

export interface ThumbnailGridProps {
  images: ImageInfo[];
  activeImage: string;
  onImageSelect: (url: string) => void;
  onImageError: (url: string) => void;
  imageLoadError: Set<string>;
  isMobile: boolean;
  isCompact?: boolean;
  className?: string;
} 