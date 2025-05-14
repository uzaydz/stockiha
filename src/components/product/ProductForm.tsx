// ... existing code ...

import ProductShippingSelector from './ProductShippingSelector';

// ... existing code ...

// في داخل مكون ProductForm، أضف الحالة التالية
const [shippingCloneId, setShippingCloneId] = useState<number | null>(productData?.shipping_clone_id || null);

// ... existing code ...

// في نهاية القسم الخاص بعرض الأقسام المختلفة للنموذج، بعد خيارات المنتج وقبل قسم الحفظ
{mode === 'edit' && productData && (
  <div className="mt-6">
    <ProductShippingSelector
      productId={productData.id}
      organizationId={organization?.id || ''}
      initialCloneId={shippingCloneId}
      onChange={setShippingCloneId}
    />
  </div>
)}

// ... existing code ...