import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonLoaderProps {
  type: 'banner' | 'products' | 'categories' | 'about' | 'testimonials';
}

const SkeletonLoader = ({ type }: SkeletonLoaderProps) => {
  switch (type) {
    case 'banner':
      return (
        <div className="w-full">
          <Skeleton className="w-full h-[400px] md:h-[500px] rounded-xl" />
        </div>
      );
    
    case 'products':
      return (
        <div className="w-full py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <Skeleton className="w-48 h-8 mb-3" />
              <Skeleton className="w-96 h-5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className="space-y-4">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="w-3/4 h-5" />
                  <Skeleton className="w-1/2 h-5" />
                  <Skeleton className="w-1/3 h-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    
    case 'categories':
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="w-48 h-8 mb-3" />
            <Skeleton className="w-96 h-5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array(6).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-3">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-24 h-5" />
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'testimonials':
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <Skeleton className="w-48 h-8 mx-auto mb-3" />
            <Skeleton className="w-96 h-5 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="p-6 rounded-xl border space-y-4">
                <Skeleton className="w-full h-24" />
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'about':
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="md:w-1/2 space-y-4">
              <Skeleton className="w-48 h-8 mb-3" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-2/3 h-4" />
            </div>
            <div className="md:w-1/2">
              <Skeleton className="w-full aspect-[4/3] rounded-xl" />
            </div>
          </div>
        </div>
      );
    
    default:
      return null;
  }
};

export default SkeletonLoader; 