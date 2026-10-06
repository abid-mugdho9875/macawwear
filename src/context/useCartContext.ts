import { useContext } from "react";
import { CartContext } from "@/context/cartContextObject";
import type { UseCart } from "@/hooks/useCart";

export function useCartContext(): UseCart {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCartContext must be used inside a <CartProvider>.");
  }
  return value;
}