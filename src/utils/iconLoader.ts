/**
 * Dynamic icon loader utility to reduce initial bundle size
 * This helps split the large lucide-react library into smaller chunks
 */

import React, { lazy, ComponentType } from 'react';
import { LucideProps } from 'lucide-react';

// Cache for loaded icons to avoid re-importing
const iconCache = new Map<string, ComponentType<LucideProps>>();

// Common icons that should be loaded immediately
const CRITICAL_ICONS = [
  'Loader2',
  'Check',
  'X',
  'ChevronDown',
  'ChevronUp',
  'ChevronLeft',
  'ChevronRight',
  'Menu',
  'Search',
  'User',
  'Settings',
  'Home'
];

// Preload critical icons
const preloadCriticalIcons = async () => {
  try {
    const iconPromises = CRITICAL_ICONS.map(async (iconName) => {
      if (!iconCache.has(iconName)) {
        const iconModule = await import(`lucide-react`);
        const IconComponent = iconModule[iconName as keyof typeof iconModule] as ComponentType<LucideProps>;
        if (IconComponent) {
          iconCache.set(iconName, IconComponent);
        }
      }
    });
    await Promise.all(iconPromises);
  } catch (error) {
    console.warn('Failed to preload critical icons:', error);
  }
};

// Dynamic icon loader with caching
export const loadIcon = async (iconName: string): Promise<ComponentType<LucideProps> | null> => {
  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }

  try {
    // Dynamic import of the specific icon
    const iconModule = await import(`lucide-react`);
    const IconComponent = iconModule[iconName as keyof typeof iconModule] as ComponentType<LucideProps>;
    
    if (IconComponent) {
      iconCache.set(iconName, IconComponent);
      return IconComponent;
    }
    
    console.warn(`Icon "${iconName}" not found in lucide-react`);
    return null;
  } catch (error) {
    console.error(`Failed to load icon "${iconName}":`, error);
    return null;
  }
};

// Lazy icon component wrapper
export const createLazyIcon = (iconName: string) => {
  return lazy(async () => {
    const IconComponent = await loadIcon(iconName);
    return {
      default: IconComponent || (() => null)
    };
  });
};

// Hook for using dynamic icons
export const useDynamicIcon = (iconName: string) => {
  const [IconComponent, setIconComponent] = React.useState<ComponentType<LucideProps> | null>(
    iconCache.get(iconName) || null
  );
  const [loading, setLoading] = React.useState(!iconCache.has(iconName));

  React.useEffect(() => {
    if (!iconCache.has(iconName)) {
      setLoading(true);
      loadIcon(iconName).then((icon) => {
        setIconComponent(icon);
        setLoading(false);
      });
    }
  }, [iconName]);

  return { icon: IconComponent, loading };
};

// Icon component with fallback
export const DynamicIcon: React.FC<{
  name: string;
  fallback?: ComponentType<LucideProps>;
  className?: string;
  size?: number;
} & LucideProps> = ({ name, fallback, className, size, ...props }) => {
  const { icon: IconComponent, loading } = useDynamicIcon(name);

  if (loading) {
    return React.createElement('div', {
      className: `animate-pulse bg-gray-200 rounded ${className}`,
      style: { width: size || 24, height: size || 24 }
    });
  }

  if (!IconComponent && fallback) {
    const FallbackIcon = fallback;
    return React.createElement(FallbackIcon, { className, size, ...props });
  }

  if (!IconComponent) {
    return React.createElement('div', {
      className: `bg-gray-300 rounded ${className}`,
      style: { width: size || 24, height: size || 24 }
    });
  }

  return React.createElement(IconComponent, { className, size, ...props });
};

// Initialize critical icons on module load
if (typeof window !== 'undefined') {
  // Preload critical icons after a short delay to not block initial render
  setTimeout(preloadCriticalIcons, 100);
}

export default {
  loadIcon,
  createLazyIcon,
  useDynamicIcon,
  DynamicIcon,
  preloadCriticalIcons
};