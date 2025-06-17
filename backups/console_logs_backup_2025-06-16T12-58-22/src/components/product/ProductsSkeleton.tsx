import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ProductsSkeletonProps {
  viewMode?: 'grid' | 'list';
  count?: number;
}

const ProductsSkeleton = ({ viewMode = 'list', count = 6 }: ProductsSkeletonProps) => {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="h-48 w-full" />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // List view skeleton
  return (
    <div className="space-y-4">
      {/* Table header skeleton for list view */}
      <div className="border rounded-lg overflow-hidden">
        <div className="border-b bg-muted/50 p-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 sm:col-span-3">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2 hidden sm:block">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2 hidden sm:block">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2 hidden lg:block">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2 hidden lg:block">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-8 sm:col-span-3 lg:col-span-1">
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
        
        {/* Table rows skeleton */}
        <div className="divide-y">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Product info - mobile: full width, desktop: 3 cols */}
                <div className="col-span-12 sm:col-span-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-12 w-12 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full max-w-[200px]" />
                      <Skeleton className="h-3 w-3/4 max-w-[150px]" />
                      <div className="flex gap-2 sm:hidden">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Category - hidden on mobile */}
                <div className="col-span-2 hidden sm:block">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                
                {/* Price - hidden on mobile */}
                <div className="col-span-2 hidden sm:block">
                  <Skeleton className="h-4 w-16" />
                </div>
                
                {/* Stock - hidden on tablet and below */}
                <div className="col-span-2 hidden lg:block">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                
                {/* Created date - hidden on tablet and below */}
                <div className="col-span-2 hidden lg:block">
                  <Skeleton className="h-3 w-20" />
                </div>
                
                {/* Actions */}
                <div className="col-span-12 sm:col-span-1">
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsSkeleton; 