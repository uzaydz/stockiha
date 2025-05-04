import { UserPermissions } from './admin';

// نوع بيانات المسؤول المستأجر
export type TenantRegistrationData = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  organizationName: string;
  subdomain: string;
}; 