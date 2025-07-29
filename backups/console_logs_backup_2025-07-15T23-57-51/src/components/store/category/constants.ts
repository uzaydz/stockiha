import { 
  Layers, 
  Laptop, 
  Smartphone, 
  Headphones, 
  Monitor, 
  ShoppingBag, 
  FolderRoot, 
  Folder 
} from 'lucide-react';

export const categoryIcons = {
  devices: Layers,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  monitors: Monitor,
  accessories: ShoppingBag,
  FolderRoot: FolderRoot,
  folder: Folder,
  layers: Layers,
} as const;

export const gradientColors = [
  'from-blue-500 to-indigo-600',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-red-500 to-red-600',
  'from-green-500 to-green-600',
] as const;
