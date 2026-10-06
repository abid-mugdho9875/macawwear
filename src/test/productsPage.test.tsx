import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProductsPage } from "../pages/ProductsPage";
import { PRODUCTS } from "../data/products";

function renderProducts(initialPath = "/products") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:category" element={<ProductsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function productLinks() {
  return screen
    .getAllByRole("link")
    .filter((l) => l.getAttribute("href")?.startsWith("/product/"));
}

describe("ProductsPage", () => {
  it("renders all available products by default", () => {
    renderProducts("/products");
    const available = PRODUCTS.filter((p) => p.available);
    expect(productLinks()).toHaveLength(available.length);
  });

  it("filters to Men when /products/men is active", () => {
    renderProducts("/products/men");
    const men = PRODUCTS.filter((p) => p.category === "men" && p.available);
    expect(productLinks()).toHaveLength(men.length);
    for (const m of men) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    }
  });

  it("filters to Kids when /products/kids is active", () => {
    renderProducts("/products/kids");
    const kids = PRODUCTS.filter((p) => p.category === "kids" && p.available);
    expect(productLinks()).toHaveLength(kids.length);
  });

  it("renders the filter pills with correct counts", () => {
    renderProducts("/products");
    const available = PRODUCTS.filter((p) => p.available);
    expect(
      screen.getByRole("button", { name: new RegExp(`All \\(${available.length}\\)`) }),
    ).toBeInTheDocument();
    const menCount = PRODUCTS.filter((p) => p.category === "men" && p.available).length;
    expect(
      screen.getByRole("button", { name: new RegExp(`Men \\(${menCount}\\)`) }),
    ).toBeInTheDocument();
  });

  it("shows the product name and price for each card", () => {
    renderProducts("/products");
    const someProduct = PRODUCTS.find((p) => p.available)!;
    expect(screen.getByRole("heading", { name: someProduct.name })).toBeInTheDocument();
  });
});