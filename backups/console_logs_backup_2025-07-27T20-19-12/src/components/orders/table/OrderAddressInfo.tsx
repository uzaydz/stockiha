import { memo } from "react";
import { MapPin, Home } from "lucide-react";
import { Order } from "./OrderTableTypes";
import { getProvinceName } from "@/utils/addressHelpers";
import { useMunicipalityResolver } from "./useMunicipalityResolver";

interface OrderAddressInfoProps {
  order: Order;
}

const OrderAddressInfo = memo(({ order }: OrderAddressInfoProps) => {
  const { getMunicipalityDisplayName: resolveMunicipalityName } = useMunicipalityResolver();

  // Helper functions with proper fallbacks
  const getProvinceDisplayName = (provinceCode: string | number) => {
    return typeof getProvinceName === 'function' ? getProvinceName(provinceCode) : provinceCode?.toString();
  };

  const getMunicipalityDisplayName = (municipalityCode: string | number, provinceCode?: string | number) => {
    // Priority order for municipality name resolution:
    // 1. stop_desk_commune_name from metadata (most reliable)
    // 2. Database resolution for yalidine municipality codes
    // 3. getMunicipalityName function result for local codes
    // 4. Raw municipality code as fallback
    
    if (order.metadata?.shipping_details?.stop_desk_commune_name) {
      return order.metadata.shipping_details.stop_desk_commune_name;
    }
    
    // Use the enhanced resolver that handles both local and database municipalities
    return resolveMunicipalityName(municipalityCode, provinceCode);
  };

  // Get address components in priority order
  const getAddressComponents = () => {
    const components = [];
    
    // Street address
    const streetAddress = order.shipping_address?.street_address || order.form_data?.address;
    if (streetAddress) {
      components.push({
        type: 'street',
        value: streetAddress,
        icon: <Home className="h-4 w-4 text-blue-500" />
      });
    }
    
    // Province
    const province = order.form_data?.province || order.shipping_address?.state;
    if (province) {
      components.push({
        type: 'province',
        value: getProvinceDisplayName(province),
        icon: <MapPin className="h-4 w-4 text-green-500" />
      });
    }
    
    // Municipality
    const municipality = order.form_data?.municipality || order.shipping_address?.municipality;
    if (municipality) {
      const municipalityName = getMunicipalityDisplayName(
        municipality, 
        order.form_data?.province || order.shipping_address?.state
      );
      components.push({
        type: 'municipality',
        value: municipalityName,
        icon: <MapPin className="h-4 w-4 text-orange-500" />
      });
    }
    
    return components;
  };

  const addressComponents = getAddressComponents();

  if (addressComponents.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">لا توجد معلومات عنوان</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        معلومات العنوان
      </h4>
      
      <div className="space-y-3">
        {addressComponents.map((component, index) => (
          <div key={`${component.type}-${index}`} className="flex items-start gap-3">
            {component.icon}
            <div>
              <p className="text-sm font-medium text-foreground">{component.value}</p>
              <p className="text-xs text-muted-foreground">
                {component.type === 'street' && 'عنوان الشارع'}
                {component.type === 'province' && 'الولاية'}
                {component.type === 'municipality' && 'البلدية'}
              </p>
            </div>
          </div>
        ))}
        
        {/* Postal code if available */}
        {order.shipping_address?.postal_code && (
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-purple-500 mt-1"></div>
            <div>
              <p className="text-sm font-medium text-foreground">{order.shipping_address.postal_code}</p>
              <p className="text-xs text-muted-foreground">الرمز البريدي</p>
            </div>
          </div>
        )}
        
        {/* Stop desk info for desk delivery */}
        {(order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk') && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">معلومات مكتب الاستلام</p>
            <p className="text-sm text-blue-900 dark:text-blue-300">
              مكتب رقم: {order.stop_desk_id || order.form_data?.stopDeskId || 'غير محدد'}
            </p>
            {order.metadata?.shipping_details?.stop_desk_commune_name && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                البلدية: {order.metadata.shipping_details.stop_desk_commune_name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

OrderAddressInfo.displayName = "OrderAddressInfo";

export default OrderAddressInfo; 