import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

interface ProductFormLoadingStateProps {
  message: string;
}

const ProductFormLoadingState: React.FC<ProductFormLoadingStateProps> = memo(({
  message,
}) => {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{message}</h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});

ProductFormLoadingState.displayName = 'ProductFormLoadingState';

export default ProductFormLoadingState;
