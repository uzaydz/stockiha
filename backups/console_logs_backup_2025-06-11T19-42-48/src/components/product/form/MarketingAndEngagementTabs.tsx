import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Target, Clock, Award } from 'lucide-react';

import ProductReviewsTab from './marketing-and-engagement/ProductReviewsTab';
import ConversionTrackingTab from './marketing-and-engagement/ConversionTrackingTab';
import OfferTimerTab from './marketing-and-engagement/OfferTimerTab';
import LoyaltyPointsTab from './marketing-and-engagement/LoyaltyPointsTab';

interface MarketingAndEngagementTabsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const MarketingAndEngagementTabs: React.FC<MarketingAndEngagementTabsProps> = ({ form, organizationId, productId }) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="reviews" className="w-full">
        {/* Modern Sub-Tabs Design */}
        <div className="mb-6">
          <TabsList className="w-full bg-muted/30 p-1.5 rounded-lg grid grid-cols-2 md:grid-cols-4 h-auto gap-1">
            <TabsTrigger 
              value="reviews"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 transition-all"
            >
              <div className="bg-current/20 p-1 rounded-full">
                <Star className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">التقييمات</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tracking"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 transition-all"
            >
              <div className="bg-current/20 p-1 rounded-full">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">تتبع التحويلات</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="timer"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 transition-all"
            >
              <div className="bg-current/20 p-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">مؤقت العروض</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="loyalty"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/60 transition-all"
            >
              <div className="bg-current/20 p-1 rounded-full">
                <Award className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">نقاط الولاء</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reviews" className="mt-6">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <ProductReviewsTab form={form} organizationId={organizationId} productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tracking" className="mt-6">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <ConversionTrackingTab form={form} organizationId={organizationId} productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timer" className="mt-6">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <OfferTimerTab form={form} organizationId={organizationId} productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="loyalty" className="mt-6">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <LoyaltyPointsTab form={form} organizationId={organizationId} productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingAndEngagementTabs;
