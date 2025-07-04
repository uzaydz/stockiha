import { StoreComponent } from '@/types/store-editor';
import ComponentPreview from '@/components/store-editor/ComponentPreview';
import { useTenant } from '@/context/TenantContext';

interface ComponentPreviewWrapperProps {
  component: StoreComponent;
}

/**
 * مكون مغلف لـ ComponentPreview لحل مشكلة توافق الأنواع مع التحميل الكسول
 * يضمن أيضًا تمرير معرف المؤسسة إلى المكون
 */
const ComponentPreviewWrapper = ({ component }: ComponentPreviewWrapperProps) => {
  // الحصول على سياق المؤسسة الحالية
  const { currentOrganization } = useTenant();
  
  return <ComponentPreview component={component} />;
};

export default ComponentPreviewWrapper;
