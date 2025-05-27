import React from 'react';
import PublicServiceTracking from '@/components/pages/PublicServiceTracking';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';

const PublicServiceTrackingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-16">
        <PublicServiceTracking />
      </main>
      <Footer />
    </div>
  );
};

export default PublicServiceTrackingPage;
