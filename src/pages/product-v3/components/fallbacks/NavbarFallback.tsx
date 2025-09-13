import React from 'react';

const NavbarFallback: React.FC = React.memo(() => (
  <div className="h-16 bg-background/95 backdrop-blur-sm border-b border-border/20">
    <div className="h-full flex items-center justify-between px-4">
      <div className="w-32 h-8 bg-muted rounded animate-pulse"></div>
      <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
    </div>
  </div>
));

NavbarFallback.displayName = 'NavbarFallback';

export default NavbarFallback;

