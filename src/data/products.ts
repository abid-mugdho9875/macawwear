import type { Product } from "@/types";

/**
 * Authoritative product catalog.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO ADD OR EDIT A PRODUCT
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Drop an image into `public/products/` (e.g. `m002.jpg`).
 * 2. Add or update an entry below.
 * 3. Save. Vite picks it up on next reload — no rebuild steps needed.
 *
 * The backend re-uses these IDs to validate orders and look up prices.
 * Never trust a price the browser sends — the backend imports this same
 * file and re-computes the total.
 */
export const PRODUCTS: readonly Product[] = [
  // ───────── Men ─────────
  {
    id: "M001",
    name: "Classic Crew Tee",
    category: "men",
    price: 1200,
    image: "/products/m001.svg",
    description:
      "A soft, breathable cotton crew-neck tee with reinforced shoulders. Built for everyday wear.",
    available: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Navy"],
  },
  {
    id: "M002",
    name: "Slim-Fit Chinos",
    category: "men",
    price: 2400,
    image: "/products/m002.svg",
    description:
      "Mid-rise slim chinos with a touch of stretch. Looks as good with sneakers as it does with loafers.",
    available: true,
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Khaki", "Charcoal", "Olive"],
  },
  {
    id: "M003",
    name: "Hooded Sweatshirt",
    category: "men",
    price: 2800,
    image: "/products/m003.svg",
    description:
      "Heavyweight fleece hoodie with a brushed inner for warmth. Pre-washed for a lived-in feel.",
    available: true,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey", "Black", "Cream"],
  },
  {
    id: "M004",
    name: "Oxford Button-Down",
    category: "men",
    price: 2200,
    image: "/products/m004.svg",
    description:
      "A versatile oxford shirt with a soft collar and tailored cut. Wear it tucked or loose.",
    available: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Light Blue", "White", "Pink"],
  },
  {
    id: "M005",
    name: "Lightweight Bomber Jacket",
    category: "men",
    price: 4500,
    image: "/products/m005.svg",
    description:
      "A clean, modern bomber with a water-resistant shell and ribbed cuffs. Perfect for layering.",
    available: false,
    sizes: ["M", "L", "XL"],
    colors: ["Black", "Navy"],
  },

  // ───────── Kids ─────────
  {
    id: "K001",
    name: "Kids' Cotton Tee",
    category: "kids",
    price: 650,
    image: "/products/k001.svg",
    description:
      "Soft, tagless cotton tee that holds up to play. Available in bright, kid-friendly colors.",
    available: true,
    sizes: ["2Y", "4Y", "6Y", "8Y", "10Y"],
    colors: ["Red", "Yellow", "Sky", "White"],
  },
  {
    id: "K002",
    name: "Kids' Joggers",
    category: "kids",
    price: 1100,
    image: "/products/k002.svg",
    description:
      "Stretchy knit joggers with an elastic waistband and ankle cuffs. Comfortable all day.",
    available: true,
    sizes: ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"],
    colors: ["Grey", "Navy", "Black"],
  },
  {
    id: "K003",
    name: "Kids' Hoodie",
    category: "kids",
    price: 1500,
    image: "/products/k003.svg",
    description:
      "A cozy fleece hoodie with a kangaroo pocket and lined hood. Built for adventures.",
    available: true,
    sizes: ["4Y", "6Y", "8Y", "10Y", "12Y"],
    colors: ["Green", "Blue", "Pink"],
  },
  {
    id: "K004",
    name: "Kids' Denim Shorts",
    category: "kids",
    price: 950,
    image: "/products/k004.svg",
    description:
      "Durable denim shorts with adjustable elastic at the waist. Easy on, easy off.",
    available: true,
    sizes: ["2Y", "4Y", "6Y", "8Y"],
    colors: ["Indigo", "Light Wash"],
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category: "men" | "kids" | "all"): Product[] {
  if (category === "all") return PRODUCTS.filter((p) => p.available);
  return PRODUCTS.filter((p) => p.category === category && p.available);
}