import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import PublicRepairTracking from '@/components/repair/PublicRepairTracking';

const RepairTrackingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-16">
        <PublicRepairTracking />
      </main>
      <Footer />
    </div>
  );
};

export default RepairTrackingPage; 