import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const POSAdvancedLoadingSkeleton: React.FC = () => (
  <div className="min-h-screen">
    <div className="p-4 space-y-4">
      {/* هيكل الترويسة */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* هيكل الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
      
      {/* هيكل المحتوى الرئيسي */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
        <div className="col-span-4">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const POSAdvancedInitialLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <h3 className="text-lg font-semibold mb-2">جاري تحميل نقطة البيع</h3>
      <p className="text-sm text-muted-foreground">يرجى الانتظار...</p>
    </div>
  </div>
);
