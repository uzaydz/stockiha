import { ChevronLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductBreadcrumbProps {
  productName: string;
  categoryName?: string;
  categorySlug?: string;
}

const ProductBreadcrumb = ({ 
  productName, 
  categoryName, 
  categorySlug 
}: ProductBreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center text-xs text-muted-foreground mb-6 overflow-hidden">
      <button 
        className="flex items-center hover:text-primary transition-colors"
        onClick={() => navigate('/')}
      >
        <Home className="h-3.5 w-3.5 ml-1" />
        <span>الرئيسية</span>
      </button>
      
      <ChevronLeft className="mx-1.5 h-3.5 w-3.5 text-border" />
      
      <button 
        className="hover:text-primary transition-colors"
        onClick={() => navigate('/products')}
      >
        المنتجات
      </button>
      
      {categoryName && categorySlug && (
        <>
          <ChevronLeft className="mx-1.5 h-3.5 w-3.5 text-border" />
          <button 
            className="hover:text-primary transition-colors"
            onClick={() => navigate(`/category/${categorySlug}`)}
          >
            {categoryName}
          </button>
        </>
      )}
      
      <ChevronLeft className="mx-1.5 h-3.5 w-3.5 text-border" />
      <span className="text-foreground font-medium truncate max-w-[200px]">{productName}</span>
    </nav>
  );
};

export default ProductBreadcrumb;
