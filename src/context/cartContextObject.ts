import { createContext } from "react";
import type { UseCart } from "@/hooks/useCart";

/**
 * The cart context lives in its own file so React Fast Refresh can update
 * the provider component without losing consumer state.
 */
export const CartContext = createContext<UseCart | null>(null);