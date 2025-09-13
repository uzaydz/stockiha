import React from 'react';

interface Props {
  isLowEnd?: boolean;
}

const MainContentFallback: React.FC<Props> = React.memo(({ isLowEnd = false }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isLowEnd ? '' : 'animate-pulse'}`}>
        <div className="aspect-square bg-muted rounded-lg"></div>
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
});

MainContentFallback.displayName = 'MainContentFallback';

export default MainContentFallback;

