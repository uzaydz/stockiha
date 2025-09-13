import React from 'react';

interface LazyIconProps {
  name: string;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
  [key: string]: any;
}

// Import all common icons statically for better performance
import {
  Loader2,
  Search,
  Filter,
  Settings,
  Check,
  X,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Download,
  Upload,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Copy,
  Clipboard,
  Home,
  User,
  Users,
  Folder,
  File,
  Image,
  Calendar,
  Clock,
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, React.ComponentType<any>> = {
  'loader-2': Loader2,
  'search': Search,
  'filter': Filter,
  'settings': Settings,
  'check': Check,
  'x': X,
  'plus': Plus,
  'minus': Minus,
  'edit': Edit,
  'trash-2': Trash2,
  'save': Save,
  'download': Download,
  'upload': Upload,
  'refresh': RefreshCw,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'eye': Eye,
  'eye-off': EyeOff,
  'copy': Copy,
  'paste': Clipboard,
  'home': Home,
  'user': User,
  'users': Users,
  'folder': Folder,
  'file': File,
  'image': Image,
  'calendar': Calendar,
  'clock': Clock,
  'bell': Bell,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  'info': Info,
  'alert-triangle': AlertTriangle,
  // Add more common icons here
};

/**
 * Lazy-loaded icon component that uses static imports for common icons
 * This reduces bundle size by only including used icons
 */
export const LazyIcon: React.FC<LazyIconProps> = ({
  name,
  className = "",
  size = 16,
  fallback = null,
  ...props
}) => {
  const IconComponent = iconMap[name];

  // If icon is not in our map, show fallback
  if (!IconComponent) {
    return fallback || (
      <div
        className={`bg-gray-100 rounded flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={`Icon ${name} not found`}
        {...props}
      >
        ?
      </div>
    );
  }

  return (
    <IconComponent
      className={className}
      size={size}
      {...props}
    />
  );
};

/**
 * Hook for getting an icon component by name
 */
export const useLazyIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName];
  return { IconComponent, isLoading: false };
};

export default LazyIcon;
