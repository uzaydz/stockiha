import React from 'react';
import FeaturesHeader from '@/components/landing/features/FeaturesHeader';
import CoreFeatures from '@/components/landing/features/CoreFeatures';
import AdditionalFeatures from '@/components/landing/features/AdditionalFeatures';
import FeaturesCTA from '@/components/landing/features/FeaturesCTA';

const FeaturesSection = () => {
  return (
    <section
      dir="rtl"
      className="py-20 landing-bg-secondary landing-section-transition overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <FeaturesHeader />
        <CoreFeatures />
        <AdditionalFeatures />
        <FeaturesCTA />
      </div>
    </section>
  );
};

export default FeaturesSection;