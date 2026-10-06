import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "../context/CartContext";
import { CartPage } from "../pages/CartPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { ConfirmationPage } from "../pages/ConfirmationPage";

// Mock the orders service so we can drive the network call from the test.
const createOrderMock = vi.fn();

vi.mock("../services/orders", async () => {
  const actual =
    await vi.importActual<typeof import("../services/orders")>("../services/orders");
  return {
    ...actual,
    createOrder: (...args: unknown[]) => createOrderMock(...args),
  };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

const STORAGE_KEY = "macaw.cart.v1";

function seedCart(items: unknown[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
}

describe("CartPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    createOrderMock.mockReset();
  });

  it("shows the empty state when the cart is empty", () => {
    renderAt("/cart");
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it("renders lines from localStorage with quantities", () => {
    seedCart([{ productId: "M001", quantity: 2, size: "L", color: "Black" }]);
    renderAt("/cart");
    expect(screen.getByText(/classic crew tee/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("increments quantity and removes a line", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1 }]);
    renderAt("/cart");
    const inc = screen.getByRole("button", { name: /increase quantity/i });
    await user.click(inc);
    expect(screen.getByText("2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() =>
      expect(screen.queryByText(/classic crew tee/i)).not.toBeInTheDocument(),
    );
  });

  it("persists changes to localStorage", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1 }]);
    renderAt("/cart");
    await user.click(screen.getByRole("button", { name: /increase quantity/i }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.items[0].quantity).toBe(2);
  });
});

describe("CheckoutPage — validation and submission", () => {
  beforeEach(() => {
    window.localStorage.clear();
    createOrderMock.mockReset();
  });

  it("redirects to /cart when the cart is empty", async () => {
    renderAt("/checkout");
    // Wait for the redirect to happen.
    expect(
      await screen.findByText(/your cart is empty/i),
    ).toBeInTheDocument();
  });

  it("blocks submission when the email is invalid", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);
    renderAt("/checkout");

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");

    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("shows a field error when name is missing", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);
    renderAt("/checkout");

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(
      await screen.findByText(/please enter your full name/i),
    ).toBeInTheDocument();
  });

  it("disables the submit button while processing", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);

    // Slow resolve so we can observe the disabled state.
    createOrderMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                orderNumber: "ORD-20240101-AAAA",
                total: 1200,
                emailSent: true,
              }),
            80,
          ),
        ),
    );

    renderAt("/checkout");

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");

    const btn = screen.getByRole("button", { name: /place order/i });
    await user.click(btn);

    expect(btn).toBeDisabled();
    //expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(btn).toHaveTextContent(/processing/i);


    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /thank you for your order/i }),
      ).toBeInTheDocument(),
    );
  });

  it("clears the cart after a successful order", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);
    createOrderMock.mockResolvedValue({
      orderNumber: "ORD-20240101-AAAA",
      total: 1200,
      emailSent: true,
    });

    renderAt("/checkout");

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /thank you/i }),
      ).toBeInTheDocument(),
    );
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.items).toEqual([]);
  });

  it("shows the confirmation page with order number and total", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 2, size: "L", color: "Black" }]);
    createOrderMock.mockResolvedValue({
      orderNumber: "ORD-20240101-ZZZZ",
      total: 2400,
      emailSent: true,
    });

    renderAt("/checkout");
    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /thank you for your order/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("ORD-20240101-ZZZZ")).toBeInTheDocument();
    expect(screen.getByText(/confirmation email sent/i)).toBeInTheDocument();
  });

  it("renders a warning when the email fails but acknowledges the order", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);
    renderAt("/checkout");

    createOrderMock.mockResolvedValue({
      orderNumber: "ORD-20240101-AAAA",
      total: 1200,
      emailSent: false,
      emailWarning: "delivery pending",
    });

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() =>
      expect(screen.getByText(/order was received/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("ORD-20240101-AAAA")).toBeInTheDocument();
  });

  it("renders a server-side error if createOrder rejects", async () => {
    const user = userEvent.setup();
    seedCart([{ productId: "M001", quantity: 1, size: "L" }]);
    createOrderMock.mockRejectedValue(new Error("Boom from server"));
    // Use a fresh render so the page is mounted (the prior test left the cart empty).
    renderAt("/checkout");

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+1 555 0000");
    await user.type(screen.getByLabelText(/address/i), "1 Test Way");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/boom from server/i)).toBeInTheDocument();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});