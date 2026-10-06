import { useCallback, useEffect, useMemo, useState } from "react";
import { getProductById } from "@/data/products";
import type { CartItem, Product } from "@/types";

/**
 * Cart state is persisted to localStorage so a page refresh doesn't drop it.
 *
 * Personal customer information (name, email, phone, address) is NEVER
 * stored here — only product IDs, quantities, and selected options.
 *
 * Schema versioning is included so future migrations don't crash existing carts.
 */
const STORAGE_KEY = "macaw.cart.v1";

interface PersistedCart {
  items: CartItem[];
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedCart;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(
      (it): it is CartItem =>
        !!it &&
        typeof it.productId === "string" &&
        typeof it.quantity === "number" &&
        it.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // Storage may be unavailable (private mode, quota). Fail silently —
    // the in-memory state still works for the current session.
  }
}

export interface CartLine {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  lineSubtotal: number;
}

export interface UseCart {
  items: CartItem[];
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  add: (item: CartItem) => void;
  update: (index: number, patch: Partial<CartItem>) => void;
  remove: (index: number) => void;
  clear: () => void;
}

function lineKey(it: CartItem): string {
  return [it.productId, it.size ?? "", it.color ?? ""].join("::");
}

export function useCart(): UseCart {
  const [items, setItems] = useState<CartItem[]>(() => readStorage());

  // Sync to storage whenever items change.
  useEffect(() => {
    writeStorage(items);
  }, [items]);

  const add = useCallback((item: CartItem) => {
    setItems((current) => {
      const key = lineKey(item);
      const existing = current.findIndex((c) => lineKey(c) === key);
      if (existing >= 0) {
        const next = [...current];
        next[existing] = {
          ...next[existing],
          quantity: next[existing].quantity + item.quantity,
        };
        return next;
      }
      return [...current, item];
    });
  }, []);

  const update = useCallback((index: number, patch: Partial<CartItem>) => {
    setItems((current) => {
      if (index < 0 || index >= current.length) return current;
      const next = [...current];
      const updated = { ...next[index], ...patch };
      if (updated.quantity <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = updated;
      }
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setItems((current) => {
      if (index < 0 || index >= current.length) return current;
      const next = [...current];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const lines = useMemo<CartLine[]>(() => {
    const out: CartLine[] = [];
    for (const it of items) {
      const product = getProductById(it.productId);
      if (!product) continue; // skip unknown products silently
      out.push({
        product,
        quantity: it.quantity,
        size: it.size,
        color: it.color,
        lineSubtotal: product.price * it.quantity,
      });
    }
    return out;
  }, [items]);

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineSubtotal, 0),
    [lines],
  );

  return { items, lines, itemCount, subtotal, add, update, remove, clear };
}