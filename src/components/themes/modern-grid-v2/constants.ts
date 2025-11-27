import { Category, Product } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: 'essential',
    name: 'The Essentials',
    image: 'https://picsum.photos/800/1000?random=101',
    description: 'Timeless staples for the modern wardrobe.'
  },
  {
    id: 'outerwear',
    name: 'Outerwear',
    image: 'https://picsum.photos/800/1000?random=102',
    description: 'Engineered for elements, designed for style.'
  },
  {
    id: 'accessories',
    name: 'Accessories',
    image: 'https://picsum.photos/800/1000?random=103',
    description: 'The finishing touches that define you.'
  },
  {
    id: 'footwear',
    name: 'Footwear',
    image: 'https://picsum.photos/800/1000?random=104',
    description: 'Grounding the silhouette with architectural soles.'
  },
  {
    id: 'tailoring',
    name: 'Tailoring',
    image: 'https://picsum.photos/800/1000?random=105',
    description: 'Soft construction meets sharp lines.'
  },
  {
    id: 'denim',
    name: 'Denim',
    image: 'https://picsum.photos/800/1000?random=106',
    description: 'Raw, untreated, and built to last.'
  },
  {
    id: 'knitwear',
    name: 'Knitwear',
    image: 'https://picsum.photos/800/1000?random=107',
    description: 'Tactile warmth for the colder months.'
  },
  {
    id: 'leather',
    name: 'Leather',
    image: 'https://picsum.photos/800/1000?random=108',
    description: 'Developing a unique patina with every wear.'
  },
  {
    id: 'active',
    name: 'Tech Wear',
    image: 'https://picsum.photos/800/1000?random=109',
    description: 'Performance fabrics for the urban athlete.'
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Obsidian Trench",
    price: 45000,
    category: "Outerwear",
    images: [
      "https://picsum.photos/600/800?random=1",
      "https://picsum.photos/600/800?random=11",
      "https://picsum.photos/600/800?random=12"
    ],
    description: "A waterproof oversized trench coat with a matte finish. Features hidden magnetic closures and a storm flap for maximum protection.",
    isNew: true,
    colors: ["Black", "Charcoal", "Midnight"],
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 2,
    name: "Silk Merino Knit",
    price: 22000,
    category: "The Essentials",
    images: [
      "https://picsum.photos/600/800?random=2",
      "https://picsum.photos/600/800?random=21",
      "https://picsum.photos/600/800?random=22"
    ],
    description: "Soft, breathable, and effortlessly chic. Crafted from a premium blend of silk and merino wool for year-round comfort.",
    colors: ["Cream", "Sage", "Stone"],
    sizes: ["XS", "S", "M", "L"]
  },
  {
    id: 3,
    name: "Structured Wide Leg",
    price: 28000,
    category: "The Essentials",
    images: [
      "https://picsum.photos/600/800?random=3",
      "https://picsum.photos/600/800?random=31"
    ],
    description: "Tailored trousers with a contemporary silhouette. High-waisted fit with deep pleats and a fluid drape.",
    colors: ["Navy", "Black", "Beige"],
    sizes: ["28", "30", "32", "34"]
  },
  {
    id: 4,
    name: "Nomad Leather Bag",
    price: 68000,
    category: "Accessories",
    images: [
      "https://picsum.photos/600/800?random=4",
      "https://picsum.photos/600/800?random=41",
      "https://picsum.photos/600/800?random=42"
    ],
    description: "Full grain leather handcrafted by artisans. Ages beautifully with time, developing a unique patina.",
    isNew: true,
    colors: ["Tan", "Dark Brown", "Black"],
    sizes: ["One Size"]
  },
  {
    id: 5,
    name: "Oxford Overshirt",
    price: 18500,
    category: "The Essentials",
    images: [
      "https://picsum.photos/600/800?random=5",
      "https://picsum.photos/600/800?random=51"
    ],
    description: "Crisp cotton oxford in a relaxed fit. Versatile enough to be worn as a shirt or a light jacket.",
    colors: ["White", "Light Blue", "Striped"],
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 6,
    name: "Monochrome Sneaker",
    price: 32000,
    category: "Accessories",
    images: [
      "https://picsum.photos/600/800?random=6",
      "https://picsum.photos/600/800?random=61",
      "https://picsum.photos/600/800?random=62"
    ],
    description: "Minimalist design meets maximum comfort. Premium leather upper with a lightweight rubber sole.",
    colors: ["White", "Off-White", "Black"],
    sizes: ["39", "40", "41", "42", "43", "44"]
  }
];