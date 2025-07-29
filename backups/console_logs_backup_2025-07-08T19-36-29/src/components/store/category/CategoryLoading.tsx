import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CategoryLoading = memo(() => {
  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto mb-2" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 overflow-hidden bg-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6 mb-3" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

CategoryLoading.displayName = 'CategoryLoading';

export { CategoryLoading }; 