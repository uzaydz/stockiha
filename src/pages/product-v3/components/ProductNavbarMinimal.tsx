import React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title?: string;
  logoUrl?: string | null;
  className?: string;
}

// Ultra-light navbar for the product page to reduce JS/CSS cost
const ProductNavbarMinimal: React.FC<Props> = ({ title, logoUrl, className }) => {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 border-b border-border/20',
        'flex items-center px-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title || 'logo'}
            width={28}
            height={28}
            className="rounded-md object-contain"
          />
        ) : (
          <div className="w-7 h-7 rounded-md bg-muted" />
        )}
        <span className="text-sm font-medium text-foreground/90">
          {title || 'المتجر'}
        </span>
      </div>
    </header>
  );
};

export default React.memo(ProductNavbarMinimal);

