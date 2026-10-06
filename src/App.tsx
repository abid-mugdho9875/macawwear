import { Route, Routes } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailsPage } from "@/pages/ProductDetailsPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { ConfirmationPage } from "@/pages/ConfirmationPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <CartProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:category" element={<ProductsPage />} />
          <Route path="/product/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </CartProvider>
  );
}