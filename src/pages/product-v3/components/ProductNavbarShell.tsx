import React, { Suspense, lazy } from 'react';
import NavbarFallback from './fallbacks/NavbarFallback';

const SmartNavbar = lazy(() => import('@/components/navbar/SmartNavbar').then(m => ({ default: m.SmartNavbar })));

interface Props {
  lowEnd?: boolean;
  hideCategories?: boolean;
}

const ProductNavbarShell: React.FC<Props> = React.memo(({ lowEnd = false, hideCategories = true }) => {
  return (
    <Suspense fallback={<NavbarFallback />}>
      <SmartNavbar
        className={`bg-background/95 border-b border-border/20 ${lowEnd ? 'backdrop-blur-sm' : 'backdrop-blur-md'}`}
        hideCategories={hideCategories}
      />
    </Suspense>
  );
});

ProductNavbarShell.displayName = 'ProductNavbarShell';

export default ProductNavbarShell;

