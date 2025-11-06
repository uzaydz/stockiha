/**
 * Customers Types
 * أنواع البيانات الخاصة بالعملاء
 */

import { User } from '@/types';

export interface CustomersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

export interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
}

export interface CustomersContextType {
  state: CustomersState;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => User;
  updateUser: (user: User) => User;
  deleteUser: (userId: string) => void;
  createCustomer: (customerData: CustomerData) => Promise<User>;
  refreshUsers: () => Promise<void>;
}
