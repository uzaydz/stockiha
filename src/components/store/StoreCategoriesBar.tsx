import { useRef } from 'react';
import { ChevronLeft, ChevronRight, MenuIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Category } from '@/lib/api/categories';

interface StoreCategoriesBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const StoreCategoriesBar = ({
  categories,
  selectedCategory,
  onCategoryChange,
}: StoreCategoriesBarProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 200;
      
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="relative my-6">
      <div
        ref={scrollRef}
        className="overflow-x-auto flex items-center gap-2 py-2 no-scrollbar"
      >
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          className="rounded-full whitespace-nowrap"
          onClick={() => onCategoryChange(null)}
        >
          جميع الفئات
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full whitespace-nowrap",
              selectedCategory === category.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.icon && (
              <span className="mr-1">{category.icon}</span>
            )}
            {category.name}
          </Button>
        ))}
        
        {selectedCategory && (
          <Link to="/products">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full whitespace-nowrap bg-secondary/10"
            >
              <MenuIcon className="h-3 w-3 ml-1" />
              عرض كل المنتجات
            </Button>
          </Link>
        )}
      </div>
      
      <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-8 w-8 bg-background shadow-md"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">تمرير لليسار</span>
        </Button>
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-8 w-8 bg-background shadow-md"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">تمرير لليمين</span>
        </Button>
      </div>
    </div>
  );
};

export default StoreCategoriesBar;
