import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "../hooks/useCart";

const STORAGE_KEY = "macaw.cart.v1";

describe("useCart", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
  });

  it("persists items to localStorage and reloads them", () => {
    const { result, rerender } = renderHook(() => useCart());
    act(() => {
      result.current.add({ productId: "M001", quantity: 2, size: "L", color: "Black" });
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotal).toBe(1200 * 2);

    // Verify storage was written.
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.items).toHaveLength(1);

    // A fresh hook should re-hydrate from storage.
    const second = renderHook(() => useCart());
    expect(second.result.current.lines).toHaveLength(1);
    expect(second.result.current.lines[0].product.id).toBe("M001");
    void rerender;
  });

  it("merges quantity when the same product+size+color is added twice", () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.add({ productId: "M001", quantity: 1, size: "L", color: "Black" });
      result.current.add({ productId: "M001", quantity: 2, size: "L", color: "Black" });
      result.current.add({ productId: "M001", quantity: 1, size: "M", color: "Black" });
    });
    expect(result.current.lines).toHaveLength(2);
    const first = result.current.lines.find((l) => l.size === "L")!;
    const second = result.current.lines.find((l) => l.size === "M")!;
    expect(first.quantity).toBe(3);
    expect(second.quantity).toBe(1);
  });

  it("updates quantity and removes when quantity drops to 0", () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.add({ productId: "K001", quantity: 3, size: "4Y", color: "Red" });
    });
    act(() => {
      result.current.update(0, { quantity: 0 });
    });
    expect(result.current.lines).toHaveLength(0);
  });

  it("removes a specific line", () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.add({ productId: "M001", quantity: 1 });
      result.current.add({ productId: "M002", quantity: 1 });
    });
    expect(result.current.lines).toHaveLength(2);
    act(() => {
      result.current.remove(0);
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].product.id).toBe("M002");
  });

  it("clears the cart and storage", () => {
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.add({ productId: "M001", quantity: 1 });
    });
    expect(result.current.lines).toHaveLength(1);
    act(() => {
      result.current.clear();
    });
    expect(result.current.lines).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.items).toEqual([]);
  });

  it("ignores garbage in storage and starts empty", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    const { result } = renderHook(() => useCart());
    expect(result.current.lines).toHaveLength(0);
  });

  it("ignores unknown product ids when reading from storage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: [
          { productId: "ZZZZ", quantity: 1 },
          { productId: "M001", quantity: 1 },
        ],
      }),
    );
    const { result } = renderHook(() => useCart());
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].product.id).toBe("M001");
  });
});