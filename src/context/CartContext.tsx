import type { ReactNode } from "react";
import { useCart } from "@/hooks/useCart";
import { CartContext } from "@/context/cartContextObject";

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useCart();
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}