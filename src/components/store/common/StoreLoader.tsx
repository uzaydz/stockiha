import React from 'react';
import SkeletonLoader from '../SkeletonLoader';

interface StoreLoaderProps {
  dataLoading: boolean;
  storeData: any;
}

export const StoreLoader = React.memo(({ dataLoading, storeData }: StoreLoaderProps) => {
  if (!dataLoading || (storeData && Object.keys(storeData).length > 0)) {
    return null;
  }

  return <SkeletonLoader type="banner" />;
});

StoreLoader.displayName = 'StoreLoader';
