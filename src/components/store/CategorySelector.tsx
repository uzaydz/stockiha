import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  categories: {
    id: string;
    name: string;
    imageUrl?: string;
  }[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectorProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: "smooth",
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={handleScrollLeft}
          aria-label="تمرير لليسار"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="pb-4 pt-2 -mx-4 px-4">
        <div
          ref={scrollContainerRef}
          className="flex space-x-reverse space-x-2 pb-4"
        >
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors",
              selectedCategoryId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span className="text-sm font-medium">جميع المنتجات</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors text-right",
                selectedCategoryId === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {category.imageUrl && (
                <div className="w-8 h-8 rounded-full overflow-hidden mb-2">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="opacity-0" />
      </ScrollArea>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={handleScrollRight}
          aria-label="تمرير لليمين"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 