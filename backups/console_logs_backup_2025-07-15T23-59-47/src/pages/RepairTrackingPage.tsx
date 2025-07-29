import React from 'react';
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import PublicRepairTracking from '@/components/repair/PublicRepairTracking';

const RepairTrackingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-16">
        <PublicRepairTracking />
      </main>
      <CustomizableStoreFooter 
        storeName="مركز الصيانة"
        description="مركز متخصص في صيانة وإصلاح الأجهزة الإلكترونية والتقنية بأعلى جودة وأسرع وقت ممكن."
        showFeatures={true}
        features={[
          {
            id: '1',
            icon: 'ShieldCheck',
            title: 'ضمان الجودة',
            description: 'ضمان شامل على جميع أعمال الصيانة'
          },
          {
            id: '2',
            icon: 'Clock',
            title: 'سرعة الإنجاز',
            description: 'إنجاز سريع وفعال لجميع الخدمات'
          },
          {
            id: '3',
            icon: 'Phone',
            title: 'دعم مستمر',
            description: 'متابعة مستمرة لحالة الجهاز'
          },
          {
            id: '4',
            icon: 'Heart',
            title: 'خدمة متميزة',
            description: 'رضا العملاء هو أولويتنا الأولى'
          }
        ]}
        footerSections={[
          {
            id: 'services',
            title: 'خدماتنا',
            links: [
              { id: '1', text: 'صيانة الهواتف', url: '/repair-services' },
              { id: '2', text: 'صيانة الحاسوب', url: '/repair-services' },
              { id: '3', text: 'صيانة الأجهزة اللوحية', url: '/repair-services' },
              { id: '4', text: 'تتبع الإصلاح', url: '/repair-tracking' }
            ]
          },
          {
            id: 'support',
            title: 'الدعم',
            links: [
              { id: '1', text: 'اتصل بنا', url: '/contact' },
              { id: '2', text: 'الأسئلة الشائعة', url: '/faq' },
              { id: '3', text: 'سياسة الضمان', url: '/warranty' },
              { id: '4', text: 'المساعدة', url: '/help' }
            ]
          }
        ]}
        contactInfo={{
          phone: '+213 555 123 456',
          email: 'info@repair-center.com',
          address: 'شارع الاستقلال، الجزائر العاصمة'
        }}
        showNewsletter={false}
        showPaymentMethods={false}
        copyrightText={`© ${new Date().getFullYear()} مركز الصيانة. جميع الحقوق محفوظة.`}
      />
    </div>
  );
};

export default RepairTrackingPage;
