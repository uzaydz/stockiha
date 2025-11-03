import React from 'react';
import CallConfirmationDropdown from './CallConfirmationDropdown';
import { useOrdersData } from '@/context/OrdersDataContext';
import type { CallConfirmationStatus } from '@/context/OrdersDataContext';

// نوع خصائص المكون
type CallConfirmationDropdownSafeProps = {
  currentStatusId: number | null;
  orderId: string;
  onUpdateStatus: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  disabled?: boolean;
  showAddNew?: boolean;
  className?: string;
  userId?: string;
  statuses?: CallConfirmationStatus[]; // اختياري: يمكن تمريره بدلاً من استخدام context
};

/**
 * Wrapper آمن لـ CallConfirmationDropdown
 * يحاول استخدام OrdersDataContext، وإذا لم يكن متاحاً يستخدم statuses من props
 */
const CallConfirmationDropdownSafe: React.FC<CallConfirmationDropdownSafeProps> = (props) => {
  let contextStatuses: CallConfirmationStatus[] | undefined;
  
  // محاولة الحصول على context
  try {
    const { data } = useOrdersData();
    contextStatuses = data?.callConfirmationStatuses;
  } catch (e) {
    // Context غير متاح، سنستخدم props فقط
    contextStatuses = undefined;
  }
  
  // استخدام props إذا تم تمريرها، وإلا استخدام context
  const finalStatuses = props.statuses || contextStatuses || [];
  
  return <CallConfirmationDropdown {...props} statuses={finalStatuses} />;
};

export default CallConfirmationDropdownSafe;
