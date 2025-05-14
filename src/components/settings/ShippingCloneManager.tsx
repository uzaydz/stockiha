import { ShippingCloneManagerView } from './shipping';

interface ShippingCloneManagerProps {
  organizationId: string;
}

export default function ShippingCloneManager({ organizationId }: ShippingCloneManagerProps) {
  return <ShippingCloneManagerView organizationId={organizationId} />;
} 