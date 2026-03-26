import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  category: string;
  finishType: string;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge?: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Verde Antiqua Patina Solution",
    price: 2499,
    originalPrice: 2999,
    description: "Professional-grade copper patina solution that creates authentic verdigris green finishes on copper, brass, and bronze surfaces. Ideal for architectural elements and artistic installations.",
    shortDescription: "Premium green patina for copper & brass",
    category: "Patina Chemicals",
    finishType: "Green Patina",
    image: product1,
    rating: 4.8,
    reviews: 124,
    inStock: true,
    badge: "Best Seller",
  },
  {
    id: "2",
    name: "Copper Glow Aging Solution",
    price: 1899,
    description: "Advanced aging solution that accelerates natural copper patina formation. Creates beautiful warm brown to deep chocolate finishes with professional results.",
    shortDescription: "Accelerated copper aging formula",
    category: "Patina Chemicals",
    finishType: "Brown Patina",
    image: product2,
    rating: 4.6,
    reviews: 89,
    inStock: true,
  },
  {
    id: "3",
    name: "Professional Finishing Kit",
    price: 5499,
    originalPrice: 6499,
    description: "Complete metal finishing kit including patina solutions, brushes, protective coatings, and application tools. Everything needed for professional patina work.",
    shortDescription: "Complete kit for professional results",
    category: "Metal Finishing Kits",
    finishType: "Multi-Finish",
    image: product3,
    rating: 4.9,
    reviews: 67,
    inStock: true,
    badge: "Premium",
  },
  {
    id: "4",
    name: "Crystal Shield Protective Coating",
    price: 1299,
    description: "Ultra-clear protective coating that seals and preserves patina finishes. UV-resistant formula prevents further oxidation while maintaining the natural look.",
    shortDescription: "UV-resistant clear protective seal",
    category: "Protective Coatings",
    finishType: "Clear Coat",
    image: product4,
    rating: 4.7,
    reviews: 156,
    inStock: true,
  },
  {
    id: "5",
    name: "Iron Rust Accelerator",
    price: 1699,
    description: "Fast-acting rust effect solution for iron and steel surfaces. Creates authentic weathered rust finishes in hours, not years.",
    shortDescription: "Instant rust effect for iron & steel",
    category: "Patina Chemicals",
    finishType: "Rust Effect",
    image: product1,
    rating: 4.5,
    reviews: 93,
    inStock: true,
  },
  {
    id: "6",
    name: "Brass Darkening Solution",
    price: 1499,
    description: "Precision brass darkening solution for creating elegant aged finishes on brass hardware, fixtures, and decorative elements.",
    shortDescription: "Elegant dark patina for brass",
    category: "Patina Chemicals",
    finishType: "Dark Patina",
    image: product2,
    rating: 4.4,
    reviews: 71,
    inStock: true,
  },
  {
    id: "7",
    name: "Application Brush Set",
    price: 899,
    description: "Professional-grade brush set designed specifically for patina application. Includes stippling, blending, and detail brushes.",
    shortDescription: "Pro brushes for patina application",
    category: "Tools & Accessories",
    finishType: "Tools",
    image: product3,
    rating: 4.3,
    reviews: 45,
    inStock: true,
  },
  {
    id: "8",
    name: "Matte Sealer Spray",
    price: 999,
    description: "Professional matte finish sealer that protects patina work while maintaining a natural, non-reflective appearance.",
    shortDescription: "Matte finish protective sealer",
    category: "Protective Coatings",
    finishType: "Matte Coat",
    image: product4,
    rating: 4.6,
    reviews: 112,
    inStock: true,
  },
];

export const categories = [
  { name: "Patina Chemicals", count: 12, description: "Premium chemical solutions for authentic patina effects" },
  { name: "Metal Finishing Kits", count: 6, description: "Complete kits for professional metal finishing" },
  { name: "Protective Coatings", count: 8, description: "Sealers and coatings to preserve your work" },
  { name: "Tools & Accessories", count: 15, description: "Professional tools for patina application" },
];
