import RegistrationLayout from '@/components/tenant-registration/RegistrationLayout';
import TenantRegistrationForm from '@/components/tenant-registration/TenantRegistrationForm';
import RegistrationSidebar from '@/components/tenant-registration/RegistrationSidebar';
import { Helmet } from 'react-helmet-async';

const TenantSignup = () => {
  return (
    <>
      <Helmet>
        <title>تسجيل مؤسسة جديدة - بازار</title>
        <meta name="description" content="قم بتسجيل مؤسستك للحصول على متجر إلكتروني وإدارة متكاملة لمتجرك" />
      </Helmet>
      
      <RegistrationLayout
        sidebar={<RegistrationSidebar />}
      >
        <TenantRegistrationForm />
      </RegistrationLayout>
    </>
  );
};

export default TenantSignup;
