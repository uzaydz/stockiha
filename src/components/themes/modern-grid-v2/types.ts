export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  images: string[];
  description: string;
  isNew?: boolean;
  colors: string[];
  sizes: string[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}