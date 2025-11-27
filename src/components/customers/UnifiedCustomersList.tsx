import React, { Suspense } from 'react';
import { Customer } from '@/types/customer';

const CustomersList = React.lazy(() => import('@/components/customers/CustomersList'));
const CustomersTableMobile = React.lazy(() => import('@/components/customers/CustomersTableMobile'));
const VirtualizedCustomersList = React.lazy(() => import('@/components/customers/VirtualizedCustomersList'));

interface UnifiedCustomersListProps {
  customers: Customer[];
  isLoading: boolean;
  hasEditPermission?: boolean;
  hasDeletePermission?: boolean;
  containerHeight?: number;
}

export default function UnifiedCustomersList({
  customers,
  isLoading,
  hasEditPermission = false,
  hasDeletePermission = false,
  containerHeight = 600,
}: UnifiedCustomersListProps) {
  const useVirtualized = customers.length > 50;

  if (useVirtualized) {
    return (
      <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded" /> }>
        <VirtualizedCustomersList
          customers={customers}
          isLoading={isLoading}
          hasEditPermission={hasEditPermission}
          hasDeletePermission={hasDeletePermission}
          containerHeight={containerHeight}
        />
      </Suspense>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded" /> }>
          <CustomersTableMobile
            customers={customers}
            isLoading={isLoading}
            hasEditPermission={hasEditPermission}
            hasDeletePermission={hasDeletePermission}
          />
        </Suspense>
      </div>
      <div className="hidden md:block">
        <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded" /> }>
          <CustomersList
            customers={customers}
            isLoading={isLoading}
            hasEditPermission={hasEditPermission}
            hasDeletePermission={hasDeletePermission}
          />
        </Suspense>
      </div>
    </>
  );
}
