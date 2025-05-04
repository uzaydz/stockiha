import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  ShoppingBag,
  ShoppingCart,
  Gift,
  Tag,
  Tags,
  Percent,
  Shirt,
  Smartphone,
  Laptop,
  Monitor,
  Headphones,
  Music,
  BookOpen,
  Coffee,
  UtensilsCrossed,
  Baby,
  Car,
  Gamepad2,
  PaintBucket,
  Camera,
  Leaf,
  Dumbbell,
  Heart,
  Pill,
  Home,
  Sofa,
  Lamp,
  Bed,
  Bath,
  FlaskConical,
  Lightbulb,
  Tv,
  Watch,
  Palette,
  FolderHeart,
  MapPin,
  ShoppingBasket,
  Store,
  Glasses,
  Sparkles,
  Crown,
  GraduationCap,
  LucideIcon,
  FolderRoot,
} from 'lucide-react';

// Define list of available icons
const icons: { name: string; icon: LucideIcon }[] = [
  { name: 'FolderRoot', icon: FolderRoot },
  { name: 'Package', icon: Package },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'ShoppingBasket', icon: ShoppingBasket },
  { name: 'Gift', icon: Gift },
  { name: 'Tag', icon: Tag },
  { name: 'Tags', icon: Tags },
  { name: 'Percent', icon: Percent },
  { name: 'Shirt', icon: Shirt },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Laptop', icon: Laptop },
  { name: 'Monitor', icon: Monitor },
  { name: 'Headphones', icon: Headphones },
  { name: 'Music', icon: Music },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Coffee', icon: Coffee },
  { name: 'UtensilsCrossed', icon: UtensilsCrossed },
  { name: 'Baby', icon: Baby },
  { name: 'Car', icon: Car },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'PaintBucket', icon: PaintBucket },
  { name: 'Camera', icon: Camera },
  { name: 'Leaf', icon: Leaf },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Heart', icon: Heart },
  { name: 'Pill', icon: Pill },
  { name: 'Home', icon: Home },
  { name: 'Sofa', icon: Sofa },
  { name: 'Lamp', icon: Lamp },
  { name: 'Bed', icon: Bed },
  { name: 'Bath', icon: Bath },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Tv', icon: Tv },
  { name: 'Watch', icon: Watch },
  { name: 'Palette', icon: Palette },
  { name: 'FolderHeart', icon: FolderHeart },
  { name: 'MapPin', icon: MapPin },
  { name: 'Store', icon: Store },
  { name: 'Glasses', icon: Glasses },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Crown', icon: Crown },
  { name: 'GraduationCap', icon: GraduationCap },
];

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const IconSelector = ({ value, onChange }: IconSelectorProps) => {
  const [open, setOpen] = useState(false);
  
  // Find the selected icon component
  const SelectedIcon = icons.find(icon => icon.name === value)?.icon || FolderRoot;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <SelectedIcon className="ml-2 h-4 w-4" />
            <span>{value || 'اختر أيقونة'}</span>
          </div>
          <span className="sr-only">اختر أيقونة</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-4 gap-2 p-4">
            {icons.map((icon) => {
              const Icon = icon.icon;
              return (
                <Button
                  key={icon.name}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-10 w-10 relative",
                    value === icon.name && "border-primary"
                  )}
                  onClick={() => {
                    onChange(icon.name);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {value === icon.name && (
                    <Check className="h-3 w-3 absolute top-1 right-1 text-primary" />
                  )}
                  <span className="sr-only">{icon.name}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default IconSelector; 