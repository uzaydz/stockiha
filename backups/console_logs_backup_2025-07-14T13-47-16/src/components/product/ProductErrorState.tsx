import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProductErrorStateProps {
  error?: string;
}

const ProductErrorState: React.FC<ProductErrorStateProps> = ({ error }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">😔</span>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'المنتج غير موجود'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            عذراً، لم نتمكن من العثور على هذا المنتج أو حدث خطأ في تحميله
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/products')}
              className="w-full"
            >
              تصفح المنتجات
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              العودة للرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductErrorState; 